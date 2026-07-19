package com.aistudyhub.service;

import com.aistudyhub.dto.response.UserSubjectResponse;
import com.aistudyhub.entity.UserSubject;
import com.aistudyhub.exception.ConflictException;
import com.aistudyhub.repository.UserSubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserSubjectService {

    private final UserSubjectRepository userSubjectRepository;

    public List<UserSubjectResponse> getByUser(Integer userId) {
        return userSubjectRepository.findByUserId(userId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    /** Add từ modal Create Course — báo lỗi nếu user đã add môn này rồi. */
    @Transactional
    public UserSubjectResponse add(Integer userId, Integer subjectId) {
        if (userSubjectRepository.existsByUserIdAndSubjectId(userId, subjectId)) {
            throw new ConflictException("Subject already added to this user's Library.");
        }
        return toDto(save(userId, subjectId));
    }

    /**
     * Gọi từ DocumentService khi upload — đảm bảo subject luôn có mặt trong
     * Library dù user upload trực tiếp mà không qua modal Create Course.
     * Idempotent, không throw nếu đã tồn tại.
     */
    @Transactional
    public void ensureAdded(Integer userId, Integer subjectId) {
        if (!userSubjectRepository.existsByUserIdAndSubjectId(userId, subjectId)) {
            save(userId, subjectId);
        }
    }

    /**
     * Chỉ xóa link USER_SUBJECT — KHÔNG xóa document. Việc xóa document phải
     * gọi từ DocumentService.deleteAllByUserAndSubject() trước (ở Controller),
     * vì DocumentService đã phụ thuộc UserSubjectService (ensureAdded) —
     * để service này gọi ngược lại DocumentService sẽ tạo circular dependency.
     */
    @Transactional
    public void removeLink(Integer userId, Integer subjectId) {
        userSubjectRepository.deleteByUserIdAndSubjectId(userId, subjectId);
    }

    private UserSubject save(Integer userId, Integer subjectId) {
        UserSubject us = new UserSubject();
        us.setUserId(userId);
        us.setSubjectId(subjectId);
        us.setAddedAt(LocalDateTime.now());
        return userSubjectRepository.save(us);
    }

    private UserSubjectResponse toDto(UserSubject us) {
        UserSubjectResponse r = new UserSubjectResponse();
        r.setUserSubjectId(us.getUserSubjectId());
        r.setUserId(us.getUserId());
        r.setSubjectId(us.getSubjectId());
        r.setAddedAt(us.getAddedAt());
        return r;
    }
}
