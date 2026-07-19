package com.aistudyhub.controller;

import com.aistudyhub.dto.request.DocumentSummarizeRequest;
import com.aistudyhub.dto.request.ShareWithUserRequest;
import com.aistudyhub.dto.response.DocumentShareResponse;
import com.aistudyhub.dto.response.DocumentResponse;
import com.aistudyhub.dto.response.DocumentSummarizeResponse;
import com.aistudyhub.dto.response.UserShareResponse;
import com.aistudyhub.service.DocumentService;
import com.aistudyhub.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final CurrentUser currentUser;

    /** Upload file lên Supabase + lưu metadata DB */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("subjectId") Integer subjectId,
            @RequestParam(value = "userId", required = false) Integer ignoredUserId,
            @RequestParam(value = "visibilityStatus", defaultValue = "PRIVATE") String visibility) throws Exception {
        return ResponseEntity.ok(documentService.upload(file, title, subjectId, currentUser.id(), visibility));
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getAll() {
        return ResponseEntity.ok(documentService.getByUser(currentUser.id()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getById(@PathVariable Integer id) {
        documentService.requireReadable(id, currentUser.id());
        return ResponseEntity.ok(documentService.getById(id));
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<ByteArrayResource> preview(@PathVariable Integer id) {
        documentService.requireReadable(id, currentUser.id());
        return fileResponse(documentService.getFile(id), false);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<ByteArrayResource> download(@PathVariable Integer id) {
        documentService.requireReadable(id, currentUser.id());
        return fileResponse(documentService.getFile(id), true);
    }

    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<List<DocumentResponse>> getBySubject(@PathVariable Integer subjectId) {
        return ResponseEntity.ok(documentService.getBySubjectAndUser(subjectId, currentUser.id()));
    }

    /** Chỉ trả về document PUBLIC — dùng cho Home page hiện số file và recent doc */
    @GetMapping("/subject/{subjectId}/public")
    public ResponseEntity<List<DocumentResponse>> getPublicBySubject(@PathVariable Integer subjectId) {
        return ResponseEntity.ok(documentService.getPublicBySubject(subjectId));
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<DocumentResponse> getPublicDocument(@PathVariable Integer id) {
        return ResponseEntity.ok(documentService.getPublicById(id));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<DocumentSummarizeResponse> getSummary(@PathVariable Integer id) {
        documentService.requireReadable(id, currentUser.id());
        return ResponseEntity.ok(documentService.getLatestSummary(id));
    }

    @GetMapping("/public/{id}/summary")
    public ResponseEntity<DocumentSummarizeResponse> getPublicSummary(@PathVariable Integer id) {
        documentService.getPublicById(id);
        return ResponseEntity.ok(documentService.getLatestSummary(id));
    }

    @GetMapping("/public/{id}/preview")
    public ResponseEntity<ByteArrayResource> previewPublicDocument(@PathVariable Integer id) {
        return fileResponse(documentService.getPublicFile(id), false);
    }

    @GetMapping("/public/{id}/download")
    public ResponseEntity<ByteArrayResource> downloadPublicDocument(@PathVariable Integer id) {
        return fileResponse(documentService.getPublicFile(id), true);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DocumentResponse>> getByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(documentService.getByUser(currentUser.id()));
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<DocumentResponse> updateVisibility(
            @PathVariable Integer id,
            @RequestParam String visibilityStatus) {
        documentService.requireOwner(id, currentUser.id());
        return ResponseEntity.ok(documentService.updateVisibility(id, visibilityStatus));
    }

    /** Đổi tên hiển thị (title) của document — không đụng visibility_status/updated_at. */
    @PatchMapping("/{id}/title")
    public ResponseEntity<DocumentResponse> updateTitle(
            @PathVariable Integer id,
            @RequestParam String title) {
        documentService.requireOwner(id, currentUser.id());
        return ResponseEntity.ok(documentService.updateTitle(id, title));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        documentService.requireOwner(id, currentUser.id());
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Tóm tắt tài liệu bằng AI (proxy sang Python AI service), kết quả lưu vào AI_SUMMARY. */
    @PostMapping("/{id}/summarize")
    public ResponseEntity<DocumentSummarizeResponse> summarize(
            @PathVariable Integer id,
            @Valid @RequestBody DocumentSummarizeRequest request) {
        documentService.requireOwner(id, currentUser.id());
        request.setDocumentId(id);
        request.setUserId(currentUser.id());
        return ResponseEntity.ok(documentService.summarize(request));
    }

    // ── Share Document ────────────────────────────────────────

    /**
     * Tạo hoặc lấy lại link share ACTIVE cho document.
     * Idempotent: bấm nhiều lần vẫn trả cùng 1 link.
     * TODO: sau B1, lấy userId từ JWT thay vì RequestParam.
     */
    @PostMapping("/{id}/share")
    public ResponseEntity<DocumentShareResponse> createShareLink(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "1") Integer userId) {
        Integer authenticatedUserId = currentUser.id();
        documentService.requireOwner(id, authenticatedUserId);
        return ResponseEntity.ok(documentService.createOrGetShareLink(id, authenticatedUserId));
    }

    /**
     * Hủy link share ACTIVE — link cũ không dùng được nữa.
     * TODO: sau B1, lấy userId từ JWT.
     */
    @DeleteMapping("/{id}/share")
    public ResponseEntity<Void> revokeShareLink(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "1") Integer userId) {
        Integer authenticatedUserId = currentUser.id();
        documentService.requireOwner(id, authenticatedUserId);
        documentService.revokeShareLink(id, authenticatedUserId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Resolve shareId → document — PUBLIC, không cần đăng nhập.
     * Dùng cho trang /share/:shareId ở FE.
     */
    @GetMapping("/share/{shareId}")
    public ResponseEntity<DocumentResponse> getByShareId(@PathVariable Integer shareId) {
        return ResponseEntity.ok(documentService.getDocumentByShareId(shareId));
    }


    @PostMapping("/{id}/share/user")
    public ResponseEntity<UserShareResponse> shareWithUser(
            @PathVariable Integer id,
            @Valid @RequestBody ShareWithUserRequest request) {
        documentService.requireOwner(id, currentUser.id());
        request.setOwnerUserId(currentUser.id());
        return ResponseEntity.status(201).body(documentService.shareWithUser(id, request));
    }

    @GetMapping("/{id}/share/users")
    public ResponseEntity<List<UserShareResponse>> getSharesForDocument(@PathVariable Integer id) {
        documentService.requireOwner(id, currentUser.id());
        return ResponseEntity.ok(documentService.getSharesForDocument(id));
    }

    @GetMapping("/shared-with-me")
    public ResponseEntity<List<UserShareResponse>> getSharedWithMe(
            @RequestParam(defaultValue = "1") Integer userId) {
        return ResponseEntity.ok(documentService.getSharedWithMe(currentUser.id()));
    }

    @DeleteMapping("/share/user/{shareId}")
    public ResponseEntity<Void> revokeUserShare(@PathVariable Integer shareId) {
        documentService.requireShareOwner(shareId, currentUser.id());
        documentService.revokeUserShare(shareId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/share/user/{shareId}/permission")
    public ResponseEntity<UserShareResponse> updateSharePermission(
            @PathVariable Integer shareId,
            @RequestParam String permission) {
        documentService.requireShareOwner(shareId, currentUser.id());
        return ResponseEntity.ok(documentService.updateSharePermission(shareId, permission));
    }
    private ResponseEntity<ByteArrayResource> fileResponse(DocumentService.DocumentFile file, boolean attachment) {
        String disposition = attachment ? "attachment" : "inline";
        String safeName = file.fileName() == null ? "document" : file.fileName().replace("\"", "");
        return ResponseEntity.ok()
                .contentType(file.mediaType() == null ? MediaType.APPLICATION_OCTET_STREAM : file.mediaType())
                .contentLength(file.bytes().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + safeName + "\"")
                .body(new ByteArrayResource(file.bytes()));
    }
}
