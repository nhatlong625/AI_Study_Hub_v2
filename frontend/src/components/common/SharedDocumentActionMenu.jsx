import { useState, useRef, useEffect } from "react";

// Menu 3 chấm dành riêng cho trang "Shared with me" — KHÁC DocumentActionMenu
// (Edit/Share/Delete) vì người xem ở đây không phải owner, chỉ có 2 quyền:
// Open (xem) và Remove (tự gỡ mình khỏi danh sách share, không ảnh hưởng
// owner/người khác — xem giải thích ở DocumentService.revokeUserShare).
export default function SharedDocumentActionMenu({ onOpen, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-40 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => {
              setOpen(false);
              onOpen?.();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Open
          </button>

          <div className="h-px bg-gray-100 mx-3" />

          <button
            onClick={() => {
              setOpen(false);
              onRemove?.();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
