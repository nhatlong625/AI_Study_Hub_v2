package com.aistudyhub.dto.response;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class LibrarySemesterResponse {
    private Integer semesterId;
    private String semesterName;
    private List<LibrarySubjectResponse> subjects = new ArrayList<>();
}
