package com.aistudyhub.dto.response;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
    private String token;
    private Integer userId;
    private String email;
    private String fullName;
    private String role;
    private String plan;
    private int streakDays;
}
