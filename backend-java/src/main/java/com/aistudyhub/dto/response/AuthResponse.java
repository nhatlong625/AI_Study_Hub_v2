package com.aistudyhub.dto.response;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
    private String token;
    private Integer userId;
    private String email;
    private String fullName;
    // Trả về ngay lúc đăng nhập để topbar/sidebar hiện đúng avatar mà không phải
    // chờ một request profile riêng.
    private String avatarUrl;
    private String role;
    private String plan;
    private int streakDays;
    private Integer majorId;
    private String majorName;
}
