package com.aistudyhub.service;

import com.aistudyhub.entity.Document;
import com.aistudyhub.entity.Subject;
import com.aistudyhub.repository.DocumentRepository;
import com.aistudyhub.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final DocumentRepository documentRepository;
    private final DocumentService documentService;

    public List<Subject> getBySemester(Integer semesterId) {
        return subjectRepository.findBySemesterId(semesterId);
    }

    @Transactional
    public Subject addSubject(Integer semesterId, String name, String subjectCode, String description) {
        Subject s = new Subject();
        s.setSemesterId(semesterId);
        s.setSubjectName(name);
        s.setSubjectCode(subjectCode);
        s.setDescription(description);
        s.setCreatedAt(LocalDateTime.now());
        return subjectRepository.save(s);
    }

    @Transactional
    public void deleteSubject(Integer subjectId) {
        // 1. Lấy tất cả documents của subject
        List<Document> docs = documentRepository.findBySubjectId(subjectId);

        // 2. Xóa từng file trên Supabase
        for (Document doc : docs) documentService.deleteStoredFile(doc);

        // 3. Xóa documents trong DB
        documentRepository.deleteAll(docs);

        // 4. Xóa subject
        subjectRepository.deleteById(subjectId);
    }
}
