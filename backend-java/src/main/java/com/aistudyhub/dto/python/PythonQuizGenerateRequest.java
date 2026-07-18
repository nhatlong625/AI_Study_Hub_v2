package com.aistudyhub.dto.python;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PythonQuizGenerateRequest(
        @JsonProperty("document_id") Integer documentId,
        @JsonProperty("document_name") String documentName,
        String title,
        String text,
        @JsonProperty("total_questions") Integer totalQuestions,
        @JsonProperty("question_type") String questionType,
        String difficulty
) {}
