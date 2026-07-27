package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

/**
 * Payload từ FE (aiChatService.askAiChat) — sessionId null nghĩa là tạo session mới.
 * subjectId/documentIds dùng để giới hạn phạm vi tìm context (RAG) trong AI_SUMMARY.
 */
@Data
public class ChatAskRequest {
    // Server-managed: ChatController populates this from the authenticated JWT.
    Integer userId;
    Integer sessionId;
    Integer documentId;
    Integer subjectId;
    List<Integer> documentIds;
    @NotBlank String message;
    @Min(1) @Max(10) Integer topK;
}
