/*==============================================================================
  AI_StudyHub - FULL SCHEMA (v1 + v2 + v3)
  ========================================

  File nay gop nguyen van ba script schema theo dung thu tu chay:

      1. AI_Study_Hub.sql                  - schema goc: tao database, bang, seed
                                             role va tai khoan mac dinh
      2. AI_Study_Hub_v2_upgrade.sql       - migration v2: da nganh hoc, cay dao tao
                                             3 cap, file hash guard, AI moderation
      3. AI_Study_Hub_v3_shared_subjects.sql- migration v3: bang SEMESTER_SUBJECT cho
                                             mon hoc dung chung nhieu ky

  NGUOI MOI CLONE PROJECT chi can chay HAI file, theo dung thu tu:

      1) AI_Study_Hub_full.sql   <- file nay (tao database + toan bo bang)
      2) AI_Study_Hub_seed.sql   <- do du lieu chuong trinh hoc 7 nganh

  Cach chay:
      sqlcmd -S localhost -E -I -f 65001 -i AI_Study_Hub_full.sql
      sqlcmd -S localhost -E -I -f 65001 -i AI_Study_Hub_seed.sql

      -I  bat QUOTED_IDENTIFIER (bat buoc: co index co dieu kien)
      -f 65001 doc file UTF-8, giu dau tieng Viet

  Hoac mo bang SSMS roi Execute lan luot hai file.

  Idempotent: chay lai nhieu lan van an toan, khong tao trung, khong mat du lieu.

  Tai khoan seed san:
      admin2@aistudyhub.local   / Admin@123456
      student2@aistudyhub.local / Student@123456

  LUU Y CHO NGUOI PHAT TRIEN:
  File nay duoc GOP TU BA FILE TREN, khong sua truc tiep. Migration moi van viet
  vao AI_Study_Hub_v2_upgrade.sql (v1 da dong bang), sau do gop lai file nay.
==============================================================================*/

-- Dat o dau session: mot so index co dieu kien o v2 doi hai tuy chon nay bat.
-- SSMS bat san, sqlcmd thi khong (tru khi truyen -I).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO





/*==============================================================================
  PHAN 1/3 - AI_Study_Hub.sql (schema goc)
==============================================================================*/

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
        major_id      INT NULL,
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

IF OBJECT_ID(N'dbo.MAJOR', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MAJOR
    (
        major_id    INT IDENTITY(1,1) NOT NULL,
        major_name  NVARCHAR(200) NOT NULL,
        description NVARCHAR(500) NULL,
        created_at  DATETIME NOT NULL CONSTRAINT DF_MAJOR_created_at DEFAULT GETDATE(),
        updated_at  DATETIME NULL,
        CONSTRAINT PK_MAJOR PRIMARY KEY (major_id),
        CONSTRAINT UQ_MAJOR_name UNIQUE (major_name)
    );
END
GO

IF OBJECT_ID(N'dbo.SEMESTER', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SEMESTER
    (
        semester_id   INT IDENTITY(1,1) NOT NULL,
        semester_name NVARCHAR(100) NOT NULL,
        major_id      INT NULL,
        created_at    DATETIME NOT NULL,
        updated_at    DATETIME NULL,
        CONSTRAINT PK_SEMESTER PRIMARY KEY (semester_id)
    );
END
GO

IF COL_LENGTH('dbo.SEMESTER', 'major_id') IS NULL
    ALTER TABLE dbo.SEMESTER ADD major_id INT NULL;
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

IF OBJECT_ID(N'dbo.SEMESTER_SUBJECT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SEMESTER_SUBJECT
    (
        semester_id INT NOT NULL,
        subject_id  INT NOT NULL,
        CONSTRAINT PK_SEMESTER_SUBJECT PRIMARY KEY (semester_id, subject_id),
        CONSTRAINT FK_SEMESTER_SUBJECT_SEMESTER FOREIGN KEY (semester_id) REFERENCES dbo.SEMESTER(semester_id),
        CONSTRAINT FK_SEMESTER_SUBJECT_SUBJECT FOREIGN KEY (subject_id) REFERENCES dbo.SUBJECT(subject_id)
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
        -- Token ngẫu nhiên cho link public /share/{token}; không dùng share_id vì đoán được.
        share_token       NVARCHAR(64) NULL,
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
    VALUES (N'GEMINI', N'gemini-3.6-flash', 1, 2);
ELSE
    UPDATE dbo.AI_PROVIDER_CONFIG
    SET model_name = N'gemini-3.6-flash', updated_at = SYSDATETIME()
    WHERE provider = N'GEMINI'
      AND model_name IN (N'gemini-3.5-flash', N'gemini-3.1-pro', N'gemini-2.5-flash', N'gemini-2.5-pro', N'gemini-2.5-flash-lite', N'gemini-1.5-flash', N'gemini-1.5-pro', N'gemini-2.0-flash');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.AI_PROVIDER_CONFIG WHERE provider = N'DEEPSEEK')
    INSERT INTO dbo.AI_PROVIDER_CONFIG (provider, model_name, enabled, priority)
    VALUES (N'DEEPSEEK', N'deepseek-v4-flash', 1, 3);
ELSE
    UPDATE dbo.AI_PROVIDER_CONFIG
    SET model_name = N'deepseek-v4-flash', updated_at = SYSDATETIME()
    WHERE provider = N'DEEPSEEK'
      AND model_name IN (N'deepseek-chat', N'deepseek-reasoner');
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

IF COL_LENGTH('dbo.[USER]', 'major_id') IS NULL
    ALTER TABLE dbo.[USER] ADD major_id INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_MAJOR')
    ALTER TABLE dbo.[USER] ADD CONSTRAINT FK_USER_MAJOR FOREIGN KEY (major_id) REFERENCES dbo.MAJOR(major_id);
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

-- version_id must be set: every quota lookup joins USER_SUBSCRIPTION to
-- SUBSCRIPTION_PLAN_VERSION through it, and a NULL leaves the account on hard-coded defaults
-- instead of the configured plan limits.
DECLARE @BasicVersionId INT = (
    SELECT TOP 1 pv.version_id
    FROM dbo.SUBSCRIPTION_PLAN_VERSION pv
    WHERE pv.plan_id = @BasicPlanId AND pv.is_active = 1
    ORDER BY pv.version_no DESC
);

INSERT INTO dbo.USER_SUBSCRIPTION (user_id, plan_id, version_id, start_date, end_date, status)
SELECT u.user_id, @BasicPlanId, @BasicVersionId, CAST(GETDATE() AS DATE), DATEADD(month, 1, CAST(GETDATE() AS DATE)), N'Active'
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

/*==============================================================================
  11. Subject & Quiz Performance Indexing Optimization

  Truoc day muc nay tao index tren dbo.PRACTICE_TEST - mot bang khong ton tai
  trong schema, nen cau lenh luon bao loi 1088 va index khong bao gio duoc tao.
  Bang luu bai lam theo tung nguoi la dbo.TEST_ATTEMPT (QUIZ_TEST chi chua noi
  dung cau hoi, khong co user_id).
==============================================================================*/
IF OBJECT_ID(N'dbo.TEST_ATTEMPT', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TEST_ATTEMPT_user_start' AND object_id = OBJECT_ID(N'dbo.TEST_ATTEMPT'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_TEST_ATTEMPT_user_start
    ON dbo.TEST_ATTEMPT (user_id, start_time DESC);
END
GO

/*==============================================================================
  12. User Profile & Study Activity Index Optimization

  Tuong tu muc 11: ten bang that la dbo.STUDY_ACTIVITY, khong phai
  dbo.USER_STUDY_ACTIVITY.
==============================================================================*/
IF OBJECT_ID(N'dbo.STUDY_ACTIVITY', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_STUDY_ACTIVITY_user_date' AND object_id = OBJECT_ID(N'dbo.STUDY_ACTIVITY'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_STUDY_ACTIVITY_user_date
    ON dbo.STUDY_ACTIVITY (user_id, activity_date DESC);
END
GO

PRINT N'Migrations applied successfully.';
GO


/*==============================================================================
  PHAN 2/3 - AI_Study_Hub_v2_upgrade.sql (migration v2)
==============================================================================*/

USE AI_StudyHub;
GO

-- Script co tao filtered index (IX_DOCUMENT_file_hash, UX_MAJOR_code). Cac index do
-- doi QUOTED_IDENTIFIER ON. SSMS bat san nhung sqlcmd mac dinh TAT => CREATE INDEX
-- loi 1934 va bi bo qua am tham. SET o day co hieu luc cho toan bo session.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/*==============================================================================
  AI_StudyHub v2 - UPGRADE MIGRATION
  ====================================
  Nang cap CSDL cho 4 tinh nang moi:
    1. Da nganh hoc (Multi-Major) + Onboarding chon Nganh
    2. Admin quan ly Cay Dao Tao 3 cap (Nganh -> Ky -> Mon)
    3. Co che chan File trung & File den (SHA-256 File Hash Guard)
    4. AI goi y duyet Public tu dong (AI Auto-Moderation Engine)

  Script la idempotent: chay lai nhieu lan van an toan, khong loi.
==============================================================================*/

PRINT N'========================================';
PRINT N'AI_StudyHub v2 - UPGRADE MIGRATION';
PRINT N'========================================';
GO

/*==============================================================================
  1. BANG MOI: MAJOR (Nganh hoc / Chuyen nganh dao tao)
     - Admin quan ly danh muc Nganh hoc
     - Sinh vien chon Nganh khi dang ky thanh cong
==============================================================================*/

IF OBJECT_ID(N'dbo.MAJOR', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MAJOR
    (
        major_id    INT IDENTITY(1,1) NOT NULL,
        -- Nullable vi base schema khong co major_code va app khong dung cot nay.
        major_code  NVARCHAR(20)      NULL,
        major_name  NVARCHAR(200)     NOT NULL,
        description NVARCHAR(1000)    NULL,
        is_active   BIT               NOT NULL CONSTRAINT DF_MAJOR_is_active DEFAULT 1,
        created_at  DATETIME2         NOT NULL CONSTRAINT DF_MAJOR_created_at DEFAULT SYSDATETIME(),
        updated_at  DATETIME2         NULL,
        CONSTRAINT PK_MAJOR PRIMARY KEY (major_id)
    );

    -- Filtered index thay cho UNIQUE constraint: UNIQUE chi cho phep dung 1 NULL.
    -- Dung dynamic SQL: neu bang MAJOR da ton tai san (base schema, khong co major_code)
    -- thi cau CREATE INDEX tinh se lam abort ca batch luc compile.
    EXEC sp_executesql N'CREATE UNIQUE INDEX UX_MAJOR_code ON dbo.MAJOR(major_code) WHERE major_code IS NOT NULL';

    PRINT N'  [OK] Created table dbo.MAJOR';
END
ELSE
    PRINT N'  [SKIP] Table dbo.MAJOR already exists';
GO

/*==============================================================================
  2. CAP NHAT BANG: SEMESTER - Gan Hoc ky theo Nganh (major_id)
     - Admin chon Nganh truoc -> ben trong quan ly theo Ky
==============================================================================*/

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.SEMESTER') AND name = 'major_id')
BEGIN
    ALTER TABLE dbo.SEMESTER ADD major_id INT NULL;
    PRINT N'  [OK] Added column SEMESTER.major_id';
END
ELSE
    PRINT N'  [SKIP] Column SEMESTER.major_id already exists';
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SEMESTER_MAJOR')
BEGIN
    ALTER TABLE dbo.SEMESTER ADD CONSTRAINT FK_SEMESTER_MAJOR
        FOREIGN KEY (major_id) REFERENCES dbo.MAJOR(major_id);
    PRINT N'  [OK] Added FK_SEMESTER_MAJOR';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.SEMESTER') AND name = N'IX_SEMESTER_major_id')
BEGIN
    CREATE INDEX IX_SEMESTER_major_id ON dbo.SEMESTER(major_id);
    PRINT N'  [OK] Created index IX_SEMESTER_major_id';
END
GO

/*==============================================================================
  3. CAP NHAT BANG: SUBJECT - Them mo ta giao trinh mon hoc
     - AI dung subject_description de danh gia muc do phu hop khi duyet Public
==============================================================================*/

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.SUBJECT') AND name = 'subject_description')
BEGIN
    ALTER TABLE dbo.SUBJECT ADD subject_description NVARCHAR(2000) NULL;
    PRINT N'  [OK] Added column SUBJECT.subject_description';
END
ELSE
    PRINT N'  [SKIP] Column SUBJECT.subject_description already exists';
GO

/*==============================================================================
  4. CAP NHAT BANG: USER - Gan Nganh hoc cho Sinh vien (major_id)
     - Sinh vien chon Nganh khi dang ky, co the doi trong Profile
     - NULL = chua chon Nganh (Modal bat buoc chon truoc khi vao he thong)
==============================================================================*/

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.[USER]') AND name = 'major_id')
BEGIN
    ALTER TABLE dbo.[USER] ADD major_id INT NULL;
    PRINT N'  [OK] Added column [USER].major_id';
END
ELSE
    PRINT N'  [SKIP] Column [USER].major_id already exists';
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_MAJOR')
BEGIN
    ALTER TABLE dbo.[USER] ADD CONSTRAINT FK_USER_MAJOR
        FOREIGN KEY (major_id) REFERENCES dbo.MAJOR(major_id);
    PRINT N'  [OK] Added FK_USER_MAJOR';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.[USER]') AND name = N'IX_USER_major_id')
BEGIN
    CREATE INDEX IX_USER_major_id ON dbo.[USER](major_id);
    PRINT N'  [OK] Created index IX_USER_major_id';
END
GO

/*==============================================================================
  5. BANG MOI: SUBJECT_REPORT (Yeu cau them Mon hoc moi tu Sinh vien)
     - Sinh vien gui Report yeu cau Admin them mon khi thay thieu
==============================================================================*/

IF OBJECT_ID(N'dbo.SUBJECT_REPORT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SUBJECT_REPORT
    (
        report_id          INT IDENTITY(1,1) NOT NULL,
        user_id            INT               NOT NULL,
        major_id           INT               NOT NULL,
        semester_id        INT               NULL,
        suggested_name     NVARCHAR(200)     NOT NULL,
        suggested_code     NVARCHAR(50)      NULL,
        reason             NVARCHAR(1000)    NULL,
        status             NVARCHAR(30)      NOT NULL CONSTRAINT DF_SUBJECT_REPORT_status DEFAULT N'PENDING',
        admin_note         NVARCHAR(500)     NULL,
        resolved_by        INT               NULL,
        resolved_at        DATETIME2         NULL,
        created_at         DATETIME2         NOT NULL CONSTRAINT DF_SUBJECT_REPORT_created_at DEFAULT SYSDATETIME(),
        CONSTRAINT PK_SUBJECT_REPORT PRIMARY KEY (report_id),
        CONSTRAINT FK_SUBJECT_REPORT_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id),
        CONSTRAINT FK_SUBJECT_REPORT_MAJOR FOREIGN KEY (major_id) REFERENCES dbo.MAJOR(major_id),
        CONSTRAINT FK_SUBJECT_REPORT_SEMESTER FOREIGN KEY (semester_id) REFERENCES dbo.SEMESTER(semester_id),
        CONSTRAINT FK_SUBJECT_REPORT_ADMIN FOREIGN KEY (resolved_by) REFERENCES dbo.[USER](user_id)
    );

    PRINT N'  [OK] Created table dbo.SUBJECT_REPORT';
END
ELSE
    PRINT N'  [SKIP] Table dbo.SUBJECT_REPORT already exists';
GO

/*==============================================================================
  6. CAP NHAT BANG: DOCUMENT - Them cot file_hash (SHA-256 File Guard)
     - Bang SHA-256 toan bo noi dung file khi upload
     - Dung de kiem tra file trung / file tung bi tu choi
==============================================================================*/

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.DOCUMENT') AND name = 'file_hash')
BEGIN
    ALTER TABLE dbo.DOCUMENT ADD file_hash CHAR(64) NULL;
    PRINT N'  [OK] Added column DOCUMENT.file_hash';
END
ELSE
    PRINT N'  [SKIP] Column DOCUMENT.file_hash already exists';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.DOCUMENT') AND name = N'IX_DOCUMENT_file_hash')
BEGIN
    CREATE INDEX IX_DOCUMENT_file_hash ON dbo.DOCUMENT(file_hash)
        WHERE file_hash IS NOT NULL;
    PRINT N'  [OK] Created filtered index IX_DOCUMENT_file_hash';
END
GO

/*==============================================================================
  7. BANG MOI: DOCUMENT_BLACKHASH (Danh sach den file bi chan vinh vien)
     - Khi Admin tu choi duyet Public hoac xoa file vi pham ban quyen,
       ma hash SHA-256 duoc ghi vao bang nay de chan upload lai vinh vien
==============================================================================*/

IF OBJECT_ID(N'dbo.DOCUMENT_BLACKHASH', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DOCUMENT_BLACKHASH
    (
        blackhash_id INT IDENTITY(1,1)  NOT NULL,
        file_hash    CHAR(64)           NOT NULL,
        reason       NVARCHAR(500)      NOT NULL,
        blocked_by   INT                NULL,
        document_id  INT                NULL,
        created_at   DATETIME2          NOT NULL CONSTRAINT DF_BLACKHASH_created_at DEFAULT SYSDATETIME(),
        CONSTRAINT PK_DOCUMENT_BLACKHASH PRIMARY KEY (blackhash_id),
        CONSTRAINT UQ_BLACKHASH_hash UNIQUE (file_hash),
        CONSTRAINT FK_BLACKHASH_ADMIN FOREIGN KEY (blocked_by) REFERENCES dbo.[USER](user_id)
    );

    PRINT N'  [OK] Created table dbo.DOCUMENT_BLACKHASH';
END
ELSE
    PRINT N'  [SKIP] Table dbo.DOCUMENT_BLACKHASH already exists';
GO

/*==============================================================================
  8. BANG MOI: PUBLIC_REVIEW_LOG (Nhat ky duyet Public tai lieu bang AI)
     - Ghi nhan ket qua cham diem AI Relevance Score
     - Luu ly do danh gia cua AI de Admin tham khao khi duyet tay

     Cac trang thai review_status:
       AUTO_APPROVED  : AI cham >= 80%, tu dong duyet Public
       PENDING_HUMAN  : AI cham 50-79%, cho Admin duyet tay
       REJECTED       : AI cham < 50%, tu dong tu choi
       ADMIN_APPROVED : Admin duyet tay (tu PENDING_HUMAN)
       ADMIN_REJECTED : Admin tu choi tay (tu PENDING_HUMAN)
==============================================================================*/

IF OBJECT_ID(N'dbo.PUBLIC_REVIEW_LOG', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PUBLIC_REVIEW_LOG
    (
        log_id          INT IDENTITY(1,1)  NOT NULL,
        document_id     INT                NOT NULL,
        user_id         INT                NOT NULL,
        relevance_score DECIMAL(5,2)       NULL,
        ai_reasoning    NVARCHAR(2000)     NULL,
        ai_summary      NVARCHAR(MAX)      NULL,
        review_status   NVARCHAR(30)       NOT NULL CONSTRAINT DF_REVIEW_LOG_status DEFAULT N'PENDING',
        reviewed_by     INT                NULL,
        reviewed_at     DATETIME2          NULL,
        created_at      DATETIME2          NOT NULL CONSTRAINT DF_REVIEW_LOG_created_at DEFAULT SYSDATETIME(),
        CONSTRAINT PK_PUBLIC_REVIEW_LOG PRIMARY KEY (log_id),
        CONSTRAINT FK_REVIEW_LOG_DOCUMENT FOREIGN KEY (document_id) REFERENCES dbo.DOCUMENT(document_id),
        CONSTRAINT FK_REVIEW_LOG_USER FOREIGN KEY (user_id) REFERENCES dbo.[USER](user_id),
        CONSTRAINT FK_REVIEW_LOG_ADMIN FOREIGN KEY (reviewed_by) REFERENCES dbo.[USER](user_id)
    );

    PRINT N'  [OK] Created table dbo.PUBLIC_REVIEW_LOG';
END
ELSE
    PRINT N'  [SKIP] Table dbo.PUBLIC_REVIEW_LOG already exists';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.PUBLIC_REVIEW_LOG') AND name = N'IX_REVIEW_LOG_status')
BEGIN
    CREATE INDEX IX_REVIEW_LOG_status
        ON dbo.PUBLIC_REVIEW_LOG(review_status, created_at DESC);
    PRINT N'  [OK] Created index IX_REVIEW_LOG_status';
END
GO

/*==============================================================================
  9. INDEX BO SUNG - Tang toc truy van cho Thu vien Cong khai & Bo loc da chieu
==============================================================================*/

-- DOCUMENT.deleted_at do DatabaseSchemaGuard them luc app khoi dong, khong co trong
-- base schema. Neu chua co cot thi bo qua index nay, chay lai script sau se tao duoc.
IF COL_LENGTH(N'dbo.DOCUMENT', N'deleted_at') IS NULL
    PRINT N'  [SKIP] IX_DOCUMENT_visibility_subject - DOCUMENT.deleted_at chua ton tai';
ELSE IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.DOCUMENT')
                 AND name = N'IX_DOCUMENT_visibility_subject')
BEGIN
    CREATE INDEX IX_DOCUMENT_visibility_subject
        ON dbo.DOCUMENT(visibility_status, subject_id, deleted_at)
        INCLUDE (user_id, title, document_name, document_type, document_size, uploaded_at);
    PRINT N'  [OK] Created index IX_DOCUMENT_visibility_subject';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.SUBJECT')
                 AND name = N'IX_SUBJECT_semester_id')
BEGIN
    CREATE INDEX IX_SUBJECT_semester_id ON dbo.SUBJECT(semester_id);
    PRINT N'  [OK] Created index IX_SUBJECT_semester_id';
END
GO

/*==============================================================================
  10. GO 3 nganh mau CNTT / QTKD / NNA
      - Ban dau file nay seed 3 nganh de co du lieu chay test ngay. Chuong trinh
        hoc that (AI, English, Finance, IA, Logistic, Marketing, SE) do
        AI_StudyHub_seed.sql nap, nen 3 nganh mau chi con la vo rong: khong ky,
        khong mon, khong sinh vien - nhung van hien trong bo loc Major.
      - Chi xoa khi that su rong, de khong bao gio lam mat du lieu that neu co ai
        do da gan hoc ky hoac sinh vien vao chung.
==============================================================================*/
IF OBJECT_ID(N'dbo.MAJOR', N'U') IS NOT NULL
BEGIN
    DECLARE @removed INT = 0;

    DELETE m
    FROM dbo.MAJOR m
    WHERE m.major_name IN (N'Cong nghe Thong tin', N'Quan tri Kinh doanh', N'Ngon ngu Anh')
      AND NOT EXISTS (SELECT 1 FROM dbo.SEMESTER se WHERE se.major_id = m.major_id)
      AND NOT EXISTS (SELECT 1 FROM dbo.[USER] u WHERE u.major_id = m.major_id)
      AND (OBJECT_ID(N'dbo.SUBJECT_REPORT', N'U') IS NULL
           OR NOT EXISTS (SELECT 1 FROM dbo.SUBJECT_REPORT r WHERE r.major_id = m.major_id));
    SET @removed = @@ROWCOUNT;

    PRINT CONCAT(N'  [OK] Removed ', @removed, N' empty sample major(s): CNTT, QTKD, NNA');

    IF EXISTS (SELECT 1 FROM dbo.MAJOR
               WHERE major_name IN (N'Cong nghe Thong tin', N'Quan tri Kinh doanh', N'Ngon ngu Anh'))
        PRINT N'  [WARN] Some sample majors kept: they still have semesters, users or reports attached';
END
GO

/*==============================================================================
  11. SEED ACCOUNT: mark email da xac thuc
      - Seed account khong the nhan mail xac thuc, ma AuthServiceImpl.login chi
        bypass check is_verified cho admin => student2 khong dang nhap duoc.
==============================================================================*/

IF COL_LENGTH(N'dbo.[USER]', N'is_verified') IS NULL
   OR COL_LENGTH(N'dbo.[USER]', N'verified_at') IS NULL
    PRINT N'  [SKIP] Verify seed accounts - [USER].is_verified/verified_at chua ton tai';
ELSE
BEGIN
    UPDATE dbo.[USER]
    SET is_verified = 1,
        verified_at = COALESCE(verified_at, SYSDATETIME())
    WHERE email IN (N'admin2@aistudyhub.local', N'student2@aistudyhub.local')
      AND is_verified = 0;

    IF @@ROWCOUNT > 0
        PRINT N'  [OK] Marked seed accounts as verified';
    ELSE
        PRINT N'  [SKIP] Seed accounts already verified';
END
GO

/*==============================================================================
  12. BANG MOI: DOCUMENT_READING (thoi gian doc tai lieu)
      - Nguon du lieu cho Study Time va feed Recent Activity o trang Profile,
        va cho tien do "da hoc" cua tung mon o Library.
      - Khong dung STUDY_ACTIVITY vi bang do bat buoc summary_id/session_id/
        question_id NOT NULL cung luc, khong bieu dien duoc hanh vi "chi doc".
==============================================================================*/

IF OBJECT_ID(N'dbo.DOCUMENT_READING', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DOCUMENT_READING
    (
        user_id      INT NOT NULL,
        document_id  INT NOT NULL,
        read_seconds INT NOT NULL CONSTRAINT DF_DOCUMENT_READING_seconds DEFAULT 0,
        last_read_at DATETIME2 NOT NULL,
        CONSTRAINT PK_DOCUMENT_READING PRIMARY KEY (user_id, document_id)
    );

    PRINT N'  [OK] Created table dbo.DOCUMENT_READING';
END
ELSE
    PRINT N'  [SKIP] Table dbo.DOCUMENT_READING already exists';
GO

/*==============================================================================
  14. VA CAC LOI CON SOT LAI CUA BASE SCHEMA
      a) MAJOR.major_code chi duoc tao khi chinh v2 tao bang MAJOR. Neu base
         schema (AI_Study_Hub.sql) da tao MAJOR truoc thi khoi lenh o muc 1
         bi SKIP => cot major_code khong bao gio ton tai.
      b) AI_Study_Hub.sql tao index tren dbo.PRACTICE_TEST nhung khong file nao
         tao bang do => script base bao loi 208 va bo qua phan con lai, ke ca
         index IX_USER_STUDY_ACTIVITY_user_date ngay sau no.
==============================================================================*/

IF COL_LENGTH(N'dbo.MAJOR', N'major_code') IS NULL
BEGIN
    ALTER TABLE dbo.MAJOR ADD major_code NVARCHAR(20) NULL;
    PRINT N'  [OK] Added column MAJOR.major_code';
END
ELSE
    PRINT N'  [SKIP] Column MAJOR.major_code already exists';
GO

-- Backfill cho 3 nganh mau o muc 10. Cac nganh khac de NULL, admin tu dat sau.
UPDATE dbo.MAJOR
SET major_code = CASE major_name
        WHEN N'Cong nghe Thong tin' THEN N'CNTT'
        WHEN N'Quan tri Kinh doanh' THEN N'QTKD'
        WHEN N'Ngon ngu Anh'        THEN N'NNA'
        END
WHERE major_code IS NULL
  AND major_name IN (N'Cong nghe Thong tin', N'Quan tri Kinh doanh', N'Ngon ngu Anh');
GO

-- Filtered index can QUOTED_IDENTIFIER ON. sqlcmd mac dinh tat option nay nen
-- cau lenh tinh se loi 1934; SET ngay tai day de chay duoc bang moi cong cu.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.MAJOR') AND name = N'UX_MAJOR_code')
   AND NOT EXISTS (SELECT major_code FROM dbo.MAJOR
                   WHERE major_code IS NOT NULL
                   GROUP BY major_code HAVING COUNT(*) > 1)
BEGIN
    CREATE UNIQUE INDEX UX_MAJOR_code ON dbo.MAJOR(major_code) WHERE major_code IS NOT NULL;
    PRINT N'  [OK] Created filtered index UX_MAJOR_code';
END
ELSE
    PRINT N'  [SKIP] UX_MAJOR_code exists, or duplicate major_code values block it';
GO

-- Khong tao IX_USER_STUDY_ACTIVITY_user_date: bang dbo.USER_STUDY_ACTIVITY khong
-- ton tai (bang that ten dbo.STUDY_ACTIVITY), va app khong doc bang do theo
-- user_id/activity_date - Study Time lay tu dbo.DOCUMENT_READING. Index do khong
-- phuc vu truy van nao nen bo han thay vi tao cho co.

-- dbo.PRACTICE_TEST khong duoc tao boi bat ky file SQL nao va khong co code nao
-- dung den. Tao index chi khi bang that su ton tai, thay vi loi 208 nhu ban base.
IF OBJECT_ID(N'dbo.PRACTICE_TEST', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE object_id = OBJECT_ID(N'dbo.PRACTICE_TEST')
                     AND name = N'IX_PRACTICE_TEST_user_created')
BEGIN
    CREATE NONCLUSTERED INDEX IX_PRACTICE_TEST_user_created
    ON dbo.PRACTICE_TEST (user_id, created_at DESC);
    PRINT N'  [OK] Created index IX_PRACTICE_TEST_user_created';
END
ELSE
    PRINT N'  [SKIP] dbo.PRACTICE_TEST does not exist - index not needed';
GO

-- Chan tai lieu trung khi xin duyet public: can dinh danh chinh xac cua noi dung
-- file. Dung SHA-256 cua dung so byte da ghi vao storage (ban PDF sau convert),
-- luu dang hex 64 ky tu. Cot NULL vi tai lieu cu chua co hash - luat chan chi ap
-- dung khi ca hai ben deu co hash.
IF OBJECT_ID(N'dbo.DOCUMENT', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.DOCUMENT', N'file_hash') IS NULL
BEGIN
    ALTER TABLE dbo.DOCUMENT ADD file_hash CHAR(64) NULL;
    PRINT N'  [OK] Added column DOCUMENT.file_hash';
END
ELSE
    PRINT N'  [SKIP] DOCUMENT.file_hash exists';
GO

IF OBJECT_ID(N'dbo.DOCUMENT', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.DOCUMENT', N'file_hash') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE object_id = OBJECT_ID(N'dbo.DOCUMENT')
                     AND name = N'IX_DOCUMENT_file_hash')
BEGIN
    CREATE NONCLUSTERED INDEX IX_DOCUMENT_file_hash
    ON dbo.DOCUMENT (file_hash, visibility_status);
    PRINT N'  [OK] Created index IX_DOCUMENT_file_hash';
END
ELSE
    PRINT N'  [SKIP] IX_DOCUMENT_file_hash exists';
GO

-- =============================================================================
--  CAC BUOC CHINH LY CHUONG TRINH HOC DA CHUYEN SANG AI_Study_Hub_seed.sql
--  -------------------------------------------------------------------------
--  Truoc day cho nay co 6 khoi thao tac tren MAJOR / SEMESTER / SUBJECT:
--    1. Doi ten Preparation / Pre-Preparation thanh Semester 0
--    2. Moi nganh chi giu mot dong Semester 0
--    3. Bo cac mon ren luyen khoi Semester 0
--    4. Them nhom mon tieng Anh chuan bi + lien ket cho moi nganh
--    5. Tach Semester 0 thanh nganh rieng Preparation
--    6. Dien mo ta cho 7 chuyen nganh
--
--  Chung deu can du lieu chuong trinh hoc DA TON TAI moi chay duoc, ma du lieu do
--  lai do file seed tao ra - trong khi seed chay SAU file nay. Ket qua: tren
--  database moi, ca 6 khoi im lang bo qua, thieu 10 mon va 6 lien ket ma khong bao
--  loi gi; phai chay lai lan hai moi du.
--
--  Vi vay chung da duoc chuyen xuong cuoi AI_Study_Hub_seed.sql - dung thu tu:
--  schema -> du lieu -> chinh ly du lieu. Thu tu chay dung chi con hai buoc:
--      1) AI_Study_Hub_full.sql
--      2) AI_Study_Hub_seed.sql
-- =============================================================================

/*==============================================================================
  BANG: STORAGE_SETTINGS (noi luu tai lieu upload: Supabase hay Cloudflare R2)
  --------------------------------------------------------------------------
  Bang nay truoc day KHONG nam trong file SQL nao - backend Java tu tao luc khoi
  dong (StorageSettingsService.ensureSchema). Hau qua: cai moi tu file SQL xong se
  co 41 bang, trong khi database dang chay co 42, nguoi doi chieu tuong bi thieu.

  Dinh nghia duoi day giu y het ben Java nen hai duong tao ra cung mot bang; ai
  chay truoc cung duoc, khong de len nhau.

  setting_id CHECK = 1: bang cau hinh chi co dung mot dong.
==============================================================================*/
IF OBJECT_ID(N'dbo.STORAGE_SETTINGS', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.STORAGE_SETTINGS
    (
        setting_id INT NOT NULL PRIMARY KEY CHECK (setting_id = 1),
        provider   NVARCHAR(20) NOT NULL,
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_by INT NULL
    );
    PRINT N'  [OK] Created table dbo.STORAGE_SETTINGS';
END
ELSE
    PRINT N'  [SKIP] Table dbo.STORAGE_SETTINGS already exists';
GO

-- SUPABASE la mac dinh giong thuoc tinh storage.provider ben Java.
IF NOT EXISTS (SELECT 1 FROM dbo.STORAGE_SETTINGS WHERE setting_id = 1)
BEGIN
    INSERT INTO dbo.STORAGE_SETTINGS (setting_id, provider) VALUES (1, N'SUPABASE');
    PRINT N'  [OK] Inserted default storage provider SUPABASE';
END
GO

/*==============================================================================
  Index hieu nang: sua lai hai index bi hong o v1
  ----------------------------------------------
  Ban v1 cu (muc 11 va 12) tao index tren dbo.PRACTICE_TEST va
  dbo.USER_STUDY_ACTIVITY - hai bang KHONG HE TON TAI; ten that la TEST_ATTEMPT va
  STUDY_ACTIVITY. Hai cau lenh do luon bao loi 1088 nen index khong duoc tao.

  v1 nay da sua. Khoi duoi day giu lai de va cho cac database DA TAO bang ban v1
  cu - chay lai v2 la co index, khong can dung lai schema tu dau.
  Voi database moi thi v1 da tao roi, khoi nay chi la no-op.
==============================================================================*/
IF OBJECT_ID(N'dbo.TEST_ATTEMPT', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = N'IX_TEST_ATTEMPT_user_start'
                     AND object_id = OBJECT_ID(N'dbo.TEST_ATTEMPT'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_TEST_ATTEMPT_user_start
    ON dbo.TEST_ATTEMPT (user_id, start_time DESC);
    PRINT N'  [INDEX] IX_TEST_ATTEMPT_user_start created';
END
GO

IF OBJECT_ID(N'dbo.STUDY_ACTIVITY', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = N'IX_STUDY_ACTIVITY_user_date'
                     AND object_id = OBJECT_ID(N'dbo.STUDY_ACTIVITY'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_STUDY_ACTIVITY_user_date
    ON dbo.STUDY_ACTIVITY (user_id, activity_date DESC);
    PRINT N'  [INDEX] IX_STUDY_ACTIVITY_user_date created';
END
GO

PRINT N'========================================';
PRINT N'UPGRADE MIGRATION COMPLETED SUCCESSFULLY';
PRINT N'========================================';
GO



/*==============================================================================
  PHAN 3/3 - AI_Study_Hub_v3_shared_subjects.sql (migration v3)
==============================================================================*/

-- AI_Study_Hub v3: Shared Subjects Migration
-- Cho phép một môn học (SUBJECT) xuất hiện ở nhiều kỳ học (SEMESTER) khác nhau.
-- Hướng B: giữ SUBJECT.semester_id làm "nhà", thêm bảng SEMESTER_SUBJECT cho link phụ.

USE AI_StudyHub;
GO

-- 1. Tạo bảng liên kết phụ SEMESTER_SUBJECT
IF OBJECT_ID(N'dbo.SEMESTER_SUBJECT', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SEMESTER_SUBJECT
    (
        semester_id INT NOT NULL,
        subject_id  INT NOT NULL,
        CONSTRAINT PK_SEMESTER_SUBJECT PRIMARY KEY (semester_id, subject_id),
        CONSTRAINT FK_SEMESTER_SUBJECT_SEMESTER FOREIGN KEY (semester_id) REFERENCES dbo.SEMESTER(semester_id),
        CONSTRAINT FK_SEMESTER_SUBJECT_SUBJECT FOREIGN KEY (subject_id) REFERENCES dbo.SUBJECT(subject_id)
    );
END
GO

-- 2. Không cần migrate dữ liệu cũ vì mỗi subject đã có semester_id (link cứng).
--    SEMESTER_SUBJECT chỉ dùng cho link phụ sau này.

