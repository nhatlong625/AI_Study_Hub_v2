package com.aistudyhub.controller;

import com.aistudyhub.dto.response.SemesterResponse;
import com.aistudyhub.service.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/semesters")
@RequiredArgsConstructor
public class SemesterController {
    private final SemesterService semesterService;

    @GetMapping
    public ResponseEntity<List<SemesterResponse>> getAll(@RequestParam(required = false) Integer majorId) {
        if (majorId != null && majorId > 0) {
            return ResponseEntity.ok(semesterService.getSemestersByMajor(majorId));
        }
        return ResponseEntity.ok(semesterService.getAllSemesters());
    }
}
