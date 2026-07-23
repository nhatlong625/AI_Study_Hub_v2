package com.aistudyhub.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentTrashCleanupJob {
    private final DocumentService documentService;

    // Run daily at 02:30 in the application's configured time zone.
    @Scheduled(cron = "0 30 2 * * *")
    public void purgeExpiredDocuments() {
        int purged = documentService.purgeExpiredDocuments();
        if (purged > 0) {
            log.info("Permanently deleted {} documents that had been in Trash for 30 days.", purged);
        }
    }
}
