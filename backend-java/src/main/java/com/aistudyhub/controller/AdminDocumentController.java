package com.aistudyhub.controller;

import com.aistudyhub.dto.response.AdminDocumentResponse;
import com.aistudyhub.dto.response.TrashDocumentResponse;
import com.aistudyhub.service.DocumentService;
import com.aistudyhub.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
    private final CurrentUser currentUser;

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

    @GetMapping("/trash")
    public ResponseEntity<List<TrashDocumentResponse>> getTrash() {
        return ResponseEntity.ok(documentService.getTrashForAdmin());
    }

    @GetMapping("/trash/{id}/preview")
    public ResponseEntity<ByteArrayResource> previewTrash(@PathVariable Integer id) {
        DocumentService.DocumentFile file = documentService.getTrashFile(id, currentUser.id(), true);
        String safeName = file.fileName() == null ? "document" : file.fileName().replace("\"", "");
        return ResponseEntity.ok()
                .contentType(file.mediaType() == null ? MediaType.APPLICATION_OCTET_STREAM : file.mediaType())
                .contentLength(file.bytes().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + safeName + "\"")
                .body(new ByteArrayResource(file.bytes()));
    }

    @PostMapping("/trash/{id}/restore")
    public ResponseEntity<TrashDocumentResponse> restore(@PathVariable Integer id) {
        return ResponseEntity.ok(documentService.restore(id, currentUser.id(), true));
    }

    @DeleteMapping("/trash/{id}")
    public ResponseEntity<Void> purge(@PathVariable Integer id) {
        documentService.purge(id, currentUser.id(), true);
        return ResponseEntity.noContent().build();
    }
}
