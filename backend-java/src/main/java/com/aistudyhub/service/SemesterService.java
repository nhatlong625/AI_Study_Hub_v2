package com.aistudyhub.service;

import com.aistudyhub.dto.response.*;
import com.aistudyhub.entity.*;
import com.aistudyhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository semesterRepository;
    private final SubjectRepository subjectRepository;
    private final DocumentRepository documentRepository;
    private final JdbcTemplate jdbcTemplate;

    private List<SemesterResponse> cachedSemesters = null;
    private long lastCacheTime = 0;
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    /** Lấy danh sách (semester_id -> List<subject_id>) từ SEMESTER_SUBJECT (link phụ) */
    private Map<Integer, List<Integer>> loadLinkedSubjectIds() {
        Map<Integer, List<Integer>> result = new HashMap<>();
        jdbcTemplate.query("SELECT semester_id, subject_id FROM dbo.SEMESTER_SUBJECT", rs -> {
            result.computeIfAbsent(rs.getInt("semester_id"), k -> new ArrayList<>())
                  .add(rs.getInt("subject_id"));
        });
        return result;
    }

    /** Merge linked subjects vào subjectsBySemester map */
    private void mergeLinkedSubjects(Map<Integer, List<Subject>> subjectsBySemester) {
        Map<Integer, List<Integer>> linkedIds = loadLinkedSubjectIds();
        Map<Integer, Subject> allSubjects = subjectRepository.findAll().stream()
                .collect(Collectors.toMap(Subject::getSubjectId, s -> s, (a, b) -> a));
        Set<Integer> existingIds = subjectsBySemester.values().stream()
                .flatMap(List::stream).map(Subject::getSubjectId).collect(Collectors.toSet());
        linkedIds.forEach((semId, subIds) -> {
            List<Subject> existing = subjectsBySemester.computeIfAbsent(semId, k -> new ArrayList<>());
            subIds.stream().filter(id -> !existingIds.contains(id))
                  .map(allSubjects::get).filter(s -> s != null)
                  .forEach(existing::add);
        });
    }

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

        mergeLinkedSubjects(subjectsBySemester);

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

    public List<SemesterResponse> getSemestersByMajor(Integer majorId) {
        if (majorId == null || majorId <= 0) {
            return getAllSemesters();
        }

        Map<Integer, DocumentRepository.PublicSubjectStats> publicStatsBySubject =
                documentRepository.findPublicSubjectStats().stream()
                        .collect(Collectors.toMap(
                                DocumentRepository.PublicSubjectStats::getSubjectId,
                                stats -> stats,
                                (existing, replacement) -> existing));

        Map<Integer, List<Subject>> subjectsBySemester = subjectRepository.findAll()
                .stream()
                .collect(Collectors.groupingBy(Subject::getSemesterId));
        mergeLinkedSubjects(subjectsBySemester);

        List<Semester> filteredSemesters = semesterRepository.findAll().stream()
                .filter(sem -> sem.getMajorId() == null || sem.getMajorId().equals(majorId))
                .collect(Collectors.toList());

        return filteredSemesters.stream().map(sem -> {
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
    }
}