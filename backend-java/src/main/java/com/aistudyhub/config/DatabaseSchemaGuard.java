package com.aistudyhub.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatabaseSchemaGuard {
    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaGuard.class);

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureRuntimeColumns() {
        run("DOCUMENT.summary_status", """
                IF OBJECT_ID(N'dbo.DOCUMENT', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.DOCUMENT', N'summary_status') IS NULL
                    ALTER TABLE dbo.DOCUMENT ADD summary_status NVARCHAR(30) NOT NULL
                        CONSTRAINT DF_DOCUMENT_summary_status DEFAULT ('UNKNOWN') WITH VALUES
                """);
        run("DOCUMENT.summary_error", """
                IF OBJECT_ID(N'dbo.DOCUMENT', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.DOCUMENT', N'summary_error') IS NULL
                    ALTER TABLE dbo.DOCUMENT ADD summary_error NVARCHAR(500) NULL
                """);
        run("DOCUMENT.summary_updated_at", """
                IF OBJECT_ID(N'dbo.DOCUMENT', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.DOCUMENT', N'summary_updated_at') IS NULL
                    ALTER TABLE dbo.DOCUMENT ADD summary_updated_at DATETIME2 NULL
                """);

        run("USER.is_verified", """
                IF OBJECT_ID(N'dbo.[USER]', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.[USER]', N'is_verified') IS NULL
                    ALTER TABLE dbo.[USER] ADD is_verified BIT NOT NULL
                        CONSTRAINT DF_USER_is_verified DEFAULT 0 WITH VALUES
                """);
        run("USER.verified_at", """
                IF OBJECT_ID(N'dbo.[USER]', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.[USER]', N'verified_at') IS NULL
                    ALTER TABLE dbo.[USER] ADD verified_at DATETIME2 NULL
                """);
        run("USER.deleted_at", """
                IF OBJECT_ID(N'dbo.[USER]', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.[USER]', N'deleted_at') IS NULL
                    ALTER TABLE dbo.[USER] ADD deleted_at DATETIME NULL
                """);

        run("TOKEN.device_info", """
                IF OBJECT_ID(N'dbo.TOKEN', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.TOKEN', N'device_info') IS NULL
                    ALTER TABLE dbo.TOKEN ADD device_info NVARCHAR(255) NULL
                """);
        run("TOKEN.ip_address", """
                IF OBJECT_ID(N'dbo.TOKEN', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.TOKEN', N'ip_address') IS NULL
                    ALTER TABLE dbo.TOKEN ADD ip_address NVARCHAR(50) NULL
                """);
        run("TOKEN.last_used_at", """
                IF OBJECT_ID(N'dbo.TOKEN', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.TOKEN', N'last_used_at') IS NULL
                    ALTER TABLE dbo.TOKEN ADD last_used_at DATETIME2 NULL
                """);
        run("TOKEN.used_at", """
                IF OBJECT_ID(N'dbo.TOKEN', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.TOKEN', N'used_at') IS NULL
                    ALTER TABLE dbo.TOKEN ADD used_at DATETIME2 NULL
                """);
        run("TOKEN.revoked_at", """
                IF OBJECT_ID(N'dbo.TOKEN', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.TOKEN', N'revoked_at') IS NULL
                    ALTER TABLE dbo.TOKEN ADD revoked_at DATETIME2 NULL
                """);

        run("SUBSCRIPTION_PLAN.created_at", """
                IF OBJECT_ID(N'dbo.SUBSCRIPTION_PLAN', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.SUBSCRIPTION_PLAN', N'created_at') IS NULL
                    ALTER TABLE dbo.SUBSCRIPTION_PLAN ADD created_at DATETIME2 NOT NULL
                        CONSTRAINT DF_SUBSCRIPTION_PLAN_created_at DEFAULT SYSDATETIME() WITH VALUES
                """);
        run("SUBSCRIPTION_PLAN_VERSION.monthly_discount_percent", """
                IF OBJECT_ID(N'dbo.SUBSCRIPTION_PLAN_VERSION', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.SUBSCRIPTION_PLAN_VERSION', N'monthly_discount_percent') IS NULL
                    ALTER TABLE dbo.SUBSCRIPTION_PLAN_VERSION ADD monthly_discount_percent DECIMAL(5,2) NOT NULL
                        CONSTRAINT DF_PLAN_VERSION_monthly_discount DEFAULT 0 WITH VALUES
                """);
        run("SUBSCRIPTION_PLAN_VERSION.yearly_discount_percent", """
                IF OBJECT_ID(N'dbo.SUBSCRIPTION_PLAN_VERSION', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.SUBSCRIPTION_PLAN_VERSION', N'yearly_discount_percent') IS NULL
                    ALTER TABLE dbo.SUBSCRIPTION_PLAN_VERSION ADD yearly_discount_percent DECIMAL(5,2) NOT NULL
                        CONSTRAINT DF_PLAN_VERSION_yearly_discount DEFAULT 0 WITH VALUES
                """);

        run("USER_SUBSCRIPTION.auto_renewal", """
                IF OBJECT_ID(N'dbo.USER_SUBSCRIPTION', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.USER_SUBSCRIPTION', N'auto_renewal') IS NULL
                    ALTER TABLE dbo.USER_SUBSCRIPTION ADD auto_renewal BIT NOT NULL
                        CONSTRAINT DF_US_auto_renewal DEFAULT 1 WITH VALUES
                """);
        run("USER_SUBSCRIPTION.renewal_policy", """
                IF OBJECT_ID(N'dbo.USER_SUBSCRIPTION', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.USER_SUBSCRIPTION', N'renewal_policy') IS NULL
                    ALTER TABLE dbo.USER_SUBSCRIPTION ADD renewal_policy NVARCHAR(20) NOT NULL
                        CONSTRAINT DF_USER_SUBSCRIPTION_renewal DEFAULT N'KEEP_VERSION' WITH VALUES
                """);
        run("USER_SUBSCRIPTION.version_id", """
                IF OBJECT_ID(N'dbo.USER_SUBSCRIPTION', N'U') IS NOT NULL
                   AND COL_LENGTH(N'dbo.USER_SUBSCRIPTION', N'version_id') IS NULL
                    ALTER TABLE dbo.USER_SUBSCRIPTION ADD version_id INT NULL
                """);
    }

    private void run(String label, String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception ex) {
            log.warn("Could not ensure database column {}: {}", label, ex.getMessage());
        }
    }
}
