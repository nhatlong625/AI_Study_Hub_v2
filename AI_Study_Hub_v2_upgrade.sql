USE AI_StudyHub;
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
        major_code  NVARCHAR(20)      NOT NULL,
        major_name  NVARCHAR(200)     NOT NULL,
        description NVARCHAR(1000)    NULL,
        is_active   BIT               NOT NULL CONSTRAINT DF_MAJOR_is_active DEFAULT 1,
        created_at  DATETIME2         NOT NULL CONSTRAINT DF_MAJOR_created_at DEFAULT SYSDATETIME(),
        updated_at  DATETIME2         NULL,
        CONSTRAINT PK_MAJOR PRIMARY KEY (major_id),
        CONSTRAINT UQ_MAJOR_code UNIQUE (major_code)
    );

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

IF NOT EXISTS (SELECT 1 FROM sys.indexes
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
  10. DU LIEU MAU: 3 Nganh hoc khoi tao (Seed Data)
      - Du lieu mau giup chay test ngay
==============================================================================*/

IF NOT EXISTS (SELECT 1 FROM dbo.MAJOR WHERE major_code = N'CNTT')
BEGIN
    INSERT INTO dbo.MAJOR (major_code, major_name, description)
    VALUES
        (N'CNTT', N'Cong nghe Thong tin',
         N'Nganh dao tao chuyen sau ve Lap trinh phan mem, Mang may tinh, Tri tue nhan tao va Co so du lieu.'),
        (N'QTKD', N'Quan tri Kinh doanh',
         N'Nganh dao tao chuyen sau ve Quan tri chien luoc, Marketing, Tai chinh doanh nghiep va Khoi nghiep.'),
        (N'NNA', N'Ngon ngu Anh',
         N'Nganh dao tao chuyen sau ve Ngon ngu hoc, Bien phien dich, Giao tiep quoc te va Van hoc Anh.');

    PRINT N'  [OK] Seeded 3 majors: CNTT, QTKD, NNA';
END
ELSE
    PRINT N'  [SKIP] Seed majors already exist';
GO

PRINT N'========================================';
PRINT N'UPGRADE MIGRATION COMPLETED SUCCESSFULLY';
PRINT N'========================================';
GO
