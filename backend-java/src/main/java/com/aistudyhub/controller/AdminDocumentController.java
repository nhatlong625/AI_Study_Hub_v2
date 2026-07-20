package com.aistudyhub.controller;

import com.aistudyhub.dto.response.AdminDocumentResponse;
import com.aistudyhub.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin duyệt document (B2). TODO (B1): thêm role guard ADMIN khi JWT được
 * integrate vào FE — hiện tạm permitAll ở SecurityConfig giống các module khác.
 */
@RestController
@RequestMapping("/api/admin/documents")
@RequiredArgsConstructor
public class AdminDocumentController {

    private final DocumentService documentService;

    /** Danh sách document đang PENDING_REVIEW — hàng đợi duyệt. */
    @GetMapping("/pending")
    public ResponseEntity<List<AdminDocumentResponse>> getPending() {
        return ResponseEntity.ok(documentService.getPendingForAdmin());
    }

    /** Duyệt — set PUBLIC. */
    @PostMapping("/{id}/approve")
    public ResponseEntity<AdminDocumentResponse> approve(@PathVariable Integer id) {
        return ResponseEntity.ok(documentService.approveDocument(id));
    }

    /** Từ chối — set PRIVATE + cooldown 1h (updated_at = now()), dùng chung cơ chế với updateVisibility(). */
    @PostMapping("/{id}/reject")
    public ResponseEntity<AdminDocumentResponse> reject(
            @PathVariable Integer id,
            @RequestParam(required = false, defaultValue = "") String reason) {
        return ResponseEntity.ok(documentService.rejectDocument(id, reason));
    }
}
