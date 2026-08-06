package com.aistudyhub.service;

import com.aistudyhub.dto.python.PythonDocumentSummarizeRequest;
import com.aistudyhub.dto.request.DocumentSummarizeRequest;
import com.aistudyhub.dto.request.ShareWithUserRequest;
import com.aistudyhub.dto.response.DocumentResponse;
import com.aistudyhub.dto.response.DocumentSummarizeResponse;
import com.aistudyhub.entity.Document;
import com.aistudyhub.exception.BadRequestException;
import com.aistudyhub.exception.ConflictException;
import com.aistudyhub.exception.ResourceNotFoundException;
import com.aistudyhub.exception.TooManyRequestsException;
import com.aistudyhub.dto.response.AdminDocumentResponse;
import com.aistudyhub.dto.response.DocumentShareResponse;
import com.aistudyhub.dto.response.UserShareResponse;
import com.aistudyhub.dto.response.TrashDocumentResponse;
import com.aistudyhub.entity.DocumentShare;
import com.aistudyhub.entity.User;
import com.aistudyhub.event.DocumentUploadedEvent;
import com.aistudyhub.repository.AiSummaryRepository;
import com.aistudyhub.repository.DocumentShareRepository;
import com.aistudyhub.repository.DocumentRepository;
import com.aistudyhub.repository.PublicReviewLogRepository;
import com.aistudyhub.entity.PublicReviewLog;
import com.aistudyhub.repository.SemesterRepository;
import com.aistudyhub.repository.SubjectRepository;
import com.aistudyhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {

    /* Section */
    private static final Set<String> SUMMARIZABLE_TYPES = Set.of("txt", "md", "csv", "pdf", "docx", "pptx");
    private static final Pattern UNSAFE_OBJECT_NAME_CHARS = Pattern.compile("[^a-zA-Z0-9._-]");
    private static final String SUMMARY_PENDING = "PENDING";
    private static final String SUMMARY_PROCESSING = "PROCESSING";
    private static final String SUMMARY_COMPLETED = "COMPLETED";
    private static final String SUMMARY_FAILED = "FAILED";
    private static final String SUMMARY_UNSUPPORTED = "UNSUPPORTED";

    private final DocumentRepository documentRepository;
    private final AiSummaryRepository aiSummaryRepository;
    private final UserSubjectService userSubjectService;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;
    private final DocumentShareRepository documentShareRepository;
    private final PublicReviewLogRepository publicReviewLogRepository;
    private final WebClient supabaseWebClient;
    private final StorageSettingsService storageSettingsService;
    private final CloudflareR2StorageService cloudflareR2StorageService;
    private final WebClient pythonAiWebClient;
    private final EmailService emailService;
    private final JdbcTemplate jdbcTemplate;
    private final PlanQuotaService planQuotaService;
    private final DocumentConversionService documentConversionService;
    private final ApplicationEventPublisher eventPublisher;
    private final com.aistudyhub.security.CurrentUser currentUser;

    public record DocumentFile(String fileName, MediaType mediaType, byte[] bytes) {}
    private record UploadPayload(String fileName, String documentType, MediaType mediaType, byte[] bytes) {}

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    @Value("${supabase.bucket}")
    private String bucket;

    @Value("${supabase.url}")
    private String supabaseUrl;

    // Normalized note.
    @Transactional
    public DocumentResponse upload(MultipartFile file, String title,
                                   Integer subjectId, Integer userId,
                                   String visibilityStatus) throws Exception {
        String originalName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();

        // Chặn sớm theo kích thước file gốc để khỏi tốn công convert khi đã vượt quota.
        checkStorageLimit(userId, file.getSize());

        UploadPayload uploadPayload = preparePdfUploadPayload(file, originalName);

        // Cái thực sự lưu là bản PDF đã convert — DOCX/PPTX ra PDF thường phình to hơn file gốc,
        // nên phải kiểm tra lại bằng đúng số byte sẽ ghi vào storage.
        checkStorageLimit(userId, uploadPayload.bytes().length);

        String safeName = UNSAFE_OBJECT_NAME_CHARS.matcher(uploadPayload.fileName()).replaceAll("_");
        String objectKey = "students/" + userId + "/subjects/" + subjectId + "/" + UUID.randomUUID() + "_" + safeName;

        String publicUrl;
        if ("R2".equals(storageSettingsService.provider())) {
            try {
                cloudflareR2StorageService.upload(objectKey, uploadPayload.mediaType().toString(), uploadPayload.bytes());
                publicUrl = "r2:" + objectKey;
            } catch (Exception e) {
                throw new BadRequestException("Cloudflare R2 upload failed: " + e.getMessage());
            }
        } else {
            try {
                supabaseWebClient.post()
                        .uri("/storage/v1/object/" + bucket + "/" + objectKey)
                        .header("apikey", supabaseKey).header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseKey)
                        .header("x-upsert", "true").contentType(uploadPayload.mediaType()).bodyValue(uploadPayload.bytes())
                        .retrieve().toBodilessEntity().block();
            } catch (WebClientResponseException e) {
                throw new BadRequestException("Supabase upload failed: HTTP " + e.getStatusCode().value() + " - " + e.getResponseBodyAsString());
            }
            publicUrl = "/storage/v1/object/public/" + bucket + "/" + objectKey;
        }

        Document doc = new Document();
        doc.setUserId(userId);
        doc.setSubjectId(subjectId);
        doc.setTitle(title != null ? title : originalName);
        doc.setDocumentName(uploadPayload.fileName());
        doc.setDocumentType(uploadPayload.documentType());
        doc.setDocumentSize((long) uploadPayload.bytes().length);
        doc.setDocumentUrl(publicUrl);
        doc.setVisibilityStatus(visibilityStatus != null ? visibilityStatus : "PRIVATE");
        doc.setStatus("Active");
        doc.setSummaryStatus(isSummarizableType(uploadPayload.documentType()) ? SUMMARY_PENDING : SUMMARY_UNSUPPORTED);
        doc.setSummaryUpdatedAt(LocalDateTime.now());
        doc.setUploadedAt(LocalDateTime.now());
        doc.setCreatedAt(LocalDateTime.now());

        DocumentResponse response = toMetadataDto(documentRepository.save(doc));
        // Normalized note.
        // Normalized note.
        userSubjectService.ensureAdded(userId, subjectId);
        if (SUMMARY_PENDING.equals(response.getSummaryStatus())) {
            eventPublisher.publishEvent(new DocumentUploadedEvent(response.getDocumentId(), userId));
        }
        return response;
    }

    // Normalized note.
    public List<DocumentResponse> getBySubject(Integer subjectId) {
        return documentRepository.findBySubjectIdAndDeletedAtIsNull(subjectId).stream().map(this::toMetadataDto).collect(Collectors.toList());
    }

    public List<DocumentResponse> getBySubjectAndUser(Integer subjectId, Integer userId) {
        return jdbcTemplate.query("""
                SELECT d.document_id,
                       d.user_id,
                       d.subject_id,
                       d.title,
                       d.document_name,
                       d.document_type,
                       d.document_size,
                       d.visibility_status,
                       d.status,
                       d.summary_status,
                       d.summary_error,
                       d.summary_updated_at,
                       d.uploaded_at,
                       d.created_at,
                       d.updated_at
                FROM dbo.DOCUMENT d
                 WHERE d.subject_id = ?
                   AND d.user_id = ?
                   AND d.deleted_at IS NULL
                ORDER BY d.created_at DESC, d.document_id DESC
                """, (rs, rowNum) -> {
            DocumentResponse response = new DocumentResponse();
            response.setDocumentId(rs.getInt("document_id"));
            response.setUserId(rs.getInt("user_id"));
            response.setSubjectId(rs.getObject("subject_id", Integer.class));
            response.setTitle(rs.getString("title"));
            response.setDocumentName(rs.getString("document_name"));
            response.setDocumentType(rs.getString("document_type"));
            response.setDocumentSize(rs.getObject("document_size", Long.class));
            response.setDocumentUrl(null);
            response.setVisibilityStatus(rs.getString("visibility_status"));
            response.setStatus(rs.getString("status"));
            response.setSummaryStatus(rs.getString("summary_status"));
            response.setSummaryError(rs.getString("summary_error"));
            response.setSummaryUpdatedAt(toLocalDateTime(rs.getTimestamp("summary_updated_at")));
            response.setUploadedAt(toLocalDateTime(rs.getTimestamp("uploaded_at")));
            response.setCreatedAt(toLocalDateTime(rs.getTimestamp("created_at")));
            response.setUpdatedAt(toLocalDateTime(rs.getTimestamp("updated_at")));
            return response;
        }, subjectId, userId);
    }

    private boolean isReadableByUser(Document document, Integer userId) {
        if (document == null || document.getDeletedAt() != null || userId == null) return false;
        if (document.getUserId() != null && document.getUserId().equals(userId)) return true;
        if ("PUBLIC".equalsIgnoreCase(document.getVisibilityStatus())) return true;
        return documentShareRepository
                .findFirstByDocumentIdAndSharedToUserIdAndShareTypeAndStatus(
                        document.getDocumentId(), userId, "USER", "ACTIVE")
                .isPresent();
    }

    private LocalDateTime toLocalDateTime(java.sql.Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    /* Section */
    public List<DocumentResponse> getPublicBySubject(Integer subjectId) {
        return documentRepository.findBySubjectIdAndVisibilityStatusAndDeletedAtIsNull(subjectId, "PUBLIC")
                .stream().map(this::toMetadataDto).collect(Collectors.toList());
    }

    public List<DocumentResponse> getByUser(Integer userId) {
        return documentRepository.findByUserIdAndDeletedAtIsNull(userId).stream().map(this::toMetadataDto).collect(Collectors.toList());
    }

    public DocumentResponse getById(Integer id) {
        return documentRepository.findById(id).filter(this::isActive).map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
    }

    public void requireOwner(Integer documentId, Integer userId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        requireActive(doc);
        if (!doc.getUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the document owner can perform this action.");
        }
    }

    public void requireReadable(Integer documentId, Integer userId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        requireActive(doc);
        // Admin duyệt document nên đọc được mọi file, kể cả PRIVATE của user khác.
        if (currentUser.isAdmin()) {
            return;
        }
        boolean owner = doc.getUserId().equals(userId);
        boolean publicDocument = "PUBLIC".equalsIgnoreCase(doc.getVisibilityStatus());
        boolean shared = documentShareRepository
                .findFirstByDocumentIdAndSharedToUserIdAndShareTypeAndStatus(
                        documentId, userId, "USER", "ACTIVE")
                .isPresent();
        if (!owner && !publicDocument && !shared) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot access this document.");
        }
    }

    public DocumentResponse getPublicById(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        if (!isActive(doc) || !"PUBLIC".equalsIgnoreCase(doc.getVisibilityStatus())) {
            throw new ResourceNotFoundException("Public document not found: " + id);
        }
        return toDto(doc);
    }

    public DocumentSummarizeResponse getLatestSummary(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);
        String summary = aiSummaryRepository.findLatestFullFileSummary(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI summary not found: " + id));
        return new DocumentSummarizeResponse(doc.getDocumentId(), doc.getDocumentName(), summary, null, false, true);
    }

    public DocumentFile getPublicFile(Integer id) {
        getPublicById(id);
        return getFile(id);
    }

    public void requireShareOwner(Integer shareId, Integer userId) {
        DocumentShare share = documentShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found: " + shareId));
        if (!share.getUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the document owner can manage this share.");
        }
    }

    /**
     * Owner hoặc người được chia sẻ đều được gỡ share: người nhận cần tự bỏ tài liệu
     * khỏi "Shared with me" mà không phải xin owner. Đổi permission thì vẫn chỉ owner
     * (xem requireShareOwner).
     */
    public void requireShareParticipant(Integer shareId, Integer userId) {
        DocumentShare share = documentShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found: " + shareId));
        boolean isOwner = share.getUserId() != null && share.getUserId().equals(userId);
        boolean isRecipient = share.getSharedToUserId() != null && share.getSharedToUserId().equals(userId);
        if (!isOwner && !isRecipient) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot manage this share.");
        }
    }

    public DocumentFile getFile(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);
        return new DocumentFile(doc.getDocumentName(), mediaTypeFor(doc.getDocumentType()), downloadFileBytes(doc));
    }

    public String getAiReadableText(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);
        return resolveSummarizableText(doc);
    }

    public List<DocumentResponse> getAll() {
        return documentRepository.findAll().stream().filter(this::isActive).map(this::toMetadataDto).collect(Collectors.toList());
    }

    /**
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     */
    @Transactional
    public DocumentResponse updateVisibility(Integer id, String newStatus) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);

        String current = doc.getVisibilityStatus();

        if ("PENDING_REVIEW".equals(current) && !"PRIVATE".equals(newStatus)) {
            // Normalized note.
            throw new ConflictException("This document is pending admin review. Please wait for the result.");
        }

        // Normalized note.
        // Normalized note.
        if ("PRIVATE".equals(current) && "PENDING_REVIEW".equals(newStatus) && doc.getUpdatedAt() != null) {
            LocalDateTime cooldownEnd = doc.getUpdatedAt().plusHours(1);
            if (LocalDateTime.now().isBefore(cooldownEnd)) {
                throw new TooManyRequestsException("You need to wait 1 more hour before requesting to publish again.");
            }
        }

        doc.setVisibilityStatus(newStatus);
        doc.setUpdatedAt(LocalDateTime.now());
        Document saved = documentRepository.save(doc);

        // AI auto-moderation when submitting for review (run asynchronously in background so UI response is instant)
        if ("PENDING_REVIEW".equals(newStatus)) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    triggerAiModeration(saved);
                } catch (Exception ignored) {
                }
            });
        }

        return toMetadataDto(saved);
    }

    /**
     *
     *
     *
     *
     *
     */
    @Transactional
    public DocumentResponse updateTitle(Integer id, String title) {
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Title must not be empty.");
        }
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);
        doc.setTitle(title.trim());
        return toMetadataDto(documentRepository.save(doc));
    }

    // Normalized note.
    /* Section */
    public List<AdminDocumentResponse> getPendingForAdmin() {
        return documentRepository.findByVisibilityStatusAndDeletedAtIsNull("PENDING_REVIEW")
                .stream().map(this::toAdminDto).collect(Collectors.toList());
    }

    /* Section */
    @Transactional
    public AdminDocumentResponse approveDocument(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);
        if (!"PENDING_REVIEW".equals(doc.getVisibilityStatus())) {
            throw new ConflictException("This document is not pending review.");
        }
        doc.setVisibilityStatus("PUBLIC");
        doc.setUpdatedAt(LocalDateTime.now());

        // Update review log with admin decision
        publicReviewLogRepository.findTopByDocumentIdOrderByCreatedAtDesc(id)
                .ifPresent(log -> {
                    log.setReviewStatus("ADMIN_APPROVED");
                    log.setReviewedBy(currentUser.id());
                    log.setReviewedAt(LocalDateTime.now());
                    publicReviewLogRepository.save(log);
                });

        return toAdminDto(documentRepository.save(doc));
    }

    /**
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     */
    @Transactional
    public AdminDocumentResponse rejectDocument(Integer id, String reason) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);
        if (!"PENDING_REVIEW".equals(doc.getVisibilityStatus())) {
            throw new ConflictException("This document is not pending review.");
        }
        doc.setVisibilityStatus("PRIVATE");
        doc.setUpdatedAt(LocalDateTime.now());

        // Update review log with admin rejection
        publicReviewLogRepository.findTopByDocumentIdOrderByCreatedAtDesc(id)
                .ifPresent(log -> {
                    log.setReviewStatus("ADMIN_REJECTED");
                    log.setReviewedBy(currentUser.id());
                    log.setReviewedAt(LocalDateTime.now());
                    if (reason != null && !reason.isBlank()) {
                        log.setAiReasoning(log.getAiReasoning() + " | Admin note: " + reason);
                    }
                    publicReviewLogRepository.save(log);
                });

        return toAdminDto(documentRepository.save(doc));
    }

    /**
     * Calls the Python AI service to evaluate document relevance against its subject.
     * Auto-approves (>=80%), leaves for admin review (50-79%), or auto-rejects (<50%).
     */
    private void triggerAiModeration(Document doc) {
        var subject = subjectRepository.findById(doc.getSubjectId()).orElse(null);
        if (subject == null) return;

        String summaryText = aiSummaryRepository.findLatestFullFileSummary(doc.getDocumentId())
                .orElse(null);

        Map<String, Object> requestBody = Map.of(
                "document_id", doc.getDocumentId(),
                "title", doc.getTitle() != null ? doc.getTitle() : doc.getDocumentName(),
                "summary_text", summaryText != null ? summaryText : "",
                "subject_name", subject.getSubjectName(),
                "subject_code", subject.getSubjectCode() != null ? subject.getSubjectCode() : "",
                "subject_description", subject.getDescription() != null ? subject.getDescription() : ""
        );

        Map<String, Object> result;
        try {
            result = pythonAiWebClient.post()
                    .uri("/api/documents/moderate")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception ex) {
            PublicReviewLog log = PublicReviewLog.builder()
                    .documentId(doc.getDocumentId())
                    .userId(doc.getUserId())
                    .relevanceScore(null)
                    .aiReasoning("AI service unavailable: " + ex.getMessage())
                    .reviewStatus("PENDING_HUMAN")
                    .createdAt(LocalDateTime.now())
                    .build();
            publicReviewLogRepository.save(log);
            return;
        }

        if (result == null) return;

        double score = result.get("relevance_score") instanceof Number n ? n.doubleValue() : 50.0;
        String reasoning = String.valueOf(result.getOrDefault("ai_reasoning", ""));
        String recommendation = String.valueOf(result.getOrDefault("recommendation", "PENDING_HUMAN"));
        boolean usedMock = Boolean.TRUE.equals(result.get("used_mock_ai"));

        String reviewStatus;
        if (usedMock) {
            reviewStatus = "PENDING_HUMAN";
        } else if (score >= 80) {
            reviewStatus = "AUTO_APPROVED";
            doc.setVisibilityStatus("PUBLIC");
            doc.setUpdatedAt(LocalDateTime.now());
            documentRepository.save(doc);
        } else if (score < 50) {
            reviewStatus = "REJECTED";
            doc.setVisibilityStatus("PRIVATE");
            doc.setUpdatedAt(LocalDateTime.now());
            documentRepository.save(doc);
        } else {
            reviewStatus = "PENDING_HUMAN";
        }

        PublicReviewLog log = PublicReviewLog.builder()
                .documentId(doc.getDocumentId())
                .userId(doc.getUserId())
                .relevanceScore(BigDecimal.valueOf(score))
                .aiReasoning(reasoning.length() > 2000 ? reasoning.substring(0, 2000) : reasoning)
                .aiSummary(summaryText)
                .reviewStatus(reviewStatus)
                .createdAt(LocalDateTime.now())
                .build();
        publicReviewLogRepository.save(log);
    }

    private AdminDocumentResponse toAdminDto(Document d) {
        AdminDocumentResponse r = new AdminDocumentResponse();
        r.setDocumentId(d.getDocumentId());
        r.setTitle(d.getTitle());
        r.setDocumentName(d.getDocumentName());
        r.setDocumentType(d.getDocumentType() == null ? "" : d.getDocumentType().toUpperCase());
        r.setDocumentSizeBytes(d.getDocumentSize());
        r.setDocumentSizeLabel(formatSize(d.getDocumentSize()));
        r.setDocumentUrl(toDownloadUrl(d.getDocumentUrl()));
        r.setVisibilityStatus(d.getVisibilityStatus());
        r.setUploadedAt(d.getUploadedAt());
        r.setUpdatedAt(d.getUpdatedAt());

        r.setUserId(d.getUserId());
        userRepository.findById(d.getUserId()).ifPresent(u -> {
            r.setUploaderName(u.getFullName());
            r.setUploaderEmail(u.getEmail());
        });

        r.setSubjectId(d.getSubjectId());
        subjectRepository.findById(d.getSubjectId()).ifPresent(s -> {
            r.setSubjectName(s.getSubjectName());
            r.setSemesterId(s.getSemesterId());
            semesterRepository.findById(s.getSemesterId())
                    .ifPresent(sem -> r.setSemesterName(sem.getSemesterName()));
        });

        // Attach AI moderation info from PUBLIC_REVIEW_LOG
        publicReviewLogRepository.findTopByDocumentIdOrderByCreatedAtDesc(d.getDocumentId())
                .ifPresent(log -> {
                    r.setRelevanceScore(log.getRelevanceScore() != null
                            ? log.getRelevanceScore().doubleValue() : null);
                    r.setAiReasoning(log.getAiReasoning());
                    r.setAiRecommendation(log.getReviewStatus());
                    r.setReviewStatus(log.getReviewStatus());
                });

        return r;
    }

    private String formatSize(Long bytes) {
        if (bytes == null) return "0 B";
        double kb = bytes / 1024.0;
        if (kb < 1024) return String.format("%.1f KB", kb);
        double mb = kb / 1024.0;
        if (mb < 1024) return String.format("%.1f MB", mb);
        return String.format("%.1f GB", mb / 1024.0);
    }

    // Normalized note.

    /**
     *
     *
     *
     */
    @Transactional
    public DocumentShareResponse createOrGetShareLink(Integer documentId, Integer userId) {
        documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        // Normalized note.
        return documentShareRepository
                .findFirstByDocumentIdAndShareTypeAndStatus(documentId, "LINK", "ACTIVE")
                .map(existing -> {
                    // Row tạo từ trước khi có share_token (hoặc backfill lỗi) thì cấp token ngay.
                    if (existing.getShareToken() == null || existing.getShareToken().isBlank()) {
                        existing.setShareToken(newShareToken());
                        documentShareRepository.save(existing);
                    }
                    return toShareDto(existing);
                })
                .orElseGet(() -> {
                    DocumentShare share = new DocumentShare();
                    share.setDocumentId(documentId);
                    share.setUserId(userId);
                    share.setShareType("LINK");
                    share.setStatus("ACTIVE");
                    share.setShareToken(newShareToken());
                    return toShareDto(documentShareRepository.save(share));
                });
    }

    /**
     *
     *
     */
    @Transactional
    public void revokeShareLink(Integer documentId, Integer userId) {
        // Normalized note.
        documentShareRepository
                .findAllByDocumentIdAndShareTypeAndStatus(documentId, "LINK", "ACTIVE")
                .forEach(share -> {
                    share.setStatus("REVOKED");
                    documentShareRepository.save(share);
                });
    }

    /**
     *
     *
     */
    public DocumentResponse getDocumentByShareToken(String shareToken) {
        if (shareToken == null || shareToken.isBlank()) {
            throw new ResourceNotFoundException("Share link not found or has been revoked.");
        }
        DocumentShare share = documentShareRepository
                .findByShareTokenAndStatus(shareToken.trim(), "ACTIVE")
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Share link not found or has been revoked."));
        return getById(share.getDocumentId());
    }

    // 128 bit ngẫu nhiên dạng hex — không đoán/duyệt được như share_id tự tăng.
    private String newShareToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private DocumentShareResponse toShareDto(DocumentShare share) {
        DocumentShareResponse r = new DocumentShareResponse();
        r.setShareId(share.getShareId());
        r.setDocumentId(share.getDocumentId());
        r.setShareToken(share.getShareToken());
        r.setShareType(share.getShareType());
        r.setStatus(share.getStatus());
        r.setShareUrl(frontendUrl + "/share/" + share.getShareToken());
        return r;
    }
    @Transactional
    public UserShareResponse shareWithUser(Integer documentId, ShareWithUserRequest request) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        User recipient = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with email: " + request.getEmail()));
        Integer ownerUserId = request.getOwnerUserId() == null ? doc.getUserId() : request.getOwnerUserId();
        if (!doc.getUserId().equals(ownerUserId)) throw new BadRequestException("Only the document owner can share this document.");
        if (recipient.getUserId().equals(ownerUserId)) throw new BadRequestException("You cannot share a document with yourself.");
        documentShareRepository.findFirstByDocumentIdAndSharedToUserIdAndShareTypeAndStatus(documentId, recipient.getUserId(), "USER", "ACTIVE")
                .ifPresent(existing -> { throw new ConflictException("This document is already shared with " + request.getEmail()); });
        DocumentShare share = documentShareRepository
                .findFirstByDocumentIdAndSharedToUserIdAndShareTypeAndStatus(documentId, recipient.getUserId(), "USER", "REVOKED")
                .orElseGet(DocumentShare::new);
        share.setDocumentId(documentId);
        share.setUserId(ownerUserId);
        share.setSharedToUserId(recipient.getUserId());
        share.setShareType("USER");
        share.setPermission(request.getPermission());
        share.setStatus("ACTIVE");
        documentShareRepository.save(share);
        User owner = userRepository.findById(ownerUserId).orElse(null);
        String ownerName = owner != null ? owner.getFullName() : "Someone";
        try { emailService.sendShareNotificationEmail(recipient.getEmail(), recipient.getFullName(), ownerName, doc.getTitle(), request.getPermission()); } catch (Exception ignored) {}
        return toUserShareResponse(share, doc, owner, recipient);
    }

    public List<UserShareResponse> getSharedWithMe(Integer userId) {
        return documentShareRepository.findAllBySharedToUserIdAndShareTypeAndStatus(userId, "USER", "ACTIVE")
                .stream()
                .map(share -> {
                    Document doc = documentRepository.findById(share.getDocumentId()).orElse(null);
                    if (!isActive(doc)) return null;
                    User owner = userRepository.findById(share.getUserId()).orElse(null);
                    User recipient = userRepository.findById(share.getSharedToUserId()).orElse(null);
                    return toUserShareResponse(share, doc, owner, recipient);
                })
                .filter(r -> r != null)
                .collect(Collectors.toList());
    }

    public List<UserShareResponse> getSharesForDocument(Integer documentId) {
        return documentShareRepository.findAllByDocumentIdAndShareTypeAndStatus(documentId, "USER", "ACTIVE")
                .stream()
                .map(share -> {
                    Document doc = documentRepository.findById(share.getDocumentId()).orElse(null);
                    User owner = userRepository.findById(share.getUserId()).orElse(null);
                    User recipient = share.getSharedToUserId() == null ? null : userRepository.findById(share.getSharedToUserId()).orElse(null);
                    return toUserShareResponse(share, doc, owner, recipient);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void revokeUserShare(Integer shareId) {
        DocumentShare share = documentShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found: " + shareId));
        share.setStatus("REVOKED");
        documentShareRepository.save(share);
    }

    @Transactional
    public UserShareResponse updateSharePermission(Integer shareId, String permission) {
        if (!"VIEW".equals(permission) && !"EDIT".equals(permission)) throw new BadRequestException("Permission must be VIEW or EDIT.");
        DocumentShare share = documentShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found: " + shareId));
        share.setPermission(permission);
        documentShareRepository.save(share);
        Document doc = documentRepository.findById(share.getDocumentId()).orElse(null);
        User owner = userRepository.findById(share.getUserId()).orElse(null);
        User recipient = share.getSharedToUserId() == null ? null : userRepository.findById(share.getSharedToUserId()).orElse(null);
        return toUserShareResponse(share, doc, owner, recipient);
    }

    private UserShareResponse toUserShareResponse(DocumentShare share, Document doc, User owner, User recipient) {
        UserShareResponse r = new UserShareResponse();
        r.setShareId(share.getShareId());
        r.setPermission(share.getPermission());
        r.setStatus(share.getStatus());
        if (doc != null) {
            r.setDocumentId(doc.getDocumentId());
            r.setDocumentTitle(doc.getTitle());
            r.setDocumentName(doc.getDocumentName());
            r.setDocumentUrl(toAbsoluteUrl(doc.getDocumentUrl()));
            r.setVisibilityStatus(doc.getVisibilityStatus());
            r.setUpdatedAt(doc.getUpdatedAt());
        }
        if (owner != null) {
            r.setOwnerUserId(owner.getUserId());
            r.setOwnerName(owner.getFullName());
            r.setOwnerEmail(owner.getEmail());
        }
        if (recipient != null) {
            r.setSharedToUserId(recipient.getUserId());
            r.setSharedToName(recipient.getFullName());
            r.setSharedToEmail(recipient.getEmail());
        }
        return r;
    }

    @Transactional
    public void delete(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        requireActive(doc);
        doc.setDeletedAt(LocalDateTime.now());
        doc.setDeletedByUserId(currentUser.id());
        doc.setDeletedByRole(currentUser.isAdmin() ? "ADMIN" : "USER");
        documentRepository.save(doc);
    }

    public List<TrashDocumentResponse> getTrashForUser(Integer userId) {
        return documentRepository.findByUserIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(userId)
                .stream().map(this::toTrashDto).toList();
    }

    public List<TrashDocumentResponse> getTrashForAdmin() {
        return documentRepository.findByDeletedAtIsNotNullOrderByDeletedAtDesc()
                .stream().map(this::toTrashDto).toList();
    }

    public DocumentFile getTrashFile(Integer id, Integer requesterId, boolean admin) {
        Document doc = requireTrashed(id);
        if (!admin && !doc.getUserId().equals(requesterId)) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot access this trashed document.");
        }
        return new DocumentFile(doc.getDocumentName(), mediaTypeFor(doc.getDocumentType()), downloadFileBytes(doc));
    }

    @Transactional
    public TrashDocumentResponse restore(Integer id, Integer requesterId, boolean admin) {
        Document doc = requireTrashed(id);
        if (!admin && !doc.getUserId().equals(requesterId)) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot restore this document.");
        }

        // Từ khi trash không còn tính vào quota, khôi phục là hành vi "thêm dung lượng"
        // nên phải kiểm hạn mức — nếu không sẽ thành đường vòng để vượt quota.
        // Tính theo chủ sở hữu tài liệu, không phải người bấm khôi phục (admin).
        long size = doc.getDocumentSize() == null ? 0L : doc.getDocumentSize();
        PlanQuotaService.PlanQuota restoreQuota = planQuotaService.getQuota(doc.getUserId());
        long restoreUsedBytes = planQuotaService.getUsage(doc.getUserId()).usedBytes();
        if (restoreUsedBytes + size > restoreQuota.maxStorageBytes()) {
            throw new BadRequestException(
                    "Not enough storage to restore \"" + doc.getDocumentName()
                            + "\". Free up space or delete other files permanently first.");
        }

        doc.setDeletedAt(null);
        doc.setDeletedByUserId(null);
        doc.setDeletedByRole(null);
        doc.setUpdatedAt(LocalDateTime.now());
        return toTrashDto(documentRepository.save(doc));
    }

    @Transactional
    public void purge(Integer id, Integer requesterId, boolean admin) {
        Document doc = requireTrashed(id);
        if (!admin && !doc.getUserId().equals(requesterId)) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot permanently delete this document.");
        }
        purgeDocument(doc);
    }

    @Transactional
    public int purgeExpiredDocuments() {
        List<Document> expired = documentRepository.findByDeletedAtBefore(LocalDateTime.now().minusDays(30));
        expired.forEach(this::purgeDocument);
        return expired.size();
    }

    private void purgeDocument(Document doc) {
        Integer id = doc.getDocumentId();
        deleteStoredFile(doc);
        // Keep dependency deletion in one service so manual and scheduled purge behave identically.
        purgeDocumentDependencies(id);
        documentRepository.deleteById(id);
    }

    private void purgeDocumentDependencies(Integer id) {
        jdbcTemplate.update("""
                DECLARE @documentId INT = ?;
                DECLARE @QuestionIds TABLE (id INT);
                DECLARE @QuizIds TABLE (id INT);
                DECLARE @AttemptIds TABLE (id INT);

                INSERT INTO @QuestionIds SELECT question_id FROM dbo.AI_QUESTION WHERE document_id = @documentId;
                INSERT INTO @QuizIds SELECT quiz_id FROM dbo.QUIZ_TEST WHERE question_id IN (SELECT id FROM @QuestionIds);
                INSERT INTO @AttemptIds
                    SELECT attempt_id FROM dbo.TEST_ATTEMPT
                    WHERE test_id IN (SELECT id FROM @QuizIds)
                       OR question_id IN (SELECT id FROM @QuestionIds);

                DELETE FROM dbo.USER_ANSWER WHERE attempt_id IN (SELECT id FROM @AttemptIds);
                DELETE FROM dbo.TEST_RESULT WHERE attempt_id IN (SELECT id FROM @AttemptIds);
                DELETE FROM dbo.TEST_ATTEMPT WHERE attempt_id IN (SELECT id FROM @AttemptIds);
                DELETE FROM dbo.ANSWER_OPTION WHERE question_id IN (SELECT id FROM @QuizIds);
                DELETE FROM dbo.QUIZ_TEST WHERE quiz_id IN (SELECT id FROM @QuizIds);
                DELETE FROM dbo.STUDY_ACTIVITY
                    WHERE document_id = @documentId
                       OR summary_id IN (SELECT summary_id FROM dbo.AI_SUMMARY WHERE document_id = @documentId)
                       OR session_id IN (SELECT session_id FROM dbo.CHAT_SESSION WHERE document_id = @documentId)
                       OR question_id IN (SELECT id FROM @QuestionIds);
                DELETE FROM dbo.REPORT WHERE document_id = @documentId;
                DELETE FROM dbo.COMMENT WHERE document_id = @documentId;
                DELETE FROM dbo.CHAT_MESSAGE WHERE session_id IN (SELECT session_id FROM dbo.CHAT_SESSION WHERE document_id = @documentId);
                DELETE FROM dbo.CHAT_SESSION WHERE document_id = @documentId;
                DELETE FROM dbo.AI_USAGE_LOG WHERE document_id = @documentId;
                DELETE FROM dbo.AI_SUGGESTION WHERE document_id = @documentId;
                DELETE FROM dbo.AI_SUMMARY WHERE document_id = @documentId;
                DELETE FROM dbo.AI_QUESTION WHERE question_id IN (SELECT id FROM @QuestionIds);
                DELETE FROM dbo.DOCUMENT_SHARE WHERE document_id = @documentId;
                """, id);
    }

    /**
     *
     *
     *
     */
    @Transactional
    public void deleteAllByUserAndSubject(Integer userId, Integer subjectId) {
        List<Document> docs = documentRepository.findByUserIdAndSubjectIdAndDeletedAtIsNull(userId, subjectId);
        for (Document doc : docs) {
            doc.setDeletedAt(LocalDateTime.now());
            doc.setDeletedByUserId(userId);
            doc.setDeletedByRole("USER");
        }
        documentRepository.saveAll(docs);
    }

    public void deleteStoredFile(Document doc) {
        String r2Key = extractR2ObjectKey(doc.getDocumentUrl());
        if (r2Key != null) {
            try { cloudflareR2StorageService.delete(r2Key); } catch (Exception ignored) {}
            return;
        }
        String driveId = extractDriveFileId(doc.getDocumentUrl());
        if (driveId != null) {
            return;
        }
        String objectKey = extractObjectKey(doc.getDocumentUrl());
        if (objectKey == null || objectKey.isBlank()) return;
        try {
            supabaseWebClient.delete()
                    .uri("/storage/v1/object/" + bucket + "/" + objectKey)
                    .header("apikey", supabaseKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseKey)
                    .retrieve().toBodilessEntity().block();
        } catch (Exception ignored) {}
    }
    // Normalized note.
    public DocumentSummarizeResponse summarize(DocumentSummarizeRequest request) {
        Document doc = documentRepository.findById(request.getDocumentId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + request.getDocumentId()));

        Integer userId = request.getUserId();
        var existingSummary = userId == null
                ? aiSummaryRepository.findLatestFullFileSummary(doc.getDocumentId())
                : aiSummaryRepository.findLatestFullFileSummary(doc.getDocumentId(), userId);
        if (existingSummary.isPresent()) {
            markSummaryStatus(doc.getDocumentId(), SUMMARY_COMPLETED, null);
            return new DocumentSummarizeResponse(
                    doc.getDocumentId(), doc.getDocumentName(), existingSummary.get(), null, false, true);
        }

        markSummaryStatus(doc.getDocumentId(), SUMMARY_PROCESSING, null);
        try {
            String text = resolveSummarizableText(doc);
            Integer maxChunks = request.getMaxChunks();

            Map<String, Object> result = pythonAiWebClient.post()
                    .uri("/api/documents/summarize")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(new PythonDocumentSummarizeRequest(
                            doc.getDocumentId(), doc.getDocumentName(), text, null, maxChunks))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (result == null || result.get("summary") == null) {
                String message = "AI service returned no summary for this document.";
                markSummaryStatus(doc.getDocumentId(), SUMMARY_FAILED, message);
                throw new BadRequestException(message);
            }

            String summary = String.valueOf(result.get("summary"));
            Integer chunkCount = result.get("chunk_count") instanceof Number n ? n.intValue() : null;
            boolean usedMockAi = Boolean.TRUE.equals(result.get("used_mock_ai"));

            if (usedMockAi) {
                markSummaryStatus(doc.getDocumentId(), SUMMARY_FAILED, summary);
                return new DocumentSummarizeResponse(doc.getDocumentId(), doc.getDocumentName(), summary, chunkCount, true, false);
            }

            aiSummaryRepository.save(doc.getDocumentId(), userId, summary, "python-ai-service-full");
            markSummaryStatus(doc.getDocumentId(), SUMMARY_COMPLETED, null);

            return new DocumentSummarizeResponse(doc.getDocumentId(), doc.getDocumentName(), summary, chunkCount, usedMockAi, true);
        } catch (BadRequestException e) {
            String status = isSummarizableType(doc.getDocumentType()) ? SUMMARY_FAILED : SUMMARY_UNSUPPORTED;
            markSummaryStatus(doc.getDocumentId(), status, e.getMessage());
            throw e;
        } catch (Exception e) {
            String message = "AI summarize service unavailable: " + e.getMessage();
            markSummaryStatus(doc.getDocumentId(), SUMMARY_FAILED, message);
            throw new BadRequestException(message);
        }
    }

    /**
     *
     *
     *
     */
    private boolean isSummarizableType(String type) {
        return type != null && SUMMARIZABLE_TYPES.contains(type.toLowerCase());
    }

    private void markSummaryStatus(Integer documentId, String status, String error) {
        String safeError = error == null ? null : error.substring(0, Math.min(error.length(), 500));
        jdbcTemplate.update("""
                UPDATE DOCUMENT
                SET summary_status = ?, summary_error = ?, summary_updated_at = ?
                WHERE document_id = ?
                """, status, safeError, LocalDateTime.now(), documentId);
    }

    private String resolveSummarizableText(Document doc) {
        String type = doc.getDocumentType() == null ? "" : doc.getDocumentType().toLowerCase();
        if (!SUMMARIZABLE_TYPES.contains(type)) {
            throw new BadRequestException(
                    "AI summary does not support format \"" + type + "\" (file \"" + doc.getDocumentName()
                            + "\"). Currently supported: " + SUMMARIZABLE_TYPES);
        }

        byte[] bytes = downloadFileBytes(doc);

        try {
            return switch (type) {
                case "pdf" -> extractPdfText(bytes);
                case "docx" -> extractDocxText(bytes);
                case "pptx" -> extractPptxText(bytes);
                default -> new String(bytes, StandardCharsets.UTF_8); // txt / md / csv
            };
        } catch (IOException e) {
            throw new BadRequestException("Could not extract text from \"" + doc.getDocumentName() + "\": " + e.getMessage());
        }
    }

    private byte[] downloadFileBytes(Document doc) {
        String r2Key = extractR2ObjectKey(doc.getDocumentUrl());
        if (r2Key != null) {
            try { return cloudflareR2StorageService.download(r2Key); }
            catch (Exception e) { throw new BadRequestException("Document file is missing or unavailable in Cloudflare R2."); }
        }
        String driveId = extractDriveFileId(doc.getDocumentUrl());
        if (driveId != null) {
            throw new BadRequestException("Google Drive storage is no longer supported.");
        }
        String objectKey = extractObjectKey(doc.getDocumentUrl());
        if (objectKey == null || objectKey.isBlank()) {
            throw new BadRequestException("Document storage path is invalid.");
        }

        byte[] bytes;
        try {
            bytes = supabaseWebClient.get()
                    .uri("/storage/v1/object/" + bucket + "/" + objectKey)
                    .header("apikey", supabaseKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseKey)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();
        } catch (WebClientResponseException e) {
            throw new BadRequestException("Document file is missing or unavailable in storage. Please upload the file again or remove this broken document record.");
        }

        if (bytes == null || bytes.length == 0) {
            throw new BadRequestException("Could not download document content from storage.");
        }
        return bytes;
    }
    private String extractPdfText(byte[] bytes) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(pdf);
        }
    }

    private String extractDocxText(byte[] bytes) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes));
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private String extractPptxText(byte[] bytes) throws IOException {
        try (XMLSlideShow ppt = new XMLSlideShow(new ByteArrayInputStream(bytes))) {
            StringBuilder text = new StringBuilder();
            for (XSLFSlide slide : ppt.getSlides()) {
                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape textShape) {
                        text.append(textShape.getText()).append("\n");
                    }
                }
            }
            return text.toString();
        }
    }

    private DocumentResponse toDto(Document d) {
        DocumentResponse r = toMetadataDto(d);
        r.setDocumentUrl(toDownloadUrl(d.getDocumentUrl()));
        return r;
    }

    private DocumentResponse toMetadataDto(Document d) {
        DocumentResponse r = new DocumentResponse();
        r.setDocumentId(d.getDocumentId());
        r.setUserId(d.getUserId());
        r.setSubjectId(d.getSubjectId());
        r.setTitle(d.getTitle());
        r.setDocumentName(d.getDocumentName());
        r.setDocumentType(d.getDocumentType());
        r.setDocumentSize(d.getDocumentSize());
        // Normalized note.
        // Normalized note.
        r.setDocumentUrl(null);
        r.setVisibilityStatus(d.getVisibilityStatus());
        r.setStatus(d.getStatus());
        r.setSummaryStatus(d.getSummaryStatus());
        r.setSummaryError(d.getSummaryError());
        r.setSummaryUpdatedAt(d.getSummaryUpdatedAt());
        r.setUploadedAt(d.getUploadedAt());
        r.setCreatedAt(d.getCreatedAt());
        r.setUpdatedAt(d.getUpdatedAt());
        r.setDeletedAt(d.getDeletedAt());
        return r;
    }

    private boolean isActive(Document document) {
        return document != null && document.getDeletedAt() == null;
    }

    private void requireActive(Document document) {
        if (!isActive(document)) {
            throw new ResourceNotFoundException("Document not found: " + document.getDocumentId());
        }
    }

    private Document requireTrashed(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trashed document not found: " + id));
        if (doc.getDeletedAt() == null) {
            throw new ResourceNotFoundException("Trashed document not found: " + id);
        }
        return doc;
    }

    private TrashDocumentResponse toTrashDto(Document d) {
        TrashDocumentResponse response = new TrashDocumentResponse();
        response.setDocumentId(d.getDocumentId());
        response.setUserId(d.getUserId());
        response.setSubjectId(d.getSubjectId());
        response.setTitle(d.getTitle());
        response.setDocumentName(d.getDocumentName());
        response.setDocumentType(d.getDocumentType());
        response.setDocumentSize(d.getDocumentSize());
        response.setDeletedAt(d.getDeletedAt());
        response.setDeletedByRole(d.getDeletedByRole());
        if (d.getDeletedAt() != null) {
            LocalDateTime purgeAt = d.getDeletedAt().plusDays(30);
            response.setPurgeAt(purgeAt);
            long hours = Math.max(0, ChronoUnit.HOURS.between(LocalDateTime.now(), purgeAt));
            response.setRemainingDays((hours + 23) / 24);
        }
        userRepository.findById(d.getUserId()).ifPresent(user -> {
            response.setOwnerName(user.getFullName());
            response.setOwnerEmail(user.getEmail());
        });
        subjectRepository.findById(d.getSubjectId()).ifPresent(subject -> {
            response.setSubjectName(subject.getSubjectName());
            semesterRepository.findById(subject.getSemesterId())
                    .ifPresent(semester -> response.setSemesterName(semester.getSemesterName()));
        });
        return response;
    }

    private String toDownloadUrl(String storedUrl) {
        String r2Key = extractR2ObjectKey(storedUrl);
        if (r2Key != null) {
            try {
                return cloudflareR2StorageService.getDownloadUrl(r2Key);
            } catch (Exception ignored) {
                return null;
            }
        }
        if (extractDriveFileId(storedUrl) != null) return null;
        String objectKey = extractObjectKey(storedUrl);
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> result = supabaseWebClient.post()
                    .uri("/storage/v1/object/sign/" + bucket + "/" + objectKey)
                    .header("apikey", supabaseKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("expiresIn", 3600))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
            Object signedUrl = result == null ? null : result.get("signedURL");
            if (signedUrl != null && !String.valueOf(signedUrl).isBlank()) {
                return toAbsoluteUrl(String.valueOf(signedUrl));
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String toAbsoluteUrl(String relativeOrAbsoluteUrl) {
        if (relativeOrAbsoluteUrl == null || relativeOrAbsoluteUrl.startsWith("http")) {
            return relativeOrAbsoluteUrl;
        }
        String base = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
        String path = relativeOrAbsoluteUrl.startsWith("/") ? relativeOrAbsoluteUrl : "/" + relativeOrAbsoluteUrl;
        if (path.startsWith("/object/")) {
            path = "/storage/v1" + path;
        }
        return base + path;
    }

    private MediaType mediaTypeFor(String type) {
        if (type == null) return MediaType.APPLICATION_OCTET_STREAM;
        return switch (type.toLowerCase()) {
            case "pdf" -> MediaType.APPLICATION_PDF;
            case "png" -> MediaType.IMAGE_PNG;
            case "jpg", "jpeg" -> MediaType.IMAGE_JPEG;
            case "gif" -> MediaType.IMAGE_GIF;
            case "txt", "md", "csv" -> MediaType.TEXT_PLAIN;
            case "docx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            case "pptx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation");
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };
    }

    private String extractObjectKey(String storedUrl) {
        if (storedUrl == null || storedUrl.isBlank()) return null;
        String value = storedUrl.trim();
        int queryStart = value.indexOf('?');
        if (queryStart >= 0) {
            value = value.substring(0, queryStart);
        }
        String base = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
        if (value.startsWith(base)) {
            value = value.substring(base.length());
        } else if (value.startsWith("http://") || value.startsWith("https://")) {
            return null;
        }
        String publicPrefix = "/storage/v1/object/public/" + bucket + "/";
        String signedPrefix = "/storage/v1/object/sign/" + bucket + "/";
        String objectPrefix = "/storage/v1/object/" + bucket + "/";
        if (value.startsWith(publicPrefix)) return safeObjectKey(value.substring(publicPrefix.length()));
        if (value.startsWith(signedPrefix)) return safeObjectKey(value.substring(signedPrefix.length()));
        if (value.startsWith(objectPrefix)) return safeObjectKey(value.substring(objectPrefix.length()));
        if (!value.startsWith("/storage/")) return safeObjectKey(value);
        return null;
    }

    private String extractR2ObjectKey(String storedUrl) {
        if (storedUrl == null) return null;
        String value = storedUrl.trim();
        return value.regionMatches(true, 0, "r2:", 0, 3) && value.length() > 3 ? value.substring(3) : null;
    }

    private String extractDriveFileId(String storedUrl) {
        if (storedUrl == null) return null;
        String value = storedUrl.trim();
        return value.regionMatches(true, 0, "drive:", 0, 6) && value.length() > 6 ? value.substring(6) : null;
    }


    // Normalized note.

    private void checkStorageLimit(Integer userId, long newFileSize) {
        // Resolved through PlanQuotaService so the enforced limit always matches the quota
        // LibraryService.getOverview displays.
        PlanQuotaService.PlanQuota quota = planQuotaService.getQuota(userId);
        long maxStorageBytes = quota.maxStorageBytes();
        long usedBytes = planQuotaService.getUsage(userId).usedBytes();

        if (usedBytes + newFileSize > maxStorageBytes) {
            // Raw byte values let the client format precisely (e.g. "0.5 GB") and explain that the
            // file being uploaded is what pushes the account over quota, not the current usage alone.
            throw new BadRequestException(
                    "STORAGE_LIMIT_REACHED:" + usedBytes + ":" + maxStorageBytes + ":" + newFileSize);
        }
    }

    private String safeObjectKey(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return null;
        String normalized = objectKey.trim().replace('\\', '/');
        if (normalized.startsWith("/") || normalized.contains("../") || normalized.contains("/..")) {
            return null;
        }
        return normalized;
    }

    private UploadPayload preparePdfUploadPayload(MultipartFile file, String originalName) throws IOException {
        String extension = getExtension(originalName);
        if ("pdf".equalsIgnoreCase(extension)) {
            return new UploadPayload(
                    ensurePdfFileName(originalName),
                    "pdf",
                    MediaType.APPLICATION_PDF,
                    file.getBytes());
        }

        return convertToPdf(file, originalName, extension);
    }

    private UploadPayload convertToPdf(MultipartFile file, String originalName, String extension) throws IOException {
        return new UploadPayload(
                ensurePdfFileName(originalName),
                "pdf",
                MediaType.APPLICATION_PDF,
                documentConversionService.convertToPdf(file.getBytes(), extension, originalName));
    }

    private String ensurePdfFileName(String originalName) {
        String name = (originalName == null || originalName.isBlank()) ? "document" : originalName.trim();
        int dotIndex = name.lastIndexOf('.');
        String baseName = dotIndex > 0 ? name.substring(0, dotIndex) : name;
        return baseName + ".pdf";
    }

    private String getExtension(String name) {
        if (name == null || !name.contains(".")) return "unknown";
        return name.substring(name.lastIndexOf('.') + 1).toLowerCase();
    }
}
