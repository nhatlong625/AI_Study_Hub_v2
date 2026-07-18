package com.aistudyhub.dto.python;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** Khớp với schema ChatAskRequest bên backend-python — gửi tới POST /api/chat/ask. */
public record PythonChatAskRequest(
        String message,
        @JsonProperty("session_id") Integer sessionId,
        @JsonProperty("context_documents") List<PythonContextDocument> contextDocuments
) {
}
