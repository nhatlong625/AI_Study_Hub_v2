package com.aistudyhub.controller;

import com.aistudyhub.entity.Subject;
import com.aistudyhub.service.SubjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {
    private final SubjectService subjectService;

    @GetMapping("/semester/{semesterId}")
    public ResponseEntity<List<Subject>> getBySemester(@PathVariable Integer semesterId) {
        return ResponseEntity.ok(subjectService.getBySemester(semesterId));
    }

    @PostMapping
    public ResponseEntity<Subject> add(@RequestParam Integer semesterId,
                                       @RequestParam String subjectName,
                                       @RequestParam(required = false) String subjectCode,
                                       @RequestParam(required = false) String description) {
        return ResponseEntity.ok(subjectService.addSubject(semesterId, subjectName, subjectCode, description));
    }

    @DeleteMapping("/{subjectId}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Integer subjectId) {
        subjectService.deleteSubject(subjectId);
        return ResponseEntity.ok(new MessageResponse("Subject deleted"));
    }

    record MessageResponse(String message) {}
}
