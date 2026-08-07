/* ============================================================
   AI_StudyHub - Rollback for AI_StudyHub_seed.sql

   Removes exactly what the curriculum seed inserted: the 7 majors
   from Subjects_7nganh.xlsx, their semesters, their subjects and
   the SEMESTER_SUBJECT links.

   Leaves untouched: the 3 sample majors seeded by
   AI_Study_Hub_v2_upgrade.sql, and every table outside the
   MAJOR / SEMESTER / SUBJECT / SEMESTER_SUBJECT group.

   SAFETY: aborts without deleting anything if any DOCUMENT,
   USER_SUBJECT, SUBJECT_REPORT or [USER] row still points at the
   rows to be removed. Runs in one transaction.
   ============================================================ */
USE [AI_StudyHub];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
-- dbo.MAJOR carries a filtered index (UX_MAJOR_code); DELETE against a table with
-- one requires QUOTED_IDENTIFIER ON. SSMS sets it, sqlcmd does not.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

BEGIN TRANSACTION;

DECLARE @maj TABLE (major_id INT PRIMARY KEY);
INSERT INTO @maj (major_id)
SELECT major_id FROM dbo.MAJOR
WHERE major_name IN (N'Software Engineering',
                     N'Digital Marketing',
                     N'Logistics & Supply Chain Management',
                     N'Finance',
                     N'Information Assurance',
                     N'English Language',
                     N'Artificial Intelligence');

DECLARE @sem TABLE (semester_id INT PRIMARY KEY);
INSERT INTO @sem (semester_id)
SELECT semester_id FROM dbo.SEMESTER WHERE major_id IN (SELECT major_id FROM @maj);

DECLARE @sub TABLE (subject_id INT PRIMARY KEY);
INSERT INTO @sub (subject_id)
SELECT subject_id FROM dbo.SUBJECT WHERE semester_id IN (SELECT semester_id FROM @sem);

/* ---------- Safety check ---------- */
DECLARE @docs   INT = (SELECT COUNT(*) FROM dbo.DOCUMENT       WHERE subject_id IN (SELECT subject_id FROM @sub));
DECLARE @usub   INT = (SELECT COUNT(*) FROM dbo.USER_SUBJECT   WHERE subject_id IN (SELECT subject_id FROM @sub));
DECLARE @users  INT = (SELECT COUNT(*) FROM dbo.[USER]         WHERE major_id   IN (SELECT major_id   FROM @maj));
DECLARE @rep    INT = (SELECT COUNT(*) FROM dbo.SUBJECT_REPORT WHERE major_id   IN (SELECT major_id   FROM @maj)
                                                                  OR semester_id IN (SELECT semester_id FROM @sem));

IF @docs > 0 OR @usub > 0 OR @users > 0 OR @rep > 0
BEGIN
    ROLLBACK TRANSACTION;
    PRINT CONCAT(N'ABORTED - rows still reference this data. documents=', @docs,
                 N' user_subjects=', @usub, N' users=', @users, N' subject_reports=', @rep);
    PRINT N'Nothing was deleted. Clear those references first, or delete them by hand.';
END
ELSE
BEGIN
    DELETE FROM dbo.SEMESTER_SUBJECT
    WHERE semester_id IN (SELECT semester_id FROM @sem)
       OR subject_id  IN (SELECT subject_id  FROM @sub);
    PRINT CONCAT(N'  [LINK]     deleted ', @@ROWCOUNT);

    DELETE FROM dbo.SUBJECT WHERE subject_id IN (SELECT subject_id FROM @sub);
    PRINT CONCAT(N'  [SUBJECT]  deleted ', @@ROWCOUNT);

    DELETE FROM dbo.SEMESTER WHERE semester_id IN (SELECT semester_id FROM @sem);
    PRINT CONCAT(N'  [SEMESTER] deleted ', @@ROWCOUNT);

    DELETE FROM dbo.MAJOR WHERE major_id IN (SELECT major_id FROM @maj);
    PRINT CONCAT(N'  [MAJOR]    deleted ', @@ROWCOUNT);

    COMMIT TRANSACTION;
    PRINT N'Rollback done. Curriculum seed removed.';
END
GO
