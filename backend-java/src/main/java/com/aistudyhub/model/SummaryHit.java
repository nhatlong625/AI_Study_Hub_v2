package com.aistudyhub.model;

/** Một bản tóm tắt (AI_SUMMARY) khớp với câu hỏi, kèm điểm liên quan (score) sau khi chấm. */
public record SummaryHit(
        Integer documentId,
        String documentName,
        String title,
        Integer subjectId,
        String subjectCode,
        String subjectName,
        String summaryContent,
        String summaryStatus,
        String summaryError,
        String visibilityStatus,
        Double score
) {
    public SummaryHit withScore(Double score) {
        return new SummaryHit(
                documentId, documentName, title, subjectId, subjectCode, subjectName,
                summaryContent, summaryStatus, summaryError, visibilityStatus, score
        );
    }
}
