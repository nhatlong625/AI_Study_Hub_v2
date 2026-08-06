package com.aistudyhub.dto.response;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserSubjectResponse {
    private Integer userSubjectId;
    private Integer userId;
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    /** Tổng tài liệu đang chiếm chỗ của môn (bỏ thùng rác). */
    private long documentCount;
    /** Trong số đó, bao nhiêu tài liệu user đã thực sự học: nộp quiz xong hoặc đã hỏi AI. */
    private long studiedDocumentCount;
    /** Lần học gần nhất của môn — null nghĩa là chưa từng động tới. */
    private LocalDateTime lastStudiedAt;
    private LocalDateTime addedAt;
}
