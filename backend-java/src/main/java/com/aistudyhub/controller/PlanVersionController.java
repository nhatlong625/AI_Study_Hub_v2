package com.aistudyhub.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/plans")
@RequiredArgsConstructor
public class PlanVersionController {
    private final NamedParameterJdbcTemplate jdbc;

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
                   COALESCE(us.renewal_policy, 'KEEP_VERSION') AS renewalPolicy
            FROM dbo.USER_SUBSCRIPTION us
            JOIN dbo.[USER] u ON u.user_id = us.user_id
            WHERE us.version_id = :versionId
            ORDER BY us.end_date DESC, us.subscription_id DESC
            """, Map.of("versionId", versionId));
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
