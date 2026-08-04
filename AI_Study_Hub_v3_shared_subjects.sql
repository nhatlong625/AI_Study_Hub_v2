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
