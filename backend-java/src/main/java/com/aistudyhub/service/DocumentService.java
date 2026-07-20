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
import com.aistudyhub.entity.DocumentShare;
import com.aistudyhub.entity.User;
import com.aistudyhub.event.DocumentUploadedEvent;
import com.aistudyhub.repository.AiSummaryRepository;
import com.aistudyhub.repository.DocumentShareRepository;
import com.aistudyhub.repository.DocumentRepository;
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
import org.jodconverter.core.office.OfficeException;
import org.jodconverter.local.JodConverter;
import org.jodconverter.local.office.LocalOfficeManager;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
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
    private final WebClient supabaseWebClient;
    private final StorageSettingsService storageSettingsService;
    private final CloudflareR2StorageService cloudflareR2StorageService;
    private final WebClient pythonAiWebClient;
    private final EmailService emailService;
    private final JdbcTemplate jdbcTemplate;
    private final ApplicationEventPublisher eventPublisher;

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

    @Value("${document-conversion.office-home:}")
    private String officeHome;

    // Normalized note.
    @Transactional
    public DocumentResponse upload(MultipartFile file, String title,
                                   Integer subjectId, Integer userId,
                                   String visibilityStatus) throws Exception {
        String originalName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();

        // Storage limit check.
        checkStorageLimit(userId, file.getSize());

        UploadPayload uploadPayload = preparePdfUploadPayload(file, originalName);
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
        return documentRepository.findBySubjectId(subjectId).stream().map(this::toMetadataDto).collect(Collectors.toList());
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
        if (document == null || userId == null) return false;
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
        return documentRepository.findBySubjectIdAndVisibilityStatus(subjectId, "PUBLIC")
                .stream().map(this::toMetadataDto).collect(Collectors.toList());
    }

    public List<DocumentResponse> getByUser(Integer userId) {
        return documentRepository.findByUserId(userId).stream().map(this::toMetadataDto).collect(Collectors.toList());
    }

    public DocumentResponse getById(Integer id) {
        return documentRepository.findById(id).map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
    }

    public void requireOwner(Integer documentId, Integer userId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        if (!doc.getUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the document owner can perform this action.");
        }
    }

    public void requireReadable(Integer documentId, Integer userId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        boolean owner = doc.getUserId().equals(userId);
        boolean publicDocument = "PUBLIC".equalsIgnoreCase(doc.getVisibilityStatus());
        boolean shared = documentShareRepository
                .findFirstByDocumentIdAndSharedToUserIdAndShareTypeAndStatus(
                        documentId, userId, "USER", "ACTIVE")
                .isPresent();
        if (!owner && !publicDocument && !shared) {
            boolean isAdmin = userRepository.findById(userId).map(u -> u.getRoleId() != null && u.getRoleId() == User.ROLE_ADMIN_ID).orElse(false);
            if (!isAdmin) {
                throw new org.springframework.security.access.AccessDeniedException("You cannot access this document.");
            }
        }
    }

    public DocumentResponse getPublicById(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        if (!"PUBLIC".equalsIgnoreCase(doc.getVisibilityStatus())) {
            throw new ResourceNotFoundException("Public document not found: " + id);
        }
        return toDto(doc);
    }

    public DocumentSummarizeResponse getLatestSummary(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
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

    public DocumentFile getFile(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        return new DocumentFile(doc.getDocumentName(), mediaTypeFor(doc.getDocumentType()), downloadFileBytes(doc));
    }

    public String getAiReadableText(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        return resolveSummarizableText(doc);
    }

    public List<DocumentResponse> getAll() {
        return documentRepository.findAll().stream().map(this::toMetadataDto).collect(Collectors.toList());
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
        return toMetadataDto(documentRepository.save(doc));
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
        doc.setTitle(title.trim());
        return toMetadataDto(documentRepository.save(doc));
    }

    // Normalized note.
    /* Section */
    public List<AdminDocumentResponse> getPendingForAdmin() {
        return documentRepository.findByVisibilityStatus("PENDING_REVIEW")
                .stream().map(this::toAdminDto).collect(Collectors.toList());
    }

    /* Section */
    @Transactional
    public AdminDocumentResponse approveDocument(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
        if (!"PENDING_REVIEW".equals(doc.getVisibilityStatus())) {
            throw new ConflictException("This document is not pending review.");
        }
        doc.setVisibilityStatus("PUBLIC");
        doc.setUpdatedAt(LocalDateTime.now());
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
        if (!"PENDING_REVIEW".equals(doc.getVisibilityStatus())) {
            throw new ConflictException("This document is not pending review.");
        }
        doc.setVisibilityStatus("PRIVATE");
        doc.setUpdatedAt(LocalDateTime.now());
        return toAdminDto(documentRepository.save(doc));
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
                .map(this::toShareDto)
                .orElseGet(() -> {
                    DocumentShare share = new DocumentShare();
                    share.setDocumentId(documentId);
                    share.setUserId(userId);
                    share.setShareType("LINK");
                    share.setStatus("ACTIVE");
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
    public DocumentResponse getDocumentByShareId(Integer shareId) {
        DocumentShare share = documentShareRepository
                .findByShareIdAndStatus(shareId, "ACTIVE")
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Share link not found or has been revoked."));
        return getById(share.getDocumentId());
    }

    private DocumentShareResponse toShareDto(DocumentShare share) {
        DocumentShareResponse r = new DocumentShareResponse();
        r.setShareId(share.getShareId());
        r.setDocumentId(share.getDocumentId());
        r.setShareType(share.getShareType());
        r.setStatus(share.getStatus());
        r.setShareUrl(frontendUrl + "/share/" + share.getShareId());
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
                    if (doc == null) return null;
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
        deleteStoredFile(doc);
        aiSummaryRepository.deleteByDocumentId(id);
        documentShareRepository.deleteByDocumentId(id);
        documentRepository.deleteById(id);
    }

    /**
     *
     *
     *
     */
    @Transactional
    public void deleteAllByUserAndSubject(Integer userId, Integer subjectId) {
        List<Document> docs = documentRepository.findByUserIdAndSubjectId(userId, subjectId);
        for (Document doc : docs) {
            deleteStoredFile(doc);
            aiSummaryRepository.deleteByDocumentId(doc.getDocumentId());
            documentShareRepository.deleteByDocumentId(doc.getDocumentId());
        }
        documentRepository.deleteAll(docs);
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
        return r;
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

        long maxStorageBytes = (long) maxStorageMb * 1024L * 1024L;

        Long usedBytes;
        try {
            usedBytes = jdbcTemplate.queryForObject("""
                    SELECT COALESCE(SUM(document_size), 0)
                    FROM dbo.DOCUMENT
                    WHERE user_id = ? AND status = 'Active'
                    """, Long.class, userId);
        } catch (Exception e) {
            usedBytes = 0L;
        }
        if (usedBytes == null) usedBytes = 0L;

        if (usedBytes + newFileSize > maxStorageBytes) {
            long usedMb = usedBytes / (1024L * 1024L);
            throw new BadRequestException("STORAGE_LIMIT_REACHED:" + usedMb + ":" + maxStorageMb);
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
        Path tempDir = Files.createTempDirectory("aistudyhub-convert-");
        Path inputPath = tempDir.resolve("input." + extension);
        Path outputPath = tempDir.resolve("output.pdf");
        LocalOfficeManager officeManager = null;

        try {
            Files.write(inputPath, file.getBytes());

            LocalOfficeManager.Builder builder = LocalOfficeManager.builder();
            if (officeHome != null && !officeHome.isBlank()) {
                builder.officeHome(officeHome.trim());
            }

            officeManager = builder.install().build();
            officeManager.start();
            JodConverter.convert(inputPath.toFile()).to(outputPath.toFile()).execute();

            return new UploadPayload(
                    ensurePdfFileName(originalName),
                    "pdf",
                    MediaType.APPLICATION_PDF,
                    Files.readAllBytes(outputPath));
        } catch (OfficeException e) {
            throw new BadRequestException(
                    "Could not convert \"" + originalName + "\" to PDF. Please install LibreOffice or configure DOCUMENT_CONVERSION_OFFICE_HOME. Detail: "
                            + e.getMessage());
        } finally {
            if (officeManager != null) {
                try {
                    officeManager.stop();
                } catch (OfficeException ignored) {
                }
            }
            deleteQuietly(outputPath);
            deleteQuietly(inputPath);
            deleteQuietly(tempDir);
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
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
