package com.aistudyhub.dto.quiz;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PracticeTestGenerateRequest {
    @NotNull
    private Integer documentId;

    private Integer userId = 1;
    private String title;
    private String difficulty = "Medium";
    private String questionType = "Multiple Choice";

    @Min(1)
    @Max(30)
    private Integer totalQuestions = 10;

    @Min(5)
    @Max(180)
    private Integer timeLimit = 20;
}