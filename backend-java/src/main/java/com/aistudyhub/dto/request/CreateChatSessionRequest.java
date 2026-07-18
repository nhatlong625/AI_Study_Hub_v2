package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class CreateChatSessionRequest {
    @NotNull Integer userId;
    Integer documentId;
    String sessionTitle;
}
