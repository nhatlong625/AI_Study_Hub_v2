package com.aistudyhub.dto.quiz;

import lombok.Data;

import java.util.Map;

@Data
public class PracticeTestSubmitRequest {
    private Integer userId = 1;
    private Integer timeSpentSeconds = 0;
    private Map<Integer, Integer> answers;
}