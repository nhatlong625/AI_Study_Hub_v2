package com.aistudyhub.service;

import com.aistudyhub.dto.response.UserActivityResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.Collections;
import java.util.List;

/**
 * Gom lịch sử hoạt động học của một user thành một feed duy nhất.
 *
 * <p>Bốn nguồn, mỗi nguồn là một hành động người dùng chủ động làm: upload tài liệu, đọc tài liệu,
 * làm quiz, hỏi AI tutor. Cố tình <b>không</b> đưa AI summary vào: summary chạy tự động sau khi
 * upload ({@code DocumentSummaryJobService.summarizeAfterUpload}) và cũng chạy khi mở trang xem tài
 * liệu, nên nó luôn trùng thời điểm với upload/đọc và chỉ làm feed bị nhân đôi.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserActivityService {

    /** Feed hiển thị ở cột phải trang profile, không cần dài. */
    private static final int MAX_LIMIT = 50;

    private final JdbcTemplate jdbcTemplate;

    /**
     * Mỗi nhánh chỉ trả về một dòng cho mỗi đối tượng (tài liệu / phiên chat / lượt quiz) nên feed
     * không bị một tài liệu đọc nhiều lần hay một phiên chat dài chiếm hết chỗ.
     *
     * <p>Mọi nhánh join DOCUMENT đều lọc {@code deleted_at IS NULL}: tài liệu đã bỏ vào Trash không
     * được hiện lại trong feed.
     */
    private static final String FEED_SQL = """
            SELECT TOP (?) type, title, detail, occurred_at, document_id
            FROM (
                SELECT CAST('upload' AS NVARCHAR(20))            AS type,
                       CAST(COALESCE(NULLIF(d.title, N''), d.document_name) AS NVARCHAR(255)) AS title,
                       CAST(NULL AS NVARCHAR(100))               AS detail,
                       d.uploaded_at                             AS occurred_at,
                       d.document_id                             AS document_id
                FROM dbo.DOCUMENT d
                WHERE d.user_id = ? AND d.deleted_at IS NULL

                UNION ALL

                SELECT CAST(CASE WHEN dr.read_seconds >= ? THEN 'read_done' ELSE 'read' END AS NVARCHAR(20)),
                       CAST(COALESCE(NULLIF(d.title, N''), d.document_name) AS NVARCHAR(255)),
                       CAST(NULL AS NVARCHAR(100)),
                       dr.last_read_at,
                       d.document_id
                FROM dbo.DOCUMENT_READING dr
                JOIN dbo.DOCUMENT d ON d.document_id = dr.document_id
                WHERE dr.user_id = ? AND d.deleted_at IS NULL

                UNION ALL

                SELECT CAST('quiz' AS NVARCHAR(20)),
                       CAST(COALESCE(NULLIF(aq.title, N''), d.document_name) AS NVARCHAR(255)),
                       CAST(CONCAT(tr.correct_answer, '/', tr.total_question) AS NVARCHAR(100)),
                       tr.generated_at,
                       d.document_id
                FROM dbo.TEST_RESULT tr
                JOIN dbo.TEST_ATTEMPT ta ON ta.attempt_id = tr.attempt_id
                JOIN dbo.AI_QUESTION aq ON aq.question_id = ta.question_id
                JOIN dbo.DOCUMENT d ON d.document_id = aq.document_id
                WHERE ta.user_id = ? AND d.deleted_at IS NULL

                UNION ALL

                -- Một phiên chat = một dòng, mốc thời gian là câu hỏi gần nhất của user.
                SELECT CAST('chat' AS NVARCHAR(20)),
                       CAST(NULLIF(cs.session_title, N'') AS NVARCHAR(255)),
                       CAST(NULL AS NVARCHAR(100)),
                       MAX(cm.created_at),
                       cs.document_id
                FROM dbo.CHAT_SESSION cs
                JOIN dbo.CHAT_MESSAGE cm ON cm.session_id = cs.session_id
                WHERE cs.user_id = ? AND cm.session_type = 'user'
                GROUP BY cs.session_id, cs.session_title, cs.document_id
            ) AS feed
            WHERE occurred_at IS NOT NULL
            ORDER BY occurred_at DESC
            """;

    /** Feed mới nhất trước. Trả về danh sách rỗng nếu truy vấn lỗi — profile không nên vì thế mà chết. */
    public List<UserActivityResponse> getRecentActivity(Integer userId, int limit) {
        if (userId == null) return Collections.emptyList();
        int capped = Math.min(Math.max(limit, 1), MAX_LIMIT);

        try {
            return jdbcTemplate.query(FEED_SQL,
                    (rs, rowNum) -> {
                        Timestamp occurredAt = rs.getTimestamp("occurred_at");
                        Integer documentId = rs.getObject("document_id", Integer.class);
                        return new UserActivityResponse(
                                rs.getString("type"),
                                rs.getString("title"),
                                rs.getString("detail"),
                                occurredAt == null ? null : occurredAt.toLocalDateTime(),
                                documentId);
                    },
                    capped,
                    userId,
                    DocumentReadingService.READ_THRESHOLD_SECONDS, userId,
                    userId,
                    userId);
        } catch (Exception e) {
            log.warn("Could not load activity feed for user {}: {}", userId, e.getMessage());
            return Collections.emptyList();
        }
    }
}
