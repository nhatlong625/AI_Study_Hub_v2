package com.aistudyhub.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class LibrarySubjectResponse {
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String description;
    private boolean added;
    private long documentCount;
    private long totalStorageBytes;
    private LocalDateTime latestDocumentAt;
    private List<DocumentResponse> documents = new ArrayList<>();
}
