package com.aistudyhub.controller;

import com.aistudyhub.dto.request.ChangePasswordRequest;
import com.aistudyhub.dto.request.UpdateSettingsRequest;
import com.aistudyhub.dto.response.*;
import com.aistudyhub.security.CurrentUser;
import com.aistudyhub.service.PlanQuotaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final WebClient supabaseWebClient;
    private final CurrentUser currentUser;
    private final PlanQuotaService planQuotaService;

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    // ── POST /api/users/{userId}/avatar ───────────────────────────────────────
    @PostMapping(value = "/{userId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadAvatar(
            @PathVariable Integer userId,
            @RequestParam("file") MultipartFile file) {
        userId = currentUser.id();
        try {
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar.jpg";
            String ext = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf(".")) : ".jpg";
            String objectKey = userId + "/" + UUID.randomUUID() + ext;

            supabaseWebClient.post()
                    .uri("/storage/v1/object/avatars/" + objectKey)
                    .header("apikey", supabaseKey)
                    .header(org.springframework.http.HttpHeaders.AUTHORIZATION, "Bearer " + supabaseKey)
                    .header("x-upsert", "true")
                    .contentType(MediaType.parseMediaType(
                            file.getContentType() != null ? file.getContentType() : "image/jpeg"))
                    .bodyValue(file.getBytes())
                    .retrieve()
                    .toBodilessEntity()
                    .block();

            String publicUrl = supabaseUrl + "/storage/v1/object/public/avatars/" + objectKey;

            jdbc.update("""
                    UPDATE dbo.[USER] SET avatar_url = ?, updated_at = GETDATE()
                    WHERE user_id = ?
                    """, publicUrl, userId);

            return ResponseEntity.ok(Map.of("avatarUrl", publicUrl));
        } catch (WebClientResponseException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload failed: " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    // ── GET /api/users/{userId}/plan ──────────────────────────────────────────
    @GetMapping("/{userId}/plan")
    public ResponseEntity<Map<String, String>> getCurrentPlan(@PathVariable Integer userId) {
        userId = currentUser.id();
        String plan = resolvePlan(userId);
        return ResponseEntity.ok(Map.of("plan", plan));
    }

    // ── GET /api/users/{userId} ───────────────────────────────────────────────
    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getProfile(@PathVariable Integer userId) {
        userId = currentUser.id();
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT u.user_id, u.full_name, u.email, u.avatar_url, u.created_at
                FROM dbo.[USER] u
                WHERE u.user_id = ?
                """, userId);

        String joinedAt = "";
        if (row.get("created_at") != null) {
            java.sql.Timestamp ts = (java.sql.Timestamp) row.get("created_at");
            joinedAt = ts.toLocalDateTime()
                    .format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH));
        }

        UserProfileResponse profile = UserProfileResponse.builder()
                .userId(userId)
                .fullName((String) row.get("full_name"))
                .email((String) row.get("email"))
                .avatarUrl((String) row.get("avatar_url"))
                .plan(resolvePlan(userId))
                .joinedAt(joinedAt)
                .build();

        return ResponseEntity.ok(profile);
    }

    // ── GET /api/users/{userId}/stats ─────────────────────────────────────────
    @GetMapping("/{userId}/stats")
    public ResponseEntity<UserStatsResponse> getStats(@PathVariable Integer userId) {
        userId = currentUser.id();

        // 1. Streak
        Integer streakDays = 0;
        try {
            List<Map<String, Object>> streakRows = jdbc.queryForList("""
                    SELECT current_streak FROM dbo.STUDY_STREAK WHERE user_id = ?
                    """, userId);
            if (!streakRows.isEmpty()) {
                streakDays = toInt(streakRows.get(0).get("current_streak"));
            }
        } catch (Exception ignored) {}

        // 2. Study time — đếm chat messages (mỗi exchange ~3 phút)
        Integer messageCount = jdbc.queryForObject("""
                SELECT COUNT(cm.message_id)
                FROM dbo.CHAT_MESSAGE cm
                JOIN dbo.CHAT_SESSION cs ON cs.session_id = cm.session_id
                WHERE cs.user_id = ?
                """, Integer.class, userId);
        int studyTimeMinutes = (messageCount == null ? 0 : messageCount) * 3;

        // 3. Courses completed — số user_subjects
        Integer coursesCompleted = jdbc.queryForObject("""
                SELECT COUNT(*) FROM dbo.USER_SUBJECT WHERE user_id = ?
                """, Integer.class, userId);

        // 4. XP — docs×50 + chat sessions×20 + quiz attempts×100
        Integer docCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM dbo.DOCUMENT WHERE user_id = ?
                """, Integer.class, userId);
        Integer sessionCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM dbo.CHAT_SESSION WHERE user_id = ?
                """, Integer.class, userId);
        Integer attemptCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM dbo.TEST_ATTEMPT WHERE user_id = ?
                """, Integer.class, userId);

        long xp = (long)(docCount == null ? 0 : docCount) * 50
                + (long)(sessionCount == null ? 0 : sessionCount) * 20
                + (long)(attemptCount == null ? 0 : attemptCount) * 100;

        int level = (int)(xp / 250) + 1;
        long xpForCurrentLevel = ((long)(level - 1)) * 250;
        long xpForNextLevel = (long) level * 250;

        // 5. Storage
        Long usedBytes = jdbc.queryForObject("""
                SELECT COALESCE(SUM(document_size), 0)
                FROM dbo.DOCUMENT WHERE user_id = ?
                """, Long.class, userId);

        Integer maxStorageMb;
        try {
            maxStorageMb = jdbc.queryForObject("""
                    SELECT TOP 1 pv.max_storage
                    FROM dbo.USER_SUBSCRIPTION us
                    JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.version_id = us.version_id
                    WHERE us.user_id = ? AND us.status = 'Active'
                    ORDER BY us.end_date DESC, us.subscription_id DESC
                    """, Integer.class, userId);
        } catch (Exception e) {
            maxStorageMb = 1024;
        }
        if (maxStorageMb == null) maxStorageMb = 1024;
        long totalBytes = (long) maxStorageMb * 1024L * 1024L;

        UserStatsResponse stats = UserStatsResponse.builder()
                .streakDays(streakDays)
                .studyTimeMinutes(studyTimeMinutes)
                .coursesCompleted(coursesCompleted == null ? 0 : coursesCompleted)
                .xp(xp)
                .level(level)
                .xpForCurrentLevel(xpForCurrentLevel)
                .xpForNextLevel(xpForNextLevel)
                .usedStorageBytes(usedBytes == null ? 0 : usedBytes)
                .totalStorageBytes(totalBytes)
                .build();

        return ResponseEntity.ok(stats);
    }

    // ── POST /api/users/report ────────────────────────────────────────────────
    @PostMapping("/report")
    public ResponseEntity<MessageResponse> submitReport(
            @RequestBody Map<String, Object> body) {

        Integer userId = currentUser.id();
        String category = (String) body.get("category");
        String description = (String) body.get("description");
        String contactEmail = (String) body.get("contactEmail");
        Boolean isAnonymous = body.get("isAnonymous") != null && (Boolean) body.get("isAnonymous");
        Integer rating = body.get("rating") != null ? Integer.parseInt(body.get("rating").toString()) : null;

        if (category == null || category.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Category is required"));
        }
        if (description == null || description.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Description is required"));
        }

        jdbc.update("""
                INSERT INTO dbo.USER_REPORT
                    (user_id, category, rating, description, contact_email, is_anonymous, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'Pending', GETDATE())
                """,
                isAnonymous ? null : userId,
                category,
                rating,
                description,
                isAnonymous ? null : contactEmail,
                isAnonymous ? 1 : 0);

        return ResponseEntity.ok(new MessageResponse("Report submitted successfully"));
    }

    // ── PUT /api/users/{userId}/subscription/auto-renewal ─────────────────────
    @PutMapping("/{userId}/subscription/auto-renewal")
    public ResponseEntity<MessageResponse> updateAutoRenewal(
            @PathVariable Integer userId,
            @RequestBody Map<String, Object> body) {
        userId = currentUser.id();

        Boolean autoRenewal = body.get("autoRenewal") != null && (Boolean) body.get("autoRenewal");

        int affected = jdbc.update("""
                UPDATE dbo.USER_SUBSCRIPTION
                SET auto_renewal = ?
                WHERE user_id = ?
                  AND status NOT IN ('Cancelled', 'Expired')
                """, autoRenewal ? 1 : 0, userId);

        if (affected == 0) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("No active subscription found"));
        }
        return ResponseEntity.ok(new MessageResponse(autoRenewal ? "Auto-renewal enabled" : "Auto-renewal disabled"));
    }

    // ── GET /api/users/{userId}/subscription ──────────────────────────────────
    @GetMapping("/{userId}/subscription")
    public ResponseEntity<Map<String, Object>> getSubscription(@PathVariable Integer userId) {
        userId = currentUser.id();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT TOP 1
                    us.subscription_id, us.version_id, us.start_date, us.end_date, us.status, us.auto_renewal,
                    sp.plan_name, pv.version_no, pv.price, pv.duration_month, pv.max_storage,
                    pv.max_quiz_per_month, pv.features_json AS description, us.renewal_policy
                FROM dbo.USER_SUBSCRIPTION us
                JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = us.plan_id
                LEFT JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.version_id = us.version_id
                WHERE us.user_id = ?
                ORDER BY us.end_date DESC, us.subscription_id DESC
                """, userId);

        // Quota comes from PlanQuotaService, not from pv, so the numbers shown here match what
        // upload and quiz generation actually enforce (Basic follows the active version).
        PlanQuotaService.PlanQuota quota = planQuotaService.getQuota(userId);

        if (rows.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "planName", "Basic",
                "status", "Active",
                "startDate", "",
                "endDate", "",
                "price", 0,
                "maxStorage", quota.maxStorageMb(),
                "maxQuiz", quota.maxQuizPerMonth(),
                "autoRenewal", true
            ));
        }

        Map<String, Object> row = rows.get(0);
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("subscriptionId", row.get("subscription_id"));
        result.put("versionId", row.get("version_id"));
        result.put("versionNo", row.get("version_no"));
        result.put("planName", row.get("plan_name"));
        result.put("status", row.get("status"));
        result.put("startDate", row.get("start_date") != null ? row.get("start_date").toString() : "");
        result.put("endDate", row.get("end_date") != null ? row.get("end_date").toString() : "");
        result.put("price", row.get("price"));
        result.put("durationMonth", row.get("duration_month"));
        result.put("maxStorage", quota.maxStorageMb());
        result.put("maxQuiz", quota.maxQuizPerMonth());
        result.put("description", row.get("description"));
        result.put("renewalPolicy", row.get("renewal_policy"));
        result.put("autoRenewal", toBool(row.get("auto_renewal")));
        return ResponseEntity.ok(result);
    }

    // ── GET /api/users/{userId}/billing-history ───────────────────────────────
    @GetMapping("/{userId}/billing-history")
    public ResponseEntity<List<Map<String, Object>>> getBillingHistory(@PathVariable Integer userId) {
        userId = currentUser.id();
        List<Map<String, Object>> payments = jdbc.queryForList("""
                SELECT payment_id, plan_code, billing_cycle, amount, status,
                       created_at, paid_at
                FROM dbo.PAYMENT
                WHERE user_id = ?
                ORDER BY created_at DESC
                """, userId);
        return ResponseEntity.ok(payments);
    }

    // ── DELETE /api/users/{userId}/subscription ───────────────────────────────
    @DeleteMapping("/{userId}/subscription")
    public ResponseEntity<MessageResponse> cancelSubscription(@PathVariable Integer userId) {
        userId = currentUser.id();
        int affected = jdbc.update("""
                UPDATE dbo.USER_SUBSCRIPTION
                SET status = 'Cancelled'
                WHERE user_id = ?
                  AND status NOT IN ('Cancelled', 'Expired')
                """, userId);

        if (affected == 0) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("No active subscription to cancel"));
        }
        return ResponseEntity.ok(new MessageResponse("Subscription cancelled successfully"));
    }

    // ── GET /api/users/{userId}/sessions ──────────────────────────────────────
    @GetMapping("/{userId}/sessions")
    public ResponseEntity<List<Map<String, Object>>> getSessions(@PathVariable Integer userId) {
        userId = currentUser.id();
        List<Map<String, Object>> sessions = jdbc.queryForList("""
                SELECT token_id, device_info, ip_address, created_at, last_used_at, is_used
                FROM dbo.TOKEN
                WHERE user_id = ?
                  AND token_type = 'LOGIN_SESSION'
                  AND is_used = 0
                  AND expires_at > GETDATE()
                ORDER BY last_used_at DESC, created_at DESC
                """, userId);
        return ResponseEntity.ok(sessions);
    }

    // ── DELETE /api/users/{userId}/sessions/{tokenId} ─────────────────────────
    @DeleteMapping("/{userId}/sessions/{tokenId}")
    public ResponseEntity<MessageResponse> revokeSession(
            @PathVariable Integer userId,
            @PathVariable Integer tokenId) {
        userId = currentUser.id();
        jdbc.update("""
                UPDATE dbo.TOKEN SET is_used = 1
                WHERE token_id = ? AND user_id = ? AND token_type = 'LOGIN_SESSION'
                """, tokenId, userId);
        return ResponseEntity.ok(new MessageResponse("Session revoked"));
    }

    // ── DELETE /api/users/{userId}/chat-history ───────────────────────────────
    @DeleteMapping("/{userId}/chat-history")
    public ResponseEntity<MessageResponse> deleteChatHistory(@PathVariable Integer userId) {
        userId = currentUser.id();
        jdbc.update("""
                DELETE cm FROM dbo.CHAT_MESSAGE cm
                JOIN dbo.CHAT_SESSION cs ON cs.session_id = cm.session_id
                WHERE cs.user_id = ?
                """, userId);
        jdbc.update("DELETE FROM dbo.CHAT_SESSION WHERE user_id = ?", userId);
        return ResponseEntity.ok(new MessageResponse("Chat history deleted successfully"));
    }

    // ── PUT /api/users/{userId} ───────────────────────────────────────────────
    @PutMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @PathVariable Integer userId,
            @RequestBody Map<String, String> body) {
        userId = currentUser.id();

        String fullName = body.get("fullName");
        if (fullName == null || fullName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        jdbc.update("""
                UPDATE dbo.[USER]
                SET full_name = ?, updated_at = GETDATE()
                WHERE user_id = ?
                """, fullName.trim(), userId);

        return getProfile(userId);
    }

    // ── PUT /api/users/{userId}/password ──────────────────────────────────────
    @PutMapping("/{userId}/password")
    public ResponseEntity<MessageResponse> changePassword(
            @PathVariable Integer userId,
            @Valid @RequestBody ChangePasswordRequest req) {
        userId = currentUser.id();

        String currentHash = jdbc.queryForObject("""
                SELECT password_hash FROM dbo.[USER] WHERE user_id = ?
                """, String.class, userId);

        if (currentHash == null || !passwordEncoder.matches(req.getCurrentPassword(), currentHash)) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Current password is incorrect"));
        }

        String newHash = passwordEncoder.encode(req.getNewPassword());
        jdbc.update("""
                UPDATE dbo.[USER] SET password_hash = ?, updated_at = GETDATE()
                WHERE user_id = ?
                """, newHash, userId);

        return ResponseEntity.ok(new MessageResponse("Password changed successfully"));
    }

    // ── GET /api/users/{userId}/settings ──────────────────────────────────────
    @GetMapping("/{userId}/settings")
    public ResponseEntity<UserSettingsResponse> getSettings(@PathVariable Integer userId) {
        userId = currentUser.id();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT email_notifications, push_notifications,
                       learning_notifications, ai_notifications,
                       achievement_notifications, security_notifications,
                       profile_visibility, show_streak, language, timezone
                FROM dbo.USER_SETTINGS
                WHERE user_id = ?
                """, userId);

        if (rows.isEmpty()) {
            return ResponseEntity.ok(UserSettingsResponse.builder()
                    .emailNotifications(true)
                    .pushNotifications(true)
                    .learningNotifications(true)
                    .aiNotifications(true)
                    .achievementNotifications(true)
                    .securityNotifications(true)
                    .profileVisibility("Public")
                    .showStreak(true)
                    .language("en")
                    .timezone("Asia/Ho_Chi_Minh")
                    .build());
        }

        Map<String, Object> row = rows.get(0);
        return ResponseEntity.ok(UserSettingsResponse.builder()
                .emailNotifications(toBool(row.get("email_notifications")))
                .pushNotifications(toBool(row.get("push_notifications")))
                .learningNotifications(toBool(row.get("learning_notifications")))
                .aiNotifications(toBool(row.get("ai_notifications")))
                .achievementNotifications(toBool(row.get("achievement_notifications")))
                .securityNotifications(toBool(row.get("security_notifications")))
                .profileVisibility((String) row.get("profile_visibility"))
                .showStreak(toBool(row.get("show_streak")))
                .language(row.get("language") != null ? (String) row.get("language") : "en")
                .timezone(row.get("timezone") != null ? (String) row.get("timezone") : "Asia/Ho_Chi_Minh")
                .build());
    }

    // ── PUT /api/users/{userId}/settings ──────────────────────────────────────
    @PutMapping("/{userId}/settings")
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @PathVariable Integer userId,
            @RequestBody UpdateSettingsRequest req) {
        userId = currentUser.id();

        int affected = jdbc.update("""
                UPDATE dbo.USER_SETTINGS
                SET email_notifications       = COALESCE(?, email_notifications),
                    push_notifications        = COALESCE(?, push_notifications),
                    learning_notifications    = COALESCE(?, learning_notifications),
                    ai_notifications          = COALESCE(?, ai_notifications),
                    achievement_notifications = COALESCE(?, achievement_notifications),
                    security_notifications    = COALESCE(?, security_notifications),
                    profile_visibility        = COALESCE(?, profile_visibility),
                    show_streak               = COALESCE(?, show_streak),
                    language                  = COALESCE(?, language),
                    timezone                  = COALESCE(?, timezone),
                    updated_at                = GETDATE()
                WHERE user_id = ?
                """,
                req.getEmailNotifications(),
                req.getPushNotifications(),
                req.getLearningNotifications(),
                req.getAiNotifications(),
                req.getAchievementNotifications(),
                req.getSecurityNotifications(),
                req.getProfileVisibility(),
                req.getShowStreak(),
                req.getLanguage(),
                req.getTimezone(),
                userId);

        if (affected == 0) {
            jdbc.update("""
                    INSERT INTO dbo.USER_SETTINGS
                        (user_id, email_notifications, push_notifications,
                         learning_notifications, ai_notifications,
                         achievement_notifications, security_notifications,
                         profile_visibility, show_streak, language, timezone, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
                    """,
                    userId,
                    req.getEmailNotifications()       != null ? req.getEmailNotifications()       : true,
                    req.getPushNotifications()        != null ? req.getPushNotifications()        : true,
                    req.getLearningNotifications()    != null ? req.getLearningNotifications()    : true,
                    req.getAiNotifications()          != null ? req.getAiNotifications()          : true,
                    req.getAchievementNotifications() != null ? req.getAchievementNotifications() : true,
                    req.getSecurityNotifications()    != null ? req.getSecurityNotifications()    : true,
                    req.getProfileVisibility()        != null ? req.getProfileVisibility()        : "Public",
                    req.getShowStreak()               != null ? req.getShowStreak()               : true,
                    req.getLanguage()                 != null ? req.getLanguage()                 : "en",
                    req.getTimezone()                 != null ? req.getTimezone()                 : "Asia/Ho_Chi_Minh");
        }

        return getSettings(userId);
    }

    // ── DELETE /api/users/{userId} — Soft delete ──────────────────────────────
    @DeleteMapping("/{userId}")
    public ResponseEntity<MessageResponse> deleteAccount(@PathVariable Integer userId) {
        userId = currentUser.id();
        int affected = jdbc.update("""
                UPDATE dbo.[USER]
                SET status     = 'Deleted',
                    deleted_at = GETDATE(),
                    updated_at = GETDATE()
                WHERE user_id = ?
                  AND status  != 'Deleted'
                """, userId);

        if (affected == 0) {
            return ResponseEntity.notFound().build();
        }

        // Revoke all active login sessions
        jdbc.update("""
                UPDATE dbo.TOKEN SET is_used = 1
                WHERE user_id    = ?
                  AND token_type = 'LOGIN_SESSION'
                  AND is_used    = 0
                """, userId);

        return ResponseEntity.ok(new MessageResponse("Account deleted successfully."));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String resolvePlan(Integer userId) {
        try {
            String planName = jdbc.queryForObject("""
                    WITH latest_subscription AS (
                        SELECT TOP 1 sp.plan_name
                        FROM dbo.USER_SUBSCRIPTION us
                        JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = us.plan_id
                        WHERE us.user_id = ?
                        ORDER BY us.end_date DESC, us.subscription_id DESC
                    )
                    SELECT COALESCE((SELECT plan_name FROM latest_subscription), 'Basic')
                    """, String.class, userId);
            if (planName == null) return "Basic";
            String trimmed = planName.trim();
            if (trimmed.isBlank()) return "Basic";
            return trimmed.substring(0, 1).toUpperCase() + trimmed.substring(1);
        } catch (Exception e) {
            return "Basic";
        }
    }

    private boolean toBool(Object val) {
        if (val == null) return false;
        if (val instanceof Boolean b) return b;
        if (val instanceof Number n) return n.intValue() != 0;
        return false;
    }

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        return 0;
    }

    public record MessageResponse(String message) {}
}
