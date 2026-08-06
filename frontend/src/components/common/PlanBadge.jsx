// Nhãn gói của người dùng. Dùng chung cho Profile và Settings để hai chỗ không
// trôi mỗi nơi một kiểu.

const PLAN_STYLES = {
  pro: "bg-purple-100 text-purple-700 border-purple-200",
  plus: "bg-indigo-100 text-indigo-700 border-indigo-200",
  basic: "bg-gray-100 text-gray-600 border-gray-200",
};

// Gói do admin tự tạo: màu riêng thay vì dùng lại màu xám của Basic, nếu không
// người dùng không phân biệt được gói mới với gói miễn phí mặc định.
const CUSTOM_PLAN_STYLE = "bg-sky-100 text-sky-700 border-sky-200";

export default function PlanBadge({ plan }) {
  const name = String(plan || "Basic").trim() || "Basic";
  const key = name.toLowerCase();
  const isBasic = key === "basic";
  const cls = PLAN_STYLES[key] || CUSTOM_PLAN_STYLE;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}
    >
      {/* Ngôi sao hàm ý gói cao cấp, nên không gắn cho Basic — gói mặc định ai cũng có. */}
      {!isBasic && "★"} {name.toUpperCase()}
    </span>
  );
}
