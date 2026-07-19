data = """1	TRS501	English 5 (University success)	-1
2	ENT503	English 6 (Summit 2)	0
3	VOV114	Vovinam 1	0
4	VOV124	Vovinam 2	0
5	VOV134	Vovinam 3	0
6	TMI101	Traditional musical instrument	0
7	OTP101	Orientation and General Training Program	0
8	CSI106	Introduction to Computer Science	1
9	SSL101c	Academic Skills for University Success	1
10	PRF192	Programming Fundamentals	1
11	MAE101	Mathematics for Engineering	1
12	CEA201	Computer Organization and Architecture	1
13	PRO192	Object-Oriented Programming	2
14	MAD101	Discrete mathematics	2
15	OSG202	Operating Systems	2
16	WED201c	Web Design	2
17	NWC204	Computer Networking	2
18	JPD113	Elementary Japanese 1- A1.1	3
19	CSD201	Data Structures and Algorithms	3
20	DBI202	Database Systems	3
21	MAS291	Statistics & Probability	3
22	LAB211	OOP with Java Lab	3
23	JPD123	Elementary Japanese 1-A1.2	4
24	IOT102	Internet of Things	4
25	PRJ301	Java Web application development	4
26	SSG104	Communication and In-Group Working Skills	4
27	SWE202c	Introduction to Software Engineering	4
28	HSF302	Working with Spring Framework	5
29	SWP391	Software development project	5
30	WDU203c	The UI/UX Design	5
31	SWR302	Software Requirements	5
32	SWT301	Software Testing	5
33	OJT202	On the job training	6
34	ENW493c	Research Methods & Academic Writing Skills	6
35	SBA301	Integrate single page application with Spring Boot	7
36	SWD392	Software Architecture and Design	7
37	EXE101	Experiential Entrepreneurship 1	7
38	PMG201c	Project Management	7
39	EXE201	Experiential Entrepreneurship 2	8
40	ITE302c	Ethics in IT	8
41	MLN122	Political economics of Marxism – Leninism	8
42	MLN111	Philosophy of Marxism – Leninism	8
43	MSS301	Microservices with Spring Cloud	8
44	PRM393	Mobile Programming	8
45	MLN131	Scientific socialism	9
46	VNR202	History of Vietnam Communist Party	9
47	HCM202	Ho Chi Minh Ideology	9
48	SEP490	SE Capstone Project	9"""

lines = data.strip().split('\n')
semesters = set()
subjects = []

for line in lines:
    parts = line.split('\t')
    if len(parts) >= 4:
        sem_val = parts[3].strip()
        semesters.add(sem_val)
        subjects.append({
            'code': parts[1].strip(),
            'name': parts[2].strip().replace("'", "''"),
            'semester': sem_val
        })

semesters = sorted(list(semesters), key=lambda x: int(x))

sql = "USE [AI_StudyHub];\nGO\n\n"
sql += "-- Insert Semesters\n"
sql += "DECLARE @SemesterMapping TABLE (sem_val INT, sem_id INT);\n\n"

for sem in semesters:
    sem_name = f"Semester {sem}"
    sql += f"INSERT INTO dbo.SEMESTER (semester_name, created_at)\n"
    sql += f"VALUES (N'{sem_name}', GETDATE());\n"
    sql += f"INSERT INTO @SemesterMapping (sem_val, sem_id) VALUES ({sem}, SCOPE_IDENTITY());\n\n"

sql += "-- Insert Subjects\n"
for sub in subjects:
    sql += f"DECLARE @SemId_{sub['code']} INT = (SELECT sem_id FROM @SemesterMapping WHERE sem_val = {sub['semester']});\n"
    sql += f"INSERT INTO dbo.SUBJECT (semester_id, subject_name, subject_code, created_at)\n"
    sql += f"VALUES (@SemId_{sub['code']}, N'{sub['name']}', N'{sub['code']}', GETDATE());\n\n"

with open(r'C:\Users\admin\Downloads\AI_Study_Hub\seed_subjects.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
print("Done")
