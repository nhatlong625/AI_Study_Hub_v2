package com.aistudyhub.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StorageSettingsService {
    private final JdbcTemplate jdbc;
    private final CloudflareR2StorageService cloudflareR2StorageService;

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

    @Transactional
    public Map<String, Object> save(String value, Integer updatedBy) {
        String provider = normalize(value);
        if ("R2".equals(provider) && !Boolean.TRUE.equals(publicSettings().get("r2Configured"))) {
            throw new IllegalArgumentException("Cloudflare R2 is not configured in the backend environment. Set credentials in .env first.");
        }
        jdbc.update("UPDATE dbo.STORAGE_SETTINGS SET provider = ?, updated_at = SYSDATETIME(), updated_by = ? WHERE setting_id = 1", provider, updatedBy);
        return publicSettings();
    }

    private String normalize(String value) {
        String provider = value == null ? "SUPABASE" : value.trim().toUpperCase(Locale.ROOT);
        if (!provider.equals("SUPABASE") && !provider.equals("R2")) throw new IllegalArgumentException("Storage provider must be Supabase or Cloudflare R2.");
        return provider;
    }
}
