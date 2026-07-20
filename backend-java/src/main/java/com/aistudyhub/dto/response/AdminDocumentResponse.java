package com.aistudyhub.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO cho trang Admin duyệt document (B2).
 * Join sẵn tên subject/semester/uploader để FE không phải gọi thêm API khác.
 */
@Data
public class AdminDocumentResponse {
    private Integer documentId;
    private String title;
    private String documentName;
    private String documentType;   // extension viết hoa, vd "PDF" — FE dùng để chọn màu badge
    private Long documentSizeBytes;
    private String documentSizeLabel; // đã format sẵn, vd "4.2 MB"
    private String documentUrl;       // absolute URL — dùng cho preview/download

    private Integer subjectId;
    private String subjectName;
    private Integer semesterId;
    private String semesterName;

    private Integer userId;
    private String uploaderName;
    private String uploaderEmail;

    private String visibilityStatus;
    private LocalDateTime uploadedAt;
    private LocalDateTime updatedAt;
}
