package com.aistudyhub.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;

/** Body cho POST /api/documents/{id}/summarize â€” Java tá»± láº¥y ná»™i dung tÃ i liá»‡u, khÃ´ng cáº§n FE gá»­i text. */
@Data
public class DocumentSummarizeRequest {
    @NotNull Integer documentId;
    Integer userId;
    @Min(1) @Max(30) Integer maxChunks;
}
