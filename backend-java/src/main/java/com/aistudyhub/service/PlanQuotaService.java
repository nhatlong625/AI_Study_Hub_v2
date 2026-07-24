package com.aistudyhub.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Single source of truth for the quota limits (storage, monthly quiz) that apply to a user.
 *
 * <p>Paid plans are grandfathered: the quota comes from the version stored on the subscription
 * ({@code us.version_id}), so a customer keeps what they paid for until they renew or an admin
 * migrates them. Basic is the free plan handed to every new account, so there is nothing to
 * grandfather — it always resolves to the plan's currently active version, otherwise accounts
 * created before an admin edited Basic would stay frozen on the old limits forever (Basic never
 * renews, so no renewal policy could ever move them forward).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PlanQuotaService {

    /** Applied when the user has no usable subscription row, matching the seeded Basic version. */
    public static final int DEFAULT_MAX_STORAGE_MB = 1024;
    public static final int DEFAULT_MAX_QUIZ_PER_MONTH = 10;

    private static final PlanQuota DEFAULT_QUOTA =
            new PlanQuota("Basic", DEFAULT_MAX_STORAGE_MB, DEFAULT_MAX_QUIZ_PER_MONTH);

    private final JdbcTemplate jdbcTemplate;

    /**
     * Quota in force for a user. {@code maxQuizPerMonth} of -1 means unlimited.
     */
    public record PlanQuota(String planName, int maxStorageMb, int maxQuizPerMonth) {
        public long maxStorageBytes() {
            return (long) maxStorageMb * 1024L * 1024L;
        }
    }

    @Transactional(readOnly = true)
    public PlanQuota getQuota(Integer userId) {
        if (userId == null) return DEFAULT_QUOTA;
        try {
            // OUTER APPLY resolves the plan's active version; the LEFT JOIN on the purchased
            // version tolerates rows written without a version_id. Basic prefers the active
            // version, paid plans prefer the purchased one, and either falls back to the other.
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                    SELECT TOP 1
                           sp.plan_name AS planName,
                           CASE WHEN UPPER(sp.plan_name) = 'BASIC'
                                THEN COALESCE(active_pv.max_storage, purchased_pv.max_storage)
                                ELSE COALESCE(purchased_pv.max_storage, active_pv.max_storage)
                           END AS maxStorage,
                           CASE WHEN UPPER(sp.plan_name) = 'BASIC'
                                THEN COALESCE(active_pv.max_quiz_per_month, purchased_pv.max_quiz_per_month)
                                ELSE COALESCE(purchased_pv.max_quiz_per_month, active_pv.max_quiz_per_month)
                           END AS maxQuiz
                    FROM dbo.USER_SUBSCRIPTION us
                    JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = us.plan_id
                    LEFT JOIN dbo.SUBSCRIPTION_PLAN_VERSION purchased_pv
                           ON purchased_pv.version_id = us.version_id
                    OUTER APPLY (
                        SELECT TOP 1 v.max_storage, v.max_quiz_per_month
                        FROM dbo.SUBSCRIPTION_PLAN_VERSION v
                        WHERE v.plan_id = sp.plan_id AND v.is_active = 1
                        ORDER BY v.version_no DESC
                    ) active_pv
                    WHERE us.user_id = ? AND us.status = 'Active'
                    ORDER BY us.end_date DESC, us.subscription_id DESC
                    """, userId);
            if (rows.isEmpty()) return DEFAULT_QUOTA;

            Map<String, Object> row = rows.get(0);
            return new PlanQuota(
                    row.get("planName") == null ? DEFAULT_QUOTA.planName() : String.valueOf(row.get("planName")),
                    intOr(row.get("maxStorage"), DEFAULT_MAX_STORAGE_MB),
                    intOr(row.get("maxQuiz"), DEFAULT_MAX_QUIZ_PER_MONTH));
        } catch (Exception e) {
            // Never block the user on a quota lookup failure, but make it visible: silently
            // serving the default limits used to hide schema/connection problems.
            log.error("Failed to resolve plan quota for user {}, falling back to defaults: {}",
                    userId, e.getMessage());
            return DEFAULT_QUOTA;
        }
    }

    private int intOr(Object value, int fallback) {
        return value instanceof Number n ? n.intValue() : fallback;
    }
}
