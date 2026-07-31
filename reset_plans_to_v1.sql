/*==============================================================================
  reset_plans_to_v1.sql
  Khôi phục thiết kế gói Basic / Plus / Pro về BẢN GỐC (version 1).

  Việc script làm:
    1. Đưa giá trị của version_no = 1 về đúng seed ban đầu
       (phòng khi lúc test đã sửa đè lên chính version 1).
    2. Bật lại version 1 làm bản active (is_active = 1, effective_to = NULL).
    3. Tắt toàn bộ version test (version_no > 1): is_active = 0 + đóng effective_to.

  KHÔNG xóa dòng nào -> không vỡ FK với USER_SUBSCRIPTION.
  Chạy trong SSMS trên đúng database AI_StudyHub.
==============================================================================*/

SET NOCOUNT ON;
BEGIN TRAN;

-- ── Trước khi đổi: xem hiện trạng ──────────────────────────────────────────
SELECT sp.plan_name, v.version_no, v.price, v.max_storage, v.max_quiz_per_month,
       v.is_active, v.effective_to
FROM dbo.SUBSCRIPTION_PLAN_VERSION v
JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = v.plan_id
ORDER BY sp.plan_name, v.version_no;

-- ── 1. Reset giá trị version 1 về seed gốc ────────────────────────────────
UPDATE v
SET v.price                    = d.price,
    v.max_storage              = d.max_storage,
    v.max_quiz_per_month       = d.max_quiz,
    v.duration_month           = 1,
    v.monthly_discount_percent = 0,
    v.yearly_discount_percent  = 0,
    v.features_json            = d.features_json,
    v.is_active                = 1,
    v.effective_to             = NULL
FROM dbo.SUBSCRIPTION_PLAN_VERSION v
JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = v.plan_id
JOIN (VALUES
    (N'BASIC', CAST(0    AS DECIMAL(12,2)),  1024, 10, N'[{"label":"Free plan for starter usage.","included":true},{"label":"Priority support","included":false},{"label":"Advanced AI models","included":false}]'),
    (N'PLUS',  CAST(900  AS DECIMAL(12,2)), 10240, 30, N'[{"label":"Priority email support","included":true},{"label":"Smart citation generator","included":true}]'),
    (N'PRO',   CAST(2900 AS DECIMAL(12,2)), 51200, -1, N'[{"label":"Advanced AI models","included":true},{"label":"Offline mode & sync","included":true},{"label":"24/7 dedicated support","included":true}]')
) d(plan_name, price, max_storage, max_quiz, features_json)
  ON UPPER(sp.plan_name) = d.plan_name
WHERE v.version_no = 1;

-- ── 2. Tắt mọi version test (version_no > 1) ──────────────────────────────
UPDATE dbo.SUBSCRIPTION_PLAN_VERSION
SET is_active    = 0,
    effective_to = CASE WHEN effective_to IS NULL THEN SYSDATETIME() ELSE effective_to END
WHERE version_no > 1;

-- ── Sau khi đổi: kiểm tra lại ─────────────────────────────────────────────
SELECT sp.plan_name, v.version_no, v.price, v.max_storage, v.max_quiz_per_month,
       v.is_active, v.effective_to
FROM dbo.SUBSCRIPTION_PLAN_VERSION v
JOIN dbo.SUBSCRIPTION_PLAN sp ON sp.plan_id = v.plan_id
ORDER BY sp.plan_name, v.version_no;

-- Xem đủ 2 kết quả rồi, nếu đúng thì COMMIT, sai thì ROLLBACK.
COMMIT;
-- ROLLBACK;   -- (bỏ dấu -- ở dòng này và comment COMMIT nếu muốn hủy)
GO

/*------------------------------------------------------------------------------
  TÙY CHỌN: kéo subscriber đang trỏ tới version test về lại version 1.
  Chỉ chạy nếu bạn muốn user hiện tại cũng dùng bản gốc.
  (Mặc định KHÔNG chạy — bỏ comment nếu cần.)

UPDATE us
SET us.version_id = v1.version_id
FROM dbo.USER_SUBSCRIPTION us
JOIN dbo.SUBSCRIPTION_PLAN_VERSION cur ON cur.version_id = us.version_id
JOIN dbo.SUBSCRIPTION_PLAN_VERSION v1  ON v1.plan_id = us.plan_id AND v1.version_no = 1
WHERE cur.version_no > 1;
GO
------------------------------------------------------------------------------*/
