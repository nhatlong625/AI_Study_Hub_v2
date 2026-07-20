package com.aistudyhub.dto.response;
import lombok.Data;
import java.util.List;
@Data
public class SemesterResponse {
    private Integer semesterId;
    private String semesterName;
    private List<SubjectResponse> subjects;
}
