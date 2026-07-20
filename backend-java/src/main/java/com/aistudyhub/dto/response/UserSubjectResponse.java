package com.aistudyhub.dto.response;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserSubjectResponse {
    private Integer userSubjectId;
    private Integer userId;
    private Integer subjectId;
    private LocalDateTime addedAt;
}
