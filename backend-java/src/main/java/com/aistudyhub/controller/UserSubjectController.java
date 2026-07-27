package com.aistudyhub.controller;

import com.aistudyhub.dto.response.UserSubjectResponse;
import com.aistudyhub.service.DocumentService;
import com.aistudyhub.service.UserSubjectService;
import com.aistudyhub.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-subjects")
@RequiredArgsConstructor
public class UserSubjectController {

    private final UserSubjectService userSubjectService;
    private final DocumentService documentService;
    private final CurrentUser currentUser;

    /** Danh sách subject mà user đã add vào Library — dùng để render Library page. */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<UserSubjectResponse>> getByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(userSubjectService.getByUser(currentUser.id()));
    }

    /** Gọi khi bấm "Create" trong modal Create Course — 409 nếu đã add rồi. */
    @PostMapping
    public ResponseEntity<UserSubjectResponse> add(@RequestParam Integer userId,
                                                    @RequestParam Integer subjectId) {
        return ResponseEntity.ok(userSubjectService.add(currentUser.id(), subjectId));
    }

    /**
     * Gọi khi user bấm Delete ở action menu (Library page) — xóa toàn bộ
     * document của user trong subject này (kèm file Supabase), rồi xóa
     * luôn link USER_SUBJECT để subject biến mất khỏi Library.
     */
    @DeleteMapping
    public ResponseEntity<Void> remove(@RequestParam Integer userId,
                                       @RequestParam Integer subjectId) {
        Integer authenticatedUserId = currentUser.id();
        documentService.deleteAllByUserAndSubject(authenticatedUserId, subjectId);
        userSubjectService.removeLink(authenticatedUserId, subjectId);
        return ResponseEntity.noContent().build();
    }
}
