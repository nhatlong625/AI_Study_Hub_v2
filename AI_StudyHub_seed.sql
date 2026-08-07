/* ============================================================
   AI_StudyHub - Curriculum seed (7 majors)
   Source: Subjects_7nganh.xlsx

   Insert-only. Creates no tables and drops nothing: it fills
   MAJOR / SEMESTER / SUBJECT / SEMESTER_SUBJECT as they are
   defined by AI_Study_Hub.sql + AI_Study_Hub_v2_upgrade.sql.

   Run order:  AI_Study_Hub.sql
            -> AI_Study_Hub_v2_upgrade.sql
            -> AI_Study_Hub_v3_shared_subjects.sql
            -> this file

   Idempotent: re-running inserts nothing new.
   File is UTF-8; run with  sqlcmd -f 65001  to keep accents.
   ============================================================ */
USE [AI_StudyHub];
GO

SET NOCOUNT ON;
-- dbo.MAJOR carries a filtered index (UX_MAJOR_code), and any INSERT touching a
-- table with one requires QUOTED_IDENTIFIER ON. SSMS sets it; sqlcmd does not.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ---------- Staging ---------- */
IF OBJECT_ID(N'tempdb..#MAJ') IS NOT NULL DROP TABLE #MAJ;
IF OBJECT_ID(N'tempdb..#SUB') IS NOT NULL DROP TABLE #SUB;
IF OBJECT_ID(N'tempdb..#CUR') IS NOT NULL DROP TABLE #CUR;
GO

CREATE TABLE #MAJ (
    major_code NVARCHAR(20)  NOT NULL PRIMARY KEY,
    major_name NVARCHAR(200) NOT NULL
);
CREATE TABLE #SUB (
    subject_code        NVARCHAR(50)   NOT NULL PRIMARY KEY,
    subject_name        NVARCHAR(100)  NOT NULL,
    subject_description NVARCHAR(2000) NULL,
    home_major          NVARCHAR(20)   NOT NULL,
    home_sem            INT            NOT NULL
);
CREATE TABLE #CUR (
    major_code    NVARCHAR(20) NOT NULL,
    semester_no   INT          NOT NULL,
    subject_code  NVARCHAR(50) NOT NULL,
    display_order INT          NOT NULL,
    PRIMARY KEY (major_code, subject_code)
);
GO


/* ---------- Staging data: majors (7) ---------- */
INSERT INTO #MAJ (major_code, major_name) VALUES
    (N'SE', N'Software Engineering'),
    (N'Marketing', N'Digital Marketing'),
    (N'Logistic', N'Logistics & Supply Chain Management'),
    (N'Finance', N'Finance'),
    (N'IA', N'Information Assurance'),
    (N'English', N'English Language'),
    (N'AI', N'Artificial Intelligence');
GO

/* ---------- Staging data: subjects (173) ---------- */
INSERT INTO #SUB (subject_code, subject_name, subject_description, home_major, home_sem) VALUES
    (N'ACC101', N'Principles of Accounting_Nguyên lý kế toán', N'Main objectives - upon completion, students should: - Clearly understand the ideas, principles and techniques of accounting; - Gain the knowledge and tools to better understand business performance issues and the decisions and problems managers face; - Understand the important role of accounting and finance in all organizations and jobs, and its link with increasingly sophisticated IT systems. Specific objectives: - Recognize and organize accounting transactions; - Classify and calculate revenue, cost, and profit or loss correctly within an account; - Prepare comprehensive and accurate financial statements. Description: The content is structured into twelve chapters covering Financial Accounting, Management Accounting and Business Finance. Topics include business transactions, financial statement format and analysis, inventory and accounts receivable, types of assets and liabilities, costing classification, master budget and capital budgeting. A key feature is the integration of AI tools and applications, enabling students to ask constructivist questions while maintaining critical thinking and originality.', N'Marketing', 2),
    (N'ACC302', N'Managerial Accounting_Kế toán quản trị', N'Managerial Accounting is a sub-area of accounting concerned with the information needed to effectively plan and control company operations and make good business decisions. The overall objective is to provide students with the concepts and tools needed to understand and effectively use managerial accounting information.', N'Finance', 3),
    (N'ACC305', N'Financial Statement Analysis_Phân tích báo cáo tài chính', N'Provides a framework for interpreting, analyzing and evaluating financial statements from the viewpoints of creditors, owners, investment firms and others, so users of accounting information understand a business''s strengths and weaknesses, the impact of general and industry-specific conditions, the behavior of financial markets, and credit/lending and equity-investment criteria on present and future financial condition. After completing the course, students can: - Be familiar with the organization and disclosure of reported information; - Evaluate core accounting issues relevant to financial statement analysis, quantitatively and qualitatively; - Apply a framework for forecasting future earnings and financial performance; - Evaluate business financial performance using quantitative and qualitative techniques; - Use financial statement information in a modeling context.', N'Finance', 4),
    (N'AIC211', N'AI for Cybersecurity_Tri tuệ nhân tạo cho An ninh mạng', N'Provides foundational knowledge of machine learning (ML) and AI techniques for solving cybersecurity problems. - Focuses on modeling security challenges as ML problems, processing and representing cybersecurity data (system logs, network traffic, security events, endpoint telemetry), and building and evaluating models to track, monitor, detect and prevent cyber threats; - Combines theoretical foundations (supervised/unsupervised learning, classification, regression, anomaly detection, model evaluation, overfitting, ML pipelines) with hands-on Python labs using popular libraries such as scikit-learn and introductory deep learning; - Students work with real-world cybersecurity datasets on tasks such as intrusion detection systems (IDS), malware classification and phishing URL/email detection.', N'AI', 4),
    (N'APO201c', N'Advanced Python with OOP_Lập trình hướng đối tượng với Python', N'By the end of the course, students understand object-oriented programming (OOP) and can apply these principles effectively using Python. - Design and implement classes, use inheritance and polymorphism, and understand the benefits of encapsulation; - Gain practical experience building graphical user interfaces (GUIs) to enhance user interaction and visualization; - Learn concurrent programming, writing multi-process programs that leverage modern processors for speed and efficiency; - Explore the fundamentals of network systems and develop networked applications, including client-server programs, using socket programming in Python.', N'AI', 2),
    (N'BDT202c', N'Business Digital Transformation_Chuyển đổi số trong kinh doanh', N'Introduces the concepts and practices of digital transformation in business — how organizations apply digital technologies to change their operations, processes and business models. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 4),
    (N'BEN_COM*1', N'1st combo* course_Học phần thứ 1 của combo*', N'A course in an elective combo for the English Language program; students choose a specialization combo and take its courses in sequence.', N'English', 7),
    (N'BEN_COM*2', N'2nd combo* course_Học phần thứ 2 của combo*', N'A course in an elective combo for the English Language program; students choose a specialization combo and take its courses in sequence.', N'English', 7),
    (N'BEN_COM*3', N'3rd combo* course_Học phần thứ 3 của combo*', N'A course in an elective combo for the English Language program; students choose a specialization combo and take its courses in sequence.', N'English', 8),
    (N'BEN_COM*4', N'4th combo* course_Học phần thứ 4 của combo*', N'A course in an elective combo for the English Language program; students choose a specialization combo and take its courses in sequence.', N'English', 8),
    (N'BEN_GRA_ELE', N'BEN Graduation Elective_Học phần tốt nghiệp lựa chọn ngành Ngôn ngữ Anh', N'A graduation-phase elective for the English Language program; students select a subject to complete their graduation requirements.', N'English', 9),
    (N'BKG303', N'Investment Project Appraisal_Thẩm định dự án đầu tư', N'Covers the appraisal and evaluation of investment projects, including assessing the financial feasibility, costs, benefits and risks of proposed investments. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Finance', 8),
    (N'CEA201', N'Computer Organization and Architecture_Tổ chức và Kiến trúc máy tính', N'An introduction to computer architecture and organization, covering both the physical design (organization) and logical design (architecture) of the computer. Main contents: the organization of a simple stored-program computer (CPU, buses and memory); instruction sets, machine code and assembly language; assembly conventions generated by compilers; floating-point representation; hardware organization of simple processors; address translation and virtual memory; and introductory examples of I/O devices, interrupt handling and multi-tasking. Chapters covered: Computer Evolution and Performance; Computer Function and Interconnection; Cache Memory; Internal Memory; External Memory; Input/Output; Operating System Support; Instruction Sets (Characteristics and Functions); Processor Structure and Function; Reduced Instruction Set Computers; Instruction-Level Parallelism and Superscalar Processors; Parallel Processing; Multicore Computers.', N'SE', 1),
    (N'CHN113', N'Elementary Chinese 1_Hán ngữ sơ cấp 1', N'Course objectives: - Equip students with about 150 vocabulary items and 45 basic grammar structures in Chinese at a level equivalent to HSK1; - Provide about 45 everyday communication situations: basic greetings; asking names, age, nationality, workplace; introducing people and abilities; describing time, place and weather; expressing food preferences, shopping and travel needs; talking about past, present and future events; and making requests for permission; - Introduce at least 3 traditional aspects of Chinese culture, including how to ask age and names and common means of communication.', N'Marketing', 4),
    (N'CHN123', N'Elementary Chinese 2_Hán ngữ sơ cấp 2', N'Course objectives: - Equip students with about 150 vocabulary items and 45 basic grammar structures in Chinese at a level equivalent to HSK2; - Provide about 60 everyday communication situations: making suggestions, conclusions or solutions; asking the cause of events; describing details of objects; commenting on and evaluating the result and state of an action; and comparing objects; - Introduce at least 3 traditional aspects of Chinese culture: table manners, tea-drinking culture, and Lunar New Year.', N'Marketing', 5),
    (N'CRY303c', N'Applied Cryptography_Mật mã ứng dụng', N'An introduction to applied cryptography and its relationship to secure systems. - Students learn to make and break codes and ciphers; - They gain a solid understanding of major concepts in applied cryptography: plaintext, encryption, ciphertext, block ciphers, decryption, public-key cryptosystems, hash functions, digital signatures, authentication, key management and cryptographic protocols, as part of securing digital systems.', N'IA', 5),
    (N'CSD201', N'Data Structures and Algorithms', N'Upon finishing the course, students can: 1) Knowledge (ABET e) - understand: - The connection between data structures and their algorithms, including complexity analysis; - Data structures in the context of object-oriented program design; - How data structures are implemented in an OO language such as Java. 2) Ability (ABET e): - Organize and manipulate basic structures: array, linked list, tree, heap, hash; - Use algorithms for traversing, sorting and searching on these structures; - Select a suitable algorithm to solve a practical problem. 3) Ability (ABET k): - Use Java to solve problems; - Use the Eclipse tool to develop Java programs; - Implement Java programs to solve practical problems based on the studied algorithms. 4) Others (ABET i) - improve study skills such as academic reading and information searching.', N'SE', 3),
    (N'CSD203', N'Data Structures and Algorithm with Python_Cấu trúc dữ liệu và giải thuật với Python', N'Introduces the basic concepts of data structures and algorithms using Python. Topics include: - The basics of algorithm analysis; - Basic data structures: stack, queue, linked list, hashtable and tree; - Recursion; - Important applications of these data structures and algorithms.', N'AI', 3),
    (N'CSI106', N'Introduction to Computer Science_Nhập môn khoa học máy tính', N'Provides an overview of computer fundamentals, covering all areas of computer science in breadth. Major instructional areas: - The Von Neumann model and computer components; - Numbering systems and data representation; - Data types and operations on data; - Computer networking and the internet; - Operating systems; - Basic algorithms and their representation; - Data structures and file structures; - Database concepts; - Software engineering; - Computing security and ethics; - Introduction to Artificial Intelligence (additional learning).', N'SE', 1),
    (N'DBI202', N'Introduction to Databases_Các hệ cơ sở dữ liệu', N'Knowledge of database systems is an essential part of a computer science education, as database management has evolved from a specialized application into a central component of modern computing. The course covers: - Basic concepts of database management; - Database design; - Database languages; - Database-system implementation. Based on these, it emphasizes how to organize, maintain and efficiently retrieve data and information from a DBMS.', N'SE', 3),
    (N'DMA301m', N'Digital Marketing Analytics_Phân tích marketing số', N'Focuses on digital marketing analytics — measuring, analysing and interpreting data from digital marketing channels to inform marketing decisions. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 4),
    (N'DMS301m', N'Digital Marketing Strategy_Chiến lược marketing số', N'Covers the planning and development of digital marketing strategy across online channels to achieve business and marketing objectives. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 3),
    (N'DTG111', N'Visual Design Tools 1_Công cụ thiết kế trực quan 1', N'Introduces visual design tools and their basic use for creating visual and graphic materials. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 5),
    (N'EAL202c', N'Nghe tiếng Anh học thuật', N'Covers the listening and speaking skills non-native English-speaking students need to succeed in English-speaking colleges and universities (also useful for native speakers and anyone improving listening comprehension). - Students learn to listen to class lectures and take notes more effectively; - They improve speaking skills for common tasks such as class discussions and presentations; - In the capstone, students create a video presentation on an academic topic.', N'English', 2),
    (N'EAW301', N'Viết tiếng Anh học thuật Academic English Writing', N'Provides a systematic introduction to the principles and conventions of academic writing, with a thorough analysis of common tasks focusing on paragraph and essay development. By the end of the course, students can: - Analyze the organization and structure of academic paragraphs and essays; - Understand and apply the conventions and norms of academic writing; - Develop critical thinking, analytical and reasoning skills to construct well-supported arguments; - Produce different genres of academic essays: cause/effect, process, comparison/contrast, argumentative, problem/solution and classification; - Plan, draft, revise and edit writing effectively to produce coherent, well-structured texts, using a flexible student-centered approach.', N'English', 2),
    (N'ECB101', N'Culture of English-Speaking Countries_Văn hóa các nước nói tiếng Anh', N'Introduces students to significant features of cultural, social, political and artistic life in modern Britain and different aspects of American cultural and socio-political life (the American Dream and identity, race, immigration, religion, and the global transmission of American culture). - Students develop a broader, deeper understanding of British and American culture; - The course integrates scholarly texts and up-to-date multimedia, letting students engage critically with key theoretical concepts and their contemporary evolutions; - Learning happens through active participation, independent study, project-based assignments, group presentations, debates and creative multimedia tasks (including responsible use of AI tools); - Students develop academic reading and writing, analytical thinking, cultural awareness, teamwork and oral communication.', N'English', 3),
    (N'ECC302c', N'Cross-cultural Communication_Giao tiếp trong môi trường đa văn hoá', N'Explores cross-cultural communication — communicating effectively with people from different cultural backgrounds in academic and professional settings. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 4),
    (N'ECO102', N'Business Environment_Môi trường kinh doanh', N'Objective: improve economic literacy along with critical-thinking and problem-solving skills to explain and predict economic issues. Description: Economics is the study of how society manages its scarce resources, divided into microeconomics and macroeconomics. - While macroeconomics studies aggregate national and international economic activity, this course - microeconomics - focuses on the behavior of individual economic agents; - It studies how households (individuals), businesses (firms) and the government make decisions given scarce resources; - It examines the interactions among market participants and their impact on economic benefits and the economy; - Because most of this activity occurs in markets, the course also focuses on how markets work.', N'Logistic', 1),
    (N'ECO111', N'Microeconomics_Kinh tế vi mô', N'Economics is the study of how society manages its scarce resources, divided into microeconomics and macroeconomics. While macroeconomics studies aggregate national and international economic activity, this course - microeconomics - focuses on the behavior of individual economic agents. - It studies how households (individuals), businesses (firms) and the government make decisions given scarce resources; - It examines the interactions among these market participants and how those interactions affect their economic benefits and the economy; - Because most of this activity occurs in markets, the course also focuses on how markets work.', N'Marketing', 1),
    (N'ECO121', N'Macroeconomics_Kinh tế vĩ mô', N'Economics is the study of how society manages its scarce resources, divided into microeconomics and macroeconomics. While microeconomics focuses on individual economic agents, this course - macroeconomics - studies how economists measure macroeconomic variables and covers: - Determination of national output and economic growth; - Unemployment, inflation, interest rates and exchange rates; - Discussion and assessment of the effectiveness of monetary and fiscal policies under different scenarios.', N'Marketing', 2),
    (N'ECR301', N'Kỹ năng đọc tư duy phản biện tiếng Anh Critical Reading in English', N'Students develop and apply critical reading skills through the analysis of texts from authentic sources (journals, newspapers, magazines and websites) across a variety of academic disciplines. - Students develop comprehension while forming a reasoned assessment of the effectiveness and validity of the text; - Students are encouraged to use AI and digital tools to enhance learning, gaining benefits in efficiency, accuracy, personalized learning and future-ready skills.', N'English', 1),
    (N'ELI302', N'Phiên dịch tiếng Anh 1 English Interpretation 1', N'English Interpretation 1 — develops foundational skills for interpreting between English and Vietnamese. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 4),
    (N'ELI402', N'Phiên dịch tiếng Anh 2 English Interpretation 2', N'English Interpretation 2 — builds on ELI302 to further develop interpreting skills between English and Vietnamese. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 5),
    (N'ELR301', N'Research Methods_Phương pháp nghiên cứu', N'Introduces research methods for language and linguistics studies, including how to design and conduct academic research. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 8),
    (N'ELT302', N'Biên dịch tiếng Anh 1 English Translation 1', N'English Translation 1 — develops foundational skills for translating between English and Vietnamese. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 4),
    (N'ELT402', N'Biên dịch tiếng Anh 2 English Translation 2', N'English Translation 2 — builds on ELT302 to further develop translation skills between English and Vietnamese. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 5),
    (N'EMP301', N'Hình thái học tiếng Anh English Morphology', N'Objectives: Helps students methodically learn the fundamentals of morphology - morphemes, allomorphs and morphological processes - equipping them to analyze word structures. Students apply key theoretical frameworks (e.g. Lexical Morphology, Distributed Morphology) to analyze linguistic data and explore how morphological processes interact with syntax, focusing on word formation and sentence structure. Description: Provides a comprehensive overview of the fundamentals of morphology and its role in linguistics. - Students explore the functions of words, dictionaries and the mental lexicon in morphological analysis; - They gain insight into processes of lexeme formation such as derivation and compounding and understand how new words are created; - The course addresses the interaction of morphology with syntax and other levels of linguistic structure.', N'English', 3),
    (N'ENB302', N'Viết tiếng Anh trong kinh doanh Business English Writing', N'Business English Writing — develops skills for writing English documents and correspondence in business contexts. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 5),
    (N'ENG303', N'Ngữ pháp tiếng Anh nâng cao', N'Consolidates and enhances students'' grammatical knowledge by exposing them to grammar as used in real-life situations. - Offers comprehensive explanations of grammatical forms and meanings and contextualized practice of various structures; - Develops students'' use of structures and their critical thinking through communicative activities; - Teaches how to recognize common grammatical errors in written work and apply learned grammar in writing; - Uses a flipped-classroom approach, with students engaging core grammar concepts independently before class and leveraging AI tools to support grammar learning, practice and writing.', N'English', 1),
    (N'ENM302', N'Business English - Level 1_Tiếng Anh Thương mại - Cấp 1', N'Helps students further improve their ability to communicate in English across a wide range of business and business-related situations, and develop the knowledge and skills needed to succeed in business. Enhanced with supplementary activities aligned with the Common European Framework of Reference for Languages, the course helps students: - Communicate effectively in discussions, meetings, negotiations and socialization events; - Acquire and use professional skills including telephoning, presentations, correspondence, decision-making and problem-solving; - Enrich knowledge of business trends in a fast-changing world; - Apply AI tools effectively and ethically to support business communication, research, language enhancement and workplace tasks; - Enhance employability.', N'Marketing', 1),
    (N'ENM402', N'Business English - Level 2_Tiếng Anh Thương mại - Cấp 2', N'Helps students further improve their ability to communicate in English across a wide range of business situations at upper-intermediate level, and develop the knowledge and skills to succeed in business. Enhanced with activities aligned to CEFR B2+ level, the course helps students: - Communicate effectively in discussions, meetings, negotiations and socialization events; - Acquire and use professional skills including telephoning, presentations, correspondence, decision-making and problem-solving; - Enrich knowledge of business trends in a fast-changing world; - Enhance employability.', N'Marketing', 2),
    (N'ENP203', N'Ngữ âm và âm vị học tiếng Anh English phonetics and phonology', N'Helps students develop clear, intelligible English pronunciation with a neutral and comprehensible accent. - Recognize and produce individual English consonant sounds, including place and manner of articulation, voicing contrasts, aspiration and difficult contrasts (e.g. /θ/-/s/, /ʃ/-/s/, /r/-/l/); - Identify the diversity of sound systems and distinguish segmental features; - Recognize and produce correct word stress, sentence stress, weak forms, linking and rhythm; - Use AI-assisted tools (e.g. ELSA, SpeechAce, Speechling) for instant feedback and shadowing practice with AI-generated audio to improve naturalness and fluency; - Diagnose personal listening and pronunciation weaknesses.', N'English', 1),
    (N'ENT503', N'English 6 (Summit 2)', N'An advanced English course refining learners'' ability to communicate with precision, fluency, and cultural sophistication in academic and professional settings. In this course, students: - Synthesize ideas from diverse authentic sources; - Analyze global and ethical issues; - Evaluate meaning, bias, and rhetorical stance in complex spoken and written texts; - Focus on persuasive writing, academic discussion, and critical thinking; - Apply technology and AI tools to enhance research and collaboration; - Demonstrate leadership, professionalism, and lifelong learning for global engagement.', N'SE', 0),
    (N'ENW492c', N'Academic Writing Skills_Kỹ năng viết học thuật', N'Develops academic writing skills, including planning, structuring and producing academic texts. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 6),
    (N'ENW493c', N'Research Methods & Academic Writing Skills_Phương pháp nghiên cứu & Kỹ năng viết học thuật', N'Provides a comprehensive framework for mastering academic research methods and writing skills. - Five courses progressively guide learners through the entire research process, from fundamental research methods to conducting independent research; - Learners develop critical skills in forming research questions, choosing appropriate methodologies, and gathering and analyzing data; - Learners also learn how to structure research findings and present them in a clear, academic format.', N'SE', 6),
    (N'EPE301c', N'Professional Ethics_Đạo đức trong công việc', N'Covers professional ethics — ethical principles and responsible conduct in the workplace and professional practice. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 6),
    (N'EPG301', N'Ngữ dụng học Tiếng Anh', N'English Pragmatics — studies how meaning is conveyed and interpreted in context, including implicature, speech acts and language use in communication. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 7),
    (N'ERW413', N'Kỹ năng viết nghiên cứu tiếng Anh 1 English Research Writing Skills 1', N'Objectives: Helps students develop critical reading, thinking and writing skills across various academic topics, so they can read, think and write better at an upper-intermediate level through active interaction with different kinds of texts. Description: "Read, Think & Write 1" combines reading and writing in one course to help students read from a writer''s viewpoint and write with a reader in mind. - Provides a systematic introduction to and in-depth analysis of integrating reading and writing skills; - Offers a cohesive instructional framework to accelerate college readiness; - Covers annotation and vocabulary, previewing texts and topics, main ideas and thesis statements, supporting details, text purposes and patterns, organizing/drafting/summarizing, titles/introductions/conclusions, and inferences and tone. Prerequisite: passed EAW301 and ECR301 (or equivalents).', N'English', 3),
    (N'ERW423', N'Kỹ năng viết nghiên cứu tiếng Anh 2 English Research Writing Skills 2', N'English Research Writing Skills 2 — develops advanced skills for writing academic research texts in English. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 4),
    (N'ESL301', N'Ngôn ngữ học xã hội Sociolinguistics', N'Sociolinguistics — studies the relationship between language and society, including variation, dialects and language use across social groups. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 7),
    (N'EST301', N'Cú pháp học Tiếng Anh English Syntax', N'English Syntax — studies the structure of English sentences, including phrases, clauses and grammatical relationships. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 4),
    (N'EXE101', N'Experiential Entrepreneurship 1_Trải nghiệm khởi nghiệp 1', N'Provides students with essential knowledge and tips for starting a start-up efficiently and effectively, covering the most important aspects of modern entrepreneurship. - Students learn by watching videos shared by prolific startup founders, with a weekly face-to-face session led by a business-administration lecturer who recaps and checks understanding of each week''s topic; - Students are grouped into teams of 4-6, each formed from at least 2 different majors; - Each team develops a startup idea and works on the project with guidance from instructors and mentors throughout the course; - Seminars and workshops feature guest entrepreneurs and venture capitalists sharing their experience and perspectives on the startup world.', N'SE', 7),
    (N'EXE201', N'Experiential Entrepreneurship 2_Trải nghiệm khởi nghiệp 2', N'In Experiential Entrepreneurship 2, student groups develop the product/service for the start-up idea prepared in Experiential Entrepreneurship 1, deploy sales and find real customers for their products/services. - There is no mandatory content, only a list of suggested lectures/talks students can view for useful tips and experiences in realizing their project; - Seminars and workshops on related topics are planned and implemented each semester according to actual needs and circumstances.', N'SE', 8),
    (N'FIM302c', N'Financial modelling_Mô hình tài chính', N'Covers financial modelling — building models to analyse financial data and support business and investment decisions. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Finance', 5),
    (N'FIN201', N'Monetary Economics and Global Economy_Kinh tế tiền tệ và kinh tế toàn cầu', N'An intermediate-level course in macroeconomics, including topics in international, monetary and financial economics. - Provides a coherent framework for analyzing macroeconomic events such as business cycles (recessions and booms) and long-run growth, their impact on financial markets, and macroeconomic policy; - Applies theories to current economic events, with particular emphasis on the relationship between macroeconomic events and financial markets; - On completion, students are well-versed in macroeconomics and finance and can recognize the implications of real-life macroeconomic policy and events on global financial markets.', N'Finance', 3),
    (N'FIN202', N'Principles of Corporate Finance_Tài chính doanh nghiệp', N'Describes the corporation and its operating environment, and how corporate boards and management evaluate investment opportunities and arrange financing for them. Discussion spans varying conditions of aggregate demand, inflation, tax rates and interest rates, along with tools for valuing short-term movements in bond and equity valuations across markets. Topics include: - Introduction to corporate finance; - Financial statements, how they relate to each other and to cash flows to investors; - Ratio analysis and other tools to evaluate financial statements; - The time value of money, applied to bond and stock valuation; - The principal tools and decision rules for evaluating capital projects and capital budgeting.', N'Marketing', 3),
    (N'FIN301', N'Financial Markets and Institutions / Thị trường tài chính và các định chế tài chính', N'Studies the fundamentals of financial markets and instruments, the formation of modern financial markets, the practical application of financial instruments, and the types of financial institutions and their roles in the markets. On completion, students can: - Demonstrate a working knowledge of financial terms and concepts and analyze how financial markets and instruments operate to achieve economic objectives; - Understand and critically engage with the profits and risks faced by investors and strategies to control them; - Think independently, reflectively and analytically for work in regulating the financial sector, financial institutions or areas of government. Topics include debt, equity and derivative markets, and commercial-bank and non-bank operations.', N'Finance', 4),
    (N'FIN303', N'Advanced Corporate Finance_Tài chính doanh nghiệp nâng cao', N'Provides continuous corporate finance theory on a firm''s financial decisions and working-capital management, and how to manage financial performance effectively to survive competition and takeover in a practical environment. On completion, students can: - Discuss theories and practices of capital-structure selection and payout policy; - Discuss practices to optimize the use of net working capital; - Design a long-term financial plan for an organization; - Critically evaluate finance theories, concepts, assumptions, limitations and arguments. Topics include capital budgeting, capital rationing and the cost of capital, working-capital management, capital raising, financial planning and forecasting, capital structure and dividend policy, and corporate risk management.', N'Finance', 3),
    (N'FIN402', N'Derivatives_Công cụ phái sinh', N'A follow-up to FIN202 and FIN303. After the theoretical foundation established there, students gain in-depth knowledge of derivatives valuation and investment strategies. Topics include: - Futures and forwards valuation and strategies; - Option valuation and strategies; - Swaps; - Commodity forwards and futures; - Financial risk management.', N'Finance', 5),
    (N'FIN_COM*.4', N'Option 4', N'An elective option course in the Finance program; the specific subject depends on the chosen specialization track.', N'Finance', 8),
    (N'FIN_COM*1', N'Option 1', N'An elective option course in the Finance program; the specific subject depends on the chosen specialization track.', N'Finance', 7),
    (N'FIN_COM*2', N'Option 2', N'An elective option course in the Finance program; the specific subject depends on the chosen specialization track.', N'Finance', 7),
    (N'FIN_COM*3', N'Option 3', N'An elective option course in the Finance program; the specific subject depends on the chosen specialization track.', N'Finance', 7),
    (N'FIN_GRA_ELE', N'Graduation Elective - Finance', N'A graduation-phase elective for the Finance program; students select a subject to complete their graduation requirements.', N'Finance', 9),
    (N'FRS301', N'Digital Forensics_Điều tra số', N'Addresses the comprehension and application of digital forensic investigations. - Students evaluate and synthesize technical and legal issues relating to digital evidence; - They apply various skills and techniques, combined with numerous investigative software tools, to analyze seized electronic media; - Topics span key technical concepts, forensic labs and tools, collecting evidence and chain of custody, Windows system artifacts, antiforensics, legal aspects, internet and e-mail evidence, network forensics and mobile-device forensics; - Students are subject to a background investigation prior to admittance.', N'IA', 5),
    (N'GLA301', N'Air Transport_Vận tải hàng hóa bằng đường hàng không', N'A practice-oriented course equipping students with the knowledge and skills to manage the full life cycle of air freight operations, focusing on how airlines, freight forwarders, ground handlers and shippers move high-value cargo safely, quickly and profitably in global supply chains. Across 11 chapters, students explore: - Industry structure and regulations, and the role of IATA cargo agents and forwarders; - Aircraft and ULD characteristics, airport and terminal facilities, and cargo handling processes; - Booking and acceptance procedures, and management of special cargo (perishables, dangerous goods); - Calculating air cargo rates and charges, and completing and interpreting airway bills; - The growing importance of cargo digitalization and automation. Real cases illustrate how air cargo supports trade and logistics development in Vietnam.', N'Logistic', 4),
    (N'GLC301', N'E-Customs_Khai báo hải quan điện tử', N'Provides specialized, applied knowledge of electronic customs declaration and customs compliance in global logistics and supply-chain operations. It equips students with the legal, technical and procedural foundations to: - Understand customs administration; - Apply HS classification, customs valuation, origin-related preferential treatment, and tariff/tax rules; - Prepare and review e-customs declaration logic, supporting documents and declaration flows for standard import/export and selected customs regimes. Through scenario-based learning, guided discussion, document review and case analysis grounded in FIATA and VLI resources, students develop compliance awareness, professional responsibility and practical decision-making skills relevant to customs, freight forwarding and international trade.', N'Logistic', 5),
    (N'GLH301', N'Goods and Insurance_Hàng hóa và bảo hiểm', N'Introduces fundamental knowledge about goods in commercial, transportation and logistics activities, and highlights the role of insurance in protecting goods against risks arising during storage, handling and transportation. The course focuses on: - Characteristics and classification of goods; - Requirements for packaging, labeling and storage; - Common risks associated with goods; - Basic principles of insurance and cargo insurance conditions; - The claims process in case of loss or damage. Through this, learners understand the relationship between the nature of different goods and their risk levels, enabling them to select appropriate insurance methods to minimize losses, support risk management and enhance efficiency in logistics and international trade.', N'Logistic', 5),
    (N'GLI202', N'Thương mại quốc tế_International Trade', N'Introduces international trade — the principles, practices and operations involved in trade between countries. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Logistic', 3),
    (N'GLT301', N'International Transport Management_Quản trị vận tải quốc tế', N'International Transport Management offers a comprehensive understanding of the essential role transportation plays in the global supply chain. - Introduces major transport modes (ocean, air, land, rail and multimodal), analyzing their functions, costs and operational efficiencies; - Covers landed cost, transportation''s impact on inventory and service trade-offs, derived demand and demand elasticity; - Examines the structure of global transport corridors (transport, trade and legal) and the strategic importance of IATA, FIATA and the International Chamber of Shipping; - Gives special attention to Incoterms, HS codes and trade agreements governing cross-border logistics; - Explores practical methods such as the Clarke and Wright Savings Algorithm for route optimization.', N'Logistic', 3),
    (N'GL_COM*1', N'Option 1', N'An elective option course in the Logistics & Supply Chain program; the specific subject depends on the chosen specialization track.', N'Logistic', 7),
    (N'GL_COM*2', N'Option 2', N'An elective option course in the Logistics & Supply Chain program; the specific subject depends on the chosen specialization track.', N'Logistic', 7),
    (N'GL_COM*3', N'Option 3', N'An elective option course in the Logistics & Supply Chain program; the specific subject depends on the chosen specialization track.', N'Logistic', 7),
    (N'GL_COM*4', N'Option 4', N'An elective option course in the Logistics & Supply Chain program; the specific subject depends on the chosen specialization track.', N'Logistic', 8),
    (N'GL_GRA_ELE', N'Graduation Elective - GL', N'A graduation-phase elective for the Logistics & Supply Chain program; students select a subject to complete their graduation requirements.', N'Logistic', 9),
    (N'GSF301', N'Sea Transport and Forwarding_Vận tải, giao nhận hàng hóa bằng đường biển', N'A practice-oriented course equipping students with the knowledge and skills to manage the full life cycle of sea freight operations. - Focuses on how sea ports and terminals, freight forwarders, shipping lines and consignors work together to move cargo safely, quickly and profitably in global supply chains; - Uses real cases and examples to illustrate how sea freight forwarding supports trade and logistics development in Vietnam, linking theory to local industry practice; - By the end, students can design and evaluate sea freight solutions, communicate effectively with international partners, and position themselves for careers with shipping lines, logistics service providers and sea port operators.', N'Logistic', 4),
    (N'HCM202', N'Ho Chi Minh Ideology_Tư tưởng Hồ Chí Minh', N'Course introduction: Ho Chi Minh ideology is the crystallization of the thousand-year traditions of national construction and defense of the Vietnamese people. It gathers intellectual values absorbed from East and West and creatively applies and develops Marxism-Leninism to Vietnamese practice. From a philosophical perspective, it is a comprehensive and profound system of views on the fundamental issues of the Vietnamese revolution, aiming at class, national and human liberation. Ho Chi Minh ideology has become a precious spiritual asset and a torch leading the Vietnamese revolution from one victory to another.', N'SE', 9),
    (N'HOD401', N'Ethical Hacking and Offensive Security', N'An introduction to the fundamentals of ethical hacking. - Students learn how hackers attack computers and networks, and how to protect Windows and Linux systems; - Legal restrictions and ethical guidelines are taught and enforced; - Students perform many hands-on labs, both attacking and defending, using port scans, footprinting, buffer overflow exploits, SQL injection, privilege escalation, Trojans and backdoors.', N'IA', 7),
    (N'HOD402', N'Ethical Hacking and Offensive Security_Thâm nhập thử và phòng thủ', N'Prepares learners with the Ethical Hacker skillset for offensive security, emphasizing that cybersecurity resilience is a necessity as threats evolve rapidly. - Learners become proficient in scoping, executing and reporting on vulnerability assessments, and recommending mitigation strategies; - Uses an engaging gamified narrative with real-world-inspired hands-on practice labs to build workforce-readiness skills and a solid foundation in offensive security; - On completion, learners can enter cybersecurity careers on the offensive (or related) side.', N'AI', 7),
    (N'HRM202c', N'Human Resource Management_Quản trị nhân sự', N'Derived from the Coursera "HRIC Human Resource Associate Professional Certificate" specialization. HR professionals are crucial to an organization''s success, playing an essential role in recruitment and management of talent, policy development and fostering a positive work environment. The program comprises five modules with videos, interactive activities, assessments and peer-reviewed projects covering HRM fundamentals. On completion, students understand how to: - Recruit, select and onboard new employees effectively; - Develop and implement employee policies and practices; - Support performance management, compensation and benefits; - Foster employee development and a positive workplace culture.', N'Marketing', 3),
    (N'HSF302', N'Working with Spring Framework', N'Upon completion, students should: 1) Understand: - Basic concepts of JavaFX for building desktop applications; - Object-Relational Mapping (ORM) with JPA and how it simplifies database interactions; - The Spring Framework and Spring Boot as a comprehensive ecosystem for enterprise-level applications; - Spring''s dependency injection and web frameworks for building robust, scalable applications. 2) Be able to: - Use the JPA ORM tool to map Java objects to database tables; - Use Spring''s dependency injection and web frameworks to build robust, scalable applications; - Develop cross-platform desktop applications with support for UI & UX. 3) Work in a team and present group results.', N'SE', 5),
    (N'IA-000001c', N'Elective 1', N'An elective slot in the Information Assurance program; students choose a subject from the approved elective list.', N'IA', 7),
    (N'IA-000002', N'Elective 2', N'An elective slot in the Information Assurance program; students choose a subject from the approved elective list.', N'IA', 7),
    (N'IA-000003c', N'Elective 3', N'An elective slot in the Information Assurance program; students choose a subject from the approved elective list.', N'IA', 8),
    (N'IA-000004', N'Elective 4', N'An elective slot in the Information Assurance program; students choose a subject from the approved elective list.', N'IA', 8),
    (N'IAA202', N'Risk Management in Information Systems_Quản trị rủi ro trong hệ thống thông tin', N'Provides a comprehensive view of managing risk in information systems. - Covers the fundamentals of risk and risk management, plus in-depth, more comprehensive risk-management topics; - Teaches how to assess and manage risk based on defining an acceptable level of risk for information systems; - Discusses the elements of a business impact analysis (BIA), business continuity plan (BCP), disaster recovery plan (DRP) and computer incident response team (CIRT) plan.', N'IA', 5),
    (N'IAM302', N'Malware Analysis and Reverse Engineering_Phân tích mã độc và kỹ thuật dịch ngược', N'Provides an immersion into malware analysis and reverse engineering, an essential component of Information Assurance (IA), which protects information and systems by ensuring confidentiality, integrity, authentication, availability and non-repudiation. - Follows a progressive approach introducing relevant concepts and techniques while preparing students to become effective malware analysts; - Teaches a standard methodology for detecting, analyzing, reverse engineering and eradicating malware; - Covers reverse engineering malware from various sources and programming languages, including web-based threats.', N'AI', 5),
    (N'IAM302t', N'Malware Analysis and Reverse Engineering', N'Provides an immersion into malware analysis and reverse engineering, an essential component of Information Assurance (IA), which protects information and systems by ensuring confidentiality, integrity, authentication, availability and non-repudiation. - Follows a progressive approach that introduces relevant concepts and techniques while preparing students to become effective malware analysts; - Teaches a standard methodology for detecting, analyzing, reverse engineering and eradicating malware; - Covers reverse engineering malware from various sources and programming languages, including web-based threats.', N'IA', 5),
    (N'IAO202', N'Introduction to Information Assurance', N'Designed based on the Cisco CyberOps Associate course, for students seeking career-oriented, entry-level security analyst skills. - Targets technology-degree students and IT professionals pursuing a career in the Security Operation Center (SOC); - Exposes learners to the foundational knowledge required to detect, analyze and escalate basic cybersecurity threats using common open-source tools; - Aligns with the Cisco Certified CyberOps Associate (CBROPS) certification; candidates pass the 200-201 CBROPS exam to achieve it.', N'IA', 3),
    (N'IAP301', N'Policy Development in Information Assurance_Phát triển chính sách an toàn thông tin', N'Delivers a logical sequence of discussions on major concepts and issues related to information assurance policy implementation. - Explores organizational objectives, threats, risk mitigation and cost-benefit analysis; - Students use industry-accepted methodologies to create practical security policy that communicates the organization''s asset-protection objectives.', N'IA', 7),
    (N'IAP491', N'IA Capstone Project', N'A capstone project in which students, working in groups of 4-5, gain significant project experience integrating much of the material learned across the program, including requirements, design, human factors, professionalism and project management. - Students develop an IA solution using knowledge gained throughout the program, including risk assessment, analysis and management, implementation and quality assurance; - They may follow any suitable process model, must attend to quality issues, and must manage the project themselves using appropriate project-management techniques; - Success is determined largely by whether students have adequately solved their customer''s problem.', N'IA', 9),
    (N'IA_COM*1', N'Subject 1 of Combo*_Học phần 1 của combo*', N'A course in an elective combo for the Information Assurance program; students choose a specialization combo and take its courses in sequence.', N'AI', 7),
    (N'IA_COM*2', N'Subject 2 of Combo*_Học phần 2 của combo*', N'A course in an elective combo for the Information Assurance program; students choose a specialization combo and take its courses in sequence.', N'AI', 7),
    (N'IA_COM*3', N'Subject 3 of Combo*_Học phần 3 của combo*', N'A course in an elective combo for the Information Assurance program; students choose a specialization combo and take its courses in sequence.', N'AI', 8),
    (N'IA_COM*4', N'Subject 4 of Combo*_Học phần 4 của combo*', N'A course in an elective combo for the Information Assurance program; students choose a specialization combo and take its courses in sequence.', N'AI', 8),
    (N'IA_ELE2', N'IA Elective 2_IA Học phần lựa chọn 2', N'An elective slot in the Information Assurance program; students choose a subject from the approved elective list.', N'AI', 3),
    (N'IA_GRA_ELE', N'Học phần lựa chọn Đồ án tốt nghiệp chuyên ngành An Toàn Thông Tin_Graduation Elective for IA', N'A graduation-phase elective for the Information Assurance program, taken alongside the graduation project; students select a subject to complete their graduation requirements.', N'AI', 9),
    (N'IOT102', N'Internet of Things_Internet vạn vật', N'A 3-credit course with two parts: online and offline. - Content covers the basic concepts and applications of IoT, plus practical exercises on a learning KIT; - Students learn online and practice some parts at home; - Q&A sessions, guidance on important issues, and performance assessments are conducted in the classroom.', N'SE', 4),
    (N'ITA203c', N'Information System Overview/Nhập môn hệ thống thông tin', N'An intensive, hands-on series of courses giving students the skills to: - Use conceptual frameworks to align IT investments with business strategy; - Assess the fit between business requirements and enterprise-system features; - Specify business requirements as information-system specifications; - Evaluate technological alternatives for developing the organization''s IT infrastructure.', N'Finance', 4),
    (N'ITE302c', N'Ethics in IT_Đạo đức trong CNTT', N'Organizations and governments increasingly seek ethics professionals to minimize risk and guide decisions about designing inclusive, responsible and trusted technology. - An algorithm not designed and assessed against ethical standards can worsen inequity across race, gender and marginalized populations, and an ethics violation can devastate a company''s reputation and finances; - Knowledgeable ethics leaders are needed to navigate more than 160 frameworks and guidelines and select the best strategy to promote fairness and minimize risk; - This specialization is for learners who want to create and lead initiatives prioritizing ethical integrity in data-driven fields such as AI and data science, bridging the gap between theory and practice.', N'SE', 8),
    (N'JPD113', N'Elementary Japanese 1- A1.1_Tiếng Nhật sơ cấp 1-A1.1', N'I. Orientation: Provides basic Japanese knowledge and skills at elementary level 1 (equivalent to A1) for students taking Japanese as a second foreign language. II. Objectives: On completion, students can: - Read and write the Japanese syllabaries (Hiragana and Katakana) fluently; - Master about 200 basic vocabulary items, the reading and writing of more than 30 kanji, and more than 20 basic grammar structures used in elementary conversation; - Understand and use familiar everyday expressions: self-introduction (name, nationality, occupation, hobbies), asking for locations, asking prices and ordering, talking about daily activities, and asking the working hours of organizations; - Practise teamwork and self-development through in-class group activities (role play) and extracurricular activities.', N'SE', 3),
    (N'JPD123', N'Elementary Japanese 1-A1.2_Tiếng Nhật sơ cấp 1-A1.2', N'I. Orientation: Provides basic Japanese knowledge and skills at elementary level 1 (equivalent to A1.2) for students taking Japanese as a second foreign language; a continuation of JPD113. II. Objectives: On completion, students can: - Introduce their hometown: its characteristics, food, climate and famous places; - Talk with friends about plans or routine activities; - Invite friends to an activity, exchange information and reach agreement on a place and time; - Convey surrounding situations simply, make requests and propose doing something together; - Master nearly 300 basic vocabulary items, the reading and writing of more than 40 kanji, and nearly 30 basic grammar structures used in elementary conversation; - Practise teamwork and self-development through in-class group activities (role play) and extracurricular activities.', N'SE', 4),
    (N'LAB211', N'OOP with Java Lab', N'Focuses on basic problems related to Java programming skills. - Students implement all assignments by themselves in lab rooms; - Each assignment must be completed continuously within the defined time.', N'SE', 3),
    (N'LAW102', N'Business Law and Ethics Fundamentals_Luật và Đạo đức kinh doanh', N'Description: Addresses the basic concepts of business law in the business environment, highlighting the legal and regulatory requirements by which people and companies conduct business, and the complexities and ambiguities of the law. It also focuses on business ethics, emphasizing appropriate behavior and treatment of business entities in global and local contexts. Objectives: On completion, students can: - Demonstrate knowledge of the legal system and basic principles of business law, and the relationship between ethics and regulations; - Compare the legal requirements for managing companies in the US and Vietnam and ethically evaluate the application of laws in business transactions; - Identify essential solutions for business disputes.', N'Marketing', 7),
    (N'LIT301', N'British & American Literature_Văn học Anh & Mỹ', N'British & American Literature — studies representative works of British and American literature and develops skills in analysing setting, plot and characters. On FLM this course is delivered through guided reading of novels such as Jane Eyre, Oliver Twist, Saving Private Ryan and The Runaway Jury, with class discussions and a story-based project. (Brief summary based on the course title and reading list; see FLM for the official syllabus.)', N'English', 3),
    (N'LTG301', N'Dẫn luận ngôn ngữ Introduction to Linguistics', N'An introduction to the study of language (Introduction to Linguistics). - Provides a fundamental introduction to language study; - Builds a vocabulary for talking about language and a solid knowledge of how English works; - Presents major concepts in language study across all the key elements of language.', N'English', 2),
    (N'MAD101', N'Discrete mathematics_Toán rời rạc', N'Upon finishing the course, students must acquire: 1) Knowledge (ABET a1): - Logical expressions and predicate logic; - Induction and recursive definition; - Algorithms, recursive algorithms and complexity; - Recurrence relations and divide-and-conquer algorithms; - Applications of integers and congruence in IT; - Set structures and maps, counting principles and combinatorics; - Terminology and properties of graphs, trees and weighted graphs, and their applications in IT. 2) Skills (ABET a2): - Manipulate and produce equivalent logical expressions; - Prove simple mathematical propositions, including by induction; - Evaluate algorithm complexity; - Solve simple congruence equations; - Apply counting techniques to set cardinalities and counting problems; - Apply graph algorithms to solve graph-theory problems.', N'SE', 2),
    (N'MAE101', N'Mathematics for Engineering_Toán cho ngành kỹ thuật', N'Upon finishing the course, students must acquire: 1) Knowledge (ABET a1): - Basic concepts of single-variable calculus: limit, derivative, integral; - Linear systems of equations, matrices and their applications; - Vector spaces, basis and dimension, linear transformations and their applications; - The range of applications of calculus and algebra in science, technology, economics and finance. 2) Skills (ABET a2): - Find limits, derivatives and integrals of single-variable functions; - Solve linear systems using row-reduced echelon form, Cramer''s Rule and inverse matrices; - Find determinants and inverses of matrices; - Find linear transformations in R^2 and R^3; - Find dimensions and bases of vector spaces; - Apply calculus and algebra to problems in science, technology, economics and finance.', N'SE', 1),
    (N'MAS202', N'Applied Statistics for Business_Thống kê ứng dụng trong kinh doanh', N'Focuses on data summaries and descriptive statistics, with a business focus. Content includes: - Introduction to a statistical computer package; - Probability: distributions, expectation, variance, covariance, portfolios and the central limit theorem; - Statistical inference for univariate data; - Statistical inference for bivariate data, including intrinsically linear simple regression models. Teaching is flexible, mixing traditional methods with project-based learning, problem-based learning and the flipped classroom.', N'Marketing', 4),
    (N'MAS291', N'Statistics & Probability_Xác suất thống kê', N'Upon finishing the course, students must acquire: 1) Knowledge (ABET a1): - The fundamental principles of probability and their applications; - Frequently used probability distributions; - The basics of descriptive statistics; - Statistical inference: parameter estimation, hypothesis testing, regression and correlation. 2) Skills (ABET a2): - Recognize simple statistical models and apply them to engineering problems; - Use at least one statistical software (Excel, Maxima) for problem solving; - Self-study skills (ABET i).', N'SE', 3),
    (N'MGT103', N'Introduction to Management_Nhập môn quản lý', N'Explores the managerial functions of management: planning, organizing, leading and controlling. - Provides basic management knowledge and skills and a comprehensive insight into the human-relations components of any managerial role, regardless of industry or function; - Examines various management theories and links them to current management practice in the world and Vietnam; - Uses interactive tools such as group exercises, case-study discussion, role-play activities and projects.', N'Marketing', 1),
    (N'MKT101', N'Marketing Principles_Nguyên lý Marketing', N'Provides a strong foundation in marketing based on five key activities: - Identifying customer needs; - Providing the right products or services to meet those needs; - Assuring availability through the right distribution channels; - Using promotional activities to motivate purchase as effectively as possible; - Setting an appropriate price that maximizes firm profitability while maintaining customer satisfaction. Based on Philip Kotler''s Principles of Marketing, the course integrates AI tools for idea generation, document organization and practical application of marketing concepts (brainstorming, content structuring, creating marketing materials, basic analytics), while students retain full responsibility for originality, critical evaluation and refinement of their work.', N'Marketing', 1),
    (N'MKT201', N'Consumer Behavior_Hành vi người tiêu dùng', N'Consumer Behavior — studies how individuals and groups make purchasing decisions and the factors influencing consumer choices. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 3),
    (N'MKT202', N'Services Marketing Management_Quản trị Marketing dịch vụ', N'Services Marketing Management — covers the marketing and management of services, addressing the distinctive characteristics of services compared with physical products. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 4),
    (N'MKT208c', N'Social media marketing_Marketing mạng xã hội', N'Social Media Marketing — covers planning and executing marketing activities on social media platforms. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 5),
    (N'MKT301', N'Marketing Research_Nghiên cứu Marketing', N'Marketing Research — covers the process of gathering, analysing and interpreting market data to support marketing decisions. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 8),
    (N'MKT304', N'Integrated Marketing Communications_Truyền thông marketing tích hợp', N'Integrated Marketing Communications — covers coordinating advertising, promotion and other communication tools into a consistent marketing message. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 3),
    (N'MKT_COM*1', N'Option 1', N'An elective option course in the Digital Marketing program; the specific subject depends on the chosen specialization track.', N'Marketing', 7),
    (N'MKT_COM*2', N'Option 2', N'An elective option course in the Digital Marketing program; the specific subject depends on the chosen specialization track.', N'Marketing', 7),
    (N'MKT_COM*3', N'Option 3', N'An elective option course in the Digital Marketing program; the specific subject depends on the chosen specialization track.', N'Marketing', 7),
    (N'MKT_COM*4', N'Option 4', N'An elective option course in the Digital Marketing program; the specific subject depends on the chosen specialization track.', N'Marketing', 8),
    (N'MKT_GRA_ELE', N'Graduation Elective - Digital Marketing', N'A graduation-phase elective for the Digital Marketing program; students select a subject to complete their graduation requirements.', N'Marketing', 9),
    (N'MLN111', N'Philosophy of Marxism – Leninism_Triết học Mác - Lê-nin', N'Course introduction: Philosophy of Marxism-Leninism studies dialectical materialist views on nature, society and the mind, making the dialectical-materialist worldview comprehensive. Applying and expanding the dialectical materialist perspective to social research, Marx introduced historical materialism and pointed out how to study the laws of social and natural development as governed by objective laws rather than subjective factors. The development of Marxism-Leninism philosophy has laid the foundation for studying history and social life in a scientific way.', N'SE', 8),
    (N'MLN122', N'Political economics of Marxism – Leninism_Kinh tế chính trị Mác - Lê-nin', N'Course introduction: Political economics of Marxism-Leninism is an economic theory and scientific discipline on political economy developed by C. Marx, Engels and later Lenin. It focuses on the capitalist mode of production and the production and economic exchange relations consistent with it, thereby clarifying the nature and phenomena of economic processes and laying a foundation to solve matters related to the theories of Marxism-Leninism. The core of Marxist-Leninist political economy is Marx''s surplus value theory.', N'SE', 8),
    (N'MLN131', N'Scientific socialism_Chủ nghĩa xã hội khoa học', N'Course introduction: Scientific socialism is one of the three parts of Marxism-Leninism. Based on the philosophical methodology of dialectical and historical materialism and on the scientific foundations of economic laws and relations, it scientifically explains the advent of the socialist revolution and the formation and development of the communist socio-economic form, associated with the historical mission of the working class, to liberate people and society.', N'SE', 9),
    (N'MSS301', N'Microservices with Spring Cloud', N'Upon completion, students should: 1) Understand: - Microservices and microservices architecture; - The basics of Spring Cloud and its architecture; - Configuration and implementation using Spring Cloud; - Microservices architecture built with Spring Cloud; - Deployment of microservices-based applications using Docker and Spring Cloud tools. 2) Be able to: - Explain microservices architecture and its benefits (scalability, resilience, fault tolerance); - Explain Spring Cloud and its architecture; - Configure and implement Spring Cloud in a project; - Design and implement a microservices architecture using Spring Cloud; - Design, build and deploy microservices-based applications using Docker and Spring Cloud tools. 3) Work in a team and present group results.', N'SE', 8),
    (N'NWC204', N'Computer Networking_Mạng máy tính', N'Designed based on the first course of the CCNA curriculum. Introduces the architectures, models, protocols and networking elements that connect users, devices, applications and data across the internet and modern computer networks - including IP addressing and Ethernet fundamentals. By the end of the course, students can: - Build simple local area networks (LANs) integrating IP addressing schemes and foundational network security; - Perform basic configurations for routers and switches. The course is organized into modules, each an integrated unit of content, activities and assessments targeting specific competencies; some foundational modules are not assessed but enable learning of concepts covered on the CCNA certification exam.', N'SE', 2),
    (N'NWC303', N'Network Connectivity_Kết nối mạng', N'Based on the Cisco Networking Academy CCNAv7 curriculum, for those seeking entry-level ICT jobs or prerequisites for more specialized skills. The CCNAv7 curriculum spans three courses - Introduction to Networks (ITN), Switching, Routing and Wireless Essentials (SRWE), and Enterprise Networking, Security and Automation (ENSA) - covering IP routing and switching fundamentals, network security and services, and network programmability and automation, with extensive hands-on practice. This course focuses on the SRWE portion: switching technologies and router operations supporting small-to-medium business networks, including wireless LANs (WLANs) and security.', N'AI', 3),
    (N'OBE102c', N'Organizational Behavior_Hành vi tổ chức', N'Organizational Behavior — studies how individuals and groups behave within organizations, including motivation, teamwork, leadership and organizational culture. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 2),
    (N'OJB202', N'On-the-job training_Đào tạo trong môi trường thực tế', N'On-the-job training — students gain practical experience in a real working environment at partner organizations. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 6),
    (N'OJE202', N'On-The-Job Training_Đào tạo trong môi trường thực tế', N'On-the-job training — students gain practical experience in a real working environment at partner organizations. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 6),
    (N'OJT202', N'On-The-Job Training_Đào tạo trong môi trường thực tế', N'Target: - Students get acquainted with the real working environment before completing the study program; - Students explore and expand their understanding of learned programs from a broader perspective; - Students gain rich learning experiences in an industrial and globalized environment. Implementation: Students do practical training at partnership enterprises signed with the University, with close cooperation between the enterprises and the University''s representative (Student Affairs Department). In the enterprise environment, students are assigned and directly managed on tasks, and their spirit, attitude and abilities are monitored and evaluated. At the end of the training, students are evaluated comprehensively by the enterprises and give feedback on the working environment.', N'SE', 6),
    (N'OSG202', N'Operating Systems', N'By the end of this course, students will be able to understand: 1) Background knowledge (ABET e): the role of the operating system, important OS concepts, OS mechanisms, and the main problems of operating systems. 2) Practical skills (ABET k): - Use basic shell commands in Linux fluently; - Apply fundamentals of shell and C language on Linux; - Explore main OS problems through simulation exercises. 3) Information searching, reading and selection skills (ABET i). 4) Group working, documentation and presentation skills (ABET g).', N'SE', 2),
    (N'OSG203', N'Operating System_Hệ điều hành', N'By the end of the course, students will be able to: 1) Background knowledge (ABET e): understand the role and functions of an operating system; grasp key concepts such as kernels, file systems and process management; comprehend OS mechanisms including memory hierarchy and CPU roles; and identify and analyze the main problems and challenges in operating systems. 2) Practical skills (ABET k): use basic and advanced shell commands in Linux fluently, develop proficiency in shell scripting, and solve key OS problems through practical exercises and simulations. 3) Information searching, reading and selection skills (ABET i). 4) Teamwork, documentation and presentation skills (ABET g).', N'AI', 2),
    (N'OSP201', N'Open Source Platform and Network Administration', N'An introduction to open source client/server networking and basic information security and assurance concepts, focusing on Linux as a platform and server operating system. - Introduces concepts related to the security of Linux platforms and applications, and methods to secure them and how to implement those methods; - Covers threats to Linux and other open source applications and the mitigation of risks; - Explains user account management and software management plans; - Examines the components of the Linux kernel and ways to address security breaches.', N'IA', 4),
    (N'OTP101', N'Orientation and General Training Program_Định hướng và Rèn luyện tập trung', N'The Orientation and General Training Program includes 4 modules: - Module 1 - Orientation: opening ceremony, health check and student cards, class arrangement and meetings, introduction to FPT Corporation, FPT University, functional departments, training regulations and information systems, study skills, and community-activity topics; - Module 2 - Military training: implementing the program prescribed by the Ministry of Education and Training; - Module 3 - Experience program: memoir research and review, seminars, experiential activities (sustainable development and community volunteering), and skill-building extracurriculars (e.g. First Aid and Emergency Response); - Module 4 - Vovinam: following the VOV114 outline. Objectives: - Guide students through procedures before a new semester; - Provide knowledge about FPT Corporation, FPT University and its supporting departments; - Introduce the curriculum, FU training model and regulations, and information systems to help students adapt; - Educate the fundamentals of military and national security and build patriotism and national pride; - Train willpower and improve physical strength, fitness and responsibility; - Foster team spirit, discipline and good attitudes toward friends, teachers and the learning environment; - Enhance student experience and community spirit through extracurricular and volunteering activities.', N'SE', 0),
    (N'PEN', N'Preparation English_Tiếng Anh chuẩn bị', N'Preparation English — a foundational English course preparing students for the language level required in the main program.', N'Marketing', 0),
    (N'PFP191', N'Programming Fundamentals with Python_Cơ sở lập trình với Python', N'Introduces programming with an emphasis on realizing ideas, approaches, models and algorithms - essential in computer science education, research and production. - Python has emerged as a popular, powerful, multitasking and widely applicable language, especially in new fields such as AI, Fintech, Data Science and IoT; - The course covers essential aspects of programming: fundamental concepts, code design and the Python language; - It emphasizes object-oriented programming (OOP), given its importance for advanced software development and subsequent courses.', N'AI', 1),
    (N'PHE_COM*2', N'Physical Education 2_Giáo dục thể chất 2', N'Physical Education 2 — a physical training course continuing the development of fitness and sports skills.', N'Marketing', 1),
    (N'PHE_COM*3', N'Physical Education 3_Giáo dục thể chất 3', N'Physical Education 3 — a physical training course further developing fitness and sports skills.', N'Marketing', 2),
    (N'PMG201c', N'Project Management', N'An intensive, hands-on series giving students the skills to ensure projects are completed on time and on budget while delivering the product users expect. - Builds a strong working knowledge of project-management basics that can be applied immediately to manage work projects; - By the end, students can identify and manage product scope, build a work breakdown structure, create a project plan and budget, define and allocate resources, and identify and manage risks; - Students are then able to manage project development end to end.', N'SE', 7),
    (N'PRF192', N'Programming Fundamentals', N'Introduces basic computer systems and software-development methods, focusing on function-oriented programming design, coding, testing and programming discipline using the C language. Upon completion, students should have: 1) Knowledge (ABET e): - Explain how to solve a real problem using a computer; - Understand basic computer systems and software development; - Understand programming concepts, focusing on procedural programming, testing, debugging and unit testing. 2) Programming skills (ABET k): - Read and understand simple C programs; - Solve real problems using C. 3) Effective learning methods (ABET i): academic reading, and individual and team-work behaviors.', N'SE', 1),
    (N'PRJ301', N'Java Web application development', N'By the end of this course, students will be able to: a) Knowledge: - Understand core Java web technologies: Servlet and JSP, and the scope of shared state (session, application, request, page); - Develop and deploy their own websites using Java; - Understand and apply the MVC architecture for the web; - Apply JPA in Java websites; - Apply AI in their own Java website. b) Skills: - Develop basic web applications applying the MVC design pattern with Servlet/Filter as controller; - Create a simple web application demo using JPA.', N'SE', 4),
    (N'PRM393', N'Mobile Programming', N'By the end of the course, students will have: - Understanding of the fundamental concepts of mobile programming with Flutter and Dart; - Experience using popular widgets and plugins to build cross-platform user interfaces; - Knowledge of state management, form handling, and navigation between screens; - The ability to apply asynchronous programming with Future and async/await; - The ability to integrate RESTful APIs to exchange data with servers, and store data locally using SharedPreferences and SQLite; - Proficiency in using Dart libraries and command-line tools to optimize development; - Knowledge of implementing mobile notification systems, including local and push notifications.', N'SE', 8),
    (N'PRO192', N'Object-Oriented Programming', N'Introduces object-oriented programming. Students learn to build reusable objects, encapsulate data and logic within a class, inherit one class from another, and implement polymorphism. By the end, students can: - Compose technical documentation of a Java program using internal comments; - Adhere to OOP principles (encapsulation, polymorphism and inheritance) when writing code; - Trace the execution of Java program logic to determine what a program does or validate its correctness.', N'SE', 2),
    (N'PRP201c', N'Python Programming [MOOC]', N'Introduces fundamental programming concepts using the Python programming language, including data structures, networked application program interfaces (APIs) and databases. - In the Capstone Project, students use the technologies learned throughout the course to design and create their own applications for data retrieval, processing and visualization.', N'IA', 5),
    (N'PWD301', N'Python Web Development_Phát triển Web với Python', N'Python Web Development — covers building web applications using the Python programming language. (Brief summary based on the course title; see FLM for the official syllabus.)', N'AI', 5),
    (N'RMB302', N'Research Methods & Quantitative Analysis_Phương pháp nghiên cứu và phân tích định lượng', N'Research Methods & Quantitative Analysis — covers research design and quantitative techniques for analysing data in business studies. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Logistic', 8),
    (N'SAL301', N'Professional Selling and Management_Kỹ năng bán hàng chuyên nghiệp', N'Professional Selling and Management — develops professional sales skills and the management of sales activities. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 5),
    (N'SAP312', N'Hệ thống ERP: khái niệm và thực hành với SAP_ERP System: Concepts and practice with SAP', N'ERP Systems: Concepts and Practice with SAP — introduces enterprise resource planning (ERP) concepts with hands-on practice using SAP. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Logistic', 5),
    (N'SBA301', N'Integrate single page application with Spring Boot', N'Upon completion, students should: 1) Understand: - ReactJS concepts for building front-end applications; - RESTful API concepts, and building RESTful APIs using Spring Boot''s built-in features and frameworks; - Security features (authentication and authorization) with RESTful APIs; - Handling HTTP requests and responses in Spring Boot; - Error handling and exception management in Spring Boot RESTful APIs. 2) Be able to: - Build RESTful APIs using Spring Boot; - Implement authentication and authorization security features; - Handle HTTP requests and responses using Spring Boot; - Build front-end applications using ReactJS components; - Integrate Spring Boot with other technologies such as SQL Server, MongoDB and ReactJS. 3) Work in a team and present group results.', N'SE', 7),
    (N'SCM202', N'''Nhập môn Quản lý Logistics và chuỗi cung ứng_Introduction to Logistics and Supply Chain Management', N'Introduction to Logistics and Supply Chain Management — covers the fundamentals of logistics and managing the flow of goods and services across the supply chain. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Logistic', 2),
    (N'SCM302', N'Procurement and Global Sourcing_Thu mua toàn cầu', N'Procurement and Global Sourcing — covers purchasing and sourcing goods and services from global suppliers. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Logistic', 3),
    (N'SEM301', N'Ngữ nghĩa học tiếng anh English Semantics', N'English Semantics — studies meaning in language, including word meaning, sentence meaning and semantic relationships. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 5),
    (N'SEP490', N'SE Capstone Project', N'The capstone project gives students important skills and initial experience in participating in software projects, applying learned knowledge to real, current projects. Students will: - Experience all project phases: requirement, design, coding, testing and release; - Find and use templates and compose documents for each project stage; - Apply the technology knowledge they have been taught; - Research and apply new technologies; - Practice teamwork and learn to interact with colleagues during implementation; - Ensure proper implementation of quality requirements and schedule; - Perform troubleshooting. Teams of 4-5 members build an output product equivalent to about 20-25 medium use cases (3-7 transactions each; action buttons, end-user interactions with screens/functions, or database transactions can each count as a transaction).', N'SE', 9),
    (N'SSA101', N'Kỹ năng học thuật', N'Introduces essential academic skills for university success, focusing on effective study habits, critical and creative thinking, academic communication and the responsible use of AI. Students explore three key areas: - AI and academic integrity; - Thinking skills for the digital age; - Learning and communication at university. The course emphasizes self-directed learning and helps students manage their study, time and learning strategies effectively in both traditional and online settings.', N'Logistic', 1),
    (N'SSB201', N'Advanced Business Communication/Kỹ năng giao tiếp nâng cao trong kinh doanh', N'Advanced Business Communication — develops advanced communication skills for professional and business contexts. (Brief summary based on the course title; see FLM for the official syllabus.)', N'Marketing', 5),
    (N'SSC302m', N'Nói trước công chúng_Public Speaking', N'Public Speaking — develops skills for preparing and delivering effective spoken presentations to an audience. (Brief summary based on the course title; see FLM for the official syllabus.)', N'English', 3),
    (N'SSG104', N'Communication and In-Group Working Skills_Kỹ năng giao tiếp và cộng tác', N'Covers both working in groups and communication skills. - Presents theories of communication and group work; - Provides activities for students to practice applying these theories in academic and working contexts.', N'SE', 4),
    (N'SSG105', N'Kỹ năng giao tiếp và cộng tác', N'Develops students'' teamwork and workplace communication skills for academic and professional contexts. - Students examine how teams function and practice building trust, leadership and conflict management while communicating effectively in collaborative settings; - Emphasizes academic integrity, netiquette and ethical communication as principles for responsible participation in academic and professional communities; - Through group projects and applied activities, students develop practical skills in writing, presentations, meetings and career communication.', N'Logistic', 4),
    (N'SSL101c', N'Academic Skills for University Success_Kỹ năng học tập đại học', N'Upon finishing the course, students can: 1) Knowledge - understand methods to develop Information & Digital Literacy, Problem Solving and Creativity, Critical Thinking, and Communication skills. 2) Ability (ABET): - Access, search, filter, manage and organize information from varied sources using digital tools; - Critically evaluate source reliability and use referencing tools to avoid plagiarism; - Show awareness of ethical issues around academic integrity; - Identify real problems within ill-defined situations and apply analytical and creative problem-solving techniques; - Use thinking tools to improve critical thinking; - Identify types of argument and bias within arguments; - Further understanding through spoken, written, visual and conversational modes; - Formulate arguments and communicate research findings through researching, composing and editing. 3) Others - improve study skills such as academic reading and information searching.', N'SE', 1),
    (N'SWD392', N'Software Architecture and Design', N'A course in the concepts and methods for the architectural design of software systems large and complex enough to require several people working for many months. - Introduces fundamental design concepts and design notations; - Presents and compares several design methods with examples of their use; - Students undertake a term project in small groups, addressing the design of a relatively complex software system.', N'SE', 7),
    (N'SWE202c', N'Introduction to Software Engineering', N'For those new to software engineering, as well as experienced developers who want a deeper understanding of the context and theory of software-development practices. By the end of the course, learners will be able to: - Build high-quality, secure software using SDLC methodologies such as agile, lean, and traditional/waterfall; - Analyze a development team''s SDLC methodology and recommend improvements; - Compare and contrast development methodologies with respect to environmental, organizational and product constraints.', N'SE', 4),
    (N'SWP391', N'Software development project', N'Guides students through the full Software Development Life Cycle (SDLC) via a real-world team project, emphasizing the responsible use of AI across requirement analysis, design, implementation and testing. Students practice: - User story writing and system design; - Coding using MVC and OOP; - Workflow development, testing and reporting. AI tools are integrated into each phase to enhance productivity and quality.', N'SE', 5),
    (N'SWR302', N'Software Requirements', N'A model-based introduction to Requirements Engineering (RE), providing conceptual background and terminology. Techniques for requirements development covered: - Analysis and requirements elicitation; - Requirements evaluation; - Requirements specification and documentation; - Requirements quality assurance. Students learn to find appropriate customer representatives, elicit requirements, and document user requirements, business rules, functional, data and nonfunctional requirements. Numerous visual models supplement natural-language text to illustrate requirements from various perspectives. The course also recommends effective requirements approaches for specific project classes: agile products, enhancement and replacement projects, packaged-solution projects, outsourced projects, business process automation, business analytics, and embedded/real-time systems.', N'SE', 5),
    (N'SWT301', N'Software Testing', N'Covers the principles and practice of software testing: - General principles of software testing, including its purposes and objectives; - Testing integrated into development processes, covering test levels, test types and maintenance testing; - Static testing basics, including feedback and review processes to enhance quality; - Techniques such as black-box (functional), white-box (structural) and experience-based testing to derive test cases; - Test activities: planning, estimation, monitoring, risk management, defect reporting and test automation; - Tools and methods that support effective testing, emphasizing benefits and potential risks; - Use of AI to explore testing concepts, support static testing, and create/optimize test plans.', N'SE', 5),
    (N'TMI101', N'Traditional musical instrument', N'Traditional Musical Instrument — introduces students to a traditional musical instrument and basic performance skills. (Brief summary based on the course title; see FLM for the official syllabus.)', N'SE', 0),
    (N'TMI_ELE', N'Traditional musical instrument_Nhạc cụ truyền thống', N'Traditional Musical Instrument (elective) — introduces students to a traditional musical instrument and basic performance skills.', N'Marketing', 0),
    (N'TRS501', N'English 5 (University success)', N'Builds learners'' confidence and fluency in English through interactive, communicative lessons. By the end of the course, students can: - Identify main ideas and supporting details, and recognize and apply organizational structures; - Read academic passages fluently and use contextual strategies (context clues, root-word analysis, syntactic parsing) to interpret ambiguous text; - Analyze peer-reviewed research articles by identifying and summarizing the research question, methodology, key findings, and implications; - Distinguish facts from opinions and recognize implication and inference; - Understand cause-and-effect relationships and tell causation from correlation; - Determine the author''s purpose and tone, and interpret information in visuals, charts, and graphs accurately; - Organize ideas effectively at sentence, paragraph, and essay levels in academic writing; - Deliver clear, well-organized, impactful oral presentations with an appropriate academic register; - Master 280 Academic Word List terms, using them correctly in writing and presentations. Students are also expected to: - Work cooperatively, supportively, and responsibly in group work; - Leverage AI, online applications, language labs, and online platforms in learning tasks; - Adhere to plagiarism rules; - Demonstrate critical thinking.', N'SE', -1),
    (N'VNC104', N'Vietnamese Culture_Cơ sở văn hóa Việt Nam', N'Provides an understanding of the foundations and dimensions of Vietnamese culture - its origin and characteristics - with attention to the relationship between Vietnamese culture and present-day life, across social structures, belief systems, literature, arts and customs. Main topics: - Foundations of Vietnamese civilization: geography, language and history; - Core concepts in Vietnamese thought and religion: animism, Taoism, Buddhism, Confucianism, Catholicism and new sects; - Literature; - Society and life: education, the role of women, food, festivals and leisure; - Arts and architecture; - Vietnamese performing arts such as Ca trù, Tuồng and Hát Bội. Teaching methods: presentation, discussion, teamwork, critical thinking and field trips.', N'English', 2),
    (N'VNR202', N'History of Communist Party of Vietnam_Lịch sử Đảng Cộng sản Việt Nam', N'Course introduction: History of the Communist Party of Vietnam (CPV) is a major and a division of historical science. President Ho Chi Minh affirmed that the Party''s history is made of golden pages of scientific, revolutionary and profound practical value in its platforms and guidelines - proper leadership and timely responses to the missions set by history, and the normative theoretical experiences and lessons of the Vietnamese revolution and the Party''s glorious traditions. Studying the history of the CPV requires not only mastering historical events and milestones but also understanding them within the process of leadership and struggle, and applying and developing them in the current period of comprehensive renovation, accelerated industrialization and modernization, and international integration.', N'SE', 9),
    (N'WDU203c', N'The UI/UX Design', N'Integrates UX Research and UX Design to create great products by understanding user needs, rapidly generating prototypes, and evaluating design concepts. - Students gain hands-on experience taking a product from initial concept through user research, ideation and refinement, formal analysis, prototyping and user testing; - They apply perspectives and methods to ensure a great user experience at every step; - The course concludes with a capstone project in which learners design a complete product, from initial concept to an interactive prototype.', N'SE', 5),
    (N'WED201c', N'Web Design', N'Upon finishing the course, students can: 1) Knowledge (ABET e) - understand: - HTML, CSS3, JavaScript, interactivity with JavaScript, and advanced styling with responsive design; - Web page and web site structure; - How to design and implement a responsive site across three platforms; - How a web page is presented in browsers. 2) Ability (ABET k): - Add interactivity to web pages with JavaScript; - Apply responsive design for various devices; - Describe the basics of CSS3; - Use the Document Object Model (DOM) to modify pages. 3) Others (ABET i) - improve study skills such as academic reading and information searching.', N'SE', 2);
GO

/* ---------- Staging data: curriculum (326) ---------- */
INSERT INTO #CUR (major_code, semester_no, subject_code, display_order) VALUES
    (N'SE', -1, N'TRS501', 1),
    (N'SE', 0, N'ENT503', 2),
    (N'SE', 0, N'TMI101', 6),
    (N'SE', 0, N'OTP101', 7),
    (N'SE', 1, N'CSI106', 8),
    (N'SE', 1, N'SSL101c', 9),
    (N'SE', 1, N'PRF192', 10),
    (N'SE', 1, N'MAE101', 11),
    (N'SE', 1, N'CEA201', 12),
    (N'SE', 2, N'PRO192', 13),
    (N'SE', 2, N'MAD101', 14),
    (N'SE', 2, N'OSG202', 15),
    (N'SE', 2, N'WED201c', 16),
    (N'SE', 2, N'NWC204', 17),
    (N'SE', 3, N'JPD113', 18),
    (N'SE', 3, N'CSD201', 19),
    (N'SE', 3, N'DBI202', 20),
    (N'SE', 3, N'MAS291', 21),
    (N'SE', 3, N'LAB211', 22),
    (N'SE', 4, N'JPD123', 23),
    (N'SE', 4, N'IOT102', 24),
    (N'SE', 4, N'PRJ301', 25),
    (N'SE', 4, N'SSG104', 26),
    (N'SE', 4, N'SWE202c', 27),
    (N'SE', 5, N'HSF302', 28),
    (N'SE', 5, N'SWP391', 29),
    (N'SE', 5, N'WDU203c', 30),
    (N'SE', 5, N'SWR302', 31),
    (N'SE', 5, N'SWT301', 32),
    (N'SE', 6, N'OJT202', 33),
    (N'SE', 6, N'ENW493c', 34),
    (N'SE', 7, N'SBA301', 35),
    (N'SE', 7, N'SWD392', 36),
    (N'SE', 7, N'EXE101', 37),
    (N'SE', 7, N'PMG201c', 38),
    (N'SE', 8, N'EXE201', 39),
    (N'SE', 8, N'ITE302c', 40),
    (N'SE', 8, N'MLN122', 41),
    (N'SE', 8, N'MLN111', 42),
    (N'SE', 8, N'MSS301', 43),
    (N'SE', 8, N'PRM393', 44),
    (N'SE', 9, N'MLN131', 45),
    (N'SE', 9, N'VNR202', 46),
    (N'SE', 9, N'HCM202', 47),
    (N'SE', 9, N'SEP490', 48),
    (N'Marketing', 0, N'OTP101', 1),
    (N'Marketing', 0, N'PEN', 2),
    (N'Marketing', 0, N'TMI_ELE', 4),
    (N'Marketing', 1, N'ECO111', 5),
    (N'Marketing', 1, N'ENM302', 6),
    (N'Marketing', 1, N'MGT103', 7),
    (N'Marketing', 1, N'MKT101', 8),
    (N'Marketing', 1, N'PHE_COM*2', 9),
    (N'Marketing', 1, N'SSL101c', 10),
    (N'Marketing', 2, N'ACC101', 11),
    (N'Marketing', 2, N'ECO121', 12),
    (N'Marketing', 2, N'ENM402', 13),
    (N'Marketing', 2, N'OBE102c', 14),
    (N'Marketing', 2, N'PHE_COM*3', 15),
    (N'Marketing', 2, N'SSG104', 16),
    (N'Marketing', 3, N'DMS301m', 17),
    (N'Marketing', 3, N'FIN202', 18),
    (N'Marketing', 3, N'HRM202c', 19),
    (N'Marketing', 3, N'MKT201', 20),
    (N'Marketing', 3, N'MKT304', 21),
    (N'Marketing', 4, N'BDT202c', 22),
    (N'Marketing', 4, N'CHN113', 23),
    (N'Marketing', 4, N'DMA301m', 24),
    (N'Marketing', 4, N'MAS202', 25),
    (N'Marketing', 4, N'MKT202', 26),
    (N'Marketing', 5, N'CHN123', 27),
    (N'Marketing', 5, N'DTG111', 28),
    (N'Marketing', 5, N'MKT208c', 29),
    (N'Marketing', 5, N'SAL301', 30),
    (N'Marketing', 5, N'SSB201', 31),
    (N'Marketing', 6, N'ENW492c', 32),
    (N'Marketing', 6, N'OJB202', 33),
    (N'Marketing', 7, N'EXE101', 34),
    (N'Marketing', 7, N'LAW102', 35),
    (N'Marketing', 7, N'MKT_COM*1', 36),
    (N'Marketing', 7, N'MKT_COM*2', 37),
    (N'Marketing', 7, N'MKT_COM*3', 38),
    (N'Marketing', 8, N'EXE201', 39),
    (N'Marketing', 8, N'MKT_COM*4', 40),
    (N'Marketing', 8, N'MKT301', 41),
    (N'Marketing', 8, N'MLN111', 42),
    (N'Marketing', 8, N'MLN122', 43),
    (N'Marketing', 8, N'PMG201c', 44),
    (N'Marketing', 9, N'HCM202', 45),
    (N'Marketing', 9, N'MKT_GRA_ELE', 46),
    (N'Marketing', 9, N'MLN131', 47),
    (N'Marketing', 9, N'VNR202', 48),
    (N'Logistic', 0, N'OTP101', 1),
    (N'Logistic', 0, N'PEN', 2),
    (N'Logistic', 0, N'TMI_ELE', 4),
    (N'Logistic', 1, N'ACC101', 5),
    (N'Logistic', 1, N'ECO102', 6),
    (N'Logistic', 1, N'ENM302', 7),
    (N'Logistic', 1, N'MGT103', 8),
    (N'Logistic', 1, N'PHE_COM*2', 9),
    (N'Logistic', 1, N'SSA101', 10),
    (N'Logistic', 2, N'ENM402', 11),
    (N'Logistic', 2, N'FIN202', 12),
    (N'Logistic', 2, N'MKT101', 13),
    (N'Logistic', 2, N'OBE102c', 14),
    (N'Logistic', 2, N'PHE_COM*3', 15),
    (N'Logistic', 2, N'SCM202', 16),
    (N'Logistic', 3, N'GLI202', 17),
    (N'Logistic', 3, N'GLT301', 18),
    (N'Logistic', 3, N'HRM202c', 19),
    (N'Logistic', 3, N'MAS202', 20),
    (N'Logistic', 3, N'SCM302', 21),
    (N'Logistic', 4, N'BDT202c', 22),
    (N'Logistic', 4, N'CHN113', 23),
    (N'Logistic', 4, N'GLA301', 24),
    (N'Logistic', 4, N'GSF301', 25),
    (N'Logistic', 4, N'SSG105', 26),
    (N'Logistic', 5, N'CHN123', 27),
    (N'Logistic', 5, N'GLC301', 28),
    (N'Logistic', 5, N'GLH301', 29),
    (N'Logistic', 5, N'SAP312', 30),
    (N'Logistic', 5, N'SSB201', 31),
    (N'Logistic', 6, N'ENW492c', 32),
    (N'Logistic', 6, N'OJB202', 33),
    (N'Logistic', 7, N'EXE101', 34),
    (N'Logistic', 7, N'GL_COM*1', 35),
    (N'Logistic', 7, N'GL_COM*2', 36),
    (N'Logistic', 7, N'GL_COM*3', 37),
    (N'Logistic', 7, N'LAW102', 38),
    (N'Logistic', 8, N'EXE201', 39),
    (N'Logistic', 8, N'GL_COM*4', 40),
    (N'Logistic', 8, N'MLN111', 41),
    (N'Logistic', 8, N'MLN122', 42),
    (N'Logistic', 8, N'PMG201c', 43),
    (N'Logistic', 8, N'RMB302', 44),
    (N'Logistic', 9, N'GL_GRA_ELE', 45),
    (N'Logistic', 9, N'HCM202', 46),
    (N'Logistic', 9, N'MLN131', 47),
    (N'Logistic', 9, N'VNR202', 48),
    (N'Finance', 0, N'OTP101', 1),
    (N'Finance', 0, N'PEN', 2),
    (N'Finance', 0, N'TMI_ELE', 4),
    (N'Finance', 1, N'ACC101', 5),
    (N'Finance', 1, N'ECO111', 6),
    (N'Finance', 1, N'ENM302', 7),
    (N'Finance', 1, N'MGT103', 8),
    (N'Finance', 1, N'PHE_COM*2', 9),
    (N'Finance', 1, N'SSL101c', 10),
    (N'Finance', 2, N'ECO121', 11),
    (N'Finance', 2, N'ENM402', 12),
    (N'Finance', 2, N'FIN202', 13),
    (N'Finance', 2, N'OBE102c', 14),
    (N'Finance', 2, N'PHE_COM*3', 15),
    (N'Finance', 2, N'SSG104', 16),
    (N'Finance', 3, N'ACC302', 17),
    (N'Finance', 3, N'FIN201', 18),
    (N'Finance', 3, N'FIN303', 19),
    (N'Finance', 3, N'HRM202c', 20),
    (N'Finance', 3, N'MKT101', 21),
    (N'Finance', 4, N'ACC305', 22),
    (N'Finance', 4, N'CHN113', 23),
    (N'Finance', 4, N'FIN301', 24),
    (N'Finance', 4, N'ITA203c', 25),
    (N'Finance', 4, N'MAS202', 26),
    (N'Finance', 5, N'CHN123', 27),
    (N'Finance', 5, N'FIM302c', 28),
    (N'Finance', 5, N'FIN402', 29),
    (N'Finance', 5, N'RMB302', 30),
    (N'Finance', 5, N'SSB201', 31),
    (N'Finance', 6, N'ENW492c', 32),
    (N'Finance', 6, N'OJB202', 33),
    (N'Finance', 7, N'EXE101', 34),
    (N'Finance', 7, N'FIN_COM*1', 35),
    (N'Finance', 7, N'FIN_COM*2', 36),
    (N'Finance', 7, N'FIN_COM*3', 37),
    (N'Finance', 7, N'LAW102', 38),
    (N'Finance', 8, N'BKG303', 39),
    (N'Finance', 8, N'EXE201', 40),
    (N'Finance', 8, N'FIN_COM*.4', 41),
    (N'Finance', 8, N'MLN111', 42),
    (N'Finance', 8, N'MLN122', 43),
    (N'Finance', 8, N'PMG201c', 44),
    (N'Finance', 9, N'FIN_GRA_ELE', 45),
    (N'Finance', 9, N'HCM202', 46),
    (N'Finance', 9, N'MLN131', 47),
    (N'Finance', 9, N'VNR202', 48),
    (N'IA', -1, N'TRS501', 1),
    (N'IA', 0, N'ENT503', 2),
    (N'IA', 0, N'TMI101', 6),
    (N'IA', 0, N'OTP101', 7),
    (N'IA', 1, N'CSI106', 8),
    (N'IA', 1, N'PRF192', 9),
    (N'IA', 1, N'MAE101', 10),
    (N'IA', 1, N'CEA201', 11),
    (N'IA', 1, N'SSL101c', 12),
    (N'IA', 2, N'IOT102', 13),
    (N'IA', 2, N'NWC204', 14),
    (N'IA', 2, N'PRO192', 15),
    (N'IA', 2, N'MAD101', 16),
    (N'IA', 2, N'OSG202', 17),
    (N'IA', 3, N'CSD201', 18),
    (N'IA', 3, N'DBI202', 19),
    (N'IA', 3, N'LAB211', 20),
    (N'IA', 3, N'JPD113', 21),
    (N'IA', 3, N'IAO202', 22),
    (N'IA', 4, N'SSG104', 23),
    (N'IA', 4, N'JPD123', 24),
    (N'IA', 4, N'ITE302c', 25),
    (N'IA', 4, N'OSP201', 26),
    (N'IA', 4, N'MAS291', 27),
    (N'IA', 5, N'IAA202', 28),
    (N'IA', 5, N'FRS301', 29),
    (N'IA', 5, N'PRP201c', 30),
    (N'IA', 5, N'CRY303c', 31),
    (N'IA', 5, N'IAM302t', 32),
    (N'IA', 6, N'ENW493c', 33),
    (N'IA', 6, N'OJT202', 34),
    (N'IA', 7, N'HOD401', 35),
    (N'IA', 7, N'IA-000001c', 36),
    (N'IA', 7, N'IA-000002', 37),
    (N'IA', 7, N'IAP301', 38),
    (N'IA', 7, N'EXE101', 39),
    (N'IA', 8, N'EXE201', 40),
    (N'IA', 8, N'PMG201c', 41),
    (N'IA', 8, N'MLN111', 42),
    (N'IA', 8, N'IA-000003c', 43),
    (N'IA', 8, N'IA-000004', 44),
    (N'IA', 8, N'MLN122', 45),
    (N'IA', 9, N'HCM202', 46),
    (N'IA', 9, N'IAP491', 47),
    (N'IA', 9, N'MLN131', 48),
    (N'IA', 9, N'VNR202', 49),
    (N'English', 0, N'OTP101', 1),
    (N'English', 0, N'PEN', 2),
    (N'English', 0, N'TMI_ELE', 4),
    (N'English', 1, N'CHN113', 5),
    (N'English', 1, N'ECR301', 6),
    (N'English', 1, N'ENG303', 7),
    (N'English', 1, N'ENP203', 8),
    (N'English', 1, N'PHE_COM*2', 9),
    (N'English', 1, N'SSA101', 10),
    (N'English', 2, N'CHN123', 11),
    (N'English', 2, N'EAL202c', 12),
    (N'English', 2, N'EAW301', 13),
    (N'English', 2, N'LTG301', 14),
    (N'English', 2, N'PHE_COM*3', 15),
    (N'English', 2, N'VNC104', 16),
    (N'English', 3, N'ECB101', 17),
    (N'English', 3, N'EMP301', 18),
    (N'English', 3, N'ERW413', 19),
    (N'English', 3, N'LIT301', 20),
    (N'English', 3, N'SSC302m', 21),
    (N'English', 4, N'ECC302c', 22),
    (N'English', 4, N'ELI302', 23),
    (N'English', 4, N'ELT302', 24),
    (N'English', 4, N'ERW423', 25),
    (N'English', 4, N'EST301', 26),
    (N'English', 5, N'ELI402', 27),
    (N'English', 5, N'ELT402', 28),
    (N'English', 5, N'ENB302', 29),
    (N'English', 5, N'SEM301', 30),
    (N'English', 5, N'SSG105', 31),
    (N'English', 6, N'EPE301c', 32),
    (N'English', 6, N'OJE202', 33),
    (N'English', 7, N'BEN_COM*1', 34),
    (N'English', 7, N'BEN_COM*2', 35),
    (N'English', 7, N'EPG301', 36),
    (N'English', 7, N'ESL301', 37),
    (N'English', 7, N'EXE101', 38),
    (N'English', 8, N'BEN_COM*3', 39),
    (N'English', 8, N'BEN_COM*4', 40),
    (N'English', 8, N'ELR301', 41),
    (N'English', 8, N'EXE201', 42),
    (N'English', 8, N'MLN111', 43),
    (N'English', 8, N'MLN122', 44),
    (N'English', 9, N'BEN_GRA_ELE', 45),
    (N'English', 9, N'HCM202', 46),
    (N'English', 9, N'MLN131', 47),
    (N'English', 9, N'VNR202', 48),
    (N'AI', 0, N'OTP101', 1),
    (N'AI', 0, N'PEN', 2),
    (N'AI', 0, N'TMI_ELE', 4),
    (N'AI', 1, N'CEA201', 5),
    (N'AI', 1, N'CSI106', 6),
    (N'AI', 1, N'MAE101', 7),
    (N'AI', 1, N'PFP191', 8),
    (N'AI', 1, N'PHE_COM*2', 9),
    (N'AI', 1, N'SSA101', 10),
    (N'AI', 2, N'APO201c', 11),
    (N'AI', 2, N'IOT102', 12),
    (N'AI', 2, N'MAD101', 13),
    (N'AI', 2, N'NWC204', 14),
    (N'AI', 2, N'OSG203', 15),
    (N'AI', 2, N'PHE_COM*3', 16),
    (N'AI', 3, N'CSD203', 17),
    (N'AI', 3, N'DBI202', 18),
    (N'AI', 3, N'IA_ELE2', 19),
    (N'AI', 3, N'JPD113', 20),
    (N'AI', 3, N'NWC303', 21),
    (N'AI', 4, N'AIC211', 22),
    (N'AI', 4, N'ITE302c', 23),
    (N'AI', 4, N'JPD123', 24),
    (N'AI', 4, N'MAS291', 25),
    (N'AI', 4, N'SSG105', 26),
    (N'AI', 5, N'CRY303c', 27),
    (N'AI', 5, N'FRS301', 28),
    (N'AI', 5, N'IAA202', 29),
    (N'AI', 5, N'IAM302', 30),
    (N'AI', 5, N'PWD301', 31),
    (N'AI', 6, N'ENW493c', 32),
    (N'AI', 6, N'OJT202', 33),
    (N'AI', 7, N'EXE101', 34),
    (N'AI', 7, N'HOD402', 35),
    (N'AI', 7, N'IA_COM*1', 36),
    (N'AI', 7, N'IA_COM*2', 37),
    (N'AI', 7, N'IAP301', 38),
    (N'AI', 8, N'EXE201', 39),
    (N'AI', 8, N'IA_COM*3', 40),
    (N'AI', 8, N'IA_COM*4', 41),
    (N'AI', 8, N'MLN111', 42),
    (N'AI', 8, N'MLN122', 43),
    (N'AI', 8, N'PMG201c', 44),
    (N'AI', 9, N'HCM202', 45),
    (N'AI', 9, N'IA_GRA_ELE', 46),
    (N'AI', 9, N'MLN131', 47),
    (N'AI', 9, N'VNR202', 48);
GO

/* ---------- 1. MAJOR ---------- */
INSERT INTO dbo.MAJOR (major_name, description, created_at)
SELECT m.major_name, NULL, GETDATE()
FROM #MAJ m
WHERE NOT EXISTS (SELECT 1 FROM dbo.MAJOR x WHERE x.major_name = m.major_name);
PRINT CONCAT(N'  [MAJOR]    inserted ', @@ROWCOUNT);
GO

/* major_code only exists once AI_Study_Hub_v2_upgrade.sql has run. */
IF COL_LENGTH(N'dbo.MAJOR', N'major_code') IS NOT NULL
    EXEC sp_executesql N'
        UPDATE x SET x.major_code = m.major_code
        FROM dbo.MAJOR x JOIN #MAJ m ON m.major_name = x.major_name
        WHERE x.major_code IS NULL';
GO

/* ---------- 2. SEMESTER (one row per major x semester_no) ---------- */
INSERT INTO dbo.SEMESTER (semester_name, major_id, created_at)
SELECT s.semester_name, s.major_id, GETDATE()
FROM (
    SELECT DISTINCT
           -- semester_no -1 va 0 deu la ky chuan bi, gop chung thanh 'Semester 0'.
           -- DISTINCT o day tu dong go hai dong trung ve mot cho moi nganh.
           CASE WHEN c.semester_no <= 0 THEN N'Semester 0'
                ELSE CONCAT(N'Semester ', c.semester_no) END AS semester_name,
           mj.major_id
    FROM #CUR c
    JOIN #MAJ m       ON m.major_code = c.major_code
    JOIN dbo.MAJOR mj ON mj.major_name = m.major_name
) s
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.SEMESTER x
    WHERE x.major_id = s.major_id AND x.semester_name = s.semester_name);
PRINT CONCAT(N'  [SEMESTER] inserted ', @@ROWCOUNT);
GO

/* ---------- 3. SUBJECT (home semester = first major that teaches it) ---------- */
INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, description, created_at)
SELECT sem.semester_id, s.subject_name, s.subject_code,
       LEFT(s.subject_description, 500), GETDATE()
FROM #SUB s
JOIN #MAJ m       ON m.major_code = s.home_major
JOIN dbo.MAJOR mj ON mj.major_name = m.major_name
JOIN dbo.SEMESTER sem
     ON sem.major_id = mj.major_id
    AND sem.semester_name = CASE WHEN s.home_sem <= 0 THEN N'Semester 0'
                                 ELSE CONCAT(N'Semester ', s.home_sem) END
WHERE NOT EXISTS (SELECT 1 FROM dbo.SUBJECT x WHERE x.subject_code = s.subject_code);
PRINT CONCAT(N'  [SUBJECT]  inserted ', @@ROWCOUNT);
GO

/* subject_description only exists once AI_Study_Hub_v2_upgrade.sql has run. */
IF COL_LENGTH(N'dbo.SUBJECT', N'subject_description') IS NOT NULL
    EXEC sp_executesql N'
        UPDATE x SET x.subject_description = s.subject_description
        FROM dbo.SUBJECT x JOIN #SUB s ON s.subject_code = x.subject_code
        WHERE x.subject_description IS NULL';
GO

/* ---------- 4. SEMESTER_SUBJECT (extra major/semester links) ---------- */
INSERT INTO dbo.SEMESTER_SUBJECT (semester_id, subject_id)
SELECT DISTINCT sem.semester_id, sb.subject_id
FROM #CUR c
JOIN #MAJ m         ON m.major_code = c.major_code
JOIN dbo.MAJOR mj   ON mj.major_name = m.major_name
JOIN dbo.SUBJECT sb ON sb.subject_code = c.subject_code
JOIN dbo.SEMESTER sem
     ON sem.major_id = mj.major_id
    AND sem.semester_name = CASE WHEN c.semester_no <= 0 THEN N'Semester 0'
                                 ELSE CONCAT(N'Semester ', c.semester_no) END
WHERE sem.semester_id <> sb.semester_id
  AND NOT EXISTS (SELECT 1 FROM dbo.SEMESTER_SUBJECT x
                  WHERE x.semester_id = sem.semester_id AND x.subject_id = sb.subject_id);
PRINT CONCAT(N'  [LINK]     inserted ', @@ROWCOUNT);
GO

DROP TABLE #MAJ;
DROP TABLE #SUB;
DROP TABLE #CUR;
GO

PRINT N'Curriculum seed done.';
GO
