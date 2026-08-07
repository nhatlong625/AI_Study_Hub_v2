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

-- Gop 'Preparation' va 'Pre-Preparation' thanh 'Semester 0'.
-- Hai nganh IA va SE dang co CA HAI ky nay, doi ten suong se de lai hai dong
-- trung ten trong cung mot nganh - dung cai loi ma trang Home vua sua xong.
-- Nen doi ten truoc, roi gop cac dong trung lai lam mot.
IF OBJECT_ID(N'dbo.SEMESTER', N'U') IS NOT NULL
BEGIN
    UPDATE dbo.SEMESTER
    SET semester_name = N'Semester 0'
    WHERE semester_name IN (N'Preparation', N'Pre-Preparation');
    PRINT CONCAT(N'  [OK] Renamed ', @@ROWCOUNT, N' semester row(s) to Semester 0');
END
GO

-- Moi nganh giu lai dung mot dong 'Semester 0' (dong co semester_id nho nhat),
-- cac dong con lai duoc tro ve dong giu lai roi xoa di.
IF OBJECT_ID(N'dbo.SEMESTER', N'U') IS NOT NULL
BEGIN
    DECLARE @merged INT = 0;

    -- Dong duoc giu cho moi nganh
    SELECT major_id, MIN(semester_id) AS keep_id
    INTO #KEEP
    FROM dbo.SEMESTER
    WHERE semester_name = N'Semester 0' AND major_id IS NOT NULL
    GROUP BY major_id
    HAVING COUNT(*) > 1;

    -- Cac dong thua se bi xoa
    SELECT sem.semester_id AS dup_id, k.keep_id
    INTO #DUP
    FROM dbo.SEMESTER sem
    JOIN #KEEP k ON k.major_id = sem.major_id
    WHERE sem.semester_name = N'Semester 0' AND sem.semester_id <> k.keep_id;

    IF EXISTS (SELECT 1 FROM #DUP)
    BEGIN
        -- Lien ket chinh
        UPDATE sub SET sub.semester_id = d.keep_id
        FROM dbo.SUBJECT sub JOIN #DUP d ON d.dup_id = sub.semester_id;

        -- Lien ket phu: chen truoc roi xoa, tranh dung khoa chinh (semester_id, subject_id)
        INSERT INTO dbo.SEMESTER_SUBJECT (semester_id, subject_id)
        SELECT DISTINCT d.keep_id, ss.subject_id
        FROM dbo.SEMESTER_SUBJECT ss
        JOIN #DUP d ON d.dup_id = ss.semester_id
        WHERE NOT EXISTS (SELECT 1 FROM dbo.SEMESTER_SUBJECT x
                          WHERE x.semester_id = d.keep_id AND x.subject_id = ss.subject_id);

        DELETE ss FROM dbo.SEMESTER_SUBJECT ss JOIN #DUP d ON d.dup_id = ss.semester_id;

        -- Bang thu ba co khoa ngoai toi SEMESTER
        IF OBJECT_ID(N'dbo.SUBJECT_REPORT', N'U') IS NOT NULL
            UPDATE r SET r.semester_id = d.keep_id
            FROM dbo.SUBJECT_REPORT r JOIN #DUP d ON d.dup_id = r.semester_id;

        DELETE sem FROM dbo.SEMESTER sem JOIN #DUP d ON d.dup_id = sem.semester_id;
        SET @merged = @@ROWCOUNT;
    END

    DROP TABLE #DUP;
    DROP TABLE #KEEP;
    PRINT CONCAT(N'  [OK] Merged ', @merged, N' duplicate Semester 0 row(s)');
END
GO

-- Bo 4 mon ren luyen khoi Semester 0: VOV114/124/134 (Vovinam) va PHE_COM*1
-- (Giao duc the chat 1). Ca 4 chi xuat hien o Semester 0 va khong o ky nao khac,
-- nen xoa han thay vi go lien ket - cot SUBJECT.semester_id la NOT NULL, de lai
-- se thanh ban ghi mo coi khong tro vao dau duoc.
-- PHE_COM*2 va PHE_COM*3 (ky 1 va 2) giu nguyen.
IF OBJECT_ID(N'dbo.SUBJECT', N'U') IS NOT NULL
BEGIN
    DECLARE @dropped INT = 0;

    SELECT sub.subject_id
    INTO #BO
    FROM dbo.SUBJECT sub
    WHERE sub.subject_code IN (N'VOV114', N'VOV124', N'VOV134', N'PHE_COM*1')
      -- Chi xoa khi khong ai dang dung, de khong lam mat tai lieu that
      AND NOT EXISTS (SELECT 1 FROM dbo.DOCUMENT d WHERE d.subject_id = sub.subject_id)
      AND NOT EXISTS (SELECT 1 FROM dbo.USER_SUBJECT us WHERE us.subject_id = sub.subject_id);

    DELETE ss FROM dbo.SEMESTER_SUBJECT ss JOIN #BO b ON b.subject_id = ss.subject_id;
    DELETE sub FROM dbo.SUBJECT sub JOIN #BO b ON b.subject_id = sub.subject_id;
    SET @dropped = @@ROWCOUNT;

    DROP TABLE #BO;
    PRINT CONCAT(N'  [OK] Removed ', @dropped, N' Semester 0 training subject(s)');

    IF EXISTS (SELECT 1 FROM dbo.SUBJECT
               WHERE subject_code IN (N'VOV114', N'VOV124', N'VOV134', N'PHE_COM*1'))
        PRINT N'  [WARN] Some kept: they still have documents or enrolled students';
END
GO

-- Them nhom mon tieng Anh chuan bi vao Semester 0 cua CA 7 nganh.
-- Ten mon: tra duoc tu tai lieu FPTU cho ENT104/203/303/403 (bo Top Notch/Summit);
-- cac ma con lai khong tim ra ten chinh thuc nen lay chinh ma lam ten, description
-- de trong - sua sau trong Library Management thay vi doan bua.
-- ENT503 va TRS501 da co san (home o SE), chi can bo sung lien ket cho cac nganh khac.
IF OBJECT_ID(N'dbo.SUBJECT', N'U') IS NOT NULL
   AND EXISTS (SELECT 1 FROM dbo.SEMESTER WHERE semester_name = N'Semester 0')
BEGIN
    DECLARE @MON TABLE (subject_code NVARCHAR(50), subject_name NVARCHAR(255));
    INSERT INTO @MON (subject_code, subject_name) VALUES
        (N'ENT103', N'ENT103'),
        (N'ENT104', N'Top Notch 1'),
        (N'ENT203', N'Top Notch 2'),
        (N'ENT303', N'Top Notch 3'),
        (N'ENT304', N'ENT304'),
        (N'ENT403', N'Summit 1'),
        (N'ENT404', N'ENT404'),
        (N'ENT503', N'English 6 (Summit 2)'),
        (N'EPT202', N'EPT202'),
        (N'TRS401', N'TRS401'),
        (N'TRS501', N'English 5 (University success)'),
        (N'TRS601', N'TRS601');

    -- Nganh "nha" cua mon moi: Semester 0 cua SE, dung cho ENT503/TRS501 san co.
    DECLARE @home INT = (SELECT MIN(sem.semester_id) FROM dbo.SEMESTER sem
                         JOIN dbo.MAJOR m ON m.major_id = sem.major_id
                         WHERE sem.semester_name = N'Semester 0' AND m.major_code = N'SE');
    IF @home IS NULL
        SET @home = (SELECT MIN(semester_id) FROM dbo.SEMESTER WHERE semester_name = N'Semester 0');

    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
    SELECT @home, x.subject_name, x.subject_code, GETDATE()
    FROM @MON x
    WHERE NOT EXISTS (SELECT 1 FROM dbo.SUBJECT s WHERE s.subject_code = x.subject_code);
    PRINT CONCAT(N'  [OK] Created ', @@ROWCOUNT, N' preparation English subject(s)');

    -- Lien ket phu toi Semester 0 cua cac nganh con lai. Bo qua chinh ky "nha" vi
    -- lien ket chinh da nam o SUBJECT.semester_id.
    INSERT INTO dbo.SEMESTER_SUBJECT (semester_id, subject_id)
    SELECT sem.semester_id, sub.subject_id
    FROM dbo.SEMESTER sem
    JOIN @MON x ON 1 = 1
    JOIN dbo.SUBJECT sub ON sub.subject_code = x.subject_code
    WHERE sem.semester_name = N'Semester 0'
      AND sem.semester_id <> sub.semester_id
      AND NOT EXISTS (SELECT 1 FROM dbo.SEMESTER_SUBJECT ss
                      WHERE ss.semester_id = sem.semester_id AND ss.subject_id = sub.subject_id);
    PRINT CONCAT(N'  [OK] Linked ', @@ROWCOUNT, N' subject/semester pair(s) across majors');
END
GO

-- Tach Semester 0 ra thanh mot "nganh" rieng ten Preparation.
-- Ly do: o truong nay Semester 0 la ky chuan bi chung, hoc va pass het moi duoc
-- chon chuyen nganh. Truoc day no duoc luu thanh 7 dong (moi chuyen nganh mot dong)
-- voi noi dung gan nhu y het - vua ton cong sua 7 lan vua da bi lech du lieu.
-- Gom ve mot dong duy nhat thuoc nganh Preparation thi hanh vi mong muon co ngay
-- tu du lieu, khong can code dac biet:
--   All Majors     -> thay Semester 0 (vi no thuoc mot nganh)
--   loc SE/AI/...   -> khong thay, vi Semester 0 khong thuoc cac nganh do
--   loc Preparation -> chi thay Semester 0
IF OBJECT_ID(N'dbo.MAJOR', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.SEMESTER', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.MAJOR WHERE major_name = N'Preparation')
    BEGIN
        -- Mo ta nay hien thang trong man onboarding nen phai la tieng Anh.
        INSERT INTO dbo.MAJOR (major_name, description, created_at)
        VALUES (N'Preparation',
                N'Shared preparation semester. Complete these courses before choosing a specialization.',
                GETDATE());
        IF COL_LENGTH(N'dbo.MAJOR', N'major_code') IS NOT NULL
            EXEC sp_executesql N'UPDATE dbo.MAJOR SET major_code = N''PREP''
                                 WHERE major_name = N''Preparation'' AND major_code IS NULL';
        PRINT N'  [OK] Created major Preparation';
    END
    ELSE
        PRINT N'  [SKIP] Major Preparation already exists';

    -- Ban migration dau tien dat mo ta bang tieng Viet khong dau; sua lai cho khop
    -- quy uoc chuoi hien thi chi dung tieng Anh.
    UPDATE dbo.MAJOR
    SET description = N'Shared preparation semester. Complete these courses before choosing a specialization.'
    WHERE major_name = N'Preparation'
      AND description = N'Ky chuan bi chung cho moi sinh vien. Hoan thanh cac mon o day roi moi chon chuyen nganh.';

    DECLARE @prepMajor INT = (SELECT MIN(major_id) FROM dbo.MAJOR WHERE major_name = N'Preparation');

    IF NOT EXISTS (SELECT 1 FROM dbo.SEMESTER
                   WHERE semester_name = N'Semester 0' AND major_id = @prepMajor)
    BEGIN
        INSERT INTO dbo.SEMESTER (semester_name, major_id, created_at)
        VALUES (N'Semester 0', @prepMajor, GETDATE());
        PRINT N'  [OK] Created semester Semester 0 under Preparation';
    END

    DECLARE @prepSem INT = (SELECT MIN(semester_id) FROM dbo.SEMESTER
                            WHERE semester_name = N'Semester 0' AND major_id = @prepMajor);

    -- Cac dong Semester 0 cu, tuc cua 7 chuyen nganh
    SELECT semester_id INTO #CU
    FROM dbo.SEMESTER
    WHERE semester_name = N'Semester 0' AND semester_id <> @prepSem;

    IF EXISTS (SELECT 1 FROM #CU)
    BEGIN
        -- Don mon ve ky moi. Mon nao trung ma da co roi thi bo qua o buoc duoi.
        UPDATE sub SET sub.semester_id = @prepSem
        FROM dbo.SUBJECT sub JOIN #CU c ON c.semester_id = sub.semester_id;

        -- Lien ket phu toi cac dong cu khong con y nghia: tat ca mon deu da nam
        -- trong dung mot ky roi.
        DELETE ss FROM dbo.SEMESTER_SUBJECT ss JOIN #CU c ON c.semester_id = ss.semester_id;
        DELETE ss FROM dbo.SEMESTER_SUBJECT ss WHERE ss.semester_id = @prepSem;

        IF OBJECT_ID(N'dbo.SUBJECT_REPORT', N'U') IS NOT NULL
        BEGIN
            UPDATE r SET r.semester_id = @prepSem
            FROM dbo.SUBJECT_REPORT r JOIN #CU c ON c.semester_id = r.semester_id;
            EXEC sp_executesql N'UPDATE r SET r.major_id = @m
                                 FROM dbo.SUBJECT_REPORT r WHERE r.semester_id = @s',
                               N'@m INT, @s INT', @m = @prepMajor, @s = @prepSem;
        END

        DELETE sem FROM dbo.SEMESTER sem JOIN #CU c ON c.semester_id = sem.semester_id;
        PRINT CONCAT(N'  [OK] Merged ', @@ROWCOUNT, N' per-major Semester 0 row(s) into Preparation');
    END
    ELSE
        PRINT N'  [SKIP] No per-major Semester 0 rows left to merge';

    DROP TABLE #CU;
END
GO

-- Mo ta cho 7 chuyen nganh. Man onboarding hien mo ta ngay duoi ten nganh, ma
-- truoc do chi Preparation co - danh sach nhin lech han, va sinh vien phai chon
-- nganh chi bang cai ten. Van tieng Anh vi day la chuoi hien thi.
-- Chi ghi khi dang trong: admin sua lai qua Library Management thi lan chay sau
-- khong de len.
IF OBJECT_ID(N'dbo.MAJOR', N'U') IS NOT NULL
BEGIN
    DECLARE @MOTA TABLE (major_name NVARCHAR(255), description NVARCHAR(1000));
    INSERT INTO @MOTA (major_name, description) VALUES
        (N'Artificial Intelligence',
         N'Machine learning, data processing and intelligent systems, built on a computing and mathematics foundation.'),
        (N'Software Engineering',
         N'Software development from programming foundations through web, mobile and large-scale systems.'),
        (N'Information Assurance',
         N'Information security, digital forensics, malware analysis and risk management for information systems.'),
        (N'Digital Marketing',
         N'Digital marketing strategy, consumer behaviour and data-driven campaigns across online channels.'),
        (N'Finance',
         N'Corporate finance, accounting, banking and investment within a business administration program.'),
        (N'Logistics & Supply Chain Management',
         N'Global logistics, supply chain operations, freight and international trade management.'),
        (N'English Language',
         N'English linguistics, translation and interpreting, and professional communication in international settings.');

    UPDATE m SET m.description = x.description, m.updated_at = GETDATE()
    FROM dbo.MAJOR m JOIN @MOTA x ON x.major_name = m.major_name
    WHERE m.description IS NULL OR LTRIM(RTRIM(m.description)) = N'';
    PRINT CONCAT(N'  [OK] Filled description for ', @@ROWCOUNT, N' major(s)');
END
GO

PRINT N'========================================';
PRINT N'UPGRADE MIGRATION COMPLETED SUCCESSFULLY';
PRINT N'========================================';
GO
