package com.aistudyhub.repository;
import com.aistudyhub.entity.UserSubject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserSubjectRepository extends JpaRepository<UserSubject, Integer> {
    List<UserSubject> findByUserId(Integer userId);
    boolean existsByUserIdAndSubjectId(Integer userId, Integer subjectId);
    void deleteByUserIdAndSubjectId(Integer userId, Integer subjectId);
}
