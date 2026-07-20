USE [AI_StudyHub];
GO

-- Insert Semesters
DECLARE @SemesterMapping TABLE (sem_val INT, sem_id INT);

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester -1', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (-1, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 0', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (0, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 1', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (1, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 2', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (2, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 3', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (3, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 4', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (4, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 5', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (5, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 6', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (6, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 7', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (7, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 8', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (8, SCOPE_IDENTITY());

INSERT INTO dbo.SEMESTER (semester_name, created_at)
VALUES (N'Semester 9', GETDATE());
INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES (9, SCOPE_IDENTITY());

-- Insert Subjects
DECLARE @SemId_TRS501 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = -1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_TRS501, N'English 5 (University success)', N'TRS501', GETDATE());

DECLARE @SemId_ENT503 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_ENT503, N'English 6 (Summit 2)', N'ENT503', GETDATE());

DECLARE @SemId_VOV114 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_VOV114, N'Vovinam 1', N'VOV114', GETDATE());

DECLARE @SemId_VOV124 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_VOV124, N'Vovinam 2', N'VOV124', GETDATE());

DECLARE @SemId_VOV134 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_VOV134, N'Vovinam 3', N'VOV134', GETDATE());

DECLARE @SemId_TMI101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_TMI101, N'Traditional musical instrument', N'TMI101', GETDATE());

DECLARE @SemId_OTP101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_OTP101, N'Orientation and General Training Program', N'OTP101', GETDATE());

DECLARE @SemId_CSI106 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_CSI106, N'Introduction to Computer Science', N'CSI106', GETDATE());

DECLARE @SemId_SSL101c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SSL101c, N'Academic Skills for University Success', N'SSL101c', GETDATE());

DECLARE @SemId_PRF192 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_PRF192, N'Programming Fundamentals', N'PRF192', GETDATE());

DECLARE @SemId_MAE101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_MAE101, N'Mathematics for Engineering', N'MAE101', GETDATE());

DECLARE @SemId_CEA201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_CEA201, N'Computer Organization and Architecture', N'CEA201', GETDATE());

DECLARE @SemId_PRO192 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_PRO192, N'Object-Oriented Programming', N'PRO192', GETDATE());

DECLARE @SemId_MAD101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_MAD101, N'Discrete mathematics', N'MAD101', GETDATE());

DECLARE @SemId_OSG202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_OSG202, N'Operating Systems', N'OSG202', GETDATE());

DECLARE @SemId_WED201c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_WED201c, N'Web Design', N'WED201c', GETDATE());

DECLARE @SemId_NWC204 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_NWC204, N'Computer Networking', N'NWC204', GETDATE());

DECLARE @SemId_JPD113 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_JPD113, N'Elementary Japanese 1- A1.1', N'JPD113', GETDATE());

DECLARE @SemId_CSD201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_CSD201, N'Data Structures and Algorithms', N'CSD201', GETDATE());

DECLARE @SemId_DBI202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_DBI202, N'Database Systems', N'DBI202', GETDATE());

DECLARE @SemId_MAS291 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_MAS291, N'Statistics & Probability', N'MAS291', GETDATE());

DECLARE @SemId_LAB211 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_LAB211, N'OOP with Java Lab', N'LAB211', GETDATE());

DECLARE @SemId_JPD123 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_JPD123, N'Elementary Japanese 1-A1.2', N'JPD123', GETDATE());

DECLARE @SemId_IOT102 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_IOT102, N'Internet of Things', N'IOT102', GETDATE());

DECLARE @SemId_PRJ301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_PRJ301, N'Java Web application development', N'PRJ301', GETDATE());

DECLARE @SemId_SSG104 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SSG104, N'Communication and In-Group Working Skills', N'SSG104', GETDATE());

DECLARE @SemId_SWE202c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SWE202c, N'Introduction to Software Engineering', N'SWE202c', GETDATE());

DECLARE @SemId_HSF302 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_HSF302, N'Working with Spring Framework', N'HSF302', GETDATE());

DECLARE @SemId_SWP391 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SWP391, N'Software development project', N'SWP391', GETDATE());

DECLARE @SemId_WDU203c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_WDU203c, N'The UI/UX Design', N'WDU203c', GETDATE());

DECLARE @SemId_SWR302 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SWR302, N'Software Requirements', N'SWR302', GETDATE());

DECLARE @SemId_SWT301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SWT301, N'Software Testing', N'SWT301', GETDATE());

DECLARE @SemId_OJT202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 6);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_OJT202, N'On the job training', N'OJT202', GETDATE());

DECLARE @SemId_ENW493c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 6);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_ENW493c, N'Research Methods & Academic Writing Skills', N'ENW493c', GETDATE());

DECLARE @SemId_SBA301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SBA301, N'Integrate single page application with Spring Boot', N'SBA301', GETDATE());

DECLARE @SemId_SWD392 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SWD392, N'Software Architecture and Design', N'SWD392', GETDATE());

DECLARE @SemId_EXE101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_EXE101, N'Experiential Entrepreneurship 1', N'EXE101', GETDATE());

DECLARE @SemId_PMG201c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_PMG201c, N'Project Management', N'PMG201c', GETDATE());

DECLARE @SemId_EXE201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_EXE201, N'Experiential Entrepreneurship 2', N'EXE201', GETDATE());

DECLARE @SemId_ITE302c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_ITE302c, N'Ethics in IT', N'ITE302c', GETDATE());

DECLARE @SemId_MLN122 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_MLN122, N'Political economics of Marxism – Leninism', N'MLN122', GETDATE());

DECLARE @SemId_MLN111 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_MLN111, N'Philosophy of Marxism – Leninism', N'MLN111', GETDATE());

DECLARE @SemId_MSS301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_MSS301, N'Microservices with Spring Cloud', N'MSS301', GETDATE());

DECLARE @SemId_PRM393 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_PRM393, N'Mobile Programming', N'PRM393', GETDATE());

DECLARE @SemId_MLN131 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_MLN131, N'Scientific socialism', N'MLN131', GETDATE());

DECLARE @SemId_VNR202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_VNR202, N'History of Vietnam Communist Party', N'VNR202', GETDATE());

DECLARE @SemId_HCM202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_HCM202, N'Ho Chi Minh Ideology', N'HCM202', GETDATE());

DECLARE @SemId_SEP490 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)
VALUES (@SemId_SEP490, N'SE Capstone Project', N'SEP490', GETDATE());

