package com.aistudyhub.service;

import com.aistudyhub.dto.response.*;
import com.aistudyhub.entity.*;
import com.aistudyhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository semesterRepository;
    private final SubjectRepository subjectRepository;
    private final DocumentRepository documentRepository;

    private List<SemesterResponse> cachedSemesters = null;
    private long lastCacheTime = 0;
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    public List<SemesterResponse> getAllSemesters() {
        if (cachedSemesters != null && System.currentTimeMillis() - lastCacheTime < CACHE_DURATION_MS) {
            return cachedSemesters;
        }

        Map<Integer, DocumentRepository.PublicSubjectStats> publicStatsBySubject =
                documentRepository.findPublicSubjectStats().stream()
                        .collect(Collectors.toMap(
                                DocumentRepository.PublicSubjectStats::getSubjectId,
                                stats -> stats,
                                (existing, replacement) -> existing)); // Handle duplicates if any

        Map<Integer, List<Subject>> subjectsBySemester = subjectRepository.findAll()
                .stream()
                .collect(Collectors.groupingBy(Subject::getSemesterId));

        List<SemesterResponse> response = semesterRepository.findAll().stream().map(sem -> {
            SemesterResponse res = new SemesterResponse();
            res.setSemesterId(sem.getSemesterId());
            res.setSemesterName(sem.getSemesterName());

            List<Subject> semesterSubjects = subjectsBySemester.getOrDefault(sem.getSemesterId(), List.of());
            
            List<SubjectResponse> subjects = semesterSubjects.stream().map(sub -> {
                SubjectResponse sr = new SubjectResponse();
                sr.setSubjectId(sub.getSubjectId());
                sr.setSubjectCode(sub.getSubjectCode() != null && !sub.getSubjectCode().isBlank()
                        ? sub.getSubjectCode()
                        : "SUB-" + sub.getSubjectId());
                sr.setSubjectName(sub.getSubjectName());
                sr.setDescription(sub.getDescription());

                DocumentRepository.PublicSubjectStats stats = publicStatsBySubject.get(sub.getSubjectId());
                if (stats != null) {
                    sr.setDocumentCount(stats.getDocumentCount() == null ? 0 : stats.getDocumentCount().intValue());
                    sr.setRecentDocId(stats.getRecentDocId());
                    sr.setRecentDocTitle(stats.getRecentDocTitle());
                    sr.setRecentDocName(stats.getRecentDocName());
                    sr.setRecentDocType(stats.getRecentDocType());
                    sr.setRecentDocUrl(null);
                    sr.setRecentDocUploadedAt(stats.getRecentDocUploadedAt() == null ? null : stats.getRecentDocUploadedAt().toString());
                }
                return sr;
            }).collect(Collectors.toList());

            res.setSubjects(subjects);
            return res;
        }).collect(Collectors.toList());

        this.cachedSemesters = response;
        this.lastCacheTime = System.currentTimeMillis();
        return response;
    }
}
