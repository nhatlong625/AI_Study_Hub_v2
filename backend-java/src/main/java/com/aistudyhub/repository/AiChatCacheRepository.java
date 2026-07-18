package com.aistudyhub.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class AiChatCacheRepository {

    private final JdbcTemplate jdbc;

    public AiChatCacheRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        ensureTable();
    }

    private void ensureTable() {
        jdbc.execute("""
            IF OBJECT_ID(N'dbo.AI_CHAT_CACHE', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AI_CHAT_CACHE (
                    cache_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    cache_key CHAR(64) NOT NULL UNIQUE,
                    user_id INT NULL,
                    answer NVARCHAR(MAX) NOT NULL,
                    sources_json NVARCHAR(MAX) NULL,
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                    last_used_at DATETIME2 NULL,
                    hit_count INT NOT NULL DEFAULT 0
                )
            END
            """);
    }

    public Optional<CacheEntry> find(String cacheKey) {
        List<CacheEntry> rows = jdbc.query("""
            SELECT TOP 1 answer, sources_json
            FROM dbo.AI_CHAT_CACHE
            WHERE cache_key = ?
            """, (rs, rowNum) -> new CacheEntry(
                rs.getString("answer"),
                rs.getString("sources_json")
            ), cacheKey);

        if (!rows.isEmpty()) {
            jdbc.update("""
                UPDATE dbo.AI_CHAT_CACHE
                SET hit_count = hit_count + 1, last_used_at = ?
                WHERE cache_key = ?
                """, LocalDateTime.now(), cacheKey);
        }
        return rows.stream().findFirst();
    }

    public void save(String cacheKey, Integer userId, String answer, String sourcesJson) {
        jdbc.update("""
            IF EXISTS (SELECT 1 FROM dbo.AI_CHAT_CACHE WHERE cache_key = ?)
                UPDATE dbo.AI_CHAT_CACHE
                SET answer = ?, sources_json = ?, last_used_at = ?
                WHERE cache_key = ?
            ELSE
                INSERT INTO dbo.AI_CHAT_CACHE (cache_key, user_id, answer, sources_json, created_at)
                VALUES (?, ?, ?, ?, ?)
            """,
            cacheKey, answer, sourcesJson, LocalDateTime.now(), cacheKey,
            cacheKey, userId, answer, sourcesJson, LocalDateTime.now());
    }

    public record CacheEntry(String answer, String sourcesJson) {}
}
