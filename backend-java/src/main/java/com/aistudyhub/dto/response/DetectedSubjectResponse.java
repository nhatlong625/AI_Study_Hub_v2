package com.aistudyhub.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Môn học được suy ra từ tài liệu context có điểm liên quan cao nhất. */
public record DetectedSubjectResponse(
        @JsonProperty("subject_id") Integer subjectId,
        @JsonProperty("subject_name") String subjectName
) {
}
