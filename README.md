# AI Study Hub

AI Study Hub là hệ thống quản lý tài liệu học tập cho sinh viên. Project gồm 3 phần chính:

- `backend-java`: Spring Boot API, xác thực, quản lý tài liệu, Supabase Storage, admin dashboard.
- `backend-python`: FastAPI AI service dùng cho AI Summary và AI Chat/RAG.
- `frontend`: React + Vite UI cho student/admin/auth/public share.

> Lưu ý khi nộp/chia sẻ project: không cần gửi thư viện đã tải như `node_modules`, `.venv`, `target`, `dist`. Người nhận chỉ cần tải lại dependencies bằng các lệnh trong README này.

## 1. Yêu Cầu Môi Trường

| Thành phần | Phiên bản khuyến nghị |
|---|---|
| Java JDK | 25, cần hỗ trợ `--enable-preview` |
| Maven | 3.9+ |
| Node.js | 18+ hoặc 20+ |
| npm | Đi kèm Node.js |
| Python | 3.11, 3.12 hoặc 3.13 |
| SQL Server | 2019+ |
| SQL Server Management Studio | Khuyến nghị để import database |

Không dùng Python 3.14 cho backend-python vì một số package có thể chưa có wheel ổn định.

## 2. Cấu Trúc Thư Mục

```text
AI_Study_Hub/
├── backend-java/                         # Spring Boot API, port 8080
├── backend-python/                       # FastAPI AI service, port 8000
├── frontend/                             # React + Vite, port 5173
├── AI_StudyHub_full_schema_current.sql   # SQL Server schema + dữ liệu mẫu
├── package.json                          # script root nếu cần
└── README.md
```

## 3. Không Gửi Thư Viện Khi Nộp Project

Các thư mục/file có thể tải lại, không nên gửi kèm:

```text
node_modules/
frontend/node_modules/
backend-python/.venv/
backend-java/target/
frontend/dist/
*.log
.env
```

Cách tải lại tài nguyên/thư viện sau khi nhận project:

```powershell
# Frontend dependencies
cd frontend
npm install

# Python dependencies
cd ..\backend-python
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Java dependencies
cd ..\backend-java
mvn dependency:resolve
```

Maven sẽ tự tải thư viện Java theo `backend-java/pom.xml`, npm tải theo `frontend/package.json`, pip tải theo `backend-python/requirements.txt`.

## 4. Cài Database SQL Server

1. Mở SQL Server Management Studio.
2. Tạo database tên `AI_StudyHub`.
3. Mở và chạy file:

```text
AI_StudyHub_full_schema_current.sql
```

4. Kiểm tra SQL Server đang bật TCP/IP port `1433`.

Nếu không kết nối được SQL Server:

- Mở `SQL Server Configuration Manager`.
- Vào `SQL Server Network Configuration`.
- Bật `TCP/IP` cho SQL Server instance đang dùng.
- Restart SQL Server service.

## 5. Chạy Backend Java

### 5.1. Cấu Hình `.env`

Tạo file:

```text
backend-java/.env
```

Có thể copy từ:

```text
backend-java/.env.example
```

Mẫu cấu hình:

```env
DB_HOST=localhost
DB_NAME=AI_StudyHub
DB_USERNAME=sa
DB_PASSWORD=your_sql_password
DB_URL=jdbc:sqlserver://localhost:1433;databaseName=AI_StudyHub;encrypt=false;trustServerCertificate=true

JWT_SECRET=change-this-secret-to-at-least-32-characters
JWT_EXPIRATION_MS=86400000
JWT_REFRESH_MS=604800000

MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password

PYTHON_AI_BASE_URL=http://127.0.0.1:8000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
SUPABASE_BUCKET=documents

FRONTEND_URL=http://localhost:5173
APP_FRONTEND_URL=http://localhost:5173
EMAIL_VERIFY_URL=http://localhost:5173/verify-email
PASSWORD_RESET_URL=http://localhost:5173/reset-password
```

Không commit hoặc gửi file `.env` thật vì có mật khẩu database, Supabase key và mail password.

### 5.2. Tải Dependencies Java

```powershell
cd backend-java
mvn dependency:resolve
```

### 5.3. Chạy Backend Java

```powershell
mvn spring-boot:run
```

Backend Java chạy tại:

```text
http://localhost:8080
```

Một số API kiểm tra nhanh:

```text
http://localhost:8080/api/admin/dashboard
http://localhost:8080/api/auth/login
```

Nếu port `8080` bị chiếm, dừng process đang dùng port đó hoặc đổi `SERVER_PORT` trong `.env`.

## 6. Chạy Backend Python AI Service

### 6.1. Tạo Virtual Environment

```powershell
cd backend-python
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Nếu dùng macOS/Linux:

```bash
cd backend-python
python3.12 -m venv .venv
source .venv/bin/activate
```

### 6.2. Tải Dependencies Python

```powershell
pip install -r requirements.txt
```

### 6.3. Cấu Hình `.env`

Tạo file:

```text
backend-python/.env
```

Mẫu cấu hình:

```env
LLM_PROVIDER=auto

OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini

GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash
```

Gợi ý:

- `LLM_PROVIDER=auto`: ưu tiên OpenAI nếu có key, nếu không thì dùng Gemini.
- `LLM_PROVIDER=openai`: chỉ gọi OpenAI.
- `LLM_PROVIDER=gemini`: chỉ gọi Gemini.
- Nếu không có key hoặc key lỗi, AI service có thể fallback sang mock/local response tùy logic hiện tại.

### 6.4. Chạy Python Service

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Python AI service chạy tại:

```text
http://127.0.0.1:8000
```

Kiểm tra:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

Nếu báo port `8000` bị chiếm:

```powershell
netstat -ano | findstr :8000
Stop-Process -Id <PID> -Force
```

## 7. Chạy Frontend React

### 7.1. Cấu Hình `.env`

Tạo file:

```text
frontend/.env
```

Mẫu cấu hình:

```env
VITE_API_URL=http://localhost:8080/api
VITE_AI_STUDY_USER_ID=1
```

Nếu frontend cần gọi thẳng Python AI service thì có thể thêm:

```env
VITE_AI_URL=http://127.0.0.1:8000
```

### 7.2. Tải Dependencies Frontend

```powershell
cd frontend
npm install
```

### 7.3. Chạy Frontend

```powershell
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

Build kiểm tra production:

```powershell
npm run build
```

## 8. Thứ Tự Chạy Project

Mở 3 terminal riêng và chạy theo thứ tự:

### Terminal 1: Backend Java

```powershell
cd backend-java
mvn spring-boot:run
```

### Terminal 2: Backend Python

```powershell
cd backend-python
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 3: Frontend

```powershell
cd frontend
npm run dev
```

Sau đó mở:

```text
http://localhost:5173
```

## 9. Supabase Storage

Project dùng Supabase Storage để lưu tài liệu upload.

Cần cấu hình trong `backend-java/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
SUPABASE_BUCKET=documents
```

Trên Supabase cần có bucket tên `documents`. Nếu muốn preview file PDF trực tiếp trên web, bucket hoặc object policy phải cho phép đọc public, hoặc backend phải tạo signed URL.

Không gửi Supabase service-role key trong README, GitHub hoặc file nộp bài.

## 10. AI Summary Và AI Chat

Luồng chạy chính:

1. User upload tài liệu ở frontend.
2. Java backend lưu file lên Supabase và metadata vào SQL Server.
3. Java backend gọi Python AI service để tóm tắt hoặc chat.
4. Python AI service gọi OpenAI/Gemini theo `.env`.
5. Kết quả summary/chat được trả về frontend và/hoặc lưu DB.

Để AI hoạt động thật, cần chạy cả:

```text
backend-java :8080
backend-python :8000
frontend :5173
```

Và cần có ít nhất một API key hợp lệ:

```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

## 11. Tài Khoản Và Phân Quyền

Database seed có thể đã có sẵn user/role tùy file SQL. Nếu cần tạo admin thủ công:

1. Đăng ký user mới trên frontend.
2. Mở SQL Server.
3. Cập nhật `role_id` của user đó sang role admin theo dữ liệu trong bảng `ROLE`.

Ví dụ kiểm tra role:

```sql
SELECT * FROM ROLE;
SELECT user_id, email, full_name, role_id FROM [USER];
```

## 12. Lỗi Thường Gặp

### Backend Java không kết nối được SQL Server

Kiểm tra:

- SQL Server đang chạy chưa.
- Database `AI_StudyHub` đã tạo chưa.
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` trong `backend-java/.env` đúng chưa.
- TCP/IP port `1433` đã bật chưa.

### Python báo port 8000 đã được dùng

```powershell
netstat -ano | findstr :8000
Stop-Process -Id <PID> -Force
```

### Java báo port 8080 đã được dùng

```powershell
netstat -ano | findstr :8080
Stop-Process -Id <PID> -Force
```

### Frontend không gọi được API

Kiểm tra `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api
```

Sau khi sửa `.env`, dừng và chạy lại `npm run dev`.

### AI trả mock hoặc báo service unavailable

Kiểm tra:

- Python service đã chạy ở `http://127.0.0.1:8000/health` chưa.
- `PYTHON_AI_BASE_URL` trong `backend-java/.env` đúng chưa.
- `OPENAI_API_KEY` hoặc `GEMINI_API_KEY` còn quota và đúng chưa.
- Terminal Python có log lỗi rate limit/token/API key không.

### Upload được nhưng preview không mở

Kiểm tra:

- Supabase bucket `documents` có tồn tại không.
- Object path lưu trong DB đúng không.
- Bucket public hoặc backend có signed URL không.
- File PDF không bị lỗi hoặc bị chặn CORS không.

## 13. Checklist Trước Khi Gửi Project

Nên gửi:

```text
backend-java/
backend-python/
frontend/
AI_StudyHub_full_schema_current.sql
README.md
package.json
package-lock.json nếu cần
```

Không nên gửi:

```text
node_modules/
frontend/node_modules/
backend-python/.venv/
backend-java/target/
frontend/dist/
.env
logs/
```

Người nhận chạy lại dependencies bằng:

```powershell
cd frontend
npm install

cd ..\backend-python
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd ..\backend-java
mvn dependency:resolve
```

## 14. Lệnh Nhanh

```powershell
# Java backend
cd backend-java
mvn spring-boot:run

# Python AI service
cd backend-python
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm run dev
```
