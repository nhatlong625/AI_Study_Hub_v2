package com.aistudyhub.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayDeque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class StorageSettingsService {
    private static final long SUPABASE_INCLUDED_BYTES = 1_000_000_000L;
    private static final long R2_INCLUDED_BYTES = 10_000_000_000L;
    private static final int LIST_PAGE_SIZE = 100;
    private static final Duration USAGE_CACHE_TTL = Duration.ofMinutes(2);

    private final JdbcTemplate jdbc;
    private final CloudflareR2StorageService cloudflareR2StorageService;
    private final WebClient supabaseWebClient;
    private final Object usageCacheLock = new Object();
    private volatile Map<String, Object> cachedUsage;
    private volatile Instant cachedUsageAt;

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.key:}")
    private String supabaseKey;

    @Value("${supabase.bucket:}")
    private String supabaseBucket;

    @Value("${storage.provider:SUPABASE}")
    private String defaultProvider;

    @PostConstruct
    public void ensureSchema() {
        jdbc.execute("""
            IF OBJECT_ID(N'dbo.STORAGE_SETTINGS', N'U') IS NULL
            CREATE TABLE dbo.STORAGE_SETTINGS (
                setting_id INT NOT NULL PRIMARY KEY CHECK (setting_id = 1),
                provider NVARCHAR(20) NOT NULL,
                updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                updated_by INT NULL
            )
            """);
        jdbc.update("""
            IF NOT EXISTS (SELECT 1 FROM dbo.STORAGE_SETTINGS WHERE setting_id = 1)
            INSERT INTO dbo.STORAGE_SETTINGS (setting_id, provider) VALUES (1, ?)
            """, normalize(defaultProvider));
    }

    public String provider() {
        try {
            String value = jdbc.queryForObject("SELECT provider FROM dbo.STORAGE_SETTINGS WHERE setting_id = 1", String.class);
            return normalize(value);
        } catch (Exception ignored) {
            return normalize(defaultProvider);
        }
    }

    public Map<String, Object> publicSettings() {
        String provider = provider();
        boolean r2Configured = cloudflareR2StorageService.isConfigured();
        return Map.of("provider", provider.toLowerCase(Locale.ROOT), "r2Configured", r2Configured);
    }

    public Map<String, Object> usage() {
        Map<String, Object> current = cachedUsage;
        Instant updatedAt = cachedUsageAt;
        if (current != null && updatedAt != null && updatedAt.plus(USAGE_CACHE_TTL).isAfter(Instant.now())) {
            return current;
        }
        synchronized (usageCacheLock) {
            current = cachedUsage;
            updatedAt = cachedUsageAt;
            if (current != null && updatedAt != null && updatedAt.plus(USAGE_CACHE_TTL).isAfter(Instant.now())) {
                return current;
            }
            current = calculateUsage();
            cachedUsage = current;
            cachedUsageAt = Instant.now();
            return current;
        }
    }

    private Map<String, Object> calculateUsage() {
        Map<String, Object> supabase = supabaseUsage();
        Map<String, Object> r2 = r2Usage();

        long actualBytes = longValue(supabase.get("usedBytes")) + longValue(r2.get("usedBytes"));
        long actualObjects = longValue(supabase.get("objectCount")) + longValue(r2.get("objectCount"));
        long includedBytes = SUPABASE_INCLUDED_BYTES + R2_INCLUDED_BYTES;

        Map<String, Object> tracked = jdbc.queryForObject("""
                SELECT COALESCE(SUM(COALESCE(document_size, 0)), 0) AS usedBytes,
                       COUNT(*) AS objectCount
                FROM dbo.DOCUMENT
                WHERE document_url IS NOT NULL
                """, (rs, rowNum) -> Map.of(
                "usedBytes", rs.getLong("usedBytes"),
                "objectCount", rs.getLong("objectCount")
        ));

        Map<String, Object> total = new LinkedHashMap<>();
        total.put("usedBytes", actualBytes);
        total.put("includedBytes", includedBytes);
        total.put("objectCount", actualObjects);
        total.put("percent", includedBytes == 0 ? 0D : Math.min(100D, actualBytes * 100D / includedBytes));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("activeProvider", provider().toLowerCase(Locale.ROOT));
        result.put("total", total);
        result.put("supabase", supabase);
        result.put("r2", r2);
        result.put("database", tracked == null ? Map.of("usedBytes", 0L, "objectCount", 0L) : tracked);
        result.put("checkedAt", java.time.OffsetDateTime.now().toString());
        return result;
    }

    @Transactional
    public Map<String, Object> save(String value, Integer updatedBy) {
        String provider = normalize(value);
        if ("R2".equals(provider) && !Boolean.TRUE.equals(publicSettings().get("r2Configured"))) {
            throw new IllegalArgumentException("Cloudflare R2 is not configured in the backend environment. Set credentials in .env first.");
        }
        jdbc.update("UPDATE dbo.STORAGE_SETTINGS SET provider = ?, updated_at = SYSDATETIME(), updated_by = ? WHERE setting_id = 1", provider, updatedBy);
        cachedUsage = null;
        cachedUsageAt = null;
        return publicSettings();
    }

    private String normalize(String value) {
        String provider = value == null ? "SUPABASE" : value.trim().toUpperCase(Locale.ROOT);
        if (!provider.equals("SUPABASE") && !provider.equals("R2")) throw new IllegalArgumentException("Storage provider must be Supabase or Cloudflare R2.");
        return provider;
    }

    private Map<String, Object> supabaseUsage() {
        boolean configured = notBlank(supabaseUrl) && notBlank(supabaseKey) && notBlank(supabaseBucket);
        if (!configured) return providerUsage(false, false, 0L, 0L, SUPABASE_INCLUDED_BYTES, "Not configured");

        try {
            long bytes = 0L;
            long objects = 0L;
            ArrayDeque<String> prefixes = new ArrayDeque<>();
            prefixes.add("");
            while (!prefixes.isEmpty()) {
                String prefix = prefixes.removeFirst();
                for (int offset = 0; ; offset += LIST_PAGE_SIZE) {
                    List<Map<String, Object>> items = supabaseWebClient.post()
                            .uri("/storage/v1/object/list/" + supabaseBucket)
                            .header("apikey", supabaseKey)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(Map.of(
                                    "prefix", prefix,
                                    "limit", LIST_PAGE_SIZE,
                                    "offset", offset,
                                    "sortBy", Map.of("column", "name", "order", "asc")
                            ))
                            .retrieve()
                            .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                            .block();
                    if (items == null || items.isEmpty()) break;
                    for (Map<String, Object> item : items) {
                        Object metadataValue = item.get("metadata");
                        if (metadataValue instanceof Map<?, ?> metadata) {
                            bytes += longValue(metadata.get("size"));
                            objects++;
                        } else {
                            String name = String.valueOf(item.getOrDefault("name", "")).trim();
                            if (!name.isEmpty()) prefixes.add(prefix.isEmpty() ? name : prefix + "/" + name);
                        }
                    }
                    if (items.size() < LIST_PAGE_SIZE) break;
                }
            }
            return providerUsage(true, true, bytes, objects, SUPABASE_INCLUDED_BYTES, null);
        } catch (Exception exception) {
            return providerUsage(true, false, 0L, 0L, SUPABASE_INCLUDED_BYTES, rootMessage(exception));
        }
    }

    private Map<String, Object> r2Usage() {
        if (!cloudflareR2StorageService.isConfigured()) {
            return providerUsage(false, false, 0L, 0L, R2_INCLUDED_BYTES, "Not configured");
        }
        try {
            CloudflareR2StorageService.StorageUsage usage = cloudflareR2StorageService.getUsage();
            return providerUsage(true, true, usage.usedBytes(), usage.objectCount(), R2_INCLUDED_BYTES, null);
        } catch (Exception exception) {
            return providerUsage(true, false, 0L, 0L, R2_INCLUDED_BYTES, rootMessage(exception));
        }
    }

    private Map<String, Object> providerUsage(boolean configured, boolean reachable, long usedBytes,
                                              long objectCount, long includedBytes, String error) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("configured", configured);
        result.put("reachable", reachable);
        result.put("usedBytes", usedBytes);
        result.put("objectCount", objectCount);
        result.put("includedBytes", includedBytes);
        result.put("percent", includedBytes == 0 ? 0D : Math.min(100D, usedBytes * 100D / includedBytes));
        if (error != null && !error.isBlank()) result.put("error", error);
        return result;
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private long longValue(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private String rootMessage(Exception exception) {
        Throwable cause = exception;
        while (cause.getCause() != null) cause = cause.getCause();
        String message = cause.getMessage();
        return message == null || message.isBlank() ? "Connection failed" : message;
    }
}
