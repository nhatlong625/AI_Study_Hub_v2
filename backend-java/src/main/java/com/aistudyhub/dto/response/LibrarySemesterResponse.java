package com.aistudyhub.dto.response;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class LibrarySemesterResponse {
    private Integer semesterId;
    private String semesterName;
    // Ngành sở hữu học kỳ. NULL nghĩa là kỳ dùng chung cho mọi ngành.
    private Integer majorId;
    private String majorName;
    private List<LibrarySubjectResponse> subjects = new ArrayList<>();
}
