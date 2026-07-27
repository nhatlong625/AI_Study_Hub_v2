package com.aistudyhub.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class AiConfigCryptoService {
    private static final String VERSION = "v1:";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom secureRandom = new SecureRandom();
    private final String masterKey;
    private final String legacyMasterKey;

    public AiConfigCryptoService(
            @Value("${ai.config.master-key:}") String masterKey,
            @Value("${ai.config.legacy-master-key:}") String legacyMasterKey) {
        this.masterKey = masterKey == null ? "" : masterKey.trim();
        this.legacyMasterKey = legacyMasterKey == null ? "" : legacyMasterKey.trim();
    }

    public boolean isConfigured() {
        return masterKey.length() >= 32;
    }

    public String encrypt(String plainText) {
        requireMasterKey();
        try {
            byte[] iv = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] payload = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
            return VERSION + Base64.getEncoder().encodeToString(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not encrypt AI API key.", ex);
        }
    }

    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank()) return "";
        requireMasterKey();
        Exception primaryFailure = null;
        try {
            return decryptWithKey(encryptedValue, masterKey);
        } catch (Exception ex) {
            primaryFailure = ex;
        }

        if (legacyMasterKey.length() >= 32) {
            try {
                return decryptWithKey(encryptedValue, legacyMasterKey);
            } catch (Exception ignored) {
                // Fall through to the actionable error below.
            }
        }

        throw new IllegalStateException(
                "Could not decrypt AI API key. Check AI_CONFIG_MASTER_KEY, or set AI_CONFIG_LEGACY_MASTER_KEY temporarily for keys saved with an older master key.",
                primaryFailure);
    }

    private SecretKeySpec secretKey() throws Exception {
        return secretKey(masterKey);
    }

    private String decryptWithKey(String encryptedValue, String key) throws Exception {
        String encoded = encryptedValue.startsWith(VERSION)
                ? encryptedValue.substring(VERSION.length()) : encryptedValue;
        byte[] payload = Base64.getDecoder().decode(encoded);
        byte[] iv = new byte[IV_BYTES];
        byte[] encrypted = new byte[payload.length - IV_BYTES];
        System.arraycopy(payload, 0, iv, 0, IV_BYTES);
        System.arraycopy(payload, IV_BYTES, encrypted, 0, encrypted.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secretKey(key), new GCMParameterSpec(TAG_BITS, iv));
        return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    }

    private SecretKeySpec secretKey(String key) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(key.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(digest, "AES");
    }

    private void requireMasterKey() {
        if (!isConfigured()) {
            throw new IllegalStateException("AI_CONFIG_MASTER_KEY must contain at least 32 characters.");
        }
    }
}
