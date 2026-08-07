package com.aistudyhub.repository;
import com.aistudyhub.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {
    interface LibrarySubjectStats {
        Integer getSemesterId();
        String getSemesterName();
        Integer getMajorId();
        String getMajorName();
        Integer getSubjectId();
        String getSubjectCode();
        String getSubjectName();
        String getDescription();
        Integer getAdded();
        Long getDocumentCount();
        Long getTotalStorageBytes();
        LocalDateTime getLatestDocumentAt();
    }

    interface PublicSubjectStats {
        Integer getSubjectId();
        Long getDocumentCount();
        Integer getRecentDocId();
        String getRecentDocTitle();
        String getRecentDocName();
        String getRecentDocType();
        String getRecentDocUrl();
        LocalDateTime getRecentDocUploadedAt();
    }

    @Query(value = """
            SELECT sem.semester_id AS semesterId,
                   sem.semester_name AS semesterName,
                   sem.major_id AS majorId,
                   m.major_name AS majorName,
                   s.subject_id AS subjectId,
                   s.subject_code AS subjectCode,
                   s.subject_name AS subjectName,
                   s.description AS description,
                   CASE WHEN COUNT(us.user_subject_id) > 0 THEN 1 ELSE 0 END AS added,
                   COUNT(d.document_id) AS documentCount,
                   COALESCE(SUM(d.document_size), 0) AS totalStorageBytes,
                   MAX(d.created_at) AS latestDocumentAt
            FROM SUBJECT s
            -- Môn dùng chung (CSI106, PRF192, MLN111...) chỉ mang được một semester_id
            -- nên nó thuộc học kỳ của ngành chủ, rồi nối sang ngành khác qua
            -- SEMESTER_SUBJECT. Bám theo s.semester_id thôi thì sinh viên IA thêm CSI106
            -- sẽ thấy nó nằm dưới học kỳ của ngành chủ, kèm nhãn ngành sai.
            -- CROSS APPLY chọn đúng MỘT học kỳ, ưu tiên học kỳ thuộc ngành của người
            -- dùng; lấy cả tập rồi lọc sau sẽ nhân dòng lên theo số ngành có liên kết.
            CROSS APPLY (
                SELECT TOP 1 sm.semester_id, sm.semester_name, sm.major_id
                FROM SEMESTER sm
                WHERE sm.semester_id = s.semester_id
                   OR sm.semester_id IN (
                        SELECT ss.semester_id FROM SEMESTER_SUBJECT ss
                        WHERE ss.subject_id = s.subject_id)
                ORDER BY CASE WHEN sm.major_id =
                                   (SELECT major_id FROM [USER] WHERE user_id = :userId)
                              THEN 0 ELSE 1 END,
                         sm.semester_id
            ) sem
            -- LEFT JOIN: học kỳ dùng chung cho mọi ngành có major_id NULL.
            LEFT JOIN MAJOR m ON m.major_id = sem.major_id
            LEFT JOIN USER_SUBJECT us ON us.subject_id = s.subject_id
                AND us.user_id = :userId
            LEFT JOIN DOCUMENT d ON d.subject_id = s.subject_id
                AND d.user_id = :userId
                AND us.user_subject_id IS NOT NULL
                AND d.deleted_at IS NULL
                AND LOWER(d.document_name) NOT LIKE 'mock-%'
            GROUP BY sem.semester_id, sem.semester_name, sem.major_id, m.major_name,
                     s.subject_id, s.subject_code, s.subject_name, s.description
            ORDER BY sem.semester_id, s.subject_name
            """, nativeQuery = true)
    List<LibrarySubjectStats> findLibraryStatsByUserId(@Param("userId") Integer userId);

    @Query(value = """
            WITH ranked_public_documents AS (
                SELECT d.subject_id,
                       d.document_id,
                       d.title,
                       d.document_name,
                       d.document_type,
                       d.document_url,
                       d.uploaded_at,
                       d.created_at,
                       ROW_NUMBER() OVER (
                           PARTITION BY d.subject_id
                           ORDER BY COALESCE(d.uploaded_at, d.created_at) DESC, d.document_id DESC
                       ) AS rn
                FROM DOCUMENT d
                WHERE d.visibility_status = 'PUBLIC'
                  AND d.status = 'Active'
                  AND d.deleted_at IS NULL
                  AND LOWER(d.document_name) NOT LIKE 'mock-%'
            )
            SELECT s.subject_id AS subjectId,
                   COUNT(d.document_id) AS documentCount,
                   recent.document_id AS recentDocId,
                   recent.title AS recentDocTitle,
                   recent.document_name AS recentDocName,
                   recent.document_type AS recentDocType,
                   recent.document_url AS recentDocUrl,
                   COALESCE(recent.uploaded_at, recent.created_at) AS recentDocUploadedAt
            FROM SUBJECT s
            LEFT JOIN DOCUMENT d ON d.subject_id = s.subject_id
                AND d.visibility_status = 'PUBLIC'
                AND d.status = 'Active'
                AND d.deleted_at IS NULL
                AND LOWER(d.document_name) NOT LIKE 'mock-%'
            LEFT JOIN ranked_public_documents recent ON recent.subject_id = s.subject_id
                AND recent.rn = 1
            GROUP BY s.subject_id,
                     recent.document_id,
                     recent.title,
                     recent.document_name,
                     recent.document_type,
                     recent.document_url,
                     recent.uploaded_at,
                     recent.created_at
            """, nativeQuery = true)
    List<PublicSubjectStats> findPublicSubjectStats();

    List<Document> findBySubjectId(Integer subjectId);
    List<Document> findByUserId(Integer userId);
    List<Document> findByUserIdAndSubjectId(Integer userId, Integer subjectId);
    List<Document> findBySubjectIdAndDeletedAtIsNull(Integer subjectId);
    List<Document> findByUserIdAndDeletedAtIsNull(Integer userId);
    List<Document> findByUserIdAndSubjectIdAndDeletedAtIsNull(Integer userId, Integer subjectId);
    List<Document> findByUserIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(Integer userId);
    List<Document> findByDeletedAtIsNotNullOrderByDeletedAtDesc();
    List<Document> findByDeletedAtBefore(LocalDateTime cutoff);
    List<Document> findByStatus(String status);
    List<Document> findBySubjectIdAndVisibilityStatus(Integer subjectId, String visibilityStatus);
    List<Document> findBySubjectIdAndVisibilityStatusAndDeletedAtIsNull(Integer subjectId, String visibilityStatus);
    List<Document> findByVisibilityStatus(String visibilityStatus);
    List<Document> findByVisibilityStatusAndDeletedAtIsNull(String visibilityStatus);

    /**
     * Đã có tài liệu khác cùng nội dung đang công khai (hoặc đang chờ duyệt) chưa.
     * Loại chính tài liệu đang xét ra để việc nộp lại sau khi bị từ chối không tự chặn mình.
     */
    @Query("""
            SELECT COUNT(d) > 0 FROM Document d
            WHERE d.fileHash = :fileHash
              AND d.documentId <> :excludeDocumentId
              AND d.deletedAt IS NULL
              AND d.visibilityStatus IN ('PUBLIC', 'PENDING_REVIEW')
            """)
    boolean existsPublishedDuplicate(@Param("fileHash") String fileHash,
                                     @Param("excludeDocumentId") Integer excludeDocumentId);

    /**
     * Nội dung này đã từng bị từ chối duyệt trong cùng môn học chưa.
     * Giới hạn theo môn vì AI chấm điểm mức liên quan của tài liệu với môn được gán —
     * cùng một file có thể không hợp môn này nhưng hợp môn khác.
     */
    @Query(value = """
            SELECT CAST(CASE WHEN EXISTS (
                SELECT 1
                FROM DOCUMENT d
                JOIN PUBLIC_REVIEW_LOG l ON l.document_id = d.document_id
                WHERE d.file_hash = :fileHash
                  AND d.subject_id = :subjectId
                  AND l.review_status IN ('REJECTED', 'ADMIN_REJECTED')
            ) THEN 1 ELSE 0 END AS BIT)
            """, nativeQuery = true)
    boolean existsRejectedContentInSubject(@Param("fileHash") String fileHash,
                                           @Param("subjectId") Integer subjectId);
}
