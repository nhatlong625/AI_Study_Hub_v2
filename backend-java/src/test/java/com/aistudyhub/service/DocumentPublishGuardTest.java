package com.aistudyhub.service;

import com.aistudyhub.entity.Document;
import com.aistudyhub.exception.ConflictException;
import com.aistudyhub.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Luật chặn tài liệu trùng ở bước xin duyệt công khai.
 * Chỉ mock DocumentRepository — phần còn lại của DocumentService không tham gia vào các nhánh này.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DocumentPublishGuardTest {

    private static final Integer DOC_ID = 101;
    private static final Integer SUBJECT_ID = 10;
    private static final String FILE_HASH = "a".repeat(64);

    @Mock
    private DocumentRepository documentRepository;

    @InjectMocks
    private DocumentService documentService;

    private Document doc;

    @BeforeEach
    void setUp() {
        doc = new Document();
        doc.setDocumentId(DOC_ID);
        doc.setUserId(1);
        doc.setSubjectId(SUBJECT_ID);
        doc.setDocumentName("sample.pdf");
        doc.setDocumentType("pdf");
        doc.setVisibilityStatus("PRIVATE");
        doc.setStatus("Active");
        doc.setFileHash(FILE_HASH);
        // updatedAt để null nhằm bỏ qua cooldown 1 tiếng, tập trung kiểm tra luật trùng lặp.
        doc.setUpdatedAt(null);

        when(documentRepository.findById(DOC_ID)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void submitForReview_whenSameFileAlreadyPublished_shouldReject() {
        when(documentRepository.existsPublishedDuplicate(FILE_HASH, DOC_ID)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> documentService.updateVisibility(DOC_ID, "PENDING_REVIEW"));

        assertTrue(ex.getMessage().contains("already been published"));
        assertEquals("PRIVATE", doc.getVisibilityStatus());
        verify(documentRepository, never()).save(any(Document.class));
    }

    @Test
    void submitForReview_whenSameContentRejectedInSubject_shouldReject() {
        when(documentRepository.existsPublishedDuplicate(FILE_HASH, DOC_ID)).thenReturn(false);
        when(documentRepository.existsRejectedContentInSubject(FILE_HASH, SUBJECT_ID)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> documentService.updateVisibility(DOC_ID, "PENDING_REVIEW"));

        assertTrue(ex.getMessage().contains("rejected for this subject"));
        assertEquals("PRIVATE", doc.getVisibilityStatus());
        verify(documentRepository, never()).save(any(Document.class));
    }

    @Test
    void submitForReview_whenContentIsNew_shouldPass() {
        when(documentRepository.existsPublishedDuplicate(FILE_HASH, DOC_ID)).thenReturn(false);
        when(documentRepository.existsRejectedContentInSubject(FILE_HASH, SUBJECT_ID)).thenReturn(false);

        documentService.updateVisibility(DOC_ID, "PENDING_REVIEW");

        assertEquals("PENDING_REVIEW", doc.getVisibilityStatus());
        verify(documentRepository).save(doc);
    }

    /** Rút về riêng tư là thao tác của chính chủ, không phải công bố nên không cần kiểm tra trùng. */
    @Test
    void switchingBackToPrivate_shouldNotRunDuplicateChecks() {
        doc.setVisibilityStatus("PUBLIC");

        documentService.updateVisibility(DOC_ID, "PRIVATE");

        assertEquals("PRIVATE", doc.getVisibilityStatus());
        verify(documentRepository, never()).existsPublishedDuplicate(anyString(), anyInt());
        verify(documentRepository, never()).existsRejectedContentInSubject(anyString(), anyInt());
    }

    /**
     * Tài liệu cũ chưa có hash và cũng không tải lại được nội dung thì cho đi tiếp,
     * để luồng duyệt thường quyết định thay vì chặn oan.
     */
    @Test
    void submitForReview_whenHashUnavailable_shouldNotBlock() {
        doc.setFileHash(null);
        doc.setDocumentUrl(null);

        documentService.updateVisibility(DOC_ID, "PENDING_REVIEW");

        assertEquals("PENDING_REVIEW", doc.getVisibilityStatus());
        verify(documentRepository, never()).existsPublishedDuplicate(anyString(), anyInt());
    }
}
