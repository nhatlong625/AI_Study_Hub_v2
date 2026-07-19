package com.aistudyhub.dto.response;
import lombok.*;
@Data @AllArgsConstructor
public class MessageResponse {
    private String message;
    public static MessageResponse ok(String msg) { return new MessageResponse(msg); }
}
