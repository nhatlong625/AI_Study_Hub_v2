package com.aistudyhub.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class AiQueryTranslationCacheRepository {

    private final JdbcTemplate jdbc;

    public AiQueryTranslationCacheRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        ensureTable();
    }

    private void ensureTable() {
        jdbc.execute("""
            IF OBJECT_ID(N'dbo.AI_QUERY_TRANSLATION_CACHE', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AI_QUERY_TRANSLATION_CACHE (
                    cache_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    cache_key CHAR(64) NOT NULL UNIQUE,
                    original_query NVARCHAR(1000) NOT NULL,
                    translated_query NVARCHAR(1000) NOT NULL,
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                    last_used_at DATETIME2 NULL,
                    hit_count INT NOT NULL DEFAULT 0
                )
            END
            """);
    }

    public Optional<String> find(String cacheKey) {
        List<String> rows = jdbc.query("""
            SELECT TOP 1 translated_query
            FROM dbo.AI_QUERY_TRANSLATION_CACHE
            WHERE cache_key = ?
            """, (rs, rowNum) -> rs.getString("translated_query"), cacheKey);

        if (!rows.isEmpty()) {
            jdbc.update("""
                UPDATE dbo.AI_QUERY_TRANSLATION_CACHE
                SET hit_count = hit_count + 1, last_used_at = ?
                WHERE cache_key = ?
                """, LocalDateTime.now(), cacheKey);
        }
        return rows.stream().findFirst();
    }

    public void save(String cacheKey, String originalQuery, String translatedQuery) {
        jdbc.update("""
            IF EXISTS (SELECT 1 FROM dbo.AI_QUERY_TRANSLATION_CACHE WHERE cache_key = ?)
                UPDATE dbo.AI_QUERY_TRANSLATION_CACHE
                SET translated_query = ?, last_used_at = ?
                WHERE cache_key = ?
            ELSE
                INSERT INTO dbo.AI_QUERY_TRANSLATION_CACHE (cache_key, original_query, translated_query, created_at)
                VALUES (?, ?, ?, ?)
            """,
            cacheKey, translatedQuery, LocalDateTime.now(), cacheKey,
            cacheKey, clip(originalQuery), clip(translatedQuery), LocalDateTime.now());
    }

    private String clip(String value) {
        String normalized = value == null ? "" : value;
        return normalized.length() > 1000 ? normalized.substring(0, 1000) : normalized;
    }
}
