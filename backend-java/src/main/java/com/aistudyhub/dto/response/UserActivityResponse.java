package com.aistudyhub.dto.response;

import java.time.LocalDateTime;

/**
 * Một dòng trong feed Recent Activity ở trang profile.
 *
 * @param type       loại hoạt động: upload | read | read_done | quiz | chat
 * @param title      tên tài liệu / tên bộ quiz / tiêu đề phiên chat
 * @param detail     thông tin phụ tuỳ loại (ví dụ "8/10" cho quiz), null nếu không có
 * @param occurredAt thời điểm hoạt động, dùng để sắp thứ tự feed
 * @param documentId tài liệu liên quan, null với phiên chat không gắn tài liệu nào
 */
public record UserActivityResponse(
        String type,
        String title,
        String detail,
        LocalDateTime occurredAt,
        Integer documentId
) {}
