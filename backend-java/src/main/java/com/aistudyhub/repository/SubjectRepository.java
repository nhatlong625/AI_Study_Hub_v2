package com.aistudyhub.repository;
import com.aistudyhub.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface SubjectRepository extends JpaRepository<Subject, Integer> {
    List<Subject> findBySemesterId(Integer semesterId);
}
