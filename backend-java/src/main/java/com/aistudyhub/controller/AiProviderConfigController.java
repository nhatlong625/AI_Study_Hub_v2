package com.aistudyhub.controller;

import com.aistudyhub.entity.User;
import com.aistudyhub.service.AiProviderConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai-config")
@RequiredArgsConstructor
public class AiProviderConfigController {
    private final AiProviderConfigService service;

    @GetMapping
    public List<Map<String, Object>> getConfigs() {
        return service.publicConfigs();
    }

    @PutMapping("/{provider}")
    public Map<String, Object> save(
            @PathVariable String provider,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        Integer userId = authentication != null && authentication.getPrincipal() instanceof User user
                ? user.getUserId() : null;
        return service.save(provider, body, userId);
    }

    @PostMapping("/{provider}/test")
    public ResponseEntity<Map<String, Object>> test(
            @PathVariable String provider,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> result = service.test(provider, body);
        return Boolean.TRUE.equals(result.get("valid"))
                ? ResponseEntity.ok(result)
                : ResponseEntity.unprocessableEntity().body(result);
    }

    @DeleteMapping("/{provider}/key")
    public Map<String, Object> clearKey(@PathVariable String provider, Authentication authentication) {
        Integer userId = authentication != null && authentication.getPrincipal() instanceof User user
                ? user.getUserId() : null;
        return service.clearKey(provider, userId);
    }
}
