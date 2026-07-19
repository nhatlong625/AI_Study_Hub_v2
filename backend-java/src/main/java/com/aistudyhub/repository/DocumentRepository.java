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
                   s.subject_id AS subjectId,
                   s.subject_code AS subjectCode,
                   s.subject_name AS subjectName,
                   s.description AS description,
                   CASE WHEN COUNT(us.user_subject_id) > 0 THEN 1 ELSE 0 END AS added,
                   COUNT(d.document_id) AS documentCount,
                   COALESCE(SUM(d.document_size), 0) AS totalStorageBytes,
                   MAX(d.created_at) AS latestDocumentAt
            FROM SUBJECT s
            JOIN SEMESTER sem ON sem.semester_id = s.semester_id
            LEFT JOIN USER_SUBJECT us ON us.subject_id = s.subject_id
                AND us.user_id = :userId
            LEFT JOIN DOCUMENT d ON d.subject_id = s.subject_id
                AND d.user_id = :userId
                AND us.user_subject_id IS NOT NULL
                AND LOWER(d.document_name) NOT LIKE 'mock-%'
            GROUP BY sem.semester_id, sem.semester_name,
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
    List<Document> findByStatus(String status);
    List<Document> findBySubjectIdAndVisibilityStatus(Integer subjectId, String visibilityStatus);
    List<Document> findByVisibilityStatus(String visibilityStatus);
}
