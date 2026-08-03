package com.aistudyhub.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/majors")
@RequiredArgsConstructor
public class MajorController {

    private final JdbcTemplate jdbc;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllMajors() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT major_id, major_name, description
                FROM dbo.MAJOR
                ORDER BY major_name ASC
                """);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new HashMap<>();
            Object idObj = row.get("major_id") != null ? row.get("major_id") : row.get("MAJOR_ID");
            Object nameObj = row.get("major_name") != null ? row.get("major_name") : row.get("MAJOR_NAME");
            Object descObj = row.get("description") != null ? row.get("description") : row.get("DESCRIPTION");

            item.put("majorId", idObj);
            item.put("majorName", nameObj != null ? nameObj.toString() : "");
            item.put("description", descObj != null ? descObj.toString() : "");
            item.put("isActive", true);
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }
}
