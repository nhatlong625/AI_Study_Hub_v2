package com.aistudyhub.service;

import com.aistudyhub.dto.response.LibraryOverviewResponse;
import com.aistudyhub.dto.response.LibrarySemesterResponse;
import com.aistudyhub.dto.response.LibrarySubjectResponse;
import com.aistudyhub.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LibraryService {
    private final DocumentRepository documentRepository;
    private final PlanQuotaService planQuotaService;

    @Transactional(readOnly = true)
    public LibraryOverviewResponse getOverview(Integer userId) {
        LibraryOverviewResponse response = new LibraryOverviewResponse();

        // Max storage = the quota in force for the user's plan (grandfathered for paid plans,
        // always the active version for Basic). See PlanQuotaService.
        response.setMaxStorageBytes(planQuotaService.getQuota(userId).maxStorageBytes());

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
