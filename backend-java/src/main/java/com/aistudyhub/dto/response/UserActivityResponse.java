package com.aistudyhub.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Một dòng trong feed Recent Activity ở trang profile.
 *
 * Bốn nguồn dồn về cùng một hình dạng nên frontend chỉ cần một vòng lặp:
 * UPLOAD (upload tài liệu), READING (đọc tài liệu), QUIZ (nộp bài),
 * CHAT (mở phiên chat AI). Các trường phụ chỉ có nghĩa với đúng loại của nó
 * và để null ở những loại còn lại.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityResponse {
    private String type;                // UPLOAD | READING | QUIZ | CHAT
    private String title;               // tên tài liệu / bài quiz / phiên chat
    private LocalDateTime occurredAt;
    private Integer durationSeconds;    // chỉ READING
    private BigDecimal score;           // chỉ QUIZ
}
