package com.aistudyhub.controller;

import com.aistudyhub.dto.quiz.PracticeTestGenerateRequest;
import com.aistudyhub.dto.quiz.PracticeTestSubmitRequest;
import com.aistudyhub.dto.quiz.SaveProgressRequest;
import com.aistudyhub.service.PracticeTestService;
import com.aistudyhub.security.CurrentUser;
import com.aistudyhub.service.DocumentService;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/practice-tests")
@RequiredArgsConstructor
public class PracticeTestController {
    private final PracticeTestService practiceTestService;
    private final CurrentUser currentUser;
    private final DocumentService documentService;
    private final NamedParameterJdbcTemplate jdbc;

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "1") Integer userId) {
        return practiceTestService.list(currentUser.id());
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable Integer id) {
        requireTestOwner(id);
        return practiceTestService.get(id);
    }

    /** Lấy quiz đang làm dở — dùng cho "Continue Learning" section */
    @GetMapping("/in-progress")
    public List<Map<String, Object>> getInProgress(@RequestParam(defaultValue = "1") Integer userId) {
        return practiceTestService.getInProgress(currentUser.id());
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@Valid @RequestBody PracticeTestGenerateRequest request) {
        request.setUserId(currentUser.id());
        documentService.requireOwner(request.getDocumentId(), currentUser.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(practiceTestService.generate(request));
    }

    /** Auto-save progress khi user đang làm quiz — gọi mỗi khi chuyển câu */
    @PatchMapping("/{id}/progress")
    public Map<String, Object> saveProgress(
            @PathVariable Integer id,
            @RequestBody SaveProgressRequest request) {
        request.setUserId(currentUser.id());
        requireTestOwner(id);
        return practiceTestService.saveProgress(id, request);
    }

    @PostMapping("/{id}/submit")
    public Map<String, Object> submit(@PathVariable Integer id, @RequestBody PracticeTestSubmitRequest request) {
        request.setUserId(currentUser.id());
        requireTestOwner(id);
        return practiceTestService.submit(id, request);
    }

    /** Lấy kết quả chi tiết của 1 lần làm bài — dùng cho Result page */
    @GetMapping("/attempts/{attemptId}/result")
    public Map<String, Object> getResult(@PathVariable Integer attemptId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM dbo.TEST_ATTEMPT WHERE attempt_id=:attemptId AND user_id=:userId
            """, Map.of("attemptId", attemptId, "userId", currentUser.id()), Integer.class);
        if (count == null || count == 0) throw new AccessDeniedException("You cannot access this test attempt.");
        return practiceTestService.getResult(attemptId);
    }

    private void requireTestOwner(Integer testId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM dbo.AI_QUESTION aq
            JOIN dbo.DOCUMENT d ON d.document_id=aq.document_id
            WHERE aq.question_id=:testId AND d.user_id=:userId
            """, Map.of("testId", testId, "userId", currentUser.id()), Integer.class);
        if (count == null || count == 0) throw new AccessDeniedException("You cannot access this practice test.");
    }
}
