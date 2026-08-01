package com.aistudyhub.repository;

import com.aistudyhub.entity.PublicReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublicReviewLogRepository extends JpaRepository<PublicReviewLog, Integer> {

    Optional<PublicReviewLog> findTopByDocumentIdOrderByCreatedAtDesc(Integer documentId);

    List<PublicReviewLog> findByDocumentIdOrderByCreatedAtDesc(Integer documentId);

    List<PublicReviewLog> findByReviewStatusOrderByCreatedAtDesc(String reviewStatus);
}
