package com.aistudyhub.controller;

import com.aistudyhub.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class NotificationController {
    private final NamedParameterJdbcTemplate jdbc;

    @GetMapping("/api/notifications")
    public List<Map<String, Object>> notifications(@RequestParam Integer userId, Authentication authentication) {
        requireUser(userId, authentication);
        return jdbc.queryForList("""
            SELECT a.announcement_id AS id, a.title, a.content AS [message], a.type,
                   CONVERT(NVARCHAR(19), a.created_at, 120) AS createdAt,
                   CAST(CASE WHEN ua.is_read = 0 THEN 1 ELSE 0 END AS bit) AS isUnread
            FROM dbo.USER_ANNOUNCEMENT ua
            JOIN dbo.ANNOUNCEMENT a ON a.announcement_id = ua.announcement_id
            WHERE ua.user_id = :userId
            ORDER BY a.created_at DESC, a.announcement_id DESC
            """, Map.of("userId", userId));
    }

    @PatchMapping("/api/notifications/{announcementId}/read")
    public void markRead(@PathVariable Integer announcementId, @RequestParam Integer userId,
                         Authentication authentication) {
        requireUser(userId, authentication);
        jdbc.update("""
            UPDATE dbo.USER_ANNOUNCEMENT
            SET is_read = 1, read_at = COALESCE(read_at, GETDATE())
            WHERE user_id = :userId AND announcement_id = :announcementId
            """, new MapSqlParameterSource("userId", userId).addValue("announcementId", announcementId));
    }

    @PatchMapping("/api/notifications/read-all")
    public void markAllRead(@RequestParam Integer userId, Authentication authentication) {
        requireUser(userId, authentication);
        jdbc.update("""
            UPDATE dbo.USER_ANNOUNCEMENT
            SET is_read = 1, read_at = COALESCE(read_at, GETDATE())
            WHERE user_id = :userId AND is_read = 0
            """, Map.of("userId", userId));
    }

    @GetMapping("/api/admin/notifications")
    public List<Map<String, Object>> history() {
        return jdbc.queryForList("""
            SELECT TOP 20 a.announcement_id AS id, a.title, a.content AS body, a.type,
                   COALESCE(a.recipient_group, 'Direct User') AS recipients,
                   CONVERT(NVARCHAR(19), a.created_at, 120) AS sentAt,
                   COUNT(ua.user_announcement_id) AS recipientCount
            FROM dbo.ANNOUNCEMENT a
            LEFT JOIN dbo.USER_ANNOUNCEMENT ua ON ua.announcement_id = a.announcement_id
            WHERE a.recipient_group IS NOT NULL
            GROUP BY a.announcement_id, a.title, a.content, a.type, a.recipient_group, a.created_at
            ORDER BY a.created_at DESC, a.announcement_id DESC
            """, Map.of());
    }

    @PostMapping("/api/admin/notifications")
    @Transactional
    public Map<String, Object> send(@RequestBody Map<String, Object> body, Authentication authentication) {
        User sender = principal(authentication);
        String title = required(body, "title");
        String content = required(body, "content");
        String type = String.valueOf(body.getOrDefault("type", "announcement")).trim().toLowerCase(Locale.ROOT);
        String recipients = String.valueOf(body.getOrDefault("recipients", "All Users")).trim();
        if (!List.of("info", "announcement", "warning", "alert").contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported notification type.");
        }

        Integer announcementId = jdbc.queryForObject("""
            INSERT INTO dbo.ANNOUNCEMENT (user_id, title, content, type, recipient_group, created_at)
            OUTPUT INSERTED.announcement_id
            VALUES (:senderId, :title, :content, :type, :recipients, GETDATE())
            """, new MapSqlParameterSource("senderId", sender.getUserId())
                .addValue("title", title).addValue("content", content)
                .addValue("type", type).addValue("recipients", recipients), Integer.class);

        String audience = switch (recipients.toUpperCase(Locale.ROOT)) {
            case "PLUS PLAN" -> "AND UPPER(COALESCE(ls.plan_name, 'BASIC')) = 'PLUS'";
            case "PRO PLAN" -> "AND UPPER(COALESCE(ls.plan_name, 'BASIC')) = 'PRO'";
            case "FREE PLAN" -> "AND UPPER(COALESCE(ls.plan_name, 'BASIC')) = 'BASIC'";
            case "ADMIN ONLY" -> "AND UPPER(r.role_name) = 'ADMIN'";
            case "ALL USERS" -> "";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported recipient group.");
        };

        int count = jdbc.update("""
            WITH latest_subscription AS (
                SELECT us.user_id, sp.plan_name,
                       ROW_NUMBER() OVER (PARTITION BY us.user_id ORDER BY us.end_date DESC, us.subscription_id DESC) rn
                FROM dbo.USER_SUBSCRIPTION us
                JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = us.plan_id
                WHERE us.status = 'Active'
            )
            INSERT INTO dbo.USER_ANNOUNCEMENT (user_id, announcement_id, is_read, read_at)
            SELECT u.user_id, :announcementId, 0, NULL
            FROM dbo.[USER] u
            JOIN dbo.ROLE r ON r.role_id = u.role_id
            LEFT JOIN latest_subscription ls ON ls.user_id = u.user_id AND ls.rn = 1
            LEFT JOIN dbo.USER_SETTINGS settings ON settings.user_id = u.user_id
            WHERE u.status = 'Active'
              AND COALESCE(settings.push_notifications, 1) = 1
            """ + audience, Map.of("announcementId", announcementId));

        return Map.of("id", announcementId, "title", title, "body", content, "type", type,
                "recipients", recipients, "recipientCount", count);
    }

    @PutMapping("/api/admin/notifications/{announcementId}")
    public Map<String, Object> update(@PathVariable Integer announcementId, @RequestBody Map<String, Object> body) {
        String title = required(body, "title");
        String content = required(body, "content");
        String type = String.valueOf(body.getOrDefault("type", "announcement")).trim().toLowerCase(Locale.ROOT);
        if (!List.of("info", "announcement", "warning", "alert").contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported notification type.");
        }

        int updated = jdbc.update("""
            UPDATE dbo.ANNOUNCEMENT
            SET title = :title, content = :content, type = :type
            WHERE announcement_id = :announcementId
              AND recipient_group IS NOT NULL
            """, new MapSqlParameterSource("announcementId", announcementId)
                .addValue("title", title)
                .addValue("content", content)
                .addValue("type", type));
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.");
        }
        return Map.of("id", announcementId, "title", title, "body", content, "type", type);
    }

    @DeleteMapping("/api/admin/notifications/{announcementId}")
    @Transactional
    public void delete(@PathVariable Integer announcementId) {
        Integer exists = jdbc.queryForObject("""
            SELECT COUNT(1)
            FROM dbo.ANNOUNCEMENT
            WHERE announcement_id = :announcementId
              AND recipient_group IS NOT NULL
            """, new MapSqlParameterSource("announcementId", announcementId), Integer.class);
        if (exists == null || exists == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.");
        }

        jdbc.update("""
            DELETE FROM dbo.USER_ANNOUNCEMENT
            WHERE announcement_id = :announcementId
            """, new MapSqlParameterSource("announcementId", announcementId));
        jdbc.update("""
            DELETE FROM dbo.ANNOUNCEMENT
            WHERE announcement_id = :announcementId
            """, new MapSqlParameterSource("announcementId", announcementId));
    }

    private void requireUser(Integer userId, Authentication authentication) {
        User user = principal(authentication);
        boolean admin = user.getRoleId() != null && user.getRoleId() == User.ROLE_ADMIN_ID;
        if (!admin && !user.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot access another user's notifications.");
        }
    }

    private User principal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        return user;
    }

    private String required(Map<String, Object> body, String key) {
        String value = String.valueOf(body.getOrDefault(key, "")).trim();
        if (value.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " is required.");
        return value;
    }
}
