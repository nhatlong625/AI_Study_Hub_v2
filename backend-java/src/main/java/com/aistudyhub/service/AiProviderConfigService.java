package com.aistudyhub.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AiProviderConfigService {
    private final NamedParameterJdbcTemplate jdbc;
    private final AiConfigCryptoService crypto;
    private final WebClient rawPythonAiWebClient;

    public AiProviderConfigService(
            NamedParameterJdbcTemplate jdbc,
            AiConfigCryptoService crypto,
            @Qualifier("rawPythonAiWebClient") WebClient rawPythonAiWebClient) {
        this.jdbc = jdbc;
        this.crypto = crypto;
        this.rawPythonAiWebClient = rawPythonAiWebClient;
    }

    @PostConstruct
    public void ensureSchema() {
        jdbc.getJdbcTemplate().execute("""
            IF OBJECT_ID(N'dbo.AI_PROVIDER_CONFIG', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AI_PROVIDER_CONFIG (
                    config_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    provider NVARCHAR(30) NOT NULL UNIQUE,
                    model_name NVARCHAR(100) NOT NULL,
                    encrypted_api_key NVARCHAR(MAX) NULL,
                    key_hint NVARCHAR(20) NULL,
                    enabled BIT NOT NULL DEFAULT (1),
                    priority INT NOT NULL DEFAULT (100),
                    temperature DECIMAL(4,2) NOT NULL DEFAULT (0.30),
                    max_tokens INT NOT NULL DEFAULT (2048),
                    top_p DECIMAL(4,2) NOT NULL DEFAULT (1.00),
                    system_prompt NVARCHAR(MAX) NULL,
                    connection_status NVARCHAR(20) NOT NULL DEFAULT ('unknown'),
                    last_test_message NVARCHAR(500) NULL,
                    last_tested_at DATETIME2 NULL,
                    updated_by INT NULL,
                    updated_at DATETIME2 NOT NULL DEFAULT (SYSDATETIME())
                )
            END
            """);
        jdbc.getJdbcTemplate().execute("""
            IF COL_LENGTH('dbo.AI_PROVIDER_CONFIG', 'connection_status') IS NULL
                ALTER TABLE dbo.AI_PROVIDER_CONFIG ADD connection_status NVARCHAR(20) NOT NULL
                    CONSTRAINT DF_AI_PROVIDER_CONFIG_connection_status DEFAULT ('unknown')
            IF COL_LENGTH('dbo.AI_PROVIDER_CONFIG', 'last_test_message') IS NULL
                ALTER TABLE dbo.AI_PROVIDER_CONFIG ADD last_test_message NVARCHAR(500) NULL
            IF COL_LENGTH('dbo.AI_PROVIDER_CONFIG', 'last_tested_at') IS NULL
                ALTER TABLE dbo.AI_PROVIDER_CONFIG ADD last_tested_at DATETIME2 NULL
            """);
        jdbc.getJdbcTemplate().execute("""
            IF NOT EXISTS (SELECT 1 FROM dbo.AI_PROVIDER_CONFIG WHERE provider = 'OPENAI')
                INSERT INTO dbo.AI_PROVIDER_CONFIG (provider, model_name, enabled, priority)
                VALUES ('OPENAI', 'gpt-4o-mini', 1, 1)
            """);
        jdbc.getJdbcTemplate().execute("""
            IF NOT EXISTS (SELECT 1 FROM dbo.AI_PROVIDER_CONFIG WHERE provider = 'GEMINI')
                INSERT INTO dbo.AI_PROVIDER_CONFIG (provider, model_name, enabled, priority)
                VALUES ('GEMINI', 'gemini-2.5-flash', 1, 2)
            """);
        jdbc.getJdbcTemplate().execute("""
            IF NOT EXISTS (SELECT 1 FROM dbo.AI_PROVIDER_CONFIG WHERE provider = 'DEEPSEEK')
                INSERT INTO dbo.AI_PROVIDER_CONFIG (provider, model_name, enabled, priority)
                VALUES ('DEEPSEEK', 'deepseek-chat', 1, 3)
            """);
    }

    public List<Map<String, Object>> publicConfigs() {
        return jdbc.queryForList("""
            SELECT config_id AS id, LOWER(provider) AS provider, model_name AS model,
                   key_hint AS keyHint,
                   CASE WHEN encrypted_api_key IS NULL OR encrypted_api_key = '' THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END AS configured,
                   enabled, priority, temperature, max_tokens AS maxTokens, top_p AS topP,
                   COALESCE(system_prompt, '') AS systemPrompt,
                   COALESCE(connection_status, 'unknown') AS connectionStatus,
                   COALESCE(last_test_message, '') AS lastTestMessage,
                   last_tested_at AS lastTestedAt, updated_at AS updatedAt
            FROM dbo.AI_PROVIDER_CONFIG
            ORDER BY priority, config_id
            """, Map.of()).stream().map(row -> {
            Map<String, Object> result = new LinkedHashMap<>(row);
            result.put("masterKeyConfigured", crypto.isConfigured());
            return result;
        }).toList();
    }

    @Transactional
    public Map<String, Object> save(String providerValue, Map<String, Object> body, Integer updatedBy) {
        String provider = normalizeProvider(providerValue);
        String model = required(body, "model");
        String apiKey = normalizeApiKey(string(body.get("apiKey")));
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("provider", provider)
                .addValue("model", model)
                .addValue("enabled", bool(body.get("enabled"), true))
                .addValue("priority", integer(body.get("priority"), defaultPriority(provider)))
                .addValue("temperature", decimal(body.get("temperature"), new BigDecimal("0.30")))
                .addValue("maxTokens", integer(body.get("maxTokens"), 2048))
                .addValue("topP", decimal(body.get("topP"), BigDecimal.ONE))
                .addValue("systemPrompt", string(body.get("systemPrompt")))
                .addValue("updatedBy", updatedBy);

        if (!apiKey.isBlank()) {
            Map<String, Object> testResult = bestEffortTest(provider, apiKey, model);
            boolean connectionOk = Boolean.TRUE.equals(testResult.get("valid"));
            params.addValue("encryptedKey", crypto.encrypt(apiKey));
            params.addValue("keyHint", keyHint(apiKey));
            params.addValue("lastTestMessage", string(testResult.get("message")));
            params.addValue("connectionStatus", connectionOk ? "active" : "inactive");
            jdbc.update("""
                UPDATE dbo.AI_PROVIDER_CONFIG
                SET model_name = :model, encrypted_api_key = :encryptedKey, key_hint = :keyHint,
                    enabled = :enabled, priority = :priority, temperature = :temperature,
                    max_tokens = :maxTokens, top_p = :topP, system_prompt = :systemPrompt,
                    connection_status = :connectionStatus, last_test_message = :lastTestMessage, last_tested_at = SYSDATETIME(),
                    updated_by = :updatedBy, updated_at = SYSDATETIME()
                WHERE provider = :provider
                """, params);
        } else {
            jdbc.update("""
                UPDATE dbo.AI_PROVIDER_CONFIG
                SET model_name = :model, enabled = :enabled, priority = :priority,
                    temperature = :temperature, max_tokens = :maxTokens, top_p = :topP,
                    system_prompt = :systemPrompt, updated_by = :updatedBy, updated_at = SYSDATETIME()
                WHERE provider = :provider
                """, params);
        }
        return publicConfigs().stream()
                .filter(item -> provider.equals(String.valueOf(item.get("provider")).toUpperCase(Locale.ROOT)))
                .findFirst().orElseThrow();
    }

    private Map<String, Object> bestEffortTest(String provider, String apiKey, String model) {
        try {
            return test(provider, Map.of("apiKey", apiKey, "model", model));
        } catch (Exception ex) {
            return Map.of(
                    "valid", false,
                    "provider", provider.toLowerCase(Locale.ROOT),
                    "model", model,
                    "message", safeMessage(ex));
        }
    }

    public Map<String, Object> test(String providerValue, Map<String, Object> body) {
        String provider = normalizeProvider(providerValue);
        String model = string(body.get("model"));
        String candidateKey = normalizeApiKey(string(body.get("apiKey")));
        boolean testingSavedKey = candidateKey.isBlank();
        if (candidateKey.isBlank()) candidateKey = savedKey(provider);
        if (candidateKey.isBlank()) throw new IllegalArgumentException("Enter an API key before testing.");
        if (model.isBlank()) model = savedModel(provider);

        long started = System.nanoTime();
        try {
            Map<?, ?> response = rawPythonAiWebClient.post()
                    .uri("/internal/ai/test")
                    .header("X-AI-Provider-Order", provider.toLowerCase(Locale.ROOT))
                    .header("X-AI-" + provider + "-Key", candidateKey)
                    .header("X-AI-" + provider + "-Model", model)
                    .retrieve().bodyToMono(Map.class).block();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("valid", response != null && Boolean.TRUE.equals(response.get("valid")));
            result.put("provider", provider.toLowerCase(Locale.ROOT));
            result.put("model", model);
            result.put("latencyMs", (System.nanoTime() - started) / 1_000_000);
            result.put("message", response == null ? "No response from AI service." : response.get("message"));
            if (testingSavedKey) persistConnectionStatus(provider,
                    Boolean.TRUE.equals(result.get("valid")) ? "active" : "inactive",
                    string(result.get("message")));
            return result;
        } catch (Exception ex) {
            String message = safeMessage(ex);
            if (testingSavedKey) persistConnectionStatus(provider, "inactive", message);
            return Map.of(
                    "valid", false,
                    "provider", provider.toLowerCase(Locale.ROOT),
                    "model", model,
                    "latencyMs", (System.nanoTime() - started) / 1_000_000,
                    "message", message);
        }
    }

    @Transactional
    public Map<String, Object> clearKey(String providerValue, Integer updatedBy) {
        String provider = normalizeProvider(providerValue);
        jdbc.update("""
            UPDATE dbo.AI_PROVIDER_CONFIG
            SET encrypted_api_key = NULL,
                key_hint = NULL,
                enabled = 0,
                connection_status = 'unknown',
                last_test_message = 'API key cleared by admin.',
                last_tested_at = NULL,
                updated_by = :updatedBy,
                updated_at = SYSDATETIME()
            WHERE provider = :provider
            """, new MapSqlParameterSource()
                .addValue("provider", provider)
                .addValue("updatedBy", updatedBy));
        return publicConfigs().stream()
                .filter(item -> provider.equals(String.valueOf(item.get("provider")).toUpperCase(Locale.ROOT)))
                .findFirst().orElseThrow();
    }

    private void persistConnectionStatus(String provider, String status, String message) {
        jdbc.update("""
            UPDATE dbo.AI_PROVIDER_CONFIG
            SET connection_status = :status, last_test_message = :message, last_tested_at = SYSDATETIME()
            WHERE provider = :provider
            """, new MapSqlParameterSource()
                .addValue("provider", provider)
                .addValue("status", status)
                .addValue("message", message.length() > 500 ? message.substring(0, 500) : message));
    }

    public void applyRuntimeHeaders(HttpHeaders headers) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT provider, model_name AS model, encrypted_api_key AS encryptedKey,
                   temperature, max_tokens AS maxTokens, top_p AS topP,
                   COALESCE(system_prompt, '') AS systemPrompt
            FROM dbo.AI_PROVIDER_CONFIG
            WHERE enabled = 1 AND encrypted_api_key IS NOT NULL AND encrypted_api_key <> ''
              AND connection_status = 'active'
            ORDER BY priority, config_id
            """, Map.of());
        List<Map<String, Object>> usableRows = new java.util.ArrayList<>();
        for (Map<String, Object> row : rows) {
            String provider = String.valueOf(row.get("provider")).toUpperCase(Locale.ROOT);
            try {
                headers.set("X-AI-" + provider + "-Key", crypto.decrypt(string(row.get("encryptedKey"))));
                headers.set("X-AI-" + provider + "-Model", string(row.get("model")));
                usableRows.add(row);
            } catch (IllegalStateException ex) {
                persistConnectionStatus(provider, "inactive", ex.getMessage());
            }
        }
        headers.set("X-AI-Provider-Order", usableRows.stream()
                .map(row -> String.valueOf(row.get("provider")).toLowerCase(Locale.ROOT))
                .reduce((left, right) -> left + "," + right).orElse(""));
        if (!usableRows.isEmpty()) {
            Map<String, Object> active = usableRows.get(0);
            headers.set("X-AI-Temperature", string(active.get("temperature")));
            headers.set("X-AI-Max-Tokens", string(active.get("maxTokens")));
            headers.set("X-AI-Top-P", string(active.get("topP")));
            headers.set("X-AI-System-Prompt", string(active.get("systemPrompt")));
        }
    }

    private String savedKey(String provider) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT encrypted_api_key AS encryptedKey FROM dbo.AI_PROVIDER_CONFIG WHERE provider = :provider",
                Map.of("provider", provider));
        if (rows.isEmpty()) return "";
        try {
            return crypto.decrypt(string(rows.get(0).get("encryptedKey")));
        } catch (IllegalStateException ex) {
            persistConnectionStatus(provider, "inactive", ex.getMessage());
            return "";
        }
    }

    private String savedModel(String provider) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT model_name AS model FROM dbo.AI_PROVIDER_CONFIG WHERE provider = :provider",
                Map.of("provider", provider));
        return rows.isEmpty() ? "" : string(rows.get(0).get("model"));
    }

    private String normalizeProvider(String value) {
        String provider = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!provider.equals("OPENAI") && !provider.equals("GEMINI") && !provider.equals("DEEPSEEK")) {
            throw new IllegalArgumentException("Only OpenAI, Gemini and DeepSeek are supported.");
        }
        return provider;
    }

    private int defaultPriority(String provider) {
        return switch (provider) {
            case "OPENAI" -> 1;
            case "GEMINI" -> 2;
            default -> 3;
        };
    }

    private String required(Map<String, Object> body, String key) {
        String value = string(body.get(key));
        if (value.isBlank()) throw new IllegalArgumentException(key + " is required.");
        return value;
    }

    private String keyHint(String key) {
        int visible = Math.min(4, key.length());
        return "****" + key.substring(key.length() - visible);
    }

    private String normalizeApiKey(String key) {
        String cleaned = key == null ? "" : key
                .replace("\uFEFF", "")
                .replace("\u200B", "")
                .replace("\u200C", "")
                .replace("\u200D", "")
                .trim();
        cleaned = cleaned.replaceFirst("(?i)^Authorization\\s*:\\s*", "").trim();
        cleaned = cleaned.replaceFirst("(?i)^Bearer\\s+", "").trim();
        if ((cleaned.startsWith("\"") && cleaned.endsWith("\""))
                || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.substring(1, cleaned.length() - 1).trim();
        }
        int bearerIndex = cleaned.toLowerCase(Locale.ROOT).indexOf("bearer ");
        if (bearerIndex >= 0) {
            cleaned = cleaned.substring(bearerIndex + "bearer ".length()).trim();
        }
        String[] parts = cleaned.split("\\s+");
        return parts.length == 0 ? "" : parts[0].trim();
    }

    private String string(Object value) { return value == null ? "" : String.valueOf(value).trim(); }
    private boolean bool(Object value, boolean fallback) { return value == null ? fallback : Boolean.parseBoolean(String.valueOf(value)); }
    private int integer(Object value, int fallback) {
        try { return value == null ? fallback : Integer.parseInt(String.valueOf(value)); }
        catch (NumberFormatException ex) { return fallback; }
    }
    private BigDecimal decimal(Object value, BigDecimal fallback) {
        try { return value == null ? fallback : new BigDecimal(String.valueOf(value)); }
        catch (NumberFormatException ex) { return fallback; }
    }
    private String safeMessage(Exception ex) {
        String message = ex.getMessage() == null ? "AI service is unavailable." : ex.getMessage();
        return message.replaceAll("(?i)(sk-|AIza|AQ\\.)[A-Za-z0-9_\\-]+", "***");
    }
}
