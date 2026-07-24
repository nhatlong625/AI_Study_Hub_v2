package com.aistudyhub.controller;

import com.aistudyhub.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/plans")
@Slf4j
@RequiredArgsConstructor
public class PlanVersionController {
    private final NamedParameterJdbcTemplate jdbc;
    private final CurrentUser currentUser;

    @GetMapping
    public List<Map<String, Object>> plans() {
        return jdbc.queryForList("""
            SELECT sp.plan_id AS planId, UPPER(sp.plan_name) AS [plan],
                   pv.version_id AS versionId, pv.version_no AS versionNo,
                   pv.price, pv.monthly_discount_percent AS monthlyDiscount,
                   pv.yearly_discount_percent AS yearlyDiscount, pv.duration_month AS durationMonth,
                   pv.max_storage AS maxStorage, pv.max_quiz_per_month AS maxQuiz,
                   COALESCE(pv.features_json, '[]') AS featuresJson,
                   CONVERT(NVARCHAR(19), pv.effective_from, 120) AS effectiveFrom,
                   CONVERT(NVARCHAR(19), pv.effective_to, 120) AS effectiveTo,
                   pv.is_active AS isActive, pv.created_at AS createdAt,
                   (SELECT COUNT(*) FROM dbo.USER_SUBSCRIPTION us WHERE us.version_id = pv.version_id) AS subscriberCount
            FROM dbo.SUBSCRIPTION_PLAN sp
            LEFT JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.plan_id = sp.plan_id
            ORDER BY CASE UPPER(sp.plan_name) WHEN 'BASIC' THEN 1 ELSE 2 END,
                     pv.price ASC,
                     UPPER(sp.plan_name),
                     pv.version_no DESC
            """, Map.of());
    }

    @PostMapping
    @Transactional
    public Map<String, Object> createPlan(@RequestBody Map<String, Object> body) {
        String planName = normalizePlanName(body.get("planName"));
        if (planName.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan name is required.");

        List<Map<String, Object>> existing = jdbc.queryForList("""
            SELECT plan_id AS planId FROM dbo.SUBSCRIPTION_PLAN
            WHERE UPPER(plan_name) = UPPER(:plan)
            """, Map.of("plan", planName));
        if (!existing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Plan already exists.");
        }

        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("versionNo", 1)
                .addValue("price", decimal(body.getOrDefault("price", 0)))
                .addValue("monthlyDiscount", discount(body.getOrDefault("monthlyDiscount", 0)))
                .addValue("yearlyDiscount", discount(body.getOrDefault("yearlyDiscount", 0)))
                .addValue("durationMonth", integer(body.get("durationMonth"), 1))
                .addValue("maxStorage", integer(body.get("maxStorage"), 1024))
                .addValue("maxQuiz", integer(body.get("maxQuiz"), 10))
                .addValue("featuresJson", String.valueOf(body.getOrDefault("featuresJson", "[]")));
        Integer planId = insertPlan(planName, p);
        p.addValue("planId", planId);

        Integer versionId = jdbc.queryForObject("""
            INSERT INTO dbo.SUBSCRIPTION_PLAN_VERSION
                (plan_id, version_no, price, monthly_discount_percent, yearly_discount_percent,
                 duration_month, max_storage, max_quiz_per_month,
                 features_json, effective_from, effective_to, is_active, created_at)
            OUTPUT INSERTED.version_id
            VALUES (:planId, :versionNo, :price, :monthlyDiscount, :yearlyDiscount,
                    :durationMonth, :maxStorage, :maxQuiz,
                    :featuresJson, SYSDATETIME(), NULL, 1, SYSDATETIME())
            """, p, Integer.class);

        return jdbc.queryForMap("""
            SELECT sp.plan_id AS planId, UPPER(sp.plan_name) AS [plan],
                   pv.version_id AS versionId, pv.version_no AS versionNo,
                   pv.price, pv.monthly_discount_percent AS monthlyDiscount,
                   pv.yearly_discount_percent AS yearlyDiscount,
                   pv.duration_month AS durationMonth, pv.max_storage AS maxStorage,
                   pv.max_quiz_per_month AS maxQuiz, COALESCE(pv.features_json, '[]') AS featuresJson,
                   pv.is_active AS isActive
            FROM dbo.SUBSCRIPTION_PLAN sp
            JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.plan_id = sp.plan_id
            WHERE pv.version_id = :versionId
            """, Map.of("versionId", versionId));
    }

    @GetMapping("/versions/{versionId}/subscribers")
    public List<Map<String, Object>> versionSubscribers(@PathVariable Integer versionId) {
        return jdbc.queryForList("""
            SELECT us.subscription_id AS subscriptionId,
                   u.user_id AS userId,
                   u.full_name AS name,
                   u.email,
                   us.status,
                   CONVERT(NVARCHAR(10), us.start_date, 120) AS startDate,
                   CONVERT(NVARCHAR(10), us.end_date, 120) AS endDate,
                   COALESCE(us.renewal_policy, 'KEEP_VERSION') AS renewalPolicy,
                   -- Current usage lets the admin see who would be over quota before migrating.
                   CAST(COALESCE(used.bytes, 0) / 1048576 AS INT) AS usedStorageMb
            FROM dbo.USER_SUBSCRIPTION us
            JOIN dbo.[USER] u ON u.user_id = us.user_id
            OUTER APPLY (
                SELECT SUM(CAST(d.document_size AS BIGINT)) AS bytes
                FROM dbo.DOCUMENT d
                WHERE d.user_id = us.user_id AND d.status = 'Active'
            ) used
            WHERE us.version_id = :versionId
            ORDER BY us.end_date DESC, us.subscription_id DESC
            """, Map.of("versionId", versionId));
    }

    /**
     * Moves subscriptions off {@code versionId} and onto the plan's active version.
     *
     * <p>Paid plans are grandfathered by default, so this is the deliberate way an admin passes an
     * improved version on to existing customers. Subscribers whose stored documents exceed the new
     * quota are skipped rather than migrated: silently shrinking their allowance would block
     * uploads for people who did nothing wrong.
     */
    @PostMapping("/versions/{versionId}/migrate")
    @Transactional
    public Map<String, Object> migrateVersion(@PathVariable Integer versionId,
                                              @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> request = body == null ? Map.of() : body;

        List<Map<String, Object>> sourceRows = jdbc.queryForList("""
            SELECT pv.plan_id AS planId, sp.plan_name AS planName, pv.version_no AS versionNo
            FROM dbo.SUBSCRIPTION_PLAN_VERSION pv
            JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = pv.plan_id
            WHERE pv.version_id = :versionId
            """, Map.of("versionId", versionId));
        if (sourceRows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found.");
        int planId = ((Number) sourceRows.get(0).get("planId")).intValue();
        String planName = String.valueOf(sourceRows.get(0).get("planName"));

        List<Map<String, Object>> targetRows = jdbc.queryForList("""
            SELECT TOP 1 version_id AS versionId, version_no AS versionNo,
                   max_storage AS maxStorage, max_quiz_per_month AS maxQuiz
            FROM dbo.SUBSCRIPTION_PLAN_VERSION
            WHERE plan_id = :planId AND is_active = 1
            ORDER BY version_no DESC
            """, Map.of("planId", planId));
        if (targetRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This plan has no active version to migrate to.");
        }
        Map<String, Object> target = targetRows.get(0);
        int targetVersionId = ((Number) target.get("versionId")).intValue();
        int targetStorageMb = integer(target.get("maxStorage"), 0);
        if (targetVersionId == versionId) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This version is already the active one.");
        }

        // An explicit id list migrates just those rows; omitting it migrates everyone on the version.
        List<Integer> requestedIds = new ArrayList<>();
        if (request.get("subscriptionIds") instanceof List<?> ids) {
            for (Object id : ids) {
                if (id instanceof Number n) requestedIds.add(n.intValue());
                else try { requestedIds.add(Integer.parseInt(String.valueOf(id))); } catch (Exception ignored) { }
            }
            if (requestedIds.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No subscriptions selected.");
            }
        }

        MapSqlParameterSource candidateParams = new MapSqlParameterSource("versionId", versionId)
                .addValue("targetStorageMb", targetStorageMb);
        String idFilter = "";
        if (!requestedIds.isEmpty()) {
            idFilter = " AND us.subscription_id IN (:ids)";
            candidateParams.addValue("ids", requestedIds);
        }
        List<Map<String, Object>> candidates = jdbc.queryForList("""
            SELECT us.subscription_id AS subscriptionId, us.user_id AS userId,
                   u.full_name AS name, u.email,
                   CAST(COALESCE(used.bytes, 0) / 1048576 AS INT) AS usedStorageMb,
                   CASE WHEN COALESCE(used.bytes, 0) > CAST(:targetStorageMb AS BIGINT) * 1048576
                        THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS overQuota
            FROM dbo.USER_SUBSCRIPTION us
            JOIN dbo.[USER] u ON u.user_id = us.user_id
            OUTER APPLY (
                SELECT SUM(CAST(d.document_size AS BIGINT)) AS bytes
                FROM dbo.DOCUMENT d
                WHERE d.user_id = us.user_id AND d.status = 'Active'
            ) used
            WHERE us.version_id = :versionId
            """ + idFilter, candidateParams);

        List<Integer> migratableIds = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();
        for (Map<String, Object> candidate : candidates) {
            if (Boolean.TRUE.equals(candidate.get("overQuota"))) {
                skipped.add(Map.of(
                        "subscriptionId", candidate.get("subscriptionId"),
                        "name", candidate.get("name") == null ? "" : candidate.get("name"),
                        "email", candidate.get("email") == null ? "" : candidate.get("email"),
                        "usedStorageMb", candidate.get("usedStorageMb"),
                        "reason", "Uses more storage than the new version allows."));
            } else {
                migratableIds.add(((Number) candidate.get("subscriptionId")).intValue());
            }
        }

        int migrated = 0;
        if (!migratableIds.isEmpty()) {
            migrated = jdbc.update("""
                UPDATE dbo.USER_SUBSCRIPTION
                SET version_id = :targetVersionId
                WHERE subscription_id IN (:ids) AND version_id = :versionId
                """, new MapSqlParameterSource("targetVersionId", targetVersionId)
                    .addValue("ids", migratableIds)
                    .addValue("versionId", versionId));
            announceMigration(planName, target, migratableIds);
        }

        return Map.of(
                "plan", planName.toUpperCase(),
                "fromVersionNo", sourceRows.get(0).get("versionNo"),
                "toVersionNo", target.get("versionNo"),
                "migrated", migrated,
                "skipped", skipped);
    }

    /** Tells the migrated users what changed, since their limits moved without them asking. */
    private void announceMigration(String planName, Map<String, Object> target, List<Integer> subscriptionIds) {
        try {
            String plan = planName.trim().toUpperCase();
            String content = "Your " + plan + " plan has been moved to the latest version. Storage is now "
                    + storageText(integer(target.get("maxStorage"), 0)) + " and quizzes are now "
                    + quizText(integer(target.get("maxQuiz"), 0)) + " per month.";

            Integer announcementId = jdbc.queryForObject("""
                INSERT INTO dbo.ANNOUNCEMENT (user_id, title, content, type, recipient_group, created_at)
                OUTPUT INSERTED.announcement_id
                VALUES (:senderId, :title, :content, 'info', :recipients, GETDATE())
                """, new MapSqlParameterSource("senderId", currentUser.id())
                    .addValue("title", plan + " plan updated")
                    .addValue("content", content)
                    .addValue("recipients", plan + " PLAN"), Integer.class);

            jdbc.update("""
                INSERT INTO dbo.USER_ANNOUNCEMENT (user_id, announcement_id, is_read, read_at)
                SELECT us.user_id, :announcementId, 0, NULL
                FROM dbo.USER_SUBSCRIPTION us
                JOIN dbo.[USER] u ON u.user_id = us.user_id
                LEFT JOIN dbo.USER_SETTINGS settings ON settings.user_id = us.user_id
                WHERE us.subscription_id IN (:ids)
                  AND u.status = 'Active'
                  AND COALESCE(settings.push_notifications, 1) = 1
                """, new MapSqlParameterSource("announcementId", announcementId).addValue("ids", subscriptionIds));
        } catch (Exception e) {
            log.error("Migrated {} subscriptions but could not notify them: {}", subscriptionIds.size(), e.getMessage());
        }
    }

    @PostMapping("/{plan}/versions")
    @Transactional
    public Map<String, Object> createVersion(@PathVariable String plan, @RequestBody Map<String, Object> body) {
        List<Map<String, Object>> plans = jdbc.queryForList("""
            SELECT plan_id AS planId FROM dbo.SUBSCRIPTION_PLAN WITH (UPDLOCK, HOLDLOCK)
            WHERE UPPER(plan_name) = UPPER(:plan)
            """, Map.of("plan", plan));
        if (plans.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found.");
        int planId = ((Number) plans.get(0).get("planId")).intValue();
        List<Map<String, Object>> currentRows = jdbc.queryForList("""
            SELECT TOP 1 price, monthly_discount_percent AS monthlyDiscount,
                         yearly_discount_percent AS yearlyDiscount,
                         duration_month AS durationMonth, max_storage AS maxStorage,
                         max_quiz_per_month AS maxQuiz, COALESCE(features_json, '[]') AS featuresJson
            FROM dbo.SUBSCRIPTION_PLAN_VERSION
            WHERE plan_id=:planId AND is_active=1 ORDER BY version_no DESC
            """, Map.of("planId", planId));
        Map<String, Object> current = currentRows.isEmpty() ? Map.of() : currentRows.get(0);
        Integer versionNo = jdbc.queryForObject("""
            SELECT COALESCE(MAX(version_no), 0) + 1 FROM dbo.SUBSCRIPTION_PLAN_VERSION WITH (UPDLOCK, HOLDLOCK)
            WHERE plan_id = :planId
            """, Map.of("planId", planId), Integer.class);

        jdbc.update("""
            UPDATE dbo.SUBSCRIPTION_PLAN_VERSION
            SET is_active = 0, effective_to = COALESCE(effective_to, SYSDATETIME())
            WHERE plan_id = :planId AND is_active = 1
            """, Map.of("planId", planId));

        MapSqlParameterSource p = new MapSqlParameterSource("planId", planId)
                .addValue("versionNo", versionNo)
                .addValue("price", decimal(body.getOrDefault("price", current.getOrDefault("price", 0))))
                .addValue("monthlyDiscount", discount(body.getOrDefault("monthlyDiscount", current.getOrDefault("monthlyDiscount", 0))))
                .addValue("yearlyDiscount", discount(body.getOrDefault("yearlyDiscount", current.getOrDefault("yearlyDiscount", 0))))
                .addValue("durationMonth", body.containsKey("durationMonth")
                        ? integer(body.get("durationMonth"), 1)
                        : ("Yearly".equalsIgnoreCase(String.valueOf(body.get("billing"))) ? 12
                           : integer(current.get("durationMonth"), 1)))
                .addValue("maxStorage", integer(body.getOrDefault("maxStorage", current.get("maxStorage")), 1024))
                .addValue("maxQuiz", integer(body.getOrDefault("maxQuiz", current.get("maxQuiz")), 10))
                .addValue("featuresJson", String.valueOf(body.getOrDefault("featuresJson",
                        body.getOrDefault("description", current.getOrDefault("featuresJson", "[]")))));
        Integer versionId = jdbc.queryForObject("""
            INSERT INTO dbo.SUBSCRIPTION_PLAN_VERSION
                (plan_id, version_no, price, monthly_discount_percent, yearly_discount_percent,
                 duration_month, max_storage, max_quiz_per_month,
                 features_json, effective_from, effective_to, is_active, created_at)
            OUTPUT INSERTED.version_id
            VALUES (:planId, :versionNo, :price, :monthlyDiscount, :yearlyDiscount,
                    :durationMonth, :maxStorage, :maxQuiz,
                    :featuresJson, SYSDATETIME(), NULL, 1, SYSDATETIME())
            """, p, Integer.class);

        // Free plans are not grandfathered: the new version takes effect for every existing
        // account right away. Move their subscriptions onto it so version_id matches the quota
        // they actually get - otherwise subscriber counts report the new version as unused while
        // it governs every free account. Paid subscribers keep the version they bought and see no
        // change, so creating a version is neither a migration nor news for them.
        if (isFreePlan(plan)) {
            int moved = jdbc.update("""
                UPDATE us
                SET us.version_id = :versionId
                FROM dbo.USER_SUBSCRIPTION us
                WHERE us.plan_id = :planId AND (us.version_id IS NULL OR us.version_id <> :versionId)
                """, new MapSqlParameterSource("versionId", versionId).addValue("planId", planId));
            log.info("Moved {} {} subscription(s) onto version {}", moved, plan, versionId);
            announceFreePlanChange(plan, current, p);
        }

        return jdbc.queryForMap("""
            SELECT UPPER(sp.plan_name) AS [plan], pv.version_id AS versionId, pv.version_no AS versionNo,
                   pv.price, pv.monthly_discount_percent AS monthlyDiscount,
                   pv.yearly_discount_percent AS yearlyDiscount,
                   CASE WHEN pv.duration_month >= 12 THEN 'Yearly' ELSE 'Monthly' END AS billing,
                   pv.duration_month AS durationMonth, pv.max_storage AS maxStorage,
                   pv.max_quiz_per_month AS maxQuiz, COALESCE(pv.features_json, '[]') AS featuresJson,
                   CAST(1 AS bit) AS grandfathered
            FROM dbo.SUBSCRIPTION_PLAN_VERSION pv
            JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id=pv.plan_id
            WHERE pv.version_id=:versionId
            """, Map.of("versionId", versionId));
    }

    @DeleteMapping("/{planId:[0-9]+}")
    @Transactional
    public void deletePlan(@PathVariable Integer planId) {
        List<Map<String, Object>> plans = jdbc.queryForList("""
            SELECT plan_id AS planId FROM dbo.SUBSCRIPTION_PLAN
            WHERE plan_id = :planId
            """, Map.of("planId", planId));
        if (plans.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found.");

        // Check if there are any subscribers for any version of this plan
        Integer subscribersCount = jdbc.queryForObject("""
            SELECT COUNT(*) FROM dbo.USER_SUBSCRIPTION us
            JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.version_id = us.version_id
            WHERE pv.plan_id = :planId
            """, Map.of("planId", planId), Integer.class);

        if (subscribersCount != null && subscribersCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete plan because it has active or past subscribers.");
        }

        // Delete plan versions
        jdbc.update("DELETE FROM dbo.SUBSCRIPTION_PLAN_VERSION WHERE plan_id = :planId", Map.of("planId", planId));

        // Delete plan
        jdbc.update("DELETE FROM dbo.SUBSCRIPTION_PLAN WHERE plan_id = :planId", Map.of("planId", planId));
    }

    @PatchMapping("/subscriptions/{subscriptionId}/renewal-policy")
    public void renewalPolicy(@PathVariable Integer subscriptionId, @RequestBody Map<String, Object> body) {
        String policy = String.valueOf(body.getOrDefault("policy", "KEEP_VERSION")).toUpperCase();
        if (!List.of("KEEP_VERSION", "LATEST_VERSION").contains(policy)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid renewal policy.");
        }
        int rows = jdbc.update("UPDATE dbo.USER_SUBSCRIPTION SET renewal_policy=:policy WHERE subscription_id=:id",
                new MapSqlParameterSource("policy", policy).addValue("id", subscriptionId));
        if (rows == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found.");
    }

    /**
     * Basic is handed to every new account for free, so there is no purchase to grandfather and
     * {@code PlanQuotaService} resolves its quota from the active version for all accounts.
     */
    private boolean isFreePlan(String planName) {
        return "BASIC".equalsIgnoreCase(String.valueOf(planName).trim());
    }

    /**
     * Notifies the users a free-plan version change actually reaches: active subscribers who have
     * not turned push notifications off. Failures are swallowed so a notification problem can
     * never roll back the version the admin just created.
     */
    private void announceFreePlanChange(String planName, Map<String, Object> previous,
                                        MapSqlParameterSource created) {
        try {
            String plan = planName.trim().toUpperCase();
            int newStorage = integer(created.getValue("maxStorage"), 0);
            int newQuiz = integer(created.getValue("maxQuiz"), 0);
            int oldStorage = integer(previous.get("maxStorage"), newStorage);
            int oldQuiz = integer(previous.get("maxQuiz"), newQuiz);
            boolean reduced = newStorage < oldStorage || (newQuiz != -1 && oldQuiz != -1 && newQuiz < oldQuiz);

            StringBuilder content = new StringBuilder("Your ").append(plan).append(" plan has been updated. ");
            if (oldStorage == newStorage && oldQuiz == newQuiz) {
                content.append("Storage stays at ").append(storageText(newStorage))
                       .append(" and quizzes stay at ").append(quizText(newQuiz)).append(" per month.");
            } else {
                if (oldStorage != newStorage) {
                    content.append("Storage: ").append(storageText(oldStorage))
                           .append(" -> ").append(storageText(newStorage)).append(". ");
                }
                if (oldQuiz != newQuiz) {
                    content.append("Quizzes per month: ").append(quizText(oldQuiz))
                           .append(" -> ").append(quizText(newQuiz)).append(". ");
                }
                if (reduced) content.append("Please review your usage so uploads are not blocked.");
            }

            Integer announcementId = jdbc.queryForObject("""
                INSERT INTO dbo.ANNOUNCEMENT (user_id, title, content, type, recipient_group, created_at)
                OUTPUT INSERTED.announcement_id
                VALUES (:senderId, :title, :content, :type, :recipients, GETDATE())
                """, new MapSqlParameterSource("senderId", currentUser.id())
                    .addValue("title", plan + " plan limits updated")
                    .addValue("content", content.toString().trim())
                    .addValue("type", reduced ? "warning" : "info")
                    .addValue("recipients", "FREE PLAN"), Integer.class);

            // Mirrors NotificationController's fan-out: only active accounts on this plan, and
            // only those who still accept push notifications.
            jdbc.update("""
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
                JOIN latest_subscription ls ON ls.user_id = u.user_id AND ls.rn = 1
                LEFT JOIN dbo.USER_SETTINGS settings ON settings.user_id = u.user_id
                WHERE u.status = 'Active'
                  AND UPPER(ls.plan_name) = :plan
                  AND COALESCE(settings.push_notifications, 1) = 1
                """, new MapSqlParameterSource("announcementId", announcementId).addValue("plan", plan));
        } catch (Exception e) {
            log.error("Created a new {} version but could not notify its subscribers: {}",
                    planName, e.getMessage());
        }
    }

    /** Mirrors the frontend formatStorage helper: MB below a gigabyte, GB above. */
    private String storageText(int megabytes) {
        if (megabytes <= 0) return "0 MB";
        if (megabytes < 1024) return megabytes + " MB";
        double gigabytes = megabytes / 1024.0;
        return (gigabytes == Math.floor(gigabytes)
                ? String.valueOf((int) gigabytes)
                : new BigDecimal(gigabytes).setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString())
                + " GB";
    }

    private String quizText(int quizzes) {
        return quizzes == -1 ? "unlimited" : String.valueOf(quizzes);
    }

    private int integer(Object value, int fallback) {
        if (value instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(value)); } catch (Exception ignored) { return fallback; }
    }

    private BigDecimal decimal(Object value) {
        try { return new BigDecimal(String.valueOf(value)); } catch (Exception ignored) { return BigDecimal.ZERO; }
    }

    private BigDecimal discount(Object value) {
        BigDecimal result = decimal(value);
        if (result.compareTo(BigDecimal.ZERO) < 0 || result.compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Discount must be between 0 and 100 percent.");
        }
        return result;
    }

    private String normalizePlanName(Object value) {
        String name = String.valueOf(value == null ? "" : value).trim();
        if (name.length() > 100) name = name.substring(0, 100);
        return name;
    }

    private Integer insertPlan(String planName, MapSqlParameterSource values) {
        List<String> columns = new ArrayList<>();
        List<String> placeholders = new ArrayList<>();
        MapSqlParameterSource params = new MapSqlParameterSource("plan", planName);

        columns.add("plan_name");
        placeholders.add(":plan");

        if (columnExists("SUBSCRIPTION_PLAN", "price")) {
            columns.add("price");
            placeholders.add(":price");
            params.addValue("price", values.getValue("price"));
        }
        if (columnExists("SUBSCRIPTION_PLAN", "duration_month")) {
            columns.add("duration_month");
            placeholders.add(":durationMonth");
            params.addValue("durationMonth", values.getValue("durationMonth"));
        }
        if (columnExists("SUBSCRIPTION_PLAN", "max_storage")) {
            columns.add("max_storage");
            placeholders.add(":maxStorage");
            params.addValue("maxStorage", values.getValue("maxStorage"));
        }
        if (columnExists("SUBSCRIPTION_PLAN", "max_quiz_per_month")) {
            columns.add("max_quiz_per_month");
            placeholders.add(":maxQuiz");
            params.addValue("maxQuiz", values.getValue("maxQuiz"));
        }
        if (columnExists("SUBSCRIPTION_PLAN", "description")) {
            columns.add("description");
            placeholders.add(":featuresJson");
            params.addValue("featuresJson", values.getValue("featuresJson"));
        }
        if (columnExists("SUBSCRIPTION_PLAN", "created_at")) {
            columns.add("created_at");
            placeholders.add("SYSDATETIME()");
        }

        String sql = """
                INSERT INTO dbo.SUBSCRIPTION_PLAN (%s)
                OUTPUT INSERTED.plan_id
                VALUES (%s)
                """.formatted(String.join(", ", columns), String.join(", ", placeholders));
        return jdbc.queryForObject(sql, params, Integer.class);
    }

    private boolean columnExists(String table, String column) {
        Boolean exists = jdbc.queryForObject("""
                SELECT CASE WHEN EXISTS (
                    SELECT 1
                    FROM sys.columns c
                    JOIN sys.objects o ON o.object_id = c.object_id
                    JOIN sys.schemas s ON s.schema_id = o.schema_id
                    WHERE s.name = N'dbo'
                      AND o.name = :table
                      AND c.name = :column
                ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END
                """, Map.of("table", table, "column", column), Boolean.class);
        return Boolean.TRUE.equals(exists);
    }
}
