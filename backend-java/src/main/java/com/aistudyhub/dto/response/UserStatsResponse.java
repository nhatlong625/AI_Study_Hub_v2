package com.aistudyhub.dto.response;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsResponse {
    private int streakDays;
    private int studyTimeMinutes;   // thời gian thật: chat (khoảng cách timestamp) + quiz (start→end)
    private int coursesCompleted;   // đếm user_subjects
    private long totalStorageBytes;
    private long usedStorageBytes;
}
