package com.aistudyhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PUBLIC_REVIEW_LOG")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PublicReviewLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Integer logId;

    @Column(name = "document_id", nullable = false)
    private Integer documentId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "relevance_score", precision = 5, scale = 2)
    private BigDecimal relevanceScore;

    @Column(name = "ai_reasoning", length = 2000)
    private String aiReasoning;

    @Column(name = "ai_summary", columnDefinition = "NVARCHAR(MAX)")
    private String aiSummary;

    @Column(name = "review_status", length = 30, nullable = false)
    private String reviewStatus;

    @Column(name = "reviewed_by")
    private Integer reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
