package com.aistudyhub.dto.request;

import lombok.Data;

@Data
public class UpdateSettingsRequest {
    private Boolean emailNotifications;
    private Boolean pushNotifications;
    private Boolean learningNotifications;
    private Boolean aiNotifications;
    private Boolean achievementNotifications;
    private Boolean securityNotifications;
    private String  profileVisibility;
    private Boolean showStreak;
    private String  language;
    private String  timezone;
}
