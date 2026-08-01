package com.aistudyhub.repository;

import com.aistudyhub.entity.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface DocumentShareRepository extends JpaRepository<DocumentShare, Integer> {

    // Tìm link ACTIVE của 1 document — dùng findFirst để tránh lỗi nếu có >1 record ACTIVE
    Optional<DocumentShare> findFirstByDocumentIdAndShareTypeAndStatus(
            Integer documentId, String shareType, String status);

    // Tìm tất cả ACTIVE của 1 document — dùng khi revoke (set hết thành REVOKED)
    List<DocumentShare> findAllByDocumentIdAndShareTypeAndStatus(
            Integer documentId, String shareType, String status);

    // Resolve link public GET /share/{shareToken} → document
    Optional<DocumentShare> findByShareTokenAndStatus(String shareToken, String status);

    @Transactional
    void deleteByDocumentId(Integer documentId);

    List<DocumentShare> findAllBySharedToUserIdAndShareTypeAndStatus(Integer sharedToUserId, String shareType, String status);

    Optional<DocumentShare> findFirstByDocumentIdAndSharedToUserIdAndShareTypeAndStatus(Integer documentId, Integer sharedToUserId, String shareType, String status);
}
