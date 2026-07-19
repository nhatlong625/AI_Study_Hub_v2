package com.aistudyhub.controller;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;
@RestController
@RequestMapping("/api/health")
public class HealthController {
    @GetMapping
    public ResponseEntity<Map<String,Object>> health() {
        return ResponseEntity.ok(Map.of("status","UP","timestamp", LocalDateTime.now().toString()));
    }
}
