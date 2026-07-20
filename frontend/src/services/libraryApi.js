// src/services/libraryApi.js
// ============================================================
// API service - connects to the Spring Boot backend.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ============================================================
// SEMESTER API
// ============================================================

export const libraryApi = {
  getOverview: async (userId) => {
    const res = await fetch(`${BASE_URL}/library/users/${userId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Cannot load library (HTTP ${res.status})`);
    return res.json();
  },
};

export const semesterApi = {
  // Load all semesters and subjects in the system.
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/semesters`, { headers: getHeaders() });
    return res.json();
  },
};

// ============================================================
// SUBJECT API
// ============================================================
export const subjectApi = {
  // Load subjects by semester.
  getBySemester: async (semesterId) => {
    const res = await fetch(`${BASE_URL}/subjects/semester/${semesterId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Add a new subject for custom-course creation flows.
  add: async (semesterId, subjectName, description = "") => {
    const res = await fetch(
      `${BASE_URL}/subjects?semesterId=${semesterId}&subjectName=${encodeURIComponent(subjectName)}&description=${encodeURIComponent(description)}`,
      { method: "POST", headers: getHeaders() },
    );
    return res.json();
  },

  // Delete a subject.
  delete: async (subjectId) => {
    const res = await fetch(`${BASE_URL}/subjects/${subjectId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.text();
  },
};

// ============================================================
// USER_SUBJECT API - subjects the user added to their personal Library.
// Independent from whether the user has uploaded documents yet.
// ============================================================
export const userSubjectApi = {
  // Load subjects the user added; used to render the Library page.
  getByUser: async (userId) => {
    const res = await fetch(`${BASE_URL}/user-subjects/user/${userId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  // Add one subject to Library when the Create Course modal is submitted.
  add: async (userId, subjectId) => {
    const res = await fetch(
      `${BASE_URL}/user-subjects?userId=${userId}&subjectId=${subjectId}`,
      { method: "POST", headers: getHeaders() },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  // Remove a subject from Library; BE also removes the user documents/files in it.
  remove: async (userId, subjectId) => {
    const res = await fetch(
      `${BASE_URL}/user-subjects?userId=${userId}&subjectId=${subjectId}`,
      { method: "DELETE", headers: getHeaders() },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
  },
};

// ============================================================
// DOCUMENT API
// ============================================================
export const documentApi = {
  // Upload file (multipart); visibilityStatus defaults to PRIVATE.
  upload: async (
    file,
    title,
    subjectId,
    userId,
    visibilityStatus = "PRIVATE",
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("subjectId", subjectId);
    formData.append("userId", userId);
    formData.append("visibilityStatus", visibilityStatus);

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: "POST",
      headers: {
        ...(localStorage.getItem("token")
          ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
          : {}),
      },
      body: formData, // Khong set Content-Type - browser tu set boundary
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const message = errorBody?.message || `Upload failed (HTTP ${res.status}).`;
      throw new Error(message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Load all documents in one subject for the current user Library view.
  getBySubject: async (subjectId) => {
    const res = await fetch(`${BASE_URL}/documents/subject/${subjectId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Cannot load subject documents (HTTP ${res.status}).`);
    }
    return res.json();
  },

  // Load public documents in one subject for the Home page.
  getPublicBySubject: async (subjectId) => {
    const res = await fetch(
      `${BASE_URL}/documents/subject/${subjectId}/public`,
      { headers: getHeaders() },
    );
    if (!res.ok) return [];
    return res.json();
  },

  // Load documents owned by one user for the Library page.
  getByUser: async (userId) => {
    const res = await fetch(`${BASE_URL}/documents/user/${userId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Cannot load user documents (HTTP ${res.status}).`);
    }
    return res.json();
  },

  // Load one document by ID.
  getById: async (documentId) => {
    const res = await fetch(`${BASE_URL}/documents/${documentId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  // Delete a document; BE also removes the file from storage.
  delete: async (documentId) => {
    const res = await fetch(`${BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.text();
  },

  // Update visibility; BE applies the state-transition rules:
  //   PRIVATE -> PENDING_REVIEW: submit admin review request.
  //   PUBLIC -> PRIVATE: immediate.
  //   PENDING_REVIEW -> anything except PRIVATE: rejected while pending (409).
  //   Cooldown: wait 1h before PRIVATE -> PENDING_REVIEW again (429).
  //   Applies after self-cancel, admin reject, or PUBLIC -> PRIVATE.
  updateVisibility: async (documentId, visibilityStatus) => {
    const res = await fetch(
      `${BASE_URL}/documents/${documentId}/visibility?visibilityStatus=${visibilityStatus}`,
      { method: "PATCH", headers: getHeaders() },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  // Rename display title without affecting visibility/cooldown.
  updateTitle: async (documentId, title) => {
    const res = await fetch(
      `${BASE_URL}/documents/${documentId}/title?title=${encodeURIComponent(title)}`,
      { method: "PATCH", headers: getHeaders() },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  // Share Document.
  // Create or reuse an ACTIVE share link; idempotent.
  createShareLink: async (documentId, userId = 1) => {
    const res = await fetch(
      `${BASE_URL}/documents/${documentId}/share?userId=${userId}`,
      { method: "POST", headers: getHeaders() },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json(); // { shareId, documentId, shareType, status, shareUrl }
  },

  // Revoke the ACTIVE share link.
  revokeShareLink: async (documentId, userId = 1) => {
    const res = await fetch(
      `${BASE_URL}/documents/${documentId}/share?userId=${userId}`,
      { method: "DELETE", headers: getHeaders() },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
  },

  // Load document by shareId; public and does not require auth.
  getByShareId: async (shareId) => {
    const res = await fetch(`${BASE_URL}/documents/share/${shareId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(
        err.message || "Share link not found or has been revoked.",
      );
      error.status = res.status;
      throw error;
    }
    return res.json();
  },


  shareWithUser: async (documentId, email, permission, ownerUserId = 1) => {
    const res = await fetch(`${BASE_URL}/documents/${documentId}/share/user`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, permission, ownerUserId }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`);
    return payload;
  },

  getSharesForDocument: async (documentId) => {
    const res = await fetch(`${BASE_URL}/documents/${documentId}/share/users`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  getSharedWithMe: async (userId = 1) => {
    const res = await fetch(`${BASE_URL}/documents/shared-with-me?userId=${userId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  revokeUserShare: async (shareId) => {
    const res = await fetch(`${BASE_URL}/documents/share/user/${shareId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  updateSharePermission: async (shareId, permission) => {
    const res = await fetch(
      `${BASE_URL}/documents/share/user/${shareId}/permission?permission=${permission}`,
      { method: "PATCH", headers: getHeaders() },
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`);
    return payload;
  },
  // AI Summarize (proxy sang Python service)
  getSummary: async (documentId, publicAccess = false) => {
    const path = publicAccess
      ? `${BASE_URL}/documents/public/${documentId}/summary`
      : `${BASE_URL}/documents/${documentId}/summary`;
    const res = await fetch(path, { headers: getHeaders() });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const error = new Error(payload?.message || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return payload;
  },

  summarize: async (documentId, _userId = null, maxChunks = null) => {
    const body = { documentId };
    if (maxChunks) {
      body.maxChunks = maxChunks;
    }

    const res = await fetch(`${BASE_URL}/documents/${documentId}/summarize`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        payload?.message || `Summarize failed with status ${res.status}`,
      );
    }
    return payload;
  },
};

// ============================================================
// COMMENT API
// ============================================================
export const commentApi = {
  getByDocument: async (documentId, { publicAccess = false, shareId = null } = {}) => {
    const path = shareId
      ? `${BASE_URL}/comments/share/${shareId}`
      : publicAccess
        ? `${BASE_URL}/comments/public/document/${documentId}`
        : `${BASE_URL}/comments/document/${documentId}`;
    const res = await fetch(path, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  create: async (userId, documentId, content) => {
    const res = await fetch(`${BASE_URL}/comments`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId, documentId, content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  delete: async (commentId, userId) => {
    const res = await fetch(`${BASE_URL}/comments/${commentId}?userId=${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  update: async (commentId, content) => {
    const res = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
