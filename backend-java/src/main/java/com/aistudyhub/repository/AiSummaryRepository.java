package com.aistudyhub.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class AiSummaryRepository {
    private final JdbcTemplate jdbcTemplate;

    public AiSummaryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> findLatestFullFileSummary(Integer documentId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                "SELECT TOP 1 content FROM AI_SUMMARY WHERE document_id = ? ORDER BY created_at DESC",
                String.class, documentId
            ));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<String> findLatestFullFileSummary(Integer documentId, Integer userId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                "SELECT TOP 1 content FROM AI_SUMMARY WHERE document_id = ? AND user_id = ? ORDER BY created_at DESC",
                String.class, documentId, userId
            ));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public void save(Integer documentId, Integer userId, String summary, String type) {
        jdbcTemplate.update(
            "INSERT INTO AI_SUMMARY (document_id, user_id, content, type, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
            documentId, userId, summary, type
        );
    }

    public void deleteByDocumentId(Integer documentId) {
        jdbcTemplate.update("DELETE FROM AI_SUMMARY WHERE document_id = ?", documentId);
    }

    public java.util.List<com.aistudyhub.model.SummaryHit> findForChatContext(Integer userId, java.util.List<Integer> subjectIds, java.util.List<Integer> documentIds) {
        return java.util.Collections.emptyList();
    }
}
