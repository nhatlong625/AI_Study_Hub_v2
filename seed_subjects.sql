USE [AI_StudyHub];
GO

/*==============================================================================
  SEED DATA: SUBJECTS FOR SOFTWARE ENGINEERING (SE) MAJOR WITH ENGLISH DESCRIPTIONS
  ==============================================================================*/

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

-- Insert SE Subjects with English Descriptions
DECLARE @SemId_TRS501 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = -1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_TRS501, N'English 5 (University success)', N'TRS501', N'Preparatory English 5 curriculum focusing on reading comprehension, academic essay writing, and foundational academic communication.', GETDATE());

DECLARE @SemId_ENT503 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_ENT503, N'English 6 (Summit 2)', N'ENT503', N'Advanced English Summit 2 curriculum emphasizing critical thinking, presentation skills, and scientific report writing.', GETDATE());

DECLARE @SemId_VOV114 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_VOV114, N'Vovinam 1', N'VOV114', N'Physical Education Vovinam 1 covering basic martial arts stances, form routines, and Vietnamese martial arts philosophy.', GETDATE());

DECLARE @SemId_VOV124 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_VOV124, N'Vovinam 2', N'VOV124', N'Physical Education Vovinam 2 advancing sparring techniques, self-defense applications, and physical conditioning.', GETDATE());

DECLARE @SemId_VOV134 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_VOV134, N'Vovinam 3', N'VOV134', N'Physical Education Vovinam 3 perfecting advanced martial techniques, combination form routines, and specialized endurance training.', GETDATE());

DECLARE @SemId_TMI101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_TMI101, N'Traditional musical instrument', N'TMI101', N'Traditional Musical Instrument introducing history, music theory, and performance skills for Vietnamese ethnic instruments.', GETDATE());

DECLARE @SemId_OTP101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 0);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_OTP101, N'Orientation and General Training Program', N'OTP101', N'Orientation and General Training Program helping freshmen integrate into the university environment and develop core life skills.', GETDATE());

DECLARE @SemId_CSI106 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_CSI106, N'Introduction to Computer Science', N'CSI106', N'Introduction to Computer Science presenting core concepts of computer systems, algorithms, and computational thinking.', GETDATE());

DECLARE @SemId_SSL101c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SSL101c, N'Academic Skills for University Success', N'SSL101c', N'Academic Skills for University Success developing self-directed learning methods, literature research, and effective teamwork.', GETDATE());

DECLARE @SemId_PRF192 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_PRF192, N'Programming Fundamentals', N'PRF192', N'Programming Fundamentals introducing algorithmic thinking, C language syntax, and foundational programming techniques.', GETDATE());

DECLARE @SemId_MAE101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_MAE101, N'Mathematics for Engineering', N'MAE101', N'Mathematics for Engineering covering Calculus, Linear Algebra, and mathematical applications in technology.', GETDATE());

DECLARE @SemId_CEA201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 1);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_CEA201, N'Computer Organization and Architecture', N'CEA201', N'Computer Organization and Architecture studying hardware structure, microprocessors, memory hierarchy, and instruction sets.', GETDATE());

DECLARE @SemId_PRO192 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_PRO192, N'Object-Oriented Programming', N'PRO192', N'Object-Oriented Programming (OOP) mastering encapsulation, inheritance, polymorphism, and abstraction using Java.', GETDATE());

DECLARE @SemId_MAD101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_MAD101, N'Discrete mathematics', N'MAD101', N'Discrete Mathematics covering set theory, propositional logic, graph theory, and counting techniques applied in computer science.', GETDATE());

DECLARE @SemId_OSG202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_OSG202, N'Operating Systems', N'OSG202', N'Operating Systems investigating process management, memory allocation, file systems, and CPU scheduling mechanisms.', GETDATE());

DECLARE @SemId_WED201c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_WED201c, N'Web Design', N'WED201c', N'Web Design guiding modern website interface development using HTML5, CSS3, JavaScript, and Responsive Web Design.', GETDATE());

DECLARE @SemId_NWC204 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 2);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_NWC204, N'Computer Networking', N'NWC204', N'Computer Networking covering OSI and TCP/IP models, Router/Switch configuration, and fundamental network protocols.', GETDATE());

DECLARE @SemId_JPD113 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_JPD113, N'Elementary Japanese 1- A1.1', N'JPD113', N'Elementary Japanese 1 (A1.1) teaching Hiragana and Katakana alphabets, basic conversational patterns, and everyday vocabulary.', GETDATE());

DECLARE @SemId_CSD201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_CSD201, N'Data Structures and Algorithms', N'CSD201', N'Data Structures and Algorithms studying Linked Lists, Trees, Graphs, Sorting algorithms, and Searching techniques.', GETDATE());

DECLARE @SemId_DBI202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_DBI202, N'Database Systems', N'DBI202', N'Database Systems covering relational database design, SQL Server query optimization, and data normalization standards.', GETDATE());

DECLARE @SemId_MAS291 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_MAS291, N'Statistics & Probability', N'MAS291', N'Statistics & Probability applied in data analysis, hypothesis testing, and predictive modeling.', GETDATE());

DECLARE @SemId_LAB211 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 3);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_LAB211, N'OOP with Java Lab', N'LAB211', N'OOP with Java Lab practicing clean coding, stream processing, Swing GUI, and real-world application development.', GETDATE());

DECLARE @SemId_JPD123 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_JPD123, N'Elementary Japanese 1-A1.2', N'JPD123', N'Elementary Japanese 2 (A1.2) reinforcing grammar, basic Kanji, and listening/speaking skills for daily communication.', GETDATE());

DECLARE @SemId_IOT102 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_IOT102, N'Internet of Things', N'IOT102', N'Internet of Things (IoT) investigating sensors, Arduino/ESP32 microcontrollers, and smart connected system architecture.', GETDATE());

DECLARE @SemId_PRJ301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_PRJ301, N'Java Web application development', N'PRJ301', N'Java Web Application Development building RESTful Web APIs using Servlets, JSP, JDBC, and the MVC architectural pattern.', GETDATE());

DECLARE @SemId_SSG104 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SSG104, N'Communication and In-Group Working Skills', N'SSG104', N'Communication and In-Group Working Skills training critical thinking, conflict resolution, and collaborative team performance.', GETDATE());

DECLARE @SemId_SWE202c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 4);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SWE202c, N'Introduction to Software Engineering', N'SWE202c', N'Introduction to Software Engineering guiding Agile/Scrum development methodologies, requirements analysis, and software design.', GETDATE());

DECLARE @SemId_HSF302 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_HSF302, N'Working with Spring Framework', N'HSF302', N'Working with Spring Framework building enterprise RESTful APIs with Spring Boot, Spring Data JPA, and Spring Security.', GETDATE());

DECLARE @SemId_SWP391 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SWP391, N'Software development project', N'SWP391', N'Software Development Project engaging students in building a complete end-to-end software product using Agile/Scrum.', GETDATE());

DECLARE @SemId_WDU203c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_WDU203c, N'The UI/UX Design', N'WDU203c', N'The UI/UX Design exploring Design Thinking methodology, Wireframing, and interactive Prototyping on Figma.', GETDATE());

DECLARE @SemId_SWR302 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SWR302, N'Software Requirements', N'SWR302', N'Software Requirements guiding requirements elicitation, analysis, IEEE SRS documentation, and stakeholder requirement management.', GETDATE());

DECLARE @SemId_SWT301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 5);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SWT301, N'Software Testing', N'SWT301', N'Software Testing exploring black-box and white-box testing techniques, Test Case design, and automated testing frameworks.', GETDATE());

DECLARE @SemId_OJT202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 6);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_OJT202, N'On the job training', N'OJT202', N'On-the-Job Training providing immersive real-world industry internship experience at partner IT enterprises.', GETDATE());

DECLARE @SemId_ENW493c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 6);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_ENW493c, N'Research Methods & Academic Writing Skills', N'ENW493c', N'Research Methods & Academic Writing Skills guiding scientific paper writing conventions, literature review, and thesis preparation.', GETDATE());

DECLARE @SemId_SBA301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SBA301, N'Integrate single page application with Spring Boot', N'SBA301', N'Integrate Single Page Application with Spring Boot connecting React Frontend applications with Spring Boot RESTful APIs.', GETDATE());

DECLARE @SemId_SWD392 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SWD392, N'Software Architecture and Design', N'SWD392', N'Software Architecture and Design exploring software Design Patterns, Microservice architectures, and Clean Architecture principles.', GETDATE());

DECLARE @SemId_EXE101 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_EXE101, N'Experiential Entrepreneurship 1', N'EXE101', N'Experiential Entrepreneurship 1 guiding business idea generation, market research, and Business Model Canvas validation.', GETDATE());

DECLARE @SemId_PMG201c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 7);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_PMG201c, N'Project Management', N'PMG201c', N'Project Management covering project planning, risk management, scheduling, and budget management aligned with PMI standards.', GETDATE());

DECLARE @SemId_EXE201 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_EXE201, N'Experiential Entrepreneurship 2', N'EXE201', N'Experiential Entrepreneurship 2 guiding Minimum Viable Product (MVP) development, financial forecasting, and investor pitching.', GETDATE());

DECLARE @SemId_ITE302c INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_ITE302c, N'Ethics in IT', N'ITE302c', N'Ethics in IT examining software copyright, information security compliance, data privacy regulations, and professional ethics.', GETDATE());

DECLARE @SemId_MLN122 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_MLN122, N'Political economics of Marxism – Leninism', N'MLN122', N'Political Economics of Marxism-Leninism studying commodity economic laws, surplus value, and market economy mechanisms.', GETDATE());

DECLARE @SemId_MLN111 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_MLN111, N'Philosophy of Marxism – Leninism', N'MLN111', N'Philosophy of Marxism-Leninism providing scientific worldview and methodology for analyzing social phenomena.', GETDATE());

DECLARE @SemId_MSS301 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_MSS301, N'Microservices with Spring Cloud', N'MSS301', N'Microservices with Spring Cloud exploring API Gateways, Eureka Service Discovery, Config Server, and Resilience4j circuit breakers.', GETDATE());

DECLARE @SemId_PRM393 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 8);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_PRM393, N'Mobile Programming', N'PRM393', N'Mobile Programming building responsive iOS/Android mobile applications using React Native, Flutter, and Mobile SDKs.', GETDATE());

DECLARE @SemId_MLN131 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_MLN131, N'Scientific socialism', N'MLN131', N'Scientific Socialism investigating laws governing the emergence and development of socialist socio-economic formations.', GETDATE());

DECLARE @SemId_VNR202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_VNR202, N'History of Vietnam Communist Party', N'VNR202', N'History of the Communist Party of Vietnam studying the founding, revolutionary strategies, and historical lessons of the Party.', GETDATE());

DECLARE @SemId_HCM202 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_HCM202, N'Ho Chi Minh Ideology', N'HCM202', N'Ho Chi Minh Ideology studying the comprehensive and profound system of viewpoints on the Vietnamese revolution.', GETDATE());

DECLARE @SemId_SEP490 INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = 9);
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
VALUES (@SemId_SEP490, N'SE Capstone Project', N'SEP490', N'Software Engineering Capstone Project: Building a complete production-ready software product and defending before the Academic Board.', GETDATE());
