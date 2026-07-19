package com.aistudyhub.service;

import com.aistudyhub.dto.response.LibraryOverviewResponse;
import com.aistudyhub.dto.response.LibrarySemesterResponse;
import com.aistudyhub.dto.response.LibrarySubjectResponse;
import com.aistudyhub.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LibraryService {
    private final DocumentRepository documentRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public LibraryOverviewResponse getOverview(Integer userId) {
        LibraryOverviewResponse response = new LibraryOverviewResponse();
        
        Integer maxStorageMb;
        try {
            maxStorageMb = jdbcTemplate.queryForObject("""
                    SELECT TOP 1 pv.max_storage
                    FROM dbo.USER_SUBSCRIPTION us
                    JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.version_id = us.version_id
                    WHERE us.user_id = ? AND us.status = 'Active'
                    ORDER BY us.end_date DESC, us.subscription_id DESC
                    """, Integer.class, userId);
        } catch (Exception e) {
            maxStorageMb = 1024;
        }
        if (maxStorageMb == null) maxStorageMb = 1024;
        response.setMaxStorageBytes(maxStorageMb * 1024L * 1024L);

        Map<Integer, LibrarySemesterResponse> semesters = new LinkedHashMap<>();

        for (DocumentRepository.LibrarySubjectStats row : documentRepository.findLibraryStatsByUserId(userId)) {
            LibrarySemesterResponse semester = semesters.computeIfAbsent(row.getSemesterId(), id -> {
                LibrarySemesterResponse item = new LibrarySemesterResponse();
                item.setSemesterId(id);
                item.setSemesterName(row.getSemesterName());
                return item;
            });

            LibrarySubjectResponse subject = new LibrarySubjectResponse();
            subject.setSubjectId(row.getSubjectId());
            subject.setSubjectCode(row.getSubjectCode() == null || row.getSubjectCode().isBlank()
                    ? "SUB-" + row.getSubjectId() : row.getSubjectCode());
            subject.setSubjectName(row.getSubjectName());
            subject.setDescription(row.getDescription());
            subject.setAdded(row.getAdded() != null && row.getAdded() == 1);
            subject.setDocumentCount(value(row.getDocumentCount()));
            subject.setTotalStorageBytes(value(row.getTotalStorageBytes()));
            subject.setLatestDocumentAt(row.getLatestDocumentAt());
            semester.getSubjects().add(subject);

            response.setTotalFiles(response.getTotalFiles() + subject.getDocumentCount());
            response.setTotalStorageBytes(response.getTotalStorageBytes() + subject.getTotalStorageBytes());
        }

        response.setSemesters(semesters.values().stream().toList());
        return response;
    }

    private long value(Long number) {
        return number == null ? 0 : number;
    }
}
