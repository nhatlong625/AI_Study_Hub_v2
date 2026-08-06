package com.aistudyhub.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Tổng thời gian học của một user, chỉ cộng những gì đo được trực tiếp từ DB.
 *
 * <p>Hai nguồn: thời gian mở đọc tài liệu ({@code DOCUMENT_READING.read_seconds}, do client báo
 * theo nhịp) và thời gian làm quiz ({@code TEST_ATTEMPT.start_time → end_time}).
 *
 * <p>Chat với AI cố tình <b>không</b> được tính. {@code CHAT_MESSAGE} chỉ có {@code created_at} của
 * từng message, không có dấu vết nào cho biết user ngồi đọc câu trả lời bao lâu — mọi cách quy ra
 * phút đều là hằng số phỏng đoán. Cách tính cũ ({@code COUNT(message) * 3}) vừa phỏng đoán vừa đếm
 * đôi vì không lọc {@code session_type}, nên một lượt hỏi–đáp bị tính thành 6 phút.
 *
 * <p>Con số này là lịch sử cộng dồn nên không lọc tài liệu đã xoá: thời gian đã học là đã học, xoá
 * tài liệu sau đó không làm nó biến mất.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class StudyTimeService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Quiz bị cap theo {@code time_limit} của bộ đề (đơn vị phút) vì {@code end_time} chỉ được ghi
     * lúc submit: một attempt mở rồi để đó qua đêm sẽ ra chênh lệch hàng chục tiếng. Chỉ tính
     * attempt đã submit ({@code end_time IS NOT NULL}).
     */
    private static final String STUDY_SECONDS_SQL = """
            SELECT
                (
                    SELECT COALESCE(SUM(CAST(dr.read_seconds AS BIGINT)), 0)
                    FROM dbo.DOCUMENT_READING dr
                    WHERE dr.user_id = ?
                ) AS read_seconds,
                (
                    SELECT COALESCE(SUM(CASE WHEN q.elapsed > q.cap THEN q.cap ELSE q.elapsed END), 0)
                    FROM (
                        SELECT CAST(DATEDIFF(SECOND, ta.start_time, ta.end_time) AS BIGINT) AS elapsed,
                               CAST(aq.time_limit AS BIGINT) * 60                           AS cap
                        FROM dbo.TEST_ATTEMPT ta
                        JOIN dbo.AI_QUESTION aq ON aq.question_id = ta.question_id
                        WHERE ta.user_id = ?
                          AND ta.end_time IS NOT NULL
                          AND ta.end_time > ta.start_time
                    ) AS q
                ) AS quiz_seconds
            """;

    /** Tổng thời gian học tính theo phút, làm tròn xuống. Trả 0 nếu truy vấn lỗi. */
    public int getStudyTimeMinutes(Integer userId) {
        if (userId == null) return 0;

        try {
            Long totalSeconds = jdbcTemplate.query(STUDY_SECONDS_SQL,
                    rs -> {
                        if (!rs.next()) return 0L;
                        return rs.getLong("read_seconds") + rs.getLong("quiz_seconds");
                    },
                    userId, userId);

            if (totalSeconds == null || totalSeconds <= 0) return 0;
            return (int) Math.min(totalSeconds / 60, Integer.MAX_VALUE);
        } catch (Exception e) {
            log.warn("Could not compute study time for user {}: {}", userId, e.getMessage());
            return 0;
        }
    }
}
