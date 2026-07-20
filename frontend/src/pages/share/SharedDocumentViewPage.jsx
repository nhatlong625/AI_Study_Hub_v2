// pages/share/SharedDocumentViewPage.jsx
// Trang xem document qua link share — public, không cần đăng nhập.
// Resolve shareId → documentId rồi navigate vào StudentDocumentViewPage
// (vốn đã read-only: không có nút Delete/Rename/Visibility).

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { documentApi } from "../../services/libraryApi";
import StudentDocumentViewPage from "../student/StudentDocumentViewPage";

export default function SharedDocumentViewPage() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    documentApi
      .getByShareId(shareId)
      .then((data) => setDoc(data))
      .catch((err) => {
        if (err.status === 404) {
          setError("This share link is no longer active or does not exist.");
        } else {
          setError("Could not load document. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
        Loading shared document...
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-700 mb-2">
          Link unavailable
        </h2>
        <p className="text-sm text-gray-400 max-w-sm">
          {error || "This document is no longer available."}
        </p>
      </div>
    );
  }

  // Truyền doc qua location.state — StudentDocumentViewPage nhận sẵn,
  // không cần fetch lại bằng documentId.
  // navigate state trick: render StudentDocumentViewPage trực tiếp với doc prop
  // bằng cách dùng key để force mount đúng documentId.
  return <StudentDocumentViewPage _sharedDoc={doc} _shareId={shareId} />;
}
