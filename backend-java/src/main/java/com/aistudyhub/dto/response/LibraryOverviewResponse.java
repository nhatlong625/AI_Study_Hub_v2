package com.aistudyhub.dto.response;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class LibraryOverviewResponse {
    private long totalFiles;
    private long totalStorageBytes;
    private long maxStorageBytes;
    private List<LibrarySemesterResponse> semesters = new ArrayList<>();
}
