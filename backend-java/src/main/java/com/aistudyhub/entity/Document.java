package com.aistudyhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "DOCUMENT")
@Data @NoArgsConstructor @AllArgsConstructor
public class Document {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Integer documentId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "subject_id")
    private Integer subjectId;

    @Column(name = "title")
    private String title;

    @Column(name = "document_name")
    private String documentName;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "document_size")
    private Long documentSize;

    @Column(name = "document_url", length = 1000)
    private String documentUrl;

    @Column(name = "visibility_status", length = 20)
    private String visibilityStatus;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "summary_status", length = 30)
    private String summaryStatus;

    @Column(name = "summary_error", length = 500)
    private String summaryError;

    @Column(name = "summary_updated_at")
    private LocalDateTime summaryUpdatedAt;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
