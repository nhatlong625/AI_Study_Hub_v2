package com.aistudyhub.dto.response;
import java.time.LocalDateTime;
public record ChatMessageDto(Integer messageId, Integer sessionId, String role,
                              String content, LocalDateTime createdAt,
                              String sourcesJson) {}
