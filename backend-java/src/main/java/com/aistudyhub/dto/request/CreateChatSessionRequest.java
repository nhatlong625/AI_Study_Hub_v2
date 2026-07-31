package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class CreateChatSessionRequest {
    // Server-managed: ChatController populates this from the authenticated JWT.
    Integer userId;
    Integer documentId;
    String sessionTitle;
}
