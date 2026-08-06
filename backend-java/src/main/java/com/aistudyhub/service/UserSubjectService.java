package com.aistudyhub.service;

import com.aistudyhub.dto.response.UserSubjectResponse;
import com.aistudyhub.entity.Subject;
import com.aistudyhub.entity.UserSubject;
import com.aistudyhub.exception.ConflictException;
import com.aistudyhub.repository.SubjectRepository;
import com.aistudyhub.repository.UserSubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserSubjectService {

    private final UserSubjectRepository userSubjectRepository;
    private final SubjectRepository subjectRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Trả kèm luôn tên/mã môn, mới add lên trước.
     *
     * <p>Tên môn đi kèm ở đây để phía client không phải tra ngược qua {@code GET /semesters} —
     * endpoint đó cache 5 phút, nên môn vừa tạo sẽ chưa có mặt và người gọi không phân biệt được
     * "môn không tồn tại" với "cache chưa kịp cập nhật".
     */
    public List<UserSubjectResponse> getByUser(Integer userId) {
        List<UserSubject> links = userSubjectRepository.findByUserId(userId);
        if (links.isEmpty()) return List.of();

        Map<Integer, Subject> subjectsById = subjectRepository.findAllById(
                        links.stream().map(UserSubject::getSubjectId).filter(Objects::nonNull).toList())
                .stream()
                .collect(Collectors.toMap(Subject::getSubjectId, subject -> subject, (a, b) -> a));

        Map<Integer, StudyProgress> progressBySubject = findStudyProgress(userId);

        return links.stream()
                .sorted(Comparator.comparing(UserSubject::getAddedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(us -> toDto(us, subjectsById.get(us.getSubjectId()),
                        progressBySubject.get(us.getSubjectId())))
                .collect(Collectors.toList());
    }

    private record StudyProgress(long documentCount, long studiedDocumentCount,
                                 LocalDateTime lastStudiedAt) {}

    /**
     * Đếm theo môn: tổng tài liệu, và bao nhiêu trong số đó user đã thực sự học.
     *
     * <p>"Đã học" = đã nộp xong ít nhất một bài quiz sinh từ tài liệu đó, hoặc đã mở một phiên
     * chat AI về nó. Đây là hai dấu vết duy nhất trong DB cho thấy user có đụng tới nội dung —
     * upload không tính, vì tải file lên rồi bỏ đó không phải là học.
     *
     * <p>Quiz chỉ tính khi {@code status = 'Completed'}; bài đang làm dở chưa nói lên điều gì.
     */
    private Map<Integer, StudyProgress> findStudyProgress(Integer userId) {
        // Gom trước danh sách tài liệu "đã đụng tới" thành CTE rồi LEFT JOIN, thay vì EXISTS lồng
        // trong SUM — SQL Server không cho aggregate nhận biểu thức chứa subquery, và cách này
        // cũng chỉ phải bóc sources_json một lần cho cả user thay vì một lần mỗi tài liệu.
        List<Map<String, Object>> rows;
        try {
            rows = jdbcTemplate.queryForList("""
                    WITH chat_docs AS (
                        -- Nguồn chính: mọi tài liệu AI từng trích trong câu trả lời. sources_json
                        -- giữ đủ danh sách nên một phiên hỏi nhiều tài liệu thì tính đủ cả.
                        SELECT src.document_id AS document_id, MAX(cm.created_at) AS lastAt
                        FROM dbo.CHAT_MESSAGE cm
                        JOIN dbo.CHAT_SESSION cs ON cs.session_id = cm.session_id
                        CROSS APPLY OPENJSON(cm.sources_json)
                            WITH (document_id INT '$.document_id') src
                        WHERE cs.user_id = ?
                          AND cm.sources_json IS NOT NULL
                          AND ISJSON(cm.sources_json) = 1
                          AND src.document_id IS NOT NULL
                        GROUP BY src.document_id

                        UNION ALL

                        -- Phiên mở thẳng từ một tài liệu nhưng AI không trích nguồn nào.
                        SELECT cs.document_id, MAX(COALESCE(cs.updated_at, cs.created_at))
                        FROM dbo.CHAT_SESSION cs
                        WHERE cs.user_id = ? AND cs.document_id IS NOT NULL
                        GROUP BY cs.document_id
                    ),
                    chat_rollup AS (
                        SELECT document_id, MAX(lastAt) AS lastAt FROM chat_docs GROUP BY document_id
                    ),
                    quiz_docs AS (
                        SELECT aq.document_id, MAX(ta.end_time) AS lastAt
                        FROM dbo.TEST_ATTEMPT ta
                        JOIN dbo.AI_QUESTION aq ON aq.question_id = ta.question_id
                        WHERE ta.user_id = ? AND ta.status = 'Completed'
                        GROUP BY aq.document_id
                    ),
                    read_docs AS (
                        -- Đọc đủ ngưỡng cũng là đã học, kể cả khi chưa làm quiz hay hỏi AI.
                        SELECT dr.document_id, dr.last_read_at AS lastAt
                        FROM dbo.DOCUMENT_READING dr
                        WHERE dr.user_id = ? AND dr.read_seconds >= ?
                    )
                    SELECT d.subject_id AS subjectId,
                           COUNT(*) AS documentCount,
                           SUM(CASE WHEN c.document_id IS NOT NULL
                                      OR q.document_id IS NOT NULL
                                      OR r.document_id IS NOT NULL
                                    THEN 1 ELSE 0 END) AS studiedDocumentCount,
                           MAX(q.lastAt) AS lastQuizAt,
                           MAX(c.lastAt) AS lastChatAt,
                           MAX(r.lastAt) AS lastReadAt
                    FROM dbo.DOCUMENT d
                    LEFT JOIN chat_rollup c ON c.document_id = d.document_id
                    LEFT JOIN quiz_docs q ON q.document_id = d.document_id
                    LEFT JOIN read_docs r ON r.document_id = d.document_id
                    WHERE d.user_id = ?
                      AND d.status = 'Active'
                      AND d.deleted_at IS NULL
                      AND d.subject_id IS NOT NULL
                    GROUP BY d.subject_id
                    """, userId, userId, userId,
                    userId, DocumentReadingService.READ_THRESHOLD_SECONDS,
                    userId);
        } catch (Exception e) {
            // Hỏng phần tiến độ thì vẫn trả danh sách môn kèm tên; mất thanh % còn hơn vỡ cả trang.
            log.error("Failed to resolve study progress for user {}: {}", userId, e.getMessage());
            return Map.of();
        }

        Map<Integer, StudyProgress> progress = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Object subjectId = row.get("subjectId");
            if (subjectId instanceof Number id) {
                progress.put(id.intValue(), new StudyProgress(
                        toLong(row.get("documentCount")),
                        toLong(row.get("studiedDocumentCount")),
                        latest(toDateTime(row.get("lastQuizAt")),
                               latest(toDateTime(row.get("lastChatAt")),
                                      toDateTime(row.get("lastReadAt"))))));
            }
        }
        return progress;
    }

    private long toLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }

    private LocalDateTime toDateTime(Object value) {
        return value instanceof java.sql.Timestamp ts ? ts.toLocalDateTime() : null;
    }

    /** Mốc học gần nhất của môn = cái muộn hơn giữa lần nộp quiz và lần chat cuối. */
    private LocalDateTime latest(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }

    /** Add từ modal Create Course — báo lỗi nếu user đã add môn này rồi. */
    @Transactional
    public UserSubjectResponse add(Integer userId, Integer subjectId) {
        if (userSubjectRepository.existsByUserIdAndSubjectId(userId, subjectId)) {
            throw new ConflictException("Subject already added to this user's Library.");
        }
        return toDto(save(userId, subjectId));
    }

    /**
     * Gọi từ DocumentService khi upload — đảm bảo subject luôn có mặt trong
     * Library dù user upload trực tiếp mà không qua modal Create Course.
     * Idempotent, không throw nếu đã tồn tại.
     */
    @Transactional
    public void ensureAdded(Integer userId, Integer subjectId) {
        if (!userSubjectRepository.existsByUserIdAndSubjectId(userId, subjectId)) {
            save(userId, subjectId);
        }
    }

    /**
     * Chỉ xóa link USER_SUBJECT — KHÔNG xóa document. Việc xóa document phải
     * gọi từ DocumentService.deleteAllByUserAndSubject() trước (ở Controller),
     * vì DocumentService đã phụ thuộc UserSubjectService (ensureAdded) —
     * để service này gọi ngược lại DocumentService sẽ tạo circular dependency.
     */
    @Transactional
    public void removeLink(Integer userId, Integer subjectId) {
        userSubjectRepository.deleteByUserIdAndSubjectId(userId, subjectId);
    }

    private UserSubject save(Integer userId, Integer subjectId) {
        UserSubject us = new UserSubject();
        us.setUserId(userId);
        us.setSubjectId(subjectId);
        us.setAddedAt(LocalDateTime.now());
        return userSubjectRepository.save(us);
    }

    private UserSubjectResponse toDto(UserSubject us) {
        return toDto(us, null, null);
    }

    private UserSubjectResponse toDto(UserSubject us, Subject subject, StudyProgress progress) {
        UserSubjectResponse r = new UserSubjectResponse();
        r.setUserSubjectId(us.getUserSubjectId());
        r.setUserId(us.getUserId());
        r.setSubjectId(us.getSubjectId());
        r.setAddedAt(us.getAddedAt());
        if (subject != null) {
            // Giống SemesterService: môn thiếu mã thì dựng mã tạm từ id để UI luôn có gì đó hiển thị.
            r.setSubjectCode(subject.getSubjectCode() != null && !subject.getSubjectCode().isBlank()
                    ? subject.getSubjectCode()
                    : "SUB-" + subject.getSubjectId());
            r.setSubjectName(subject.getSubjectName());
        }
        if (progress != null) {
            r.setDocumentCount(progress.documentCount());
            r.setStudiedDocumentCount(progress.studiedDocumentCount());
            r.setLastStudiedAt(progress.lastStudiedAt());
        }
        return r;
    }
}
