package com.aistudyhub.dto.response;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class DocumentResponse {
    private Integer documentId;
    private Integer userId;
    private Integer subjectId;
    private String title;
    private String documentName;
    private String documentType;
    private Long documentSize;
    private String documentUrl;
    private String visibilityStatus;
    private String status;
    private String summaryStatus;
    private String summaryError;
    private LocalDateTime summaryUpdatedAt;
    private LocalDateTime uploadedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
