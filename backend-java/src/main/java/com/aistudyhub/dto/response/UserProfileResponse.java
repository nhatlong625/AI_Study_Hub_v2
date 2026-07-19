package com.aistudyhub.dto.response;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Integer userId;
    private String fullName;
    private String email;
    private String plan;
    private String avatarUrl;
    private String joinedAt;   // "January 2024"
}
