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
    private int studyTimeMinutes;   // tính từ chat messages
    private int coursesCompleted;   // đếm user_subjects
    private long xp;                // docs×50 + sessions×20 + attempts×100
    private int level;              // xp / 250
    private long xpForCurrentLevel;
    private long xpForNextLevel;
    private long totalStorageBytes;
    private long usedStorageBytes;
}
