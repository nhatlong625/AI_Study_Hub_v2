USE master;
GO

/*==============================================================================
  AI_StudyHub - Full database schema for the current project

  Notes:
  - Script is idempotent: it creates the database, tables, constraints, and seed
    data only when missing.
  - The schema below matches the current project database surface:
    auth/roles, library, documents, sharing, AI summary/chat, practice tests,
    payment/upgrade, admin announcements, reports, study activity, and tokens.
  - The system has exactly two roles: Student (role_id 1) and Admin (role_id 2).
  - Seed login accounts:
      admin2@aistudyhub.local   / Admin@123456
      student2@aistudyhub.local / Student@123456
==============================================================================*/

IF DB_ID(N'AI_StudyHub') IS NULL
BEGIN
    CREATE DATABASE AI_StudyHub;
END
GO

USE AI_StudyHub;
GO

/*==============================================================================
  1. Identity and subscription core
==============================================================================*/

IF OBJECT_ID(N'dbo.ROLE', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ROLE
    (
        role_id     INT IDENTITY(1,1) NOT NULL,
        role_name   NVARCHAR(50) NOT NULL,
        description NVARCHAR(255) NULL,
        created_at  DATETIME NOT NULL CONSTRAINT DF_ROLE_created_at DEFAULT GETDATE(),
        updated_at  DATETIME NULL,
        CONSTRAINT PK_ROLE PRIMARY KEY (role_id),
        CONSTRAINT UQ_ROLE_role_name UNIQUE (role_name)
    );

    SET IDENTITY_INSERT dbo.ROLE ON;
    INSERT INTO dbo.ROLE (role_id, role_name, description, created_at)
    VALUES
        (1, N'Student', N'Default authenticated user role.', GETDATE()),
        (2, N'Admin', N'Administrator role for admin dashboard and management screens.', GETDATE());
    SET IDENTITY_INSERT dbo.ROLE OFF;
END
GO

IF OBJECT_ID(N'dbo.SUBSCRIPTION_PLAN', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SUBSCRIPTION_PLAN
    (
        plan_id    INT IDENTITY(1,1) NOT NULL,
        plan_name  NVARCHAR(100) NOT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_SUBSCRIPTION_PLAN_created_at DEFAULT SYSDATETIME(),
        CONSTRAINT PK_SUBSCRIPTION_PLAN PRIMARY KEY (plan_id),
        CONSTRAINT UQ_SUBSCRIPTION_PLAN_name UNIQUE (plan_name)
    );
END
GO

IF OBJECT_ID(N'dbo.SUBSCRIPTION_PLAN_VERSION', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SUBSCRIPTION_PLAN_VERSION
    (
        version_id          INT IDENTITY(1,1) NOT NULL,
        plan_id             INT NOT NULL,
        version_no          INT NOT NULL,
        price               DECIMAL(12,2) NOT NULL,
        monthly_discount_percent DECIMAL(5,2) NOT NULL CONSTRAINT DF_PLAN_VERSION_monthly_discount DEFAULT 0,
        yearly_discount_percent  DECIMAL(5,2) NOT NULL CONSTRAINT DF_PLAN_VERSION_yearly_discount DEFAULT 0,
        duration_month      INT NOT NULL,
        max_storage         INT NOT NULL,
        max_quiz_per_month  INT NOT NULL,
        features_json       NVARCHAR(MAX) NULL,
        effective_from      DATETIME2 NOT NULL,
        effective_to        DATETIME2 NULL,
        is_active           BIT NOT NULL CONSTRAINT DF_PLAN_VERSION_active DEFAULT 1,
        created_at          DATETIME2 NOT NULL CONSTRAINT DF_PLAN_VERSION_created DEFAULT SYSDATETIME(),
        CONSTRAINT PK_SUBSCRIPTION_PLAN_VERSION PRIMARY KEY (version_id),
        CONSTRAINT UQ_SUBSCRIPTION_PLAN_VERSION UNIQUE (plan_id, version_no),
        CONSTRAINT CK_PLAN_VERSION_monthly_discount CHECK (monthly_discount_percent BETWEEN 0 AND 100),
        CONSTRAINT CK_PLAN_VERSION_yearly_discount CHECK (yearly_discount_percent BETWEEN 0 AND 100),
        CONSTRAINT FK_PLAN_VERSION_PLAN FOREIGN KEY (plan_id) REFERENCES dbo.SUBSCRIPTION_PLAN(plan_id)
    );
END
GO

IF OBJECT_ID(N'dbo.[USER]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[USER]
    (
        user_id       INT IDENTITY(1,1) NOT NULL,
        role_id       INT NOT NULL,
        full_name     NVARCHAR(100) NOT NULL,
        email         NVARCHAR(150) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        avatar_url    NVARCHAR(500) NULL,
        status        NVARCHAR(30) NOT NULL CONSTRAINT DF_USER_status DEFAULT N'Active',
        is_verified   BIT NOT NULL CONSTRAINT DF_USER_is_verified DEFAULT 0,
        verified_at   DATETIME2 NULL,
        created_at    DATETIME NOT NULL CONSTRAINT DF_USER_created_at DEFAULT GETDATE(),
        updated_at    DATETIME NULL,
        last_login    DATETIME NULL,
        CONSTRAINT PK_USER PRIMARY KEY (user_id),
        CONSTRAINT UQ_USER_email UNIQUE (email)
    );
END
GO

IF OBJECT_ID(N'dbo.USER_SUBSCRIPTION', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.USER_SUBSCRIPTION
    (
        subscription_id INT IDENTITY(1,1) NOT NULL,
        user_id         INT NOT NULL,
        plan_id         INT NOT NULL,
        version_id      INT NULL,
        start_date      DATE NOT NULL,
        end_date        DATE NOT NULL,
        status          NVARCHAR(30) NOT NULL,
        renewal_policy  NVARCHAR(20) NOT NULL CONSTRAINT DF_USER_SUBSCRIPTION_renewal DEFAULT N'KEEP_VERSION',
        CONSTRAINT PK_USER_SUBSCRIPTION PRIMARY KEY (subscription_id)
    );
END
GO

IF OBJECT_ID(N'dbo.PAYMENT_HISTORY', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PAYMENT_HISTORY
    (
        payment_id       INT IDENTITY(1,1) NOT NULL,
        subscription_id  INT NOT NULL,
        amount           DECIMAL(12,2) NOT NULL,
        payment_method   NVARCHAR(50) NOT NULL,
        transaction_code NVARCHAR(100) NOT NULL,
        payment_status   NVARCHAR(30) NOT NULL,
        payment_date     DATETIME NOT NULL,
        CONSTRAINT PK_PAYMENT_HISTORY PRIMARY KEY (payment_id)
    );
END
GO

IF OBJECT_ID(N'dbo.PAYMENT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PAYMENT
    (
        payment_id    INT IDENTITY(1,1) NOT NULL,
        user_id       INT NOT NULL,
        order_code    BIGINT NOT NULL,
        plan_code     NVARCHAR(20) NOT NULL,
        billing_cycle NVARCHAR(20) NOT NULL,
        amount        BIGINT NOT NULL,
        status        NVARCHAR(20) NOT NULL CONSTRAINT DF_PAYMENT_status DEFAULT N'PENDING',
        checkout_url  NVARCHAR(500) NULL,
        created_at    DATETIME2 NULL CONSTRAINT DF_PAYMENT_created_at DEFAULT SYSUTCDATETIME(),
        paid_at       DATETIME2 NULL,
        CONSTRAINT PK_PAYMENT PRIMARY KEY (payment_id),
        CONSTRAINT UQ_PAYMENT_order_code UNIQUE (order_code)
    );
END
GO

/*==============================================================================
  2. Library, courses, and documents
==============================================================================*/

IF OBJECT_ID(N'dbo.SEMESTER', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SEMESTER
    (
        semester_id   INT IDENTITY(1,1) NOT NULL,
        semester_name NVARCHAR(100) NOT NULL,
        created_at    DATETIME NOT NULL,
        updated_at    DATETIME NULL,
        CONSTRAINT PK_SEMESTER PRIMARY KEY (semester_id)
    );
END
GO

IF OBJECT_ID(N'dbo.SUBJECT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SUBJECT
    (
        subject_id   INT IDENTITY(1,1) NOT NULL,
        semester_id  INT NOT NULL,
        subject_name NVARCHAR(100) NOT NULL,
        subject_code NVARCHAR(50)  NULL,
        description  NVARCHAR(500) NULL,
        created_at   DATETIME NOT NULL,
        updated_at   DATETIME NULL,
        CONSTRAINT PK_SUBJECT PRIMARY KEY (subject_id)
    );
END
GO

IF OBJECT_ID(N'dbo.USER_SUBJECT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.USER_SUBJECT
    (
        user_subject_id INT IDENTITY(1,1) NOT NULL,
        user_id         INT NOT NULL,
        subject_id      INT NOT NULL,
        added_at        DATETIME2 NOT NULL CONSTRAINT DF_USER_SUBJECT_added_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_USER_SUBJECT PRIMARY KEY (user_subject_id),
        CONSTRAINT UQ_USER_SUBJECT_USER_SUBJECT UNIQUE (user_id, subject_id)
    );
END
GO

IF OBJECT_ID(N'dbo.DOCUMENT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DOCUMENT
    (
        document_id       INT IDENTITY(1,1) NOT NULL,
        user_id           INT NOT NULL,
        subject_id        INT NOT NULL,
        title             NVARCHAR(255) NOT NULL,
        document_name     NVARCHAR(255) NOT NULL,
        document_type     NVARCHAR(50) NOT NULL,
        document_size     BIGINT NOT NULL,
        document_url      NVARCHAR(500) NOT NULL,
        visibility_status NVARCHAR(30) NOT NULL,
        status            NVARCHAR(30) NOT NULL,
        summary_status    NVARCHAR(30) NOT NULL CONSTRAINT DF_DOCUMENT_summary_status DEFAULT ('UNKNOWN'),
        summary_error     NVARCHAR(500) NULL,
        summary_updated_at DATETIME2 NULL,
        uploaded_at       DATETIME NOT NULL,
        created_at        DATETIME NOT NULL,
        updated_at        DATETIME NULL,
        CONSTRAINT PK_DOCUMENT PRIMARY KEY (document_id)
    );
END
GO

IF COL_LENGTH('dbo.DOCUMENT', 'summary_status') IS NULL
    ALTER TABLE dbo.DOCUMENT ADD summary_status NVARCHAR(30) NOT NULL
        CONSTRAINT DF_DOCUMENT_summary_status DEFAULT ('UNKNOWN');
GO

IF COL_LENGTH('dbo.DOCUMENT', 'summary_error') IS NULL
    ALTER TABLE dbo.DOCUMENT ADD summary_error NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.DOCUMENT', 'summary_updated_at') IS NULL
    ALTER TABLE dbo.DOCUMENT ADD summary_updated_at DATETIME2 NULL;
GO

IF OBJECT_ID(N'dbo.DOCUMENT_SHARE', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DOCUMENT_SHARE
    (
        share_id          INT IDENTITY(1,1) NOT NULL,
        document_id       INT NOT NULL,
        user_id           INT NOT NULL,
        description       NVARCHAR(500) NULL,
        share_type        NVARCHAR(30) NOT NULL,
        status            NVARCHAR(30) NOT NULL,
        shared_to_user_id INT NULL,
        permission        NVARCHAR(20) NULL,
        CONSTRAINT PK_DOCUMENT_SHARE PRIMARY KEY (share_id)
    );
END
GO

/*==============================================================================
  3. AI summary, chat, comments, and reports
==============================================================================*/

IF OBJECT_ID(N'dbo.AI_SUMMARY', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AI_SUMMARY
    (
        summary_id      INT IDENTITY(1,1) NOT NULL,
        document_id     INT NOT NULL,
        user_id         INT NOT NULL,
        summary_content NVARCHAR(MAX) NOT NULL,
        model_name      NVARCHAR(100) NOT NULL,
        created_at      DATETIME NOT NULL,
        CONSTRAINT PK_AI_SUMMARY PRIMARY KEY (summary_id)
    );
END
GO

IF OBJECT_ID(N'dbo.CHAT_SESSION', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CHAT_SESSION
    (
        session_id    INT IDENTITY(1,1) NOT NULL,
        user_id       INT NOT NULL,
        document_id   INT NULL,
        session_title NVARCHAR(255) NOT NULL,
        created_at    DATETIME NOT NULL,
        updated_at    DATETIME NULL,
        CONSTRAINT PK_CHAT_SESSION PRIMARY KEY (session_id)
    );
END
GO

IF OBJECT_ID(N'dbo.CHAT_MESSAGE', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CHAT_MESSAGE
    (
        message_id      INT IDENTITY(1,1) NOT NULL,
        session_id      INT NOT NULL,
        session_type    NVARCHAR(30) NOT NULL,
        message_content NVARCHAR(MAX) NOT NULL,
        created_at      DATETIME NOT NULL,
        sources_json    NVARCHAR(MAX) NULL,
        CONSTRAINT PK_CHAT_MESSAGE PRIMARY KEY (message_id)
    );
END
GO

IF OBJECT_ID(N'dbo.AI_CHAT_CACHE', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AI_CHAT_CACHE
    (
        cache_id     INT IDENTITY(1,1) NOT NULL,
        cache_key    CHAR(64) NOT NULL,
        user_id      INT NULL,
        answer       NVARCHAR(MAX) NOT NULL,
        sources_json NVARCHAR(MAX) NULL,
        created_at   DATETIME2 NOT NULL CONSTRAINT DF_AI_CHAT_CACHE_created_at DEFAULT SYSUTCDATETIME(),
        last_used_at DATETIME2 NULL,
        hit_count    INT NOT NULL CONSTRAINT DF_AI_CHAT_CACHE_hit_count DEFAULT 0,
        CONSTRAINT PK_AI_CHAT_CACHE PRIMARY KEY (cache_id),
        CONSTRAINT UQ_AI_CHAT_CACHE_key UNIQUE (cache_key)
    );
END
GO

IF OBJECT_ID(N'dbo.AI_QUERY_TRANSLATION_CACHE', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AI_QUERY_TRANSLATION_CACHE
    (
        cache_id         INT IDENTITY(1,1) NOT NULL,
        cache_key        CHAR(64) NOT NULL,
        original_query   NVARCHAR(1000) NOT NULL,
        translated_query NVARCHAR(1000) NOT NULL,
        created_at       DATETIME2 NOT NULL CONSTRAINT DF_AI_QUERY_TRANSLATION_CACHE_created_at DEFAULT SYSUTCDATETIME(),
        last_used_at     DATETIME2 NULL,
        hit_count        INT NOT NULL CONSTRAINT DF_AI_QUERY_TRANSLATION_CACHE_hit_count DEFAULT 0,
        CONSTRAINT PK_AI_QUERY_TRANSLATION_CACHE PRIMARY KEY (cache_id),
        CONSTRAINT UQ_AI_QUERY_TRANSLATION_CACHE_key UNIQUE (cache_key)
    );
END
GO

IF OBJECT_ID(N'dbo.AI_USAGE_LOG', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AI_USAGE_LOG
    (
        usage_id          INT IDENTITY(1,1) NOT NULL,
        user_id           INT NULL,
        feature           NVARCHAR(30) NOT NULL,
        provider          NVARCHAR(30) NULL,
        model_name        NVARCHAR(100) NULL,
        prompt_tokens     INT NULL,
        completion_tokens INT NULL,
        total_tokens      INT NULL,
        estimated         BIT NOT NULL CONSTRAINT DF_AI_USAGE_LOG_estimated DEFAULT 0,
        document_id       INT NULL,
        session_id        INT NULL,
        context_count     INT NULL,
        context_chars     INT NULL,
        cache_hit         BIT NOT NULL CONSTRAINT DF_AI_USAGE_LOG_cache_hit DEFAULT 0,
        success           BIT NOT NULL CONSTRAINT DF_AI_USAGE_LOG_success DEFAULT 1,
        error_message     NVARCHAR(500) NULL,
        created_at        DATETIME2 NOT NULL CONSTRAINT DF_AI_USAGE_LOG_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AI_USAGE_LOG PRIMARY KEY (usage_id)
    );
END
GO


IF OBJECT_ID(N'dbo.COMMENT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.COMMENT
    (
        comment_id   INT IDENTITY(1,1) NOT NULL,
        user_id      INT NOT NULL,
        document_id  INT NOT NULL,
        session_type NVARCHAR(30) NOT NULL,
        content      NVARCHAR(MAX) NOT NULL,
        created_at   DATETIME NOT NULL,
        CONSTRAINT PK_COMMENT PRIMARY KEY (comment_id)
    );
END
GO

IF OBJECT_ID(N'dbo.REPORT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.REPORT
    (
        report_id   INT IDENTITY(1,1) NOT NULL,
        user_id     INT NOT NULL,
        document_id INT NOT NULL,
        reason      NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        status      NVARCHAR(30) NOT NULL,
        created_at  DATETIME NOT NULL,
        CONSTRAINT PK_REPORT PRIMARY KEY (report_id)
    );
END
GO

/*==============================================================================
  4. Practice tests and quiz progress

  Note:
  - TEST_ATTEMPT.last_question_index and answers_snapshot are required by the
    current Practice Test resume/save-progress flow.
  - ANSWER_OPTION.question_id exists in the current DB without a FK constraint.
==============================================================================*/

IF OBJECT_ID(N'dbo.AI_QUESTION', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AI_QUESTION
    (
        question_id    INT IDENTITY(1,1) NOT NULL,
        document_id    INT NOT NULL,
        title          NVARCHAR(255) NOT NULL,
        description    NVARCHAR(MAX) NULL,
        total_question INT NOT NULL,
        time_limit     INT NOT NULL,
        created_at     DATETIME NOT NULL,
        CONSTRAINT PK_AI_QUESTION PRIMARY KEY (question_id)
    );
END
GO

IF OBJECT_ID(N'dbo.QUIZ_TEST', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.QUIZ_TEST
    (
        quiz_id          INT IDENTITY(1,1) NOT NULL,
        question_id      INT NOT NULL,
        question_content NVARCHAR(MAX) NOT NULL,
        question_type    NVARCHAR(50) NOT NULL,
        correct_answer   NVARCHAR(MAX) NOT NULL,
        difficulty_level NVARCHAR(30) NOT NULL,
        CONSTRAINT PK_QUIZ_TEST PRIMARY KEY (quiz_id)
    );
END
GO

IF OBJECT_ID(N'dbo.ANSWER_OPTION', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ANSWER_OPTION
    (
        option_id      INT IDENTITY(1,1) NOT NULL,
        question_id    INT NOT NULL,
        option_content NVARCHAR(MAX) NOT NULL,
        is_correct     BIT NOT NULL,
        CONSTRAINT PK_ANSWER_OPTION PRIMARY KEY (option_id)
    );
END
GO

IF OBJECT_ID(N'dbo.TEST_ATTEMPT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TEST_ATTEMPT
    (
        attempt_id          INT IDENTITY(1,1) NOT NULL,
        user_id             INT NOT NULL,
        test_id             INT NOT NULL,
        question_id         INT NOT NULL,
        start_time          DATETIME NOT NULL,
        end_time            DATETIME NULL,
        score               DECIMAL(5,2) NULL,
        status              NVARCHAR(30) NOT NULL,
        last_question_index INT NOT NULL CONSTRAINT DF_TEST_ATTEMPT_last_question_index DEFAULT (0),
        answers_snapshot    NVARCHAR(MAX) NULL,
        CONSTRAINT PK_TEST_ATTEMPT PRIMARY KEY (attempt_id)
    );
END
GO

IF OBJECT_ID(N'dbo.TEST_RESULT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TEST_RESULT
    (
        result_id      INT IDENTITY(1,1) NOT NULL,
        attempt_id     INT NOT NULL,
        total_question INT NOT NULL,
        correct_answer INT NOT NULL,
        score          DECIMAL(5,2) NOT NULL,
        grade          NVARCHAR(20) NOT NULL,
        generated_at   DATETIME NOT NULL,
        CONSTRAINT PK_TEST_RESULT PRIMARY KEY (result_id)
    );
END
GO

IF OBJECT_ID(N'dbo.USER_ANSWER', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.USER_ANSWER
    (
        user_answer_id INT IDENTITY(1,1) NOT NULL,
        attempt_id     INT NOT NULL,
        question_id    INT NOT NULL,
        option_id      INT NOT NULL,
        selected_answer NVARCHAR(MAX) NOT NULL,
        is_correct     BIT NOT NULL,
        answered_at    DATETIME NOT NULL,
        CONSTRAINT PK_USER_ANSWER PRIMARY KEY (user_answer_id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AI_SUMMARY_DOCUMENT_MODEL_LATEST' AND object_id = OBJECT_ID(N'dbo.AI_SUMMARY'))
    CREATE INDEX IX_AI_SUMMARY_DOCUMENT_MODEL_LATEST
        ON dbo.AI_SUMMARY(document_id, model_name, created_at DESC, summary_id DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_COMMENT_DOCUMENT_CREATED' AND object_id = OBJECT_ID(N'dbo.COMMENT'))
    CREATE INDEX IX_COMMENT_DOCUMENT_CREATED
        ON dbo.COMMENT(document_id, created_at ASC, comment_id ASC);
GO


IF OBJECT_ID(N'dbo.SUBSCRIPTION_HISTORY', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SUBSCRIPTION_HISTORY
    (
        history_id       BIGINT IDENTITY(1,1) NOT NULL,
        subscription_id  INT NOT NULL,
        user_id          INT NOT NULL,
        old_plan_id      INT NULL,
        old_version_id   INT NULL,
        new_plan_id      INT NOT NULL,
        new_version_id   INT NOT NULL,
        payment_id       INT NULL,
        change_type      NVARCHAR(30) NOT NULL,
        notes            NVARCHAR(500) NULL,
        changed_at       DATETIME2 NOT NULL CONSTRAINT DF_SUBSCRIPTION_HISTORY_changed DEFAULT SYSDATETIME(),
        CONSTRAINT PK_SUBSCRIPTION_HISTORY PRIMARY KEY (history_id)
    );
END
GO

IF OBJECT_ID(N'dbo.AI_PROVIDER_CONFIG', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AI_PROVIDER_CONFIG
    (
        config_id          INT IDENTITY(1,1) NOT NULL,
        provider           NVARCHAR(30) NOT NULL,
        model_name         NVARCHAR(100) NOT NULL,
        encrypted_api_key  NVARCHAR(MAX) NULL,
        key_hint           NVARCHAR(20) NULL,
        enabled            BIT NOT NULL CONSTRAINT DF_AI_PROVIDER_CONFIG_enabled DEFAULT (1),
        priority           INT NOT NULL CONSTRAINT DF_AI_PROVIDER_CONFIG_priority DEFAULT (100),
        temperature        DECIMAL(4,2) NOT NULL CONSTRAINT DF_AI_PROVIDER_CONFIG_temperature DEFAULT (0.30),
        max_tokens         INT NOT NULL CONSTRAINT DF_AI_PROVIDER_CONFIG_max_tokens DEFAULT (2048),
        top_p              DECIMAL(4,2) NOT NULL CONSTRAINT DF_AI_PROVIDER_CONFIG_top_p DEFAULT (1.00),
        system_prompt      NVARCHAR(MAX) NULL,
        updated_by         INT NULL,
        updated_at         DATETIME2 NOT NULL CONSTRAINT DF_AI_PROVIDER_CONFIG_updated_at DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_AI_PROVIDER_CONFIG PRIMARY KEY (config_id),
        CONSTRAINT UQ_AI_PROVIDER_CONFIG_provider UNIQUE (provider),
        CONSTRAINT FK_AI_PROVIDER_CONFIG_USER FOREIGN KEY (updated_by) REFERENCES dbo.[USER](user_id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AI_PROVIDER_CONFIG WHERE provider = N'OPENAI')
    INSERT INTO dbo.AI_PROVIDER_CONFIG (provider, model_name, enabled, priority)
    VALUES (N'OPENAI', N'gpt-4o-mini', 1, 1);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AI_PROVIDER_CONFIG WHERE provider = N'GEMINI')
    INSERT INTO dbo.AI_PROVIDER_CONFIG (provider, model_name, enabled, priority)
    VALUES (N'GEMINI', N'gemini-2.5-flash', 1, 2);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AI_PROVIDER_CONFIG WHERE provider = N'DEEPSEEK')
    INSERT INTO dbo.AI_PROVIDER_CONFIG (provider, model_name, enabled, priority)
    VALUES (N'DEEPSEEK', N'deepseek-chat', 1, 3);
GO

/*==============================================================================
  5. Notifications, study tracking, and auth tokens
==============================================================================*/

IF OBJECT_ID(N'dbo.ANNOUNCEMENT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ANNOUNCEMENT
    (
        announcement_id INT IDENTITY(1,1) NOT NULL,
        user_id         INT NOT NULL,
        title           NVARCHAR(255) NOT NULL,
        content         NVARCHAR(MAX) NOT NULL,
        type            NVARCHAR(50) NOT NULL,
        recipient_group NVARCHAR(30) NULL,
        created_at      DATETIME NOT NULL,
        CONSTRAINT PK_ANNOUNCEMENT PRIMARY KEY (announcement_id)
    );
END
GO

IF OBJECT_ID(N'dbo.USER_ANNOUNCEMENT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.USER_ANNOUNCEMENT
    (
        user_announcement_id INT IDENTITY(1,1) NOT NULL,
        user_id              INT NOT NULL,
        announcement_id      INT NOT NULL,
        is_read              BIT NOT NULL,
        read_at              DATETIME NULL,
        CONSTRAINT PK_USER_ANNOUNCEMENT PRIMARY KEY (user_announcement_id)
    );
END
GO

IF OBJECT_ID(N'dbo.STUDY_STREAK', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.STUDY_STREAK
    (
        streak_id         INT IDENTITY(1,1) NOT NULL,
        user_id           INT NOT NULL,
        current_streak    INT NOT NULL,
        longest_streak    INT NOT NULL,
        last_study_date   DATE NULL,
        streak_start_date DATE NULL,
        total_study_days  INT NOT NULL,
        status            NVARCHAR(30) NOT NULL,
        created_at        DATETIME NOT NULL,
        updated_at        DATETIME NULL,
        CONSTRAINT PK_STUDY_STREAK PRIMARY KEY (streak_id)
    );
END
GO

IF OBJECT_ID(N'dbo.STUDY_ACTIVITY', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.STUDY_ACTIVITY
    (
        activity_id     INT IDENTITY(1,1) NOT NULL,
        user_id         INT NOT NULL,
        document_id     INT NOT NULL,
        summary_id      INT NOT NULL,
        session_id      INT NOT NULL,
        question_id     INT NOT NULL,
        activity_type   NVARCHAR(50) NOT NULL,
        study_duration  INT NOT NULL,
        activity_date   DATETIME NOT NULL,
        is_valid_streak BIT NOT NULL,
        created_at      DATETIME NOT NULL,
        CONSTRAINT PK_STUDY_ACTIVITY PRIMARY KEY (activity_id)
    );
END
GO

-- Normalize the legacy plural table name before creating/altering TOKEN.
IF EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID(N'dbo') AND name COLLATE Latin1_General_100_BIN2 = N'Tokens')
    EXEC sys.sp_rename N'dbo.Tokens', N'TOKEN', N'OBJECT';
GO

IF OBJECT_ID(N'dbo.FK_Tokens_User', N'F') IS NOT NULL
    EXEC sys.sp_rename N'dbo.FK_Tokens_User', N'FK_TOKEN_USER', N'OBJECT';
GO

IF OBJECT_ID(N'dbo.TOKEN', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TOKEN
    (
        token_id     INT IDENTITY(1,1) NOT NULL,
        user_id      INT NOT NULL,
        token        NVARCHAR(800) NOT NULL,
        token_type   NVARCHAR(20) NOT NULL,
        expires_at   DATETIME2 NOT NULL,
        is_used      BIT NOT NULL CONSTRAINT DF_Tokens_is_used DEFAULT (0),
        created_at   DATETIME2 NOT NULL CONSTRAINT DF_Tokens_created_at DEFAULT SYSUTCDATETIME(),
        used_at      DATETIME2 NULL,
        revoked_at   DATETIME2 NULL,
        device_info  NVARCHAR(255) NULL,
        ip_address   NVARCHAR(50) NULL,
        last_used_at DATETIME2 NULL,
        CONSTRAINT PK_Tokens PRIMARY KEY (token_id),
        CONSTRAINT UQ_Tokens_token UNIQUE (token)
    );
END
GO

/*==============================================================================
  6. Foreign keys
==============================================================================*/

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_ROLE')
    ALTER TABLE dbo.[USER] ADD CONSTRAINT FK_USER_ROLE FOREIGN KEY (role_id) REFERENCES dbo.ROLE(role_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_SUBSCRIPTION_USER')
    ALTER TABLE dbo.USER_SUBSCRIPTION ADD CONSTRAINT FK_USER_SUBSCRIPTION_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_SUBSCRIPTION_PLAN')
    ALTER TABLE dbo.USER_SUBSCRIPTION ADD CONSTRAINT FK_USER_SUBSCRIPTION_PLAN FOREIGN KEY (plan_id) REFERENCES dbo.SUBSCRIPTION_PLAN(plan_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PAYMENT_HISTORY_SUBSCRIPTION')
    ALTER TABLE dbo.PAYMENT_HISTORY ADD CONSTRAINT FK_PAYMENT_HISTORY_SUBSCRIPTION FOREIGN KEY (subscription_id) REFERENCES dbo.USER_SUBSCRIPTION(subscription_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PAYMENT_USER')
    ALTER TABLE dbo.PAYMENT ADD CONSTRAINT FK_PAYMENT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SUBJECT_SEMESTER')
    ALTER TABLE dbo.SUBJECT ADD CONSTRAINT FK_SUBJECT_SEMESTER FOREIGN KEY (semester_id) REFERENCES dbo.SEMESTER(semester_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_SUBJECT_USER')
    ALTER TABLE dbo.USER_SUBJECT ADD CONSTRAINT FK_USER_SUBJECT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_SUBJECT_SUBJECT')
    ALTER TABLE dbo.USER_SUBJECT ADD CONSTRAINT FK_USER_SUBJECT_SUBJECT FOREIGN KEY (subject_id) REFERENCES dbo.SUBJECT(subject_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DOCUMENT_USER')
    ALTER TABLE dbo.DOCUMENT ADD CONSTRAINT FK_DOCUMENT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DOCUMENT_SUBJECT')
    ALTER TABLE dbo.DOCUMENT ADD CONSTRAINT FK_DOCUMENT_SUBJECT FOREIGN KEY (subject_id) REFERENCES dbo.SUBJECT(subject_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DOCUMENT_SHARE_DOCUMENT')
    ALTER TABLE dbo.DOCUMENT_SHARE ADD CONSTRAINT FK_DOCUMENT_SHARE_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DOCUMENT_SHARE_USER')
    ALTER TABLE dbo.DOCUMENT_SHARE ADD CONSTRAINT FK_DOCUMENT_SHARE_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AI_SUMMARY_DOCUMENT')
    ALTER TABLE dbo.AI_SUMMARY ADD CONSTRAINT FK_AI_SUMMARY_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AI_SUMMARY_USER')
    ALTER TABLE dbo.AI_SUMMARY ADD CONSTRAINT FK_AI_SUMMARY_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CHAT_SESSION_USER')
    ALTER TABLE dbo.CHAT_SESSION ADD CONSTRAINT FK_CHAT_SESSION_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CHAT_SESSION_DOCUMENT')
    ALTER TABLE dbo.CHAT_SESSION ADD CONSTRAINT FK_CHAT_SESSION_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CHAT_MESSAGE_SESSION')
    ALTER TABLE dbo.CHAT_MESSAGE ADD CONSTRAINT FK_CHAT_MESSAGE_SESSION FOREIGN KEY (session_id) REFERENCES dbo.CHAT_SESSION(session_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AI_CHAT_CACHE_USER')
    ALTER TABLE dbo.AI_CHAT_CACHE ADD CONSTRAINT FK_AI_CHAT_CACHE_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AI_USAGE_LOG_USER')
    ALTER TABLE dbo.AI_USAGE_LOG ADD CONSTRAINT FK_AI_USAGE_LOG_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AI_USAGE_LOG_DOCUMENT')
    ALTER TABLE dbo.AI_USAGE_LOG ADD CONSTRAINT FK_AI_USAGE_LOG_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AI_USAGE_LOG_SESSION')
    ALTER TABLE dbo.AI_USAGE_LOG ADD CONSTRAINT FK_AI_USAGE_LOG_SESSION FOREIGN KEY (session_id) REFERENCES dbo.CHAT_SESSION(session_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_COMMENT_USER')
    ALTER TABLE dbo.COMMENT ADD CONSTRAINT FK_COMMENT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_COMMENT_DOCUMENT')
    ALTER TABLE dbo.COMMENT ADD CONSTRAINT FK_COMMENT_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_REPORT_USER')
    ALTER TABLE dbo.REPORT ADD CONSTRAINT FK_REPORT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_REPORT_DOCUMENT')
    ALTER TABLE dbo.REPORT ADD CONSTRAINT FK_REPORT_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_QUESTION_DOCUMENT')
    ALTER TABLE dbo.AI_QUESTION ADD CONSTRAINT FK_QUESTION_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_QUIZ_TEST_AI_QUESTION')
    ALTER TABLE dbo.QUIZ_TEST ADD CONSTRAINT FK_QUIZ_TEST_AI_QUESTION FOREIGN KEY (question_id) REFERENCES dbo.AI_QUESTION(question_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TEST_ATTEMPT_USER')
    ALTER TABLE dbo.TEST_ATTEMPT ADD CONSTRAINT FK_TEST_ATTEMPT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TEST_ATTEMPT_QUIZ')
    ALTER TABLE dbo.TEST_ATTEMPT ADD CONSTRAINT FK_TEST_ATTEMPT_QUIZ FOREIGN KEY (test_id) REFERENCES dbo.QUIZ_TEST(quiz_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TEST_RESULT_ATTEMPT')
    ALTER TABLE dbo.TEST_RESULT ADD CONSTRAINT FK_TEST_RESULT_ATTEMPT FOREIGN KEY (attempt_id) REFERENCES dbo.TEST_ATTEMPT(attempt_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_ANSWER_TEST_ATTEMPT')
    ALTER TABLE dbo.USER_ANSWER ADD CONSTRAINT FK_USER_ANSWER_TEST_ATTEMPT FOREIGN KEY (attempt_id) REFERENCES dbo.TEST_ATTEMPT(attempt_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ANNOUNCEMENT_USER')
    ALTER TABLE dbo.ANNOUNCEMENT ADD CONSTRAINT FK_ANNOUNCEMENT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_ANNOUNCEMENT_USER')
    ALTER TABLE dbo.USER_ANNOUNCEMENT ADD CONSTRAINT FK_USER_ANNOUNCEMENT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_ANNOUNCEMENT_ANNOUNCEMENT')
    ALTER TABLE dbo.USER_ANNOUNCEMENT ADD CONSTRAINT FK_USER_ANNOUNCEMENT_ANNOUNCEMENT FOREIGN KEY (announcement_id) REFERENCES dbo.ANNOUNCEMENT(announcement_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_STUDY_STREAK_USER')
    ALTER TABLE dbo.STUDY_STREAK ADD CONSTRAINT FK_STUDY_STREAK_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_STUDY_ACTIVITY_USER')
    ALTER TABLE dbo.STUDY_ACTIVITY ADD CONSTRAINT FK_STUDY_ACTIVITY_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_STUDY_ACTIVITY_DOCUMENT')
    ALTER TABLE dbo.STUDY_ACTIVITY ADD CONSTRAINT FK_STUDY_ACTIVITY_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_STUDY_ACTIVITY_SUMMARY')
    ALTER TABLE dbo.STUDY_ACTIVITY ADD CONSTRAINT FK_STUDY_ACTIVITY_SUMMARY FOREIGN KEY (summary_id) REFERENCES dbo.AI_SUMMARY(summary_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_STUDY_ACTIVITY_SESSION')
    ALTER TABLE dbo.STUDY_ACTIVITY ADD CONSTRAINT FK_STUDY_ACTIVITY_SESSION FOREIGN KEY (session_id) REFERENCES dbo.CHAT_SESSION(session_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TOKEN_USER')
    ALTER TABLE dbo.TOKEN ADD CONSTRAINT FK_TOKEN_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO

/*==============================================================================
  7. Seed data
==============================================================================*/

DECLARE @LegacyUserRoleId INT = (SELECT TOP 1 role_id FROM dbo.ROLE WHERE UPPER(role_name) = N'USER');
DECLARE @StudentRoleIdForMigration INT = (SELECT TOP 1 role_id FROM dbo.ROLE WHERE UPPER(role_name) = N'STUDENT');

IF @LegacyUserRoleId IS NOT NULL AND @StudentRoleIdForMigration IS NOT NULL
BEGIN
    UPDATE dbo.[USER] SET role_id = @StudentRoleIdForMigration WHERE role_id = @LegacyUserRoleId;
    DELETE FROM dbo.ROLE WHERE role_id = @LegacyUserRoleId;
END

DECLARE @LegacyAdminRoleId INT = (SELECT TOP 1 role_id FROM dbo.ROLE WHERE UPPER(role_name) = N'ADMIN');
IF @LegacyAdminRoleId IS NOT NULL AND @LegacyAdminRoleId <> 2
BEGIN
    UPDATE dbo.ROLE SET role_name = CONCAT(N'Admin_Legacy_', @LegacyAdminRoleId) WHERE role_id = @LegacyAdminRoleId;

    IF EXISTS (SELECT 1 FROM dbo.ROLE WHERE role_id = 2)
    BEGIN
        UPDATE dbo.[USER] SET role_id = 1 WHERE role_id = 2;
        UPDATE dbo.ROLE
        SET role_name = N'Admin',
            description = N'Administrator role for admin dashboard and management screens.',
            updated_at = GETDATE()
        WHERE role_id = 2;
    END
    ELSE
    BEGIN
        SET IDENTITY_INSERT dbo.ROLE ON;
        INSERT INTO dbo.ROLE (role_id, role_name, description, created_at)
        VALUES (2, N'Admin', N'Administrator role for admin dashboard and management screens.', GETDATE());
        SET IDENTITY_INSERT dbo.ROLE OFF;
    END

    UPDATE dbo.[USER] SET role_id = 2 WHERE role_id = @LegacyAdminRoleId;
    DELETE FROM dbo.ROLE WHERE role_id = @LegacyAdminRoleId;
END

SET IDENTITY_INSERT dbo.ROLE ON;

MERGE dbo.ROLE AS target
USING (VALUES
    (1, N'Student', N'Default authenticated user role.'),
    (2, N'Admin',   N'Administrator role for admin dashboard and management screens.')
) AS source(role_id, role_name, description)
ON target.role_id = source.role_id
WHEN MATCHED THEN
    UPDATE SET role_name = source.role_name, description = source.description, updated_at = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (role_id, role_name, description, created_at)
    VALUES (source.role_id, source.role_name, source.description, GETDATE());

SET IDENTITY_INSERT dbo.ROLE OFF;
GO

IF COL_LENGTH('dbo.SUBSCRIPTION_PLAN', 'price') IS NOT NULL
BEGIN
    EXEC(N'
        MERGE dbo.SUBSCRIPTION_PLAN AS target
        USING (VALUES
            (N''Basic'', CAST(0 AS DECIMAL(12,2)), 1, 1024, 10, N''[{"label":"Free plan for starter usage.","included":true},{"label":"Priority support","included":false},{"label":"Advanced AI models","included":false}]''),
            (N''Plus'', CAST(900 AS DECIMAL(12,2)), 1, 10240, 30, N''[{"label":"Priority email support","included":true},{"label":"Smart citation generator","included":true}]''),
            (N''Pro'', CAST(2900 AS DECIMAL(12,2)), 1, 51200, -1, N''[{"label":"Advanced AI models","included":true},{"label":"Offline mode & sync","included":true},{"label":"24/7 dedicated support","included":true}]'')
        ) AS source(plan_name, price, duration_month, max_storage, max_quiz_per_month, description)
        ON UPPER(target.plan_name) = UPPER(source.plan_name)
        WHEN NOT MATCHED THEN
            INSERT (plan_name, price, duration_month, max_storage, max_quiz_per_month, description)
            VALUES (source.plan_name, source.price, source.duration_month, source.max_storage, source.max_quiz_per_month, source.description);');
END
ELSE
BEGIN
    MERGE dbo.SUBSCRIPTION_PLAN AS target
    USING (VALUES
        (N'Basic'), (N'Plus'), (N'Pro')
    ) AS source(plan_name)
    ON UPPER(target.plan_name) = UPPER(source.plan_name)
    WHEN NOT MATCHED THEN
        INSERT (plan_name) VALUES (source.plan_name);
END
GO

-- Preserve the exact legacy benefits as version 1 before switching to versioned plans.
IF COL_LENGTH('dbo.SUBSCRIPTION_PLAN', 'price') IS NOT NULL
BEGIN
    EXEC(N'
        INSERT INTO dbo.SUBSCRIPTION_PLAN_VERSION
            (plan_id, version_no, price, duration_month, max_storage, max_quiz_per_month,
             features_json, effective_from, effective_to, is_active, created_at)
        SELECT sp.plan_id, 1, sp.price, sp.duration_month, sp.max_storage,
               sp.max_quiz_per_month, COALESCE(sp.description, N''[]''),
               SYSDATETIME(), NULL, 1, SYSDATETIME()
        FROM dbo.SUBSCRIPTION_PLAN sp
        WHERE NOT EXISTS (SELECT 1 FROM dbo.SUBSCRIPTION_PLAN_VERSION pv WHERE pv.plan_id = sp.plan_id);');
END
GO

INSERT INTO dbo.SUBSCRIPTION_PLAN_VERSION
    (plan_id, version_no, price, duration_month, max_storage, max_quiz_per_month,
     features_json, effective_from, effective_to, is_active, created_at)
SELECT sp.plan_id, 1, defaults.price, 1, defaults.max_storage, defaults.max_quiz,
       defaults.features_json, SYSDATETIME(), NULL, 1, SYSDATETIME()
FROM dbo.SUBSCRIPTION_PLAN sp
JOIN (VALUES
    (N'BASIC', CAST(0 AS DECIMAL(12,2)), 1024, 10, N'[{"label":"Free plan for starter usage.","included":true},{"label":"Priority support","included":false},{"label":"Advanced AI models","included":false}]'),
    (N'PLUS', CAST(900 AS DECIMAL(12,2)), 10240, 30, N'[{"label":"Priority email support","included":true},{"label":"Smart citation generator","included":true}]'),
    (N'PRO', CAST(2900 AS DECIMAL(12,2)), 51200, -1, N'[{"label":"Advanced AI models","included":true},{"label":"Offline mode & sync","included":true},{"label":"24/7 dedicated support","included":true}]')
) defaults(plan_name, price, max_storage, max_quiz, features_json)
  ON UPPER(sp.plan_name) = defaults.plan_name
WHERE NOT EXISTS (SELECT 1 FROM dbo.SUBSCRIPTION_PLAN_VERSION pv WHERE pv.plan_id = sp.plan_id);
GO

DECLARE @AdminRoleId INT = (SELECT TOP 1 role_id FROM dbo.ROLE WHERE role_name = N'Admin');
DECLARE @StudentRoleId INT = (SELECT TOP 1 role_id FROM dbo.ROLE WHERE role_name = N'Student');
DECLARE @BasicPlanId INT = (SELECT TOP 1 plan_id FROM dbo.SUBSCRIPTION_PLAN WHERE UPPER(plan_name) = N'BASIC');

IF NOT EXISTS (SELECT 1 FROM dbo.[USER] WHERE email = N'admin2@aistudyhub.local')
BEGIN
    INSERT INTO dbo.[USER] (role_id, full_name, email, password_hash, avatar_url, status, created_at, updated_at, last_login)
    VALUES
    (
        @AdminRoleId,
        N'Admin Two',
        N'admin2@aistudyhub.local',
        N'$2a$10$zZ/3YjqzTDMTtlfdSyv/WOUGCURbukxNTA/ofwzaSItiv/1.dgL3K',
        NULL,
        N'Active',
        GETDATE(),
        NULL,
        NULL
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.[USER] WHERE email = N'student2@aistudyhub.local')
BEGIN
    INSERT INTO dbo.[USER] (role_id, full_name, email, password_hash, avatar_url, status, created_at, updated_at, last_login)
    VALUES
    (
        @StudentRoleId,
        N'Student Two',
        N'student2@aistudyhub.local',
        N'$2a$10$wq8GaGjbBKPj64kcae0hDetQZ/bttRlOxkBDOKUkfD7SFykrjyuA.',
        NULL,
        N'Active',
        GETDATE(),
        NULL,
        NULL
    );
END

INSERT INTO dbo.USER_SUBSCRIPTION (user_id, plan_id, start_date, end_date, status)
SELECT u.user_id, @BasicPlanId, CAST(GETDATE() AS DATE), DATEADD(month, 1, CAST(GETDATE() AS DATE)), N'Active'
FROM dbo.[USER] u
WHERE u.email IN (N'admin2@aistudyhub.local', N'student2@aistudyhub.local')
  AND NOT EXISTS
  (
      SELECT 1
      FROM dbo.USER_SUBSCRIPTION us
      WHERE us.user_id = u.user_id
  );
GO

PRINT N'AI_StudyHub schema and seed data are ready.';
GO

-- ============================================================
-- MIGRATIONS (added during Profile & Settings development)
-- ============================================================

-- 1. USER_SETTINGS table
IF OBJECT_ID(N'dbo.USER_SETTINGS', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.USER_SETTINGS
    (
        user_id                   INT           NOT NULL,
        email_notifications       BIT           NOT NULL CONSTRAINT DF_US_email_notif   DEFAULT 1,
        push_notifications        BIT           NOT NULL CONSTRAINT DF_US_push_notif    DEFAULT 1,
        learning_notifications    BIT           NOT NULL CONSTRAINT DF_US_learn_notif   DEFAULT 1,
        ai_notifications          BIT           NOT NULL CONSTRAINT DF_US_ai_notif      DEFAULT 1,
        achievement_notifications BIT           NOT NULL CONSTRAINT DF_US_achiev_notif  DEFAULT 1,
        security_notifications    BIT           NOT NULL CONSTRAINT DF_US_sec_notif     DEFAULT 1,
        profile_visibility        NVARCHAR(20)  NOT NULL CONSTRAINT DF_US_visibility    DEFAULT N'Public',
        show_streak               BIT           NOT NULL CONSTRAINT DF_US_show_streak   DEFAULT 1,
        language                  NVARCHAR(10)  NOT NULL CONSTRAINT DF_US_language      DEFAULT N'en',
        timezone                  NVARCHAR(50)  NOT NULL CONSTRAINT DF_US_timezone      DEFAULT N'Asia/Ho_Chi_Minh',
        updated_at                DATETIME      NULL,
        CONSTRAINT PK_USER_SETTINGS PRIMARY KEY (user_id),
        CONSTRAINT FK_USER_SETTINGS_USER FOREIGN KEY (user_id)
            REFERENCES dbo.[USER](user_id) ON DELETE CASCADE
    );
END
GO

-- 2. USER_REPORT table
IF OBJECT_ID(N'dbo.USER_REPORT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.USER_REPORT
    (
        report_id     INT            IDENTITY(1,1) NOT NULL,
        user_id       INT            NULL,
        category      NVARCHAR(50)   NOT NULL,
        rating        INT            NULL,
        description   NVARCHAR(1000) NOT NULL,
        contact_email NVARCHAR(150)  NULL,
        is_anonymous  BIT            NOT NULL CONSTRAINT DF_UR_anonymous  DEFAULT 0,
        status        NVARCHAR(30)   NOT NULL CONSTRAINT DF_UR_status     DEFAULT N'Pending',
        created_at    DATETIME       NOT NULL CONSTRAINT DF_UR_created_at DEFAULT GETDATE(),
        CONSTRAINT PK_USER_REPORT PRIMARY KEY (report_id),
        CONSTRAINT FK_USER_REPORT_USER FOREIGN KEY (user_id)
            REFERENCES dbo.[USER](user_id) ON DELETE SET NULL
    );
END
GO

-- 3. TOKEN: add device_info, ip_address, last_used_at, used_at, revoked_at
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TOKEN') AND name = 'device_info')
    ALTER TABLE dbo.TOKEN ADD device_info  NVARCHAR(255) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TOKEN') AND name = 'ip_address')
    ALTER TABLE dbo.TOKEN ADD ip_address   NVARCHAR(50)  NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TOKEN') AND name = 'last_used_at')
    ALTER TABLE dbo.TOKEN ADD last_used_at DATETIME2     NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TOKEN') AND name = 'used_at')
    ALTER TABLE dbo.TOKEN ADD used_at      DATETIME2     NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TOKEN') AND name = 'revoked_at')
    ALTER TABLE dbo.TOKEN ADD revoked_at   DATETIME2     NULL;
GO

-- 4. USER_SUBSCRIPTION: add auto_renewal
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USER_SUBSCRIPTION') AND name = 'auto_renewal')
    ALTER TABLE dbo.USER_SUBSCRIPTION ADD auto_renewal BIT NOT NULL CONSTRAINT DF_US_auto_renewal DEFAULT 1;
GO

-- 5. USER: add deleted_at for soft-delete / 30-day reactivation window
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.[USER]') AND name = 'deleted_at')
    ALTER TABLE dbo.[USER] ADD deleted_at DATETIME NULL;
GO

-- 6. USER: add is_verified, verified_at for email verification
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.[USER]') AND name = 'is_verified')
    ALTER TABLE dbo.[USER] ADD is_verified BIT NOT NULL CONSTRAINT DF_USER_is_verified DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.[USER]') AND name = 'verified_at')
    ALTER TABLE dbo.[USER] ADD verified_at DATETIME2 NULL;
GO

-- 7. Subscription versioning and grandfathering.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USER_SUBSCRIPTION') AND name = 'version_id')
    ALTER TABLE dbo.USER_SUBSCRIPTION ADD version_id INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USER_SUBSCRIPTION') AND name = 'renewal_policy')
    ALTER TABLE dbo.USER_SUBSCRIPTION ADD renewal_policy NVARCHAR(20) NOT NULL
        CONSTRAINT DF_USER_SUBSCRIPTION_renewal DEFAULT N'KEEP_VERSION';
GO

UPDATE us
SET version_id = pv.version_id
FROM dbo.USER_SUBSCRIPTION us
JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.plan_id = us.plan_id AND pv.version_no = 1
WHERE us.version_id IS NULL;
GO

IF EXISTS (SELECT 1 FROM dbo.USER_SUBSCRIPTION WHERE version_id IS NULL)
    THROW 51000, 'Cannot migrate USER_SUBSCRIPTION: version_id remains NULL.', 1;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USER_SUBSCRIPTION') AND name = 'version_id' AND is_nullable = 1)
    ALTER TABLE dbo.USER_SUBSCRIPTION ALTER COLUMN version_id INT NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_SUBSCRIPTION_VERSION')
    ALTER TABLE dbo.USER_SUBSCRIPTION WITH CHECK ADD CONSTRAINT FK_USER_SUBSCRIPTION_VERSION
        FOREIGN KEY (version_id) REFERENCES dbo.SUBSCRIPTION_PLAN_VERSION(version_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SUBSCRIPTION_HISTORY_SUBSCRIPTION')
    ALTER TABLE dbo.SUBSCRIPTION_HISTORY WITH CHECK ADD CONSTRAINT FK_SUBSCRIPTION_HISTORY_SUBSCRIPTION
        FOREIGN KEY (subscription_id) REFERENCES dbo.USER_SUBSCRIPTION(subscription_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SUBSCRIPTION_HISTORY_USER')
    ALTER TABLE dbo.SUBSCRIPTION_HISTORY WITH CHECK ADD CONSTRAINT FK_SUBSCRIPTION_HISTORY_USER
        FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SUBSCRIPTION_HISTORY_OLD_VERSION')
    ALTER TABLE dbo.SUBSCRIPTION_HISTORY ADD CONSTRAINT FK_SUBSCRIPTION_HISTORY_OLD_VERSION
        FOREIGN KEY (old_version_id) REFERENCES dbo.SUBSCRIPTION_PLAN_VERSION(version_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SUBSCRIPTION_HISTORY_NEW_VERSION')
    ALTER TABLE dbo.SUBSCRIPTION_HISTORY ADD CONSTRAINT FK_SUBSCRIPTION_HISTORY_NEW_VERSION
        FOREIGN KEY (new_version_id) REFERENCES dbo.SUBSCRIPTION_PLAN_VERSION(version_id);
GO

-- 8. ANNOUNCEMENT: retain the Admin recipient group for sent history.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ANNOUNCEMENT') AND name = 'recipient_group')
    ALTER TABLE dbo.ANNOUNCEMENT ADD recipient_group NVARCHAR(30) NULL;
GO

-- 9. AI_PROVIDER_CONFIG: normalize constraint names and add its USER foreign key.
DECLARE @AiConstraintName SYSNAME, @AiFullConstraintName NVARCHAR(517);

IF OBJECT_ID(N'dbo.PK_AI_PROVIDER_CONFIG', N'PK') IS NULL
BEGIN
    SELECT @AiConstraintName = kc.name
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID(N'dbo.AI_PROVIDER_CONFIG') AND kc.[type] = N'PK';
    IF @AiConstraintName IS NOT NULL
    BEGIN
        SET @AiFullConstraintName = N'dbo.' + QUOTENAME(@AiConstraintName);
        EXEC sys.sp_rename @AiFullConstraintName, N'PK_AI_PROVIDER_CONFIG', N'OBJECT';
    END
END

IF OBJECT_ID(N'dbo.UQ_AI_PROVIDER_CONFIG_provider', N'UQ') IS NULL
BEGIN
    SET @AiConstraintName = NULL;
    SELECT @AiConstraintName = kc.name
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID(N'dbo.AI_PROVIDER_CONFIG') AND kc.[type] = N'UQ';
    IF @AiConstraintName IS NOT NULL
    BEGIN
        SET @AiFullConstraintName = N'dbo.' + QUOTENAME(@AiConstraintName);
        EXEC sys.sp_rename @AiFullConstraintName, N'UQ_AI_PROVIDER_CONFIG_provider', N'OBJECT';
    END
END

DECLARE @AiDefaultNames TABLE (column_name SYSNAME, desired_name SYSNAME);
INSERT INTO @AiDefaultNames (column_name, desired_name) VALUES
    (N'enabled', N'DF_AI_PROVIDER_CONFIG_enabled'),
    (N'priority', N'DF_AI_PROVIDER_CONFIG_priority'),
    (N'temperature', N'DF_AI_PROVIDER_CONFIG_temperature'),
    (N'max_tokens', N'DF_AI_PROVIDER_CONFIG_max_tokens'),
    (N'top_p', N'DF_AI_PROVIDER_CONFIG_top_p'),
    (N'updated_at', N'DF_AI_PROVIDER_CONFIG_updated_at');

DECLARE @AiColumnName SYSNAME, @AiDesiredName SYSNAME;
DECLARE ai_default_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT column_name, desired_name FROM @AiDefaultNames;
OPEN ai_default_cursor;
FETCH NEXT FROM ai_default_cursor INTO @AiColumnName, @AiDesiredName;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF OBJECT_ID(N'dbo.' + @AiDesiredName, N'D') IS NULL
    BEGIN
        SET @AiConstraintName = NULL;
        SELECT @AiConstraintName = dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID(N'dbo.AI_PROVIDER_CONFIG') AND c.name = @AiColumnName;
        IF @AiConstraintName IS NOT NULL
        BEGIN
            SET @AiFullConstraintName = N'dbo.' + QUOTENAME(@AiConstraintName);
            EXEC sys.sp_rename @AiFullConstraintName, @AiDesiredName, N'OBJECT';
        END
    END
    FETCH NEXT FROM ai_default_cursor INTO @AiColumnName, @AiDesiredName;
END
CLOSE ai_default_cursor;
DEALLOCATE ai_default_cursor;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AI_PROVIDER_CONFIG_USER')
    ALTER TABLE dbo.AI_PROVIDER_CONFIG WITH CHECK
    ADD CONSTRAINT FK_AI_PROVIDER_CONFIG_USER FOREIGN KEY (updated_by) REFERENCES dbo.[USER](user_id);
GO

-- 10. Per-cycle discounts are versioned so existing subscribers retain purchased pricing.
IF COL_LENGTH(N'dbo.SUBSCRIPTION_PLAN_VERSION', N'monthly_discount_percent') IS NULL
    ALTER TABLE dbo.SUBSCRIPTION_PLAN_VERSION ADD monthly_discount_percent DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_PLAN_VERSION_monthly_discount DEFAULT 0 WITH VALUES;
GO

IF COL_LENGTH(N'dbo.SUBSCRIPTION_PLAN_VERSION', N'yearly_discount_percent') IS NULL
    ALTER TABLE dbo.SUBSCRIPTION_PLAN_VERSION ADD yearly_discount_percent DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_PLAN_VERSION_yearly_discount DEFAULT 0 WITH VALUES;
GO

IF OBJECT_ID(N'dbo.CK_PLAN_VERSION_monthly_discount', N'C') IS NULL
    ALTER TABLE dbo.SUBSCRIPTION_PLAN_VERSION ADD CONSTRAINT CK_PLAN_VERSION_monthly_discount
        CHECK (monthly_discount_percent BETWEEN 0 AND 100);
GO

IF OBJECT_ID(N'dbo.CK_PLAN_VERSION_yearly_discount', N'C') IS NULL
    ALTER TABLE dbo.SUBSCRIPTION_PLAN_VERSION ADD CONSTRAINT CK_PLAN_VERSION_yearly_discount
        CHECK (yearly_discount_percent BETWEEN 0 AND 100);
GO

PRINT N'Migrations applied successfully.';
GO
