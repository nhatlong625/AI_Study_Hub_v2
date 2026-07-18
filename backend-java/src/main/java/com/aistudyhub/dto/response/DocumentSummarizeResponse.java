package com.aistudyhub.dto.response;

public record DocumentSummarizeResponse(
        Integer documentId,
        String documentName,
        String summary,
        Integer chunkCount,
        Boolean usedMockAi,
        Boolean savedToDb
) {
}
