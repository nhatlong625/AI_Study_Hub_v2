package com.aistudyhub.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TrashDocumentResponse {
    private Integer documentId;
    private Integer userId;
    private Integer subjectId;
    private String title;
    private String documentName;
    private String documentType;
    private Long documentSize;
    private String ownerName;
    private String ownerEmail;
    private String subjectName;
    private String semesterName;
    private LocalDateTime deletedAt;
    private LocalDateTime purgeAt;
    private long remainingDays;
    private String deletedByRole;
}
