# Student Major Integration — Design Plan

> Created: 2026-08-01  
> Status: Design complete, implementation pending  
> Branch: `feature/major-management`

---

## Problem

Admin đã có thể quản lý phân cấp **Ngành → Kỳ → Môn** trong Library Management.  
Nhưng phía Student chưa có khái niệm "ngành học của tôi" — student vẫn thấy **tất cả** kỳ/môn 
của mọi ngành lẫn lộn, không được lọc theo ngành.

## Goal

Khi student đăng nhập, hệ thống tự động lọc kỳ/môn theo ngành student đã chọn, 
giúp giao diện gọn gàng, đúng ngành học, đúng chuẩn UX.

---

## UX Flow

```
Đăng ký / Đăng nhập lần đầu
        │
        ▼
┌──────────────────────────┐
│  🎓 Welcome!             │
│  Select your major:      │
│  ┌────────────────────┐  │
│  │ Software Engineering│  │
│  │ Data Science        │  │
│  │ Information Systems │  │
│  └────────────────────┘  │
│         [Continue]       │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│  Home                                │
│  ┌────────────────────────────────┐  │
│  │ 🎓 Software Engineering    [▼] │  │  ← dropdown đổi ngành bất kỳ lúc nào
│  └────────────────────────────────┘  │
│                                      │
│  📅 Semester 1                       │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ CS101│ │ MA101│ │ PH101│        │  ← chỉ hiện môn của ngành đã chọn
│  └──────┘ └──────┘ └──────┘        │
│                                      │
│  📅 Semester 2                       │
│  ...                                 │
└──────────────────────────────────────┘
```

---

## Key Behaviors

| Vị trí | Hành vi |
|---|---|
| **Onboarding** | Lần đầu đăng nhập, nếu `user.major_id` null → hiện modal chọn ngành (1 lần) |
| **Home page** | Top bar hiện ngành đã chọn, có dropdown đổi ngành |
| **Library** | Mặc định lọc theo ngành, có nút "Browse all majors" để khám phá |
| **Settings** | Mục "My Major" để đổi ngành bất cứ lúc nào |
| **My Courses** | Chỉ hiện môn thuộc ngành của mình |

---

## Technical Changes Needed

### 1. Database (`AI_Study_Hub.sql`)

Thêm cột `major_id` vào bảng `USER`:

```sql
IF COL_LENGTH('dbo.[USER]', 'major_id') IS NULL
    ALTER TABLE dbo.[USER] ADD major_id INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_USER_MAJOR')
    ALTER TABLE dbo.[USER] ADD CONSTRAINT FK_USER_MAJOR 
        FOREIGN KEY (major_id) REFERENCES dbo.MAJOR(major_id);
GO
```

### 2. Backend Java

#### 2a. Entity: `User.java` — thêm field `majorId`
```java
@Column(name = "major_id")
private Integer majorId;
```

#### 2b. API mới / sửa:

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /api/semesters?majorId={id}` | GET | Lọc kỳ theo ngành (sửa `SemesterController.getAll`) |
| `PUT /api/users/me/major` | PUT | Cập nhật ngành của user hiện tại |
| `GET /api/users/me` | GET | Trả về thông tin user (đã có, thêm majorId) |

#### 2c. Files cần sửa:
- `entity/User.java` — thêm `majorId`
- `controller/SemesterController.java` — thêm optional param `majorId`
- `controller/UserController.java` — thêm endpoint update major
- `service/SemesterService.java` — thêm filter by major

### 3. Frontend React

#### 3a. Files cần sửa:

| File | Thay đổi |
|---|---|
| `StudentHomePage.jsx` | Thêm major selector dropdown ở top bar; lọc `semesterApi.getAll()` theo `majorId` |
| `StudentLibraryPage.jsx` | Tương tự, thêm major filter + nút "Browse all" |
| `StudentSettingsPage.jsx` | Thêm field "My Major" dropdown |
| `services/libraryApi.js` | Thêm `semesterApi.getAll(majorId)` param |
| `services/userService.js` | Thêm `updateMyMajor(majorId)` |

#### 3b. Onboarding Modal (component mới):
- `components/student/MajorOnboardingModal.jsx` — hiện sau login nếu `user.majorId` null
- Gọi `GET /api/admin/majors` để lấy danh sách ngành (endpoint đã có)
- Gọi `PUT /api/users/me/major` để lưu lựa chọn

#### 3c. Major Selector Dropdown (component mới):
- `components/student/MajorSelector.jsx` — dùng chung ở Home + Library + Settings
- Dropdown hiển thị danh sách ngành + "All Majors" option

---

## Backward Compatibility

| Trường hợp | Xử lý |
|---|---|
| User cũ (`major_id = null`) | Hiện modal onboarding → bắt chọn ngành |
| Semester cũ (`major_id = null`) | Luôn hiện trong "All Majors" mode |
| Admin chưa tạo ngành nào | Ẩn major selector, giữ nguyên flow cũ |

---

## Implementation Order

1. **Database** — thêm `major_id` vào USER
2. **Backend** — entity + API update major, filter semester by major
3. **Frontend** — MajorSelector component + MajorOnboardingModal
4. **Frontend** — tích hợp vào Home, Library, Settings
5. **Test** — đăng nhập student mới → onboarding → xem đúng môn theo ngành

---

## Files Checklist

### Database
- [ ] `AI_Study_Hub.sql` — thêm cột `major_id` vào USER

### Backend
- [ ] `entity/User.java` — thêm `majorId` field
- [ ] `controller/UserController.java` — thêm `PUT /users/me/major`
- [ ] `controller/SemesterController.java` — thêm param `majorId` optional
- [ ] `service/SemesterService.java` — filter by `majorId`
- [ ] `controller/AdminController.java` — (không thay đổi, đã có majors endpoint)

### Frontend
- [ ] `services/libraryApi.js` — sửa `semesterApi.getAll(majorId)`
- [ ] `services/userService.js` — thêm `updateMyMajor(majorId)`
- [ ] `components/student/MajorSelector.jsx` — component mới
- [ ] `components/student/MajorOnboardingModal.jsx` — component mới
- [ ] `pages/student/StudentHomePage.jsx` — tích hợp MajorSelector
- [ ] `pages/student/StudentLibraryPage.jsx` — tích hợp MajorSelector
- [ ] `pages/student/StudentSettingsPage.jsx` — thêm "My Major" field
