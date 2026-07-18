package com.aistudyhub.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ChatAskResponse(
        String answer,
        @JsonProperty("session_id") Integer sessionId,
        @JsonProperty("detected_subject") DetectedSubjectResponse detectedSubject,
        List<SourceDocumentResponse> sources,
        @JsonProperty("used_mock_ai") Boolean usedMockAi
) {
}
