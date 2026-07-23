package com.aistudyhub.controller;

import com.aistudyhub.dto.request.ChangePasswordRequest;
import com.aistudyhub.dto.request.UpdateSettingsRequest;
import com.aistudyhub.dto.response.*;
import com.aistudyhub.security.CurrentUser;
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

        // 2. Study time — thời gian thật, đo từ timestamp chứ không nhân hằng số.
        //
        //    Chat: cộng khoảng cách giữa các tin nhắn liên tiếp trong cùng một phiên.
        //    Khoảng cách > IDLE_GAP_SECONDS coi như user bỏ đi rồi quay lại, không tính —
        //    nếu không một phiên mở từ hôm qua sẽ cộng nguyên 24 giờ.
        //    Hệ quả: phiên chỉ có đúng 1 tin nhắn đóng góp 0 phút, vì không có
        //    mốc thứ hai nào để đo. Chấp nhận thiếu một ít còn hơn bịa ra thời gian.
        final int IDLE_GAP_SECONDS = 900; // 15 phút

        Integer chatSeconds = jdbc.queryForObject("""
                WITH msg AS (
                    SELECT DATEDIFF(second,
                               LAG(cm.created_at) OVER (
                                   PARTITION BY cm.session_id ORDER BY cm.created_at),
                               cm.created_at) AS gap_seconds
                    FROM dbo.CHAT_MESSAGE cm
                    JOIN dbo.CHAT_SESSION cs ON cs.session_id = cm.session_id
                    WHERE cs.user_id = ?
                )
                SELECT COALESCE(SUM(gap_seconds), 0)
                FROM msg
                WHERE gap_seconds IS NOT NULL
                  AND gap_seconds > 0
                  AND gap_seconds <= ?
                """, Integer.class, userId, IDLE_GAP_SECONDS);

        //    Quiz: start_time được ghi bằng GETDATE() trừ đi timer thật của frontend,
        //    end_time là lúc nộp bài — nên hiệu hai mốc chính là thời gian làm bài thật.
        //    Chỉ tính bài đã nộp (end_time IS NOT NULL).
        Integer quizSeconds = jdbc.queryForObject("""
                SELECT COALESCE(SUM(DATEDIFF(second, start_time, end_time)), 0)
                FROM dbo.TEST_ATTEMPT
                WHERE user_id = ?
                  AND end_time IS NOT NULL
                  AND end_time >= start_time
                """, Integer.class, userId);

        //    Đọc tài liệu: cộng dồn từ heartbeat mà frontend gửi trong lúc mở tài liệu
        //    (xem DocumentService.recordReadingHeartbeat).
        Integer readingSeconds = jdbc.queryForObject("""
                SELECT COALESCE(SUM(study_duration), 0)
                FROM dbo.STUDY_ACTIVITY
                WHERE user_id = ?
                  AND activity_type = 'Reading'
                """, Integer.class, userId);

        int studyTimeMinutes = ((chatSeconds == null ? 0 : chatSeconds)
                + (quizSeconds == null ? 0 : quizSeconds)
                + (readingSeconds == null ? 0 : readingSeconds)) / 60;

        // 3. Courses completed — số user_subjects
        Integer coursesCompleted = jdbc.queryForObject("""
                SELECT COUNT(*) FROM dbo.USER_SUBJECT WHERE user_id = ?
                """, Integer.class, userId);

        // 4. Storage
        // Tài liệu trong Trash không chiếm quota (Trash chỉ set deleted_at,
        // status vẫn là 'Active'), nên phải lọc theo deleted_at.
        Long usedBytes = jdbc.queryForObject("""
                SELECT COALESCE(SUM(document_size), 0)
                FROM dbo.DOCUMENT WHERE user_id = ? AND deleted_at IS NULL
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
            maxStorageMb = null;
        }
        if (maxStorageMb == null) maxStorageMb = fallbackStorageMb();
        long totalBytes = (long) maxStorageMb * 1024L * 1024L;


        UserStatsResponse stats = UserStatsResponse.builder()
                .streakDays(streakDays)
                .studyTimeMinutes(studyTimeMinutes)
                .coursesCompleted(coursesCompleted == null ? 0 : coursesCompleted)
                .usedStorageBytes(usedBytes == null ? 0 : usedBytes)
                .totalStorageBytes(totalBytes)
                .build();

        return ResponseEntity.ok(stats);
    }

    // ── GET /api/users/{userId}/activities ────────────────────────────────────
    /**
     * Feed Recent Activity: trộn 4 loại hoạt động rồi lấy N cái gần nhất.
     *
     * Gộp bằng UNION ALL thay vì 4 lượt gọi riêng để việc "lấy 10 cái mới nhất"
     * do SQL Server quyết định trên toàn bộ dữ liệu — nếu tách ra, mỗi nguồn
     * trả về top 10 của riêng nó rồi frontend tự trộn, một nguồn dày đặc sẽ
     * đẩy hết các nguồn khác ra ngoài.
     */
    @GetMapping("/{userId}/activities")
    public ResponseEntity<List<UserActivityResponse>> getActivities(
            @PathVariable Integer userId,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        userId = currentUser.id();
        int capped = Math.max(1, Math.min(limit, 50));

        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT TOP (?) *
                FROM (
                    -- Upload tài liệu
                    SELECT 'UPLOAD' AS activity_type,
                           d.title AS title,
                           d.uploaded_at AS occurred_at,
                           CAST(NULL AS INT) AS duration_seconds,
                           CAST(NULL AS DECIMAL(5,2)) AS score
                    FROM dbo.DOCUMENT d
                    WHERE d.user_id = ? AND d.deleted_at IS NULL

                    UNION ALL

                    -- Đọc tài liệu (heartbeat từ trang xem tài liệu)
                    SELECT 'READING',
                           d.title,
                           sa.activity_date,
                           sa.study_duration,
                           NULL
                    FROM dbo.STUDY_ACTIVITY sa
                    JOIN dbo.DOCUMENT d ON d.document_id = sa.document_id
                    WHERE sa.user_id = ?
                      AND sa.activity_type = 'Reading'
                      AND d.deleted_at IS NULL

                    UNION ALL

                    -- Nộp bài quiz
                    SELECT 'QUIZ',
                           q.title,
                           ta.end_time,
                           NULL,
                           ta.score
                    FROM dbo.TEST_ATTEMPT ta
                    JOIN dbo.AI_QUESTION q ON q.question_id = ta.question_id
                    WHERE ta.user_id = ? AND ta.end_time IS NOT NULL

                    UNION ALL

                    -- Mở phiên chat AI
                    SELECT 'CHAT',
                           cs.session_title,
                           cs.created_at,
                           NULL,
                           NULL
                    FROM dbo.CHAT_SESSION cs
                    WHERE cs.user_id = ?
                ) feed
                ORDER BY occurred_at DESC
                """, capped, userId, userId, userId, userId);

        List<UserActivityResponse> activities = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Object duration = row.get("duration_seconds");
            Object score = row.get("score");
            activities.add(UserActivityResponse.builder()
                    .type((String) row.get("activity_type"))
                    .title((String) row.get("title"))
                    .occurredAt(toLocalDateTime(row.get("occurred_at")))
                    .durationSeconds(duration == null ? null : ((Number) duration).intValue())
                    .score(score == null ? null : new java.math.BigDecimal(score.toString()))
                    .build());
        }
        return ResponseEntity.ok(activities);
    }

    /**
     * Dung lượng dùng khi không tra được gói của user: lấy gói thấp nhất đang bán
     * thay vì ghi cứng 1 GB, để admin đổi hạn mức Basic thì chỗ này đi theo.
     */
    private int fallbackStorageMb() {
        try {
            Integer lowest = jdbc.queryForObject("""
                    SELECT MIN(max_storage)
                    FROM dbo.SUBSCRIPTION_PLAN_VERSION
                    WHERE is_active = 1
                    """, Integer.class);
            if (lowest != null && lowest > 0) return lowest;
        } catch (Exception ignored) {}
        return 1024;
    }

    private static java.time.LocalDateTime toLocalDateTime(Object value) {
        if (value instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        if (value instanceof java.time.LocalDateTime ldt) return ldt;
        return null;
    }

    // ── GET /api/users/{userId}/course-progress ───────────────────────────────
    /**
     * Tiến độ từng môn = số tài liệu đã đọc / tổng tài liệu của môn.
     *
     * "Đã đọc" nghĩa là tổng thời gian đọc tài liệu đó đạt tối thiểu
     * MIN_READ_SECONDS. Mở nhầm rồi đóng ngay không được tính là đã học.
     * Tài liệu trong Trash bị loại khỏi cả tử số lẫn mẫu số, nếu không việc
     * xoá tài liệu chưa đọc sẽ làm tiến độ tụt xuống một cách vô lý.
     */
    @GetMapping("/{userId}/course-progress")
    public ResponseEntity<List<CourseProgressResponse>> getCourseProgress(@PathVariable Integer userId) {
        userId = currentUser.id();
        final int MIN_READ_SECONDS = 30;

        List<Map<String, Object>> rows = jdbc.queryForList("""
                WITH read_docs AS (
                    SELECT document_id, SUM(study_duration) AS read_seconds
                    FROM dbo.STUDY_ACTIVITY
                    WHERE user_id = ? AND activity_type = 'Reading'
                    GROUP BY document_id
                )
                SELECT us.subject_id AS subject_id,
                       COUNT(DISTINCT d.document_id) AS total_documents,
                       COUNT(DISTINCT CASE WHEN rd.read_seconds >= ?
                                           THEN d.document_id END) AS read_documents
                FROM dbo.USER_SUBJECT us
                LEFT JOIN dbo.DOCUMENT d
                       ON d.subject_id = us.subject_id
                      AND d.user_id = us.user_id
                      AND d.deleted_at IS NULL
                LEFT JOIN read_docs rd ON rd.document_id = d.document_id
                WHERE us.user_id = ?
                GROUP BY us.subject_id
                """, userId, MIN_READ_SECONDS, userId);

        List<CourseProgressResponse> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            int total = toInt(row.get("total_documents"));
            int read = toInt(row.get("read_documents"));
            result.add(CourseProgressResponse.builder()
                    .subjectId(toInt(row.get("subject_id")))
                    .totalDocuments(total)
                    .readDocuments(read)
                    .progressPercent(total == 0 ? 0 : (int) Math.round(read * 100.0 / total))
                    .build());
        }
        return ResponseEntity.ok(result);
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
                JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.version_id = us.version_id
                WHERE us.user_id = ?
                ORDER BY us.end_date DESC, us.subscription_id DESC
                """, userId);

        if (rows.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "planName", "Basic",
                "status", "Active",
                "startDate", "",
                "endDate", "",
                "price", 0,
                "maxStorage", 1024,
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
        result.put("maxStorage", row.get("max_storage"));
        result.put("maxQuiz", row.get("max_quiz_per_month"));
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
        // Các cột còn lại trong USER_SETTINGS (language, timezone,
        // profile_visibility, show_streak, và các cờ notification khác) không
        // được đọc ở đâu nên không trả về nữa. Cột vẫn giữ trong DB.
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT push_notifications
                FROM dbo.USER_SETTINGS
                WHERE user_id = ?
                """, userId);

        if (rows.isEmpty()) {
            return ResponseEntity.ok(UserSettingsResponse.builder()
                    .pushNotifications(true)
                    .build());
        }

        Map<String, Object> row = rows.get(0);
        return ResponseEntity.ok(UserSettingsResponse.builder()
                .pushNotifications(toBool(row.get("push_notifications")))
                .build());
    }

    // ── PUT /api/users/{userId}/settings ──────────────────────────────────────
    @PutMapping("/{userId}/settings")
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @PathVariable Integer userId,
            @RequestBody UpdateSettingsRequest req) {
        userId = currentUser.id();

        // Các cột khác giữ nguyên giá trị đang có trong DB; khi INSERT thì
        // DEFAULT của từng cột lo phần còn lại.
        int affected = jdbc.update("""
                UPDATE dbo.USER_SETTINGS
                SET push_notifications = COALESCE(?, push_notifications),
                    updated_at         = GETDATE()
                WHERE user_id = ?
                """,
                req.getPushNotifications(),
                userId);

        if (affected == 0) {
            jdbc.update("""
                    INSERT INTO dbo.USER_SETTINGS (user_id, push_notifications, updated_at)
                    VALUES (?, ?, GETDATE())
                    """,
                    userId,
                    req.getPushNotifications() != null ? req.getPushNotifications() : true);
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
