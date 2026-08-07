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

    // Trước đây chỗ này có cache 5 phút tự viết tay, nhưng không có nơi nào xoá cache
    // khi môn học hoặc học kỳ thay đổi. Hậu quả: admin sửa chương trình học xong thì
    // "All Majors" vẫn trả dữ liệu cũ tới 5 phút, trong khi chọn từng ngành lại đúng
    // ngay — vì getSemestersByMajor không hề cache. Bỏ cache để hai đường đi cùng
    // đọc một nguồn; chi phí đúng bằng nhánh theo ngành vốn vẫn chạy mỗi lần chọn.

    /** Lấy danh sách (semester_id -> List<subject_id>) từ SEMESTER_SUBJECT (link phụ) */
    private Map<Integer, List<Integer>> loadLinkedSubjectIds() {
        Map<Integer, List<Integer>> result = new HashMap<>();
        jdbcTemplate.query("SELECT semester_id, subject_id FROM dbo.SEMESTER_SUBJECT", rs -> {
            result.computeIfAbsent(rs.getInt("semester_id"), k -> new ArrayList<>())
                  .add(rs.getInt("subject_id"));
        });
        return result;
    }

    /**
     * Merge linked subjects vào subjectsBySemester map.
     *
     * Chống trùng phải xét trong phạm vi TỪNG học kỳ, không phải toàn hệ thống. SUBJECT
     * chỉ mang được một semester_id nên môn dùng chung (CSI106, PRF192, MLN111...) được
     * gán cho học kỳ của một ngành, rồi nối sang các ngành khác qua SEMESTER_SUBJECT.
     * Lọc theo tập toàn cục sẽ loại đúng những môn đó — vì chúng "đã tồn tại" ở ngành
     * chủ — khiến chương trình học của ngành khác trống gần hết.
     */
    private void mergeLinkedSubjects(Map<Integer, List<Subject>> subjectsBySemester) {
        Map<Integer, List<Integer>> linkedIds = loadLinkedSubjectIds();
        Map<Integer, Subject> allSubjects = subjectRepository.findAll().stream()
                .collect(Collectors.toMap(Subject::getSubjectId, s -> s, (a, b) -> a));
        linkedIds.forEach((semId, subIds) -> {
            List<Subject> existing = subjectsBySemester.computeIfAbsent(semId, k -> new ArrayList<>());
            Set<Integer> idsInThisSemester = existing.stream()
                    .map(Subject::getSubjectId).collect(Collectors.toSet());
            subIds.stream().filter(id -> !idsInThisSemester.contains(id))
                  .map(allSubjects::get).filter(s -> s != null)
                  .forEach(existing::add);
        });
    }

    public List<SemesterResponse> getAllSemesters() {
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