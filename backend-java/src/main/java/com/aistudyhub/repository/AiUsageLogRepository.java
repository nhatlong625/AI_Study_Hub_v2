package com.aistudyhub.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Map;

@Repository
public class AiUsageLogRepository {

    private final JdbcTemplate jdbc;

    public AiUsageLogRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        ensureTable();
    }

    private void ensureTable() {
        jdbc.execute("""
            IF OBJECT_ID(N'dbo.AI_USAGE_LOG', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AI_USAGE_LOG (
                    usage_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    user_id INT NULL,
                    feature NVARCHAR(30) NOT NULL,
                    provider NVARCHAR(30) NULL,
                    model_name NVARCHAR(100) NULL,
                    prompt_tokens INT NULL,
                    completion_tokens INT NULL,
                    total_tokens INT NULL,
                    estimated BIT NOT NULL DEFAULT 0,
                    document_id INT NULL,
                    session_id INT NULL,
                    context_count INT NULL,
                    context_chars INT NULL,
                    cache_hit BIT NOT NULL DEFAULT 0,
                    success BIT NOT NULL DEFAULT 1,
                    error_message NVARCHAR(500) NULL,
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                )
            END
            """);
    }

    public void save(
            Integer userId,
            String feature,
            Map<String, Object> usage,
            Integer documentId,
            Integer sessionId,
            Integer contextCount,
            Integer contextChars,
            boolean cacheHit,
            boolean success,
            String errorMessage
    ) {
        jdbc.update("""
            INSERT INTO dbo.AI_USAGE_LOG (
                user_id, feature, provider, model_name, prompt_tokens, completion_tokens, total_tokens,
                estimated, document_id, session_id, context_count, context_chars, cache_hit, success,
                error_message, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            userId,
            feature,
            string(usage, "provider"),
            string(usage, "model_name"),
            integer(usage, "prompt_tokens"),
            integer(usage, "completion_tokens"),
            integer(usage, "total_tokens"),
            bool(usage, "estimated") ? 1 : 0,
            documentId,
            sessionId,
            contextCount,
            contextChars,
            cacheHit ? 1 : 0,
            success ? 1 : 0,
            clip(errorMessage),
            LocalDateTime.now());
    }

    private String string(Map<String, Object> usage, String key) {
        if (usage == null || usage.get(key) == null) return null;
        String value = String.valueOf(usage.get(key));
        return value.isBlank() ? null : value;
    }

    private Integer integer(Map<String, Object> usage, String key) {
        if (usage == null) return null;
        Object value = usage.get(key);
        if (value instanceof Number number) return number.intValue();
        try {
            return value == null ? null : Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean bool(Map<String, Object> usage, String key) {
        if (usage == null) return false;
        Object value = usage.get(key);
        if (value instanceof Boolean bool) return bool;
        return "true".equalsIgnoreCase(String.valueOf(value));
    }

    private String clip(String value) {
        if (value == null || value.isBlank()) return null;
        return value.length() > 500 ? value.substring(0, 500) : value;
    }
}
