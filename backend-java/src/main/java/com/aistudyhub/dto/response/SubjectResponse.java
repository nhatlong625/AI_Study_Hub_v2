package com.aistudyhub.dto.response;
import lombok.Data;
@Data
public class SubjectResponse {
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String description;
    private int documentCount;
    private Integer recentDocId;
    private String recentDocTitle;
    private String recentDocName;
    private String recentDocType;
    private String recentDocUrl;
    private String recentDocUploadedAt;
}
