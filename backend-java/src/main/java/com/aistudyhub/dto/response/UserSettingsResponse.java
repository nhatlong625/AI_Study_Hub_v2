package com.aistudyhub.dto.response;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingsResponse {
    private boolean emailNotifications;
    private boolean pushNotifications;
    private boolean learningNotifications;
    private boolean aiNotifications;
    private boolean achievementNotifications;
    private boolean securityNotifications;
    private String  profileVisibility;  // "Public" | "Private"
    private boolean showStreak;
    private String  language;
    private String  timezone;
}
