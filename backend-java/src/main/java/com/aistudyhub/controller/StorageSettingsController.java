package com.aistudyhub.controller;

import com.aistudyhub.entity.User;
import com.aistudyhub.service.StorageSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/storage-settings")
@RequiredArgsConstructor
public class StorageSettingsController {
    private final StorageSettingsService service;

    @GetMapping
    public Map<String, Object> get() { return service.publicSettings(); }

    @PutMapping
    public Map<String, Object> save(@RequestBody Map<String, Object> body, Authentication authentication) {
        Integer userId = authentication != null && authentication.getPrincipal() instanceof User user ? user.getUserId() : null;
        return service.save(String.valueOf(body.get("provider")), userId);
    }
}
