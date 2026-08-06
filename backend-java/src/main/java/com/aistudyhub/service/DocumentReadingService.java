package com.aistudyhub.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cộng dồn thời gian user thực sự mở đọc từng tài liệu.
 *
 * <p>Đọc là hành vi học cơ bản nhất nhưng trước đây không để lại dấu vết nào trong DB: user đọc kỹ
 * hết tài liệu của một môn mà không làm quiz hay hỏi AI thì tiến độ vẫn là 0. Bảng
 * {@code DOCUMENT_READING} lấp chỗ đó.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentReadingService {

    /** Đọc đủ ngưỡng này mới coi là đã học xong tài liệu. */
    public static final int READ_THRESHOLD_SECONDS = 120;

    /**
     * Chặn trên cho mỗi lần báo. Client gửi nhịp đều đặn nên một lần báo không thể lớn hơn nhịp
     * đó nhiều; giá trị bất thường thường là tab bị treo hoặc bị sửa tay.
     */
    private static final int MAX_SECONDS_PER_REPORT = 120;

    private final JdbcTemplate jdbcTemplate;

    /** Cộng thêm thời gian đọc; trả về tổng sau khi cộng, -1 nếu không ghi được. */
    @Transactional
    public int addReadingTime(Integer userId, Integer documentId, Integer seconds) {
        if (userId == null || documentId == null || seconds == null || seconds <= 0) return -1;
        int capped = Math.min(seconds, MAX_SECONDS_PER_REPORT);

        try {
            // MERGE để lần đọc đầu tiên và các lần sau dùng chung một lệnh, tránh race giữa hai tab.
            jdbcTemplate.update("""
                    MERGE dbo.DOCUMENT_READING AS target
                    USING (SELECT ? AS user_id, ? AS document_id) AS source
                        ON target.user_id = source.user_id AND target.document_id = source.document_id
                    WHEN MATCHED THEN
                        UPDATE SET read_seconds = target.read_seconds + ?, last_read_at = SYSDATETIME()
                    WHEN NOT MATCHED THEN
                        INSERT (user_id, document_id, read_seconds, last_read_at)
                        VALUES (source.user_id, source.document_id, ?, SYSDATETIME());
                    """, userId, documentId, capped, capped);

            Integer total = jdbcTemplate.queryForObject("""
                    SELECT read_seconds FROM dbo.DOCUMENT_READING
                    WHERE user_id = ? AND document_id = ?
                    """, Integer.class, userId, documentId);
            return total == null ? -1 : total;
        } catch (Exception e) {
            // Không chặn việc đọc tài liệu chỉ vì ghi thống kê thất bại.
            log.warn("Could not record reading time for user {} document {}: {}",
                    userId, documentId, e.getMessage());
            return -1;
        }
    }
}
