package com.aistudyhub.service;

import com.aistudyhub.dto.request.DocumentSummarizeRequest;
import com.aistudyhub.event.DocumentUploadedEvent;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
@RequiredArgsConstructor
public class DocumentSummaryJobService {
    private static final Logger log = LoggerFactory.getLogger(DocumentSummaryJobService.class);

    private final DocumentService documentService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void summarizeAfterUpload(DocumentUploadedEvent event) {
        try {
            DocumentSummarizeRequest request = new DocumentSummarizeRequest();
            request.setDocumentId(event.documentId());
            request.setUserId(event.userId());
            documentService.summarize(request);
        } catch (Exception ex) {
            log.warn("Background summary failed for document {}: {}", event.documentId(), ex.getMessage());
        }
    }
}
