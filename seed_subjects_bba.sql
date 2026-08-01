USE [AI_StudyHub];
GO

/*==============================================================================
  SEED DATA: SUBJECTS FOR BUSINESS ADMINISTRATION (BBA / IB) MAJOR
  (Excluding duplicate subjects already present in SE seed data)
  ==============================================================================*/

-- Find existing Semesters or create if missing
DECLARE @SemesterMapping TABLE (sem_val INT, sem_id INT);

INSERT INTO @SemesterMapping (sem_val, sem_id)
SELECT sem_val, s.semester_id
FROM (VALUES (-1), (0), (1), (2), (3), (4), (5), (6), (7), (8), (9)) AS v(sem_val)
JOIN dbo.SEMESTER s ON s.semester_name = N'Semester ' + CAST(v.sem_val AS NVARCHAR(10));

-- Insert BBA / International Business Subjects (Non-Duplicate with English Descriptions)

-- Semester 0
DECLARE @SemId_PEN INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'PEN')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_PEN, N'Preparation English', N'PEN', N'Preparatory English course developing foundational grammar, vocabulary, and communication skills for business students.', GETDATE());

DECLARE @SemId_PHE1 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'PHE_COM*1')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_PHE1, N'Physical Education 1', N'PHE_COM*1', N'Physical Education 1 developing physical fitness, active health habits, and sportsmanship.', GETDATE());

DECLARE @SemId_TMI_ELE INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'TMI_ELE')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_TMI_ELE, N'Traditional musical instrument (Elective)', N'TMI_ELE', N'Traditional Musical Instrument elective introducing traditional music heritage and performance practice.', GETDATE());

-- Semester 1
DECLARE @SemId_ACC101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'ACC101')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_ACC101, N'Principles of Accounting', N'ACC101', N'Principles of Accounting covering accounting equation, double-entry bookkeeping, financial statements, and balance sheets.', GETDATE());

DECLARE @SemId_ECO111 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'ECO111')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_ECO111, N'Microeconomics', N'ECO111', N'Microeconomics examining consumer behavior, firm production choices, market supply and demand, and market structures.', GETDATE());

DECLARE @SemId_ENM302 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'ENM302')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_ENM302, N'Business English - Level 1', N'ENM302', N'Business English Level 1 building commercial vocabulary, professional email writing, and basic business negotiation.', GETDATE());

DECLARE @SemId_MKG101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'MKG101')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_MKG101, N'Management and Marketing Principles', N'MKG101', N'Management and Marketing Principles exploring core management functions and the Marketing Mix (4P/7P) framework.', GETDATE());

DECLARE @SemId_PHE2 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'PHE_COM*2')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_PHE2, N'Physical Education 2', N'PHE_COM*2', N'Physical Education 2 improving physical endurance and coordination skills across team sports.', GETDATE());

DECLARE @SemId_SSA101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'SSA101')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_SSA101, N'Academic Skills', N'SSA101', N'Academic Skills developing critical thinking, literature search, academic citation, and report writing for business majors.', GETDATE());

-- Semester 2
DECLARE @SemId_ECO121 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'ECO121')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_ECO121, N'Macroeconomics', N'ECO121', N'Macroeconomics analyzing Gross Domestic Product (GDP), inflation, unemployment, fiscal policy, and monetary policy.', GETDATE());

DECLARE @SemId_ENM402 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'ENM402')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_ENM402, N'Business English - Level 2', N'ENM402', N'Business English Level 2 advancing project presentation, contract negotiation, and international business communication.', GETDATE());

DECLARE @SemId_FIN202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'FIN202')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_FIN202, N'Principles of Corporate Finance', N'FIN202', N'Principles of Corporate Finance studying capital management, financial statement analysis, asset valuation, and investment decisions.', GETDATE());

DECLARE @SemId_IBI101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IBI101')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IBI101, N'Introduction to International Business', N'IBI101', N'Introduction to International Business studying global trade environments, globalization drivers, and market entry strategies.', GETDATE());

DECLARE @SemId_OBE102c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'OBE102c')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_OBE102c, N'Organizational Behavior', N'OBE102c', N'Organizational Behavior investigating workplace motivation, leadership dynamics, corporate culture, and conflict resolution.', GETDATE());

DECLARE @SemId_PHE3 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'PHE_COM*3')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_PHE3, N'Physical Education 3', N'PHE_COM*3', N'Physical Education 3 perfecting physical fitness, discipline, and sustainable wellness habits.', GETDATE());

-- Semester 3
DECLARE @SemId_ECO201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'ECO201')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_ECO201, N'International Economics', N'ECO201', N'International Economics examining international trade theories, tariffs, trade barriers, and foreign exchange rates.', GETDATE());

DECLARE @SemId_HRM202c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'HRM202c')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_HRM202c, N'Human Resource Management', N'HRM202c', N'Human Resource Management covering recruitment, training, performance appraisal, and compensation strategies in organizations.', GETDATE());

DECLARE @SemId_IBC201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IBC201')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IBC201, N'Cross Cultural Management and Negotiation', N'IBC201', N'Cross Cultural Management and Negotiation mastering intercultural communication, negotiation, and multinational team management.', GETDATE());

DECLARE @SemId_IOM201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IOM201')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IOM201, N'International Operation Management', N'IOM201', N'International Operation Management studying global production process design, quality management, and operations optimization.', GETDATE());

DECLARE @SemId_MAS202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'MAS202')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_MAS202, N'Applied Statistics for Business', N'MAS202', N'Applied Statistics for Business covering data collection, regression analysis, trend forecasting, and business decision support.', GETDATE());

-- Semester 4
DECLARE @SemId_BDT202c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'BDT202c')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_BDT202c, N'Business Digital Transformation', N'BDT202c', N'Business Digital Transformation exploring Big Data, AI, Cloud Computing, and IoT applications for business model innovation.', GETDATE());

DECLARE @SemId_CHN113 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'CHN113')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_CHN113, N'Elementary Chinese 1', N'CHN113', N'Elementary Chinese 1 covering Pinyin phonetics, basic Chinese characters, and introductory business conversation.', GETDATE());

DECLARE @SemId_IBF301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IBF301')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IBF301, N'International Finance', N'IBF301', N'International Finance investigating foreign exchange markets, currency risk management, international investments, and L/C settlements.', GETDATE());

DECLARE @SemId_SCM202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'SCM202')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_SCM202, N'Introduction to Logistics and Supply Chain Management', N'SCM202', N'Introduction to Logistics and Supply Chain Management covering warehousing, freight transportation, inventory, and global sourcing.', GETDATE());

DECLARE @SemId_SSG105 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'SSG105')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_SSG105, N'Communication and Collaboration Skills', N'SSG105', N'Communication and Collaboration Skills refining persuasion, effective teamwork, and workplace relationship building.', GETDATE());

-- Semester 5
DECLARE @SemId_CHN123 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'CHN123')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_CHN123, N'Elementary Chinese 2', N'CHN123', N'Elementary Chinese 2 consolidating Chinese grammar, expanding business vocabulary, and partner communication skills.', GETDATE());

DECLARE @SemId_EEC101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'EEC101')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_EEC101, N'Introduction to E-Commerce', N'EEC101', N'Introduction to E-Commerce studying B2B and B2C business models, electronic payment gateways, Digital Marketing, and TMDT platforms.', GETDATE());

DECLARE @SemId_IBS301m INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IBS301m')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IBS301m, N'International Business Strategy', N'IBS301m', N'International Business Strategy formulating global competitive strategies, strategic alliances, and cross-border M&A.', GETDATE());

DECLARE @SemId_IEI301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IEI301')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IEI301, N'Import Export', N'IEI301', N'Import Export guiding customs procedures, international commercial contracts, Incoterms 2020 rules, and L/C payment processing.', GETDATE());

DECLARE @SemId_MKT205c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'MKT205c')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_MKT205c, N'International Marketing', N'MKT205c', N'International Marketing exploring product adaptation, global pricing, international distribution channels, and trade promotion.', GETDATE());

-- Semester 6
DECLARE @SemId_ENW492c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 6);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'ENW492c')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_ENW492c, N'Academic Writing Skills', N'ENW492c', N'Academic Writing Skills refining economic research paper writing, APA citation formatting, and thesis methodology.', GETDATE());

DECLARE @SemId_OJB202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 6);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'OJB202')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_OJB202, N'On-the-job training (BBA)', N'OJB202', N'On-the-Job Training (BBA) providing practical business internship experience at partner enterprises and corporations.', GETDATE());

-- Semester 7
DECLARE @SemId_IB_COM1 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IB_COM*1')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IB_COM1, N'Option 1 (IB Elective)', N'IB_COM*1', N'International Business Elective 1 expanding practical knowledge aligned with enterprise requirements.', GETDATE());

DECLARE @SemId_IB_COM2 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IB_COM*2')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IB_COM2, N'Option 2 (IB Elective)', N'IB_COM*2', N'International Business Elective 2 delving into real-world business case studies and commercial strategies.', GETDATE());

DECLARE @SemId_IB_COM3 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IB_COM*3')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IB_COM3, N'Option 3 (IB Elective)', N'IB_COM*3', N'International Business Elective 3 sharpening market analysis techniques and strategic problem-solving.', GETDATE());

DECLARE @SemId_LAW102 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'LAW102')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_LAW102, N'Business Law and Ethics Fundamentals', N'LAW102', N'Business Law and Ethics Fundamentals examining corporate law, commercial contracts, dispute resolution, and business ethics.', GETDATE());

-- Semester 8
DECLARE @SemId_IB_COM4 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IB_COM*.4')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IB_COM4, N'Option 4 (IB Elective)', N'IB_COM*.4', N'International Business Elective 4 equipping final-year students with advanced specialized international business insights.', GETDATE());

DECLARE @SemId_RMB301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'RMB301')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_RMB301, N'Business Research Methods', N'RMB301', N'Business Research Methods guiding research design, data collection sampling, and empirical analysis using SPSS/STATA.', GETDATE());

-- Semester 9
DECLARE @SemId_IB_GRA_ELE INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
IF NOT EXISTS (SELECT 1 FROM dbo.SUBJECT WHERE subject_code = N'IB_GRA_ELE')
    INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
    VALUES (@SemId_IB_GRA_ELE, N'Graduation Elective - International Business', N'IB_GRA_ELE', N'Graduation Elective - International Business synthesizing specialized knowledge and practical skills for BBA/IB graduates.', GETDATE());

PRINT N'Seeded BBA/IB subjects successfully (39 non-duplicate subjects with English descriptions).';
GO
