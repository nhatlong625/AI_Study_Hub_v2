package com.aistudyhub.dto.quiz;

import lombok.Data;
import java.util.Map;

@Data
public class SaveProgressRequest {
    private Integer userId = 1;
    private Integer lastQuestionIndex = 0;
    private Integer timeSpentSeconds = 0;
    // quizId (QUIZ_TEST.quiz_id) → optionId (ANSWER_OPTION.option_id)
    private Map<Integer, Integer> answers;
}