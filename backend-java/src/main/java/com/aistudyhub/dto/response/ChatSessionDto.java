package com.aistudyhub.dto.response;
import java.time.LocalDateTime;
public record ChatSessionDto(Integer sessionId, Integer userId, Integer documentId,
                              String sessionTitle, LocalDateTime createdAt, LocalDateTime updatedAt) {}
