package com.aistudyhub.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import com.aistudyhub.security.CurrentUser;
import com.aistudyhub.service.DocumentService;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final NamedParameterJdbcTemplate jdbc;
    private final CurrentUser currentUser;
    private final DocumentService documentService;

    /**
     * GET /api/comments/document/{documentId}
     * Lấy tất cả comment của 1 document, sắp xếp theo thời gian tạo (cũ → mới).
     */
    @GetMapping("/document/{documentId}")
    public List<Map<String, Object>> getByDocument(@PathVariable Integer documentId) {
        documentService.requireReadable(documentId, currentUser.id());
        return findComments(documentId);
    }

    @GetMapping("/public/document/{documentId}")
    public List<Map<String, Object>> getByPublicDocument(@PathVariable Integer documentId) {
        documentService.getPublicById(documentId);
        return findComments(documentId);
    }

    @GetMapping("/share/{shareId}")
    public List<Map<String, Object>> getByShare(@PathVariable Integer shareId) {
        List<Integer> documentIds = jdbc.queryForList("""
            SELECT document_id
            FROM dbo.DOCUMENT_SHARE
            WHERE share_id = :shareId
              AND share_type = 'LINK'
              AND status = 'ACTIVE'
            """, Map.of("shareId", shareId), Integer.class);
        if (documentIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Share link not found or has been revoked.");
        }
        return findComments(documentIds.get(0));
    }

    private List<Map<String, Object>> findComments(Integer documentId) {
        return jdbc.queryForList("""
            SELECT c.comment_id   AS commentId,
                   c.user_id      AS userId,
                   c.document_id  AS documentId,
                   c.content,
                   c.created_at   AS createdAt,
                   u.full_name    AS fullName,
                   u.avatar_url   AS avatarUrl
            FROM dbo.COMMENT c
            JOIN dbo.[USER] u ON u.user_id = c.user_id
            WHERE c.document_id = :documentId
            ORDER BY c.created_at ASC
            """, Map.of("documentId", documentId));
    }

    /**
     * POST /api/comments
     * Tạo comment mới cho document.
     * Body: { userId, documentId, content }
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Integer userId = currentUser.id();
        Integer documentId = (Integer) body.get("documentId");
        String content = (String) body.get("content");
        if (documentId != null) documentService.requireReadable(documentId, userId);

        if (documentId == null || content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "documentId and content are required.");
        }

        jdbc.update("""
            INSERT INTO dbo.COMMENT (user_id, document_id, session_type, content, created_at)
            VALUES (:userId, :documentId, 'COMMENT', :content, GETDATE())
            """, new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("documentId", documentId)
                .addValue("content", content));

        // Return the newly created comment
        Map<String, Object> created = jdbc.queryForMap("""
            SELECT TOP 1 c.comment_id AS commentId,
                   c.user_id      AS userId,
                   c.document_id  AS documentId,
                   c.content,
                   c.created_at   AS createdAt,
                   u.full_name    AS fullName,
                   u.avatar_url   AS avatarUrl
            FROM dbo.COMMENT c
            JOIN dbo.[USER] u ON u.user_id = c.user_id
            WHERE c.user_id = :userId AND c.document_id = :documentId
            ORDER BY c.created_at DESC
            """, new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("documentId", documentId));

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * DELETE /api/comments/{commentId}?userId={userId}
     * Xóa comment (chỉ cho phép user sở hữu comment xóa).
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable Integer commentId, @RequestParam Integer userId) {
        userId = currentUser.id();
        int rows = jdbc.update("""
            DELETE FROM dbo.COMMENT WHERE comment_id = :commentId AND user_id = :userId
            """, new MapSqlParameterSource()
                .addValue("commentId", commentId)
                .addValue("userId", userId));
        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found or not owned by user.");
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * PUT /api/comments/{commentId}
     * Cập nhật nội dung comment (chỉ cho phép user sở hữu comment cập nhật).
     */
    @PutMapping("/{commentId}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer commentId, @RequestBody Map<String, Object> body) {
        Integer userId = currentUser.id();
        String content = (String) body.get("content");

        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Content cannot be empty.");
        }

        int rows = jdbc.update("""
            UPDATE dbo.COMMENT
            SET content = :content
            WHERE comment_id = :commentId AND user_id = :userId
            """, new MapSqlParameterSource()
                .addValue("content", content)
                .addValue("commentId", commentId)
                .addValue("userId", userId));

        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found or not owned by user.");
        }
        
        // Return updated comment info (can fetch from DB if needed, but returning success is enough)
        return ResponseEntity.ok(Map.of("success", true, "commentId", commentId, "content", content));
    }
}
