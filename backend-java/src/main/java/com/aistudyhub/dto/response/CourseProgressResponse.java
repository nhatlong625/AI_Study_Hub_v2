package com.aistudyhub.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tiến độ học của một môn: đã đọc bao nhiêu trên tổng số tài liệu của môn đó.
 *
 * Trả về cả tử số lẫn mẫu số chứ không chỉ phần trăm, để UI giải thích được
 * con số — "60%" một mình không cho biết 60% của cái gì.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseProgressResponse {
    private Integer subjectId;
    private int totalDocuments;
    private int readDocuments;
    private int progressPercent;
}
