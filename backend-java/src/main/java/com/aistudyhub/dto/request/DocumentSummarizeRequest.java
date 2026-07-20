package com.aistudyhub.dto.request;

import lombok.Data;

@Data
public class DocumentSummarizeRequest {
    private Integer documentId;
    private Integer userId;
    private Integer maxChunks;
}
