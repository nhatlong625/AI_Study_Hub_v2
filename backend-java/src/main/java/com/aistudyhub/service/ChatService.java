package com.aistudyhub.service;

import com.aistudyhub.dto.python.PythonChatAskRequest;
import com.aistudyhub.dto.python.PythonContextDocument;
import com.aistudyhub.dto.request.ChatAskRequest;
import com.aistudyhub.dto.request.CreateChatSessionRequest;
import com.aistudyhub.dto.response.ChatAskResponse;
import com.aistudyhub.dto.response.ChatMessageDto;
import com.aistudyhub.dto.response.ChatSessionDto;
import com.aistudyhub.dto.response.DetectedSubjectResponse;
import com.aistudyhub.dto.response.SourceDocumentResponse;
import com.aistudyhub.exception.ResourceNotFoundException;
import com.aistudyhub.model.SummaryHit;
import com.aistudyhub.repository.AiSummaryRepository;
import com.aistudyhub.repository.AiChatCacheRepository;
import com.aistudyhub.repository.AiQueryTranslationCacheRepository;
import com.aistudyhub.repository.AiUsageLogRepository;
import com.aistudyhub.repository.ChatMessageRepository;
import com.aistudyhub.repository.ChatSessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final Pattern TOKEN_PATTERN = Pattern.compile("[\\p{L}\\p{N}_]+");
    private static final Pattern CJK_PATTERN = Pattern.compile("[\\u3040-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff\\uac00-\\ud7af]");
    private static final Pattern SUBJECT_CODE_PATTERN = Pattern.compile("\\b[A-Z]{2,5}\\d{3}\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUBJECT_PREFIX_PATTERN = Pattern.compile("\\b[A-Z]{3,5}\\b", Pattern.CASE_INSENSITIVE);
    private static final Set<String> STOP_WORDS = Set.of(
            "co", "khong", "ko", "k", "la", "ve", "cho", "toi", "minh", "mon", "hoc", "nay",
            "gi", "no", "cua", "thuoc", "the", "nao", "pdf", "file", "document",
            "quiz", "test", "practice", "does", "is", "are", "any", "have", "has", "what", "which",
            "this", "that", "there", "about", "for", "from", "with", "subject", "course",
            "material", "materials", "trong", "can", "tim", "hay", "doc", "giup"
    );
    private static final Map<String, List<String>> SUBJECT_PREFIX_ALIASES = Map.of(
            "NWC", List.of("NETWORK", "NETWORKING", "COMPUTER NETWORKING", "CCNA"),
            "CCNA", List.of("NETWORK", "NETWORKING", "COMPUTER NETWORKING")
    );
    private static final double MIN_CONTEXT_SCORE = 0.35;
    private static final int MAX_AI_CONTEXT_CHARS = 8_000;

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final AiSummaryRepository aiSummaryRepository;
    private final AiChatCacheRepository chatCacheRepository;
    private final AiQueryTranslationCacheRepository translationCacheRepository;
    private final AiUsageLogRepository usageLogRepository;
    private final DocumentService documentService;
    private final WebClient pythonAiWebClient;
    private final ObjectMapper objectMapper;
    private final NamedParameterJdbcTemplate namedJdbc;

    public List<ChatSessionDto> listSessions(Integer userId) {
        return sessionRepository.findByUserId(userId);
    }

    public ChatSessionDto createSession(CreateChatSessionRequest req) {
        if (req.getDocumentId() != null) documentService.requireReadable(req.getDocumentId(), req.getUserId());
        String title = req.getSessionTitle() != null ? req.getSessionTitle() : "New Chat";
        return sessionRepository.save(req.getUserId(), req.getDocumentId(), title);
    }

    public List<ChatMessageDto> listMessages(Integer sessionId, Integer userId) {
        ChatSessionDto session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        if (userId != null && !session.userId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }
        return messageRepository.findBySessionId(sessionId);
    }

    public void deleteSession(Integer sessionId, Integer userId) {
        ChatSessionDto session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        if (userId != null && !session.userId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }
        messageRepository.deleteBySessionId(sessionId);
        sessionRepository.deleteById(sessionId);
    }

    public ChatAskResponse ask(ChatAskRequest req) {
        if (req.getDocumentId() != null) documentService.requireReadable(req.getDocumentId(), req.getUserId());
        if (req.getDocumentIds() != null) {
            req.getDocumentIds().forEach(documentId -> documentService.requireReadable(documentId, req.getUserId()));
        }

        final Integer sessionId;
        if (req.getSessionId() == null) {
            sessionId = sessionRepository.save(req.getUserId(), req.getDocumentId(), createTitle(req.getMessage())).sessionId();
        } else {
            sessionId = req.getSessionId();
            ChatSessionDto session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
            if (!session.userId().equals(req.getUserId())) {
                throw new AccessDeniedException("Access denied");
            }
        }

        messageRepository.save(sessionId, "user", req.getMessage());

        Optional<DocumentSubjectAnswer> documentSubjectAnswer = answerDocumentSubjectQuestion(req, sessionId);
        if (documentSubjectAnswer.isPresent()) {
            DocumentSubjectAnswer result = documentSubjectAnswer.get();
            messageRepository.save(sessionId, "assistant", result.answer(), toSourcesJson(result.sources()));
            rememberActiveDocument(sessionId, result.sources());
            sessionRepository.touch(sessionId);
            saveUsageLog(req, "chat_direct_answer", estimatedUsage("local", "document-subject", req.getMessage(), result.answer()),
                    req.getDocumentId(), sessionId, result.sources().size(), 0, false, true, null);
            return new ChatAskResponse(result.answer(), sessionId, result.detectedSubject(), result.sources(), false);
        }

        SubjectMatch subjectMatch = detectSubject(req.getMessage(), req.getUserId());
        RetrievalResult retrieval = searchContext(req, subjectMatch, sessionId);
        if (retrieval.translationUsage() != null || retrieval.translationCacheHit()) {
            saveUsageLog(req, "chat_translate_query", retrieval.translationUsage(), null, sessionId,
                    0, req.getMessage() == null ? 0 : req.getMessage().length(), retrieval.translationCacheHit(), true, null);
        }
        List<SummaryHit> contextHits = retrieval.hits();
        List<SourceDocumentResponse> sources = contextHits.stream().map(this::toSourceResponse).toList();
        DetectedSubjectResponse detectedSubject = contextHits.isEmpty()
                ? (subjectMatch == null ? null : new DetectedSubjectResponse(subjectMatch.subjectId(), subjectMatch.subjectName()))
                : new DetectedSubjectResponse(contextHits.get(0).subjectId(), contextHits.get(0).subjectName());

        Optional<String> notReadyAnswer = documentNotReadyAnswer(req, contextHits);
        if (notReadyAnswer.isPresent()) {
            String answer = notReadyAnswer.get();
            messageRepository.save(sessionId, "assistant", answer, toSourcesJson(sources));
            rememberActiveDocument(sessionId, sources);
            sessionRepository.touch(sessionId);
            saveUsageLog(req, "chat_document_not_ready", estimatedUsage("local", "metadata-fallback", req.getMessage(), answer),
                    req.getDocumentId(), sessionId, contextHits.size(), 0, false, true, null);
            return new ChatAskResponse(answer, sessionId, detectedSubject, sources, false);
        }

        Optional<String> directAnswer = directAnswer(req, subjectMatch, contextHits);
        if (directAnswer.isPresent()) {
            String answer = directAnswer.get();
            messageRepository.save(sessionId, "assistant", answer, toSourcesJson(sources));
            rememberActiveDocument(sessionId, sources);
            sessionRepository.touch(sessionId);
            saveUsageLog(req, "chat_direct_answer", estimatedUsage("local", "direct-answer", req.getMessage(), answer),
                    req.getDocumentId(), sessionId, contextHits.size(), contextChars(contextHits), false, true, null);
            return new ChatAskResponse(answer, sessionId, detectedSubject, sources, false);
        }

        List<SummaryHit> aiReadyHits = contextHits.stream().filter(this::hasUsableSummary).toList();
        List<SourceDocumentResponse> aiReadySources = aiReadyHits.stream().map(this::toSourceResponse).toList();
        String sourcesJson = toSourcesJson(aiReadySources);
        String cacheKey = chatCacheKey(req, aiReadySources);
        Optional<AiChatCacheRepository.CacheEntry> cachedAnswer = chatCacheRepository.find(cacheKey);
        if (cachedAnswer.isPresent()) {
            List<SourceDocumentResponse> cachedSources = parseSourcesJson(cachedAnswer.get().sourcesJson(), aiReadySources);
            messageRepository.save(sessionId, "assistant", cachedAnswer.get().answer(), cachedAnswer.get().sourcesJson());
            rememberActiveDocument(sessionId, cachedSources);
            sessionRepository.touch(sessionId);
            saveUsageLog(req, "chat_answer", null, req.getDocumentId(), sessionId,
                    aiReadyHits.size(), contextChars(aiReadyHits), true, true, null);
            return new ChatAskResponse(cachedAnswer.get().answer(), sessionId, detectedSubject, cachedSources, false);
        }

        String answer;
        boolean usedMockAi;
        Map<String, Object> usage = null;
        String errorMessage = null;
        try {
            Map<String, Object> result = pythonAiWebClient.post()
                    .uri("/api/chat/ask")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(new PythonChatAskRequest(
                            req.getMessage(),
                            sessionId,
                            aiReadyHits.stream().map(this::toPythonContextDocument).toList()
                    ))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (result != null && result.get("answer") != null) {
                answer = String.valueOf(result.get("answer"));
                usedMockAi = Boolean.TRUE.equals(result.get("used_mock_ai"));
                usage = mapValue(result.get("usage"));
            } else {
                answer = buildLocalMockAnswer(aiReadyHits);
                usedMockAi = true;
                usage = estimatedUsage("local", "empty-python-response", req.getMessage(), answer);
            }
        } catch (Exception e) {
            log.warn("Python AI service unavailable, falling back to local answer: {}", e.getMessage());
            errorMessage = e.getMessage();
            answer = buildLocalMockAnswer(aiReadyHits);
            usedMockAi = true;
            usage = estimatedUsage("local", "python-error-fallback", req.getMessage(), answer);
        }

        messageRepository.save(sessionId, "assistant", answer, sourcesJson);
        rememberActiveDocument(sessionId, aiReadySources);
        if (!usedMockAi && !aiReadyHits.isEmpty()) {
            chatCacheRepository.save(cacheKey, req.getUserId(), answer, sourcesJson);
        }
        saveUsageLog(req, "chat_answer", usage, req.getDocumentId(), sessionId,
                aiReadyHits.size(), contextChars(aiReadyHits), false, errorMessage == null, errorMessage);
        sessionRepository.touch(sessionId);
        return new ChatAskResponse(answer, sessionId, detectedSubject, aiReadySources, usedMockAi);
    }

    private String createTitle(String message) {
        String normalized = message == null ? "New AI Chat" : message.trim();
        if (normalized.isBlank()) return "New AI Chat";
        return normalized.length() > 80 ? normalized.substring(0, 80) : normalized;
    }

    private RetrievalResult searchContext(ChatAskRequest req, SubjectMatch subjectMatch, Integer sessionId) {
        List<Integer> documentIds = normalizeDocumentIds(req, sessionId);
        int topK = Math.min(req.getTopK() == null ? 3 : req.getTopK(), 3);
        List<Integer> subjectIds = req.getSubjectId() != null
                ? List.of(req.getSubjectId())
                : (subjectMatch == null ? List.of() : subjectMatch.subjectIds());
        boolean explicitSubjectScope = req.getSubjectId() != null;

        List<SummaryHit> availableHits = aiSummaryRepository.findForChatContext(req.getUserId(), subjectIds, documentIds);
        List<SummaryHit> selected = rankContext(req.getMessage(), availableHits, subjectMatch, documentIds, explicitSubjectScope, topK);
        if (!shouldTranslateForRetrieval(req.getMessage(), selected, documentIds)) {
            return new RetrievalResult(selected, null, null, false);
        }

        TranslationResult translation = translateQueryForRetrieval(req.getMessage());
        if (translation.translatedQuery().isBlank()
                || stripVietnameseMarks(translation.translatedQuery()).equals(stripVietnameseMarks(req.getMessage()))) {
            return new RetrievalResult(selected, translation.translatedQuery(), translation.usage(), translation.cacheHit());
        }

        String translatedRetrievalQuery = req.getMessage() + " " + translation.translatedQuery();
        List<SummaryHit> translatedSelected = rankContext(translatedRetrievalQuery, availableHits, subjectMatch, documentIds, explicitSubjectScope, topK);
        if (!translatedSelected.isEmpty()
                && (selected.isEmpty() || translatedSelected.get(0).score() > selected.get(0).score())) {
            return new RetrievalResult(translatedSelected, translation.translatedQuery(), translation.usage(), translation.cacheHit());
        }
        return new RetrievalResult(selected, translation.translatedQuery(), translation.usage(), translation.cacheHit());
    }

    private List<SummaryHit> rankContext(
            String query,
            List<SummaryHit> availableHits,
            SubjectMatch subjectMatch,
            List<Integer> documentIds,
            boolean explicitSubjectScope,
            int topK
    ) {
        List<SummaryHit> ranked = availableHits.stream()
                .map(hit -> hit.withScore(keywordScore(query, hit, subjectMatch)))
                .sorted(Comparator.comparing(SummaryHit::score).reversed())
                .toList();

        if (documentIds == null || documentIds.isEmpty()) {
            if (explicitSubjectScope) {
                return ranked.stream()
                        .limit(topK)
                        .toList();
            }
            return ranked.stream()
                    .filter(hit -> hit.score() >= MIN_CONTEXT_SCORE)
                    .limit(topK)
                    .toList();
        }
        return ranked.stream().limit(topK).toList();
    }

    private boolean shouldTranslateForRetrieval(String message, List<SummaryHit> hits, List<Integer> documentIds) {
        if (containsCjkText(message)) return true;
        if (documentIds != null && !documentIds.isEmpty()) return false;
        return hits.isEmpty() || hits.get(0).score() < MIN_CONTEXT_SCORE;
    }

    private boolean containsCjkText(String value) {
        return CJK_PATTERN.matcher(nullToBlank(value)).find();
    }

    private boolean isSameRetrievalQuery(String left, String right) {
        return stripVietnameseMarks(left).trim().replaceAll("\\s+", " ")
                .equals(stripVietnameseMarks(right).trim().replaceAll("\\s+", " "));
    }

    private TranslationResult translateQueryForRetrieval(String message) {
        String cacheKey = sha256("translate|" + stripVietnameseMarks(message).trim().replaceAll("\\s+", " "));
        Optional<String> cachedTranslation = translationCacheRepository.find(cacheKey);
        if (cachedTranslation.isPresent()) {
            String translatedQuery = cachedTranslation.get();
            if (!isSameRetrievalQuery(message, translatedQuery)) {
                return new TranslationResult(translatedQuery, null, true);
            }
        }

        try {
            Map<String, Object> result = pythonAiWebClient.post()
                    .uri("/api/chat/translate-query")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(Map.of("message", nullToBlank(message)))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
            if (result == null) return new TranslationResult("", null, false);
            String translatedQuery = String.valueOf(result.getOrDefault("translated_query", ""));
            if (!translatedQuery.isBlank() && !isSameRetrievalQuery(message, translatedQuery)) {
                translationCacheRepository.save(cacheKey, message, translatedQuery);
            }
            return new TranslationResult(translatedQuery, mapValue(result.get("usage")), false);
        } catch (Exception e) {
            log.warn("Could not translate chat query for retrieval: {}", e.getMessage());
            return new TranslationResult("", estimatedUsage("local", "translation-error-fallback", message, ""), false);
        }
    }

    private List<Integer> normalizeDocumentIds(ChatAskRequest req, Integer sessionId) {
        if (req.getDocumentIds() != null && !req.getDocumentIds().isEmpty()) return req.getDocumentIds();
        if (req.getDocumentId() != null) return List.of(req.getDocumentId());
        if (shouldUseReferencedDocumentContext(req.getMessage(), sessionId)) {
            return resolveReferencedDocumentId(req, sessionId)
                    .map(List::of)
                    .orElseGet(List::of);
        }
        return List.of();
    }

    private Double keywordScore(String query, SummaryHit hit, SubjectMatch subjectMatch) {
        RetrievalTerms queryTerms = retrievalTerms(expandQueryForRetrieval(query));
        if (queryTerms.all().isEmpty()) return 0.0;

        String titleText = String.join(" ", Arrays.asList(
                nullToBlank(hit.documentName()),
                nullToBlank(hit.title()),
                nullToBlank(hit.subjectCode()),
                nullToBlank(hit.subjectName())
        ));
        RetrievalTerms titleTerms = retrievalTerms(titleText);
        RetrievalTerms summaryTerms = retrievalTerms(hit.summaryContent());

        double score = 0.0;
        if (subjectMatch != null && subjectMatch.subjectIds().contains(hit.subjectId())) score += 4.0;
        for (String term : queryTerms.original()) {
            if (isStopWord(term)) continue;
            if (titleTerms.original().contains(term)) score += 2.8;
            if (summaryTerms.original().contains(term)) score += 1.2;
        }
        for (String term : queryTerms.ascii()) {
            if (isStopWord(term)) continue;
            if (titleTerms.ascii().contains(term) && !titleTerms.original().contains(term)) score += 1.8;
            if (summaryTerms.ascii().contains(term) && !summaryTerms.original().contains(term)) score += 0.7;
        }

        int usefulTermCount = (int) queryTerms.original().stream().filter(term -> !isStopWord(term)).count();
        return Math.round(score / Math.max(1, usefulTermCount) * 10_000.0) / 10_000.0;
    }

    private RetrievalTerms retrievalTerms(String text) {
        Set<String> original = tokenizePreserveMarks(text);
        Set<String> ascii = tokenizeAscii(text);
        Set<String> all = new HashSet<>(original);
        all.addAll(ascii);
        return new RetrievalTerms(original, ascii, all);
    }

    private Set<String> tokenizePreserveMarks(String text) {
        Set<String> terms = new HashSet<>();
        TOKEN_PATTERN.matcher(normalizeKeepMarks(nullToBlank(text)))
                .results()
                .map(match -> match.group().toLowerCase(Locale.ROOT))
                .forEach(terms::add);
        return terms;
    }

    private Set<String> tokenizeAscii(String text) {
        Set<String> terms = new HashSet<>();
        TOKEN_PATTERN.matcher(stripVietnameseMarks(nullToBlank(text)))
                .results()
                .map(match -> match.group().toLowerCase(Locale.ROOT))
                .forEach(terms::add);
        return terms;
    }

    private Set<String> tokenize(String text) {
        return tokenizeAscii(text);
    }

    private String expandQueryForRetrieval(String query) {
        return nullToBlank(query);
    }

    private boolean isStopWord(String term) {
        return STOP_WORDS.contains(stripVietnameseMarks(term));
    }

    private SourceDocumentResponse toSourceResponse(SummaryHit hit) {
        return new SourceDocumentResponse(
                hit.documentId(), hit.documentName(), hit.title(),
                hit.subjectId(), hit.subjectCode(), hit.subjectName(), hit.score(), preview(hit.summaryContent()),
                hit.summaryStatus(), hit.summaryError(), hasUsableSummary(hit)
        );
    }

    private PythonContextDocument toPythonContextDocument(SummaryHit hit) {
        return new PythonContextDocument(
                hit.documentId(), hit.documentName(), hit.title(),
                hit.subjectId(), hit.subjectName(), hit.score(), limitAiContext(hit.summaryContent())
        );
    }

    private String limitAiContext(String text) {
        String normalized = nullToBlank(text);
        return normalized.length() > MAX_AI_CONTEXT_CHARS
                ? normalized.substring(0, MAX_AI_CONTEXT_CHARS)
                : normalized;
    }

    private boolean hasUsableSummary(SummaryHit hit) {
        return hit != null && hit.summaryContent() != null && !hit.summaryContent().isBlank();
    }

    private Optional<String> documentNotReadyAnswer(ChatAskRequest req, List<SummaryHit> hits) {
        if (hits == null || hits.isEmpty()) return Optional.empty();
        SummaryHit bestHit = hits.get(0);
        if (hasUsableSummary(bestHit)) return Optional.empty();

        boolean explicitDocumentScope = req.getDocumentId() != null
                || (req.getDocumentIds() != null && !req.getDocumentIds().isEmpty());
        boolean explicitSubjectScope = req.getSubjectId() != null;
        if (!explicitDocumentScope && !explicitSubjectScope && bestHit.score() < MIN_CONTEXT_SCORE) return Optional.empty();

        String status = firstNonBlank(bestHit.summaryStatus(), "PENDING");
        String name = firstNonBlank(bestHit.title(), bestHit.documentName(), "this document");
        String detail = firstNonBlank(bestHit.summaryError(), "The AI summary is not ready yet.");
        return Optional.of("I found \"" + name + "\" in the selected course, but it is not ready for AI Chat yet. "
                + "Summary status: " + status + ". " + detail);
    }

    private String buildLocalMockAnswer(List<SummaryHit> hits) {
        if (hits.isEmpty()) {
            return "AI service is unavailable right now and no matching study material was found for this question.";
        }

        SummaryHit bestHit = hits.get(0);
        return "AI service is unavailable right now - here is a quick answer based on your documents.\n\n"
                + "Based on " + bestHit.documentName() + ": " + preview(bestHit.summaryContent());
    }

    private Optional<DocumentSubjectAnswer> answerDocumentSubjectQuestion(ChatAskRequest req, Integer sessionId) {
        if (!isDocumentSubjectQuestion(req.getMessage())) return Optional.empty();

        Optional<Integer> documentId = resolveReferencedDocumentId(req, sessionId);
        if (documentId.isEmpty()) {
            return Optional.of(new DocumentSubjectAnswer(
                    "Mình chưa xác định được bạn đang hỏi tài liệu nào. Hãy mở/chọn một tài liệu hoặc hỏi tiếp ngay sau câu trả lời có source.",
                    List.of(),
                    null
            ));
        }

        List<Map<String, Object>> rows = namedJdbc.queryForList("""
            SELECT TOP 1
                   d.document_id AS documentId,
                   d.document_name AS documentName,
                   d.title AS title,
                   s.subject_id AS subjectId,
                   s.subject_code AS subjectCode,
                   s.subject_name AS subjectName
            FROM dbo.DOCUMENT d
            JOIN dbo.SUBJECT s ON s.subject_id = d.subject_id
            WHERE d.document_id = :documentId
              AND (
                    d.user_id = :userId
                    OR UPPER(COALESCE(d.visibility_status, '')) = 'PUBLIC'
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.DOCUMENT_SHARE ds
                        WHERE ds.document_id = d.document_id
                          AND ds.shared_to_user_id = :userId
                          AND ds.share_type = 'USER'
                          AND ds.status = 'ACTIVE'
                    )
                  )
            """, Map.of("documentId", documentId.get(), "userId", req.getUserId()));
        if (rows.isEmpty()) {
            return Optional.of(new DocumentSubjectAnswer(
                    "Mình không tìm thấy quyền đọc hoặc thông tin môn học của tài liệu này.",
                    List.of(),
                    null
            ));
        }

        Map<String, Object> row = rows.get(0);
        String documentName = firstNonBlank(dbString(row.get("title")), dbString(row.get("documentName")), "Tài liệu này");
        String subjectCode = dbString(row.get("subjectCode"));
        String subjectName = dbString(row.get("subjectName"));
        String subjectLabel = formatSubjectLabel(subjectCode, subjectName);
        SourceDocumentResponse source = new SourceDocumentResponse(
                ((Number) row.get("documentId")).intValue(),
                dbString(row.get("documentName")),
                dbString(row.get("title")),
                ((Number) row.get("subjectId")).intValue(),
                subjectCode,
                subjectName,
                1.0,
                "Document subject metadata",
                "METADATA",
                null,
                false
        );
        return Optional.of(new DocumentSubjectAnswer(
                "Tài liệu \"" + documentName + "\" thuộc môn " + subjectLabel + ".",
                List.of(source),
                new DetectedSubjectResponse(source.subjectId(), subjectName)
        ));
    }

    private boolean isDocumentSubjectQuestion(String message) {
        Set<String> terms = tokenize(message);
        boolean asksSubject = terms.contains("mon")
                || terms.contains("subject")
                || terms.contains("course")
                || terms.contains("belongs")
                || terms.contains("belong");
        boolean referencesDocument = terms.contains("tai")
                || terms.contains("lieu")
                || terms.contains("document")
                || terms.contains("file")
                || terms.contains("this")
                || terms.contains("nay");
        return asksSubject && referencesDocument;
    }

    private boolean isReferencedDocumentQuestion(String message) {
        Set<String> terms = tokenize(message);
        boolean referencesDocument = terms.contains("document")
                || terms.contains("file")
                || (terms.contains("tai") && terms.contains("lieu"));
        boolean hasPointer = terms.contains("this")
                || terms.contains("that")
                || terms.contains("it")
                || terms.contains("nay")
                || terms.contains("do")
                || terms.contains("there");
        return referencesDocument && hasPointer;
    }

    private boolean shouldUseReferencedDocumentContext(String message, Integer sessionId) {
        if (extractSubjectMention(message).isPresent()) return false;
        if (isReferencedDocumentQuestion(message)) return true;

        Set<String> terms = tokenize(message);
        boolean hasPointer = terms.contains("this")
                || terms.contains("that")
                || terms.contains("it")
                || terms.contains("they")
                || terms.contains("there")
                || terms.contains("nay")
                || terms.contains("do")
                || terms.contains("no");
        boolean asksAboutDocumentContent = terms.contains("say")
                || terms.contains("said")
                || terms.contains("mention")
                || terms.contains("mentioned")
                || terms.contains("content")
                || terms.contains("inside")
                || terms.contains("where")
                || terms.contains("position")
                || terms.contains("location")
                || terms.contains("section")
                || terms.contains("part")
                || terms.contains("page")
                || terms.contains("noi")
                || terms.contains("noi-dung")
                || terms.contains("dung")
                || terms.contains("ben")
                || terms.contains("trong")
                || terms.contains("vi")
                || terms.contains("tri")
                || terms.contains("phan")
                || terms.contains("trang")
                || terms.contains("dau");
        if (hasPointer && asksAboutDocumentContent) return true;

        boolean asksToContinue = terms.contains("more")
                || terms.contains("detail")
                || terms.contains("explain")
                || terms.contains("elaborate")
                || terms.contains("them")
                || terms.contains("giai")
                || terms.contains("thich")
                || terms.contains("ro");
        long usefulTerms = terms.stream().filter(term -> !isStopWord(term)).count();
        if (sessionId != null && usefulTerms <= 3 && isShortDefinitionFollowUp(terms)
                && latestReferencedDocumentId(sessionId).isPresent()) {
            return true;
        }
        return asksToContinue && usefulTerms <= 3;
    }

    private boolean isShortDefinitionFollowUp(Set<String> terms) {
        return terms.contains("what")
                || terms.contains("define")
                || terms.contains("definition")
                || terms.contains("explain")
                || terms.contains("gi")
                || terms.contains("la")
                || terms.contains("thich");
    }

    private Optional<Integer> latestReferencedDocumentId(Integer sessionId) {
        if (sessionId == null) return Optional.empty();
        return messageRepository.findLatestSourcesJsonBySessionId(sessionId).stream()
                .findFirst()
                .flatMap(this::firstDocumentIdFromSourcesJson);
    }

    private Optional<Integer> resolveReferencedDocumentId(ChatAskRequest req, Integer sessionId) {
        if (req.getDocumentId() != null) return Optional.of(req.getDocumentId());
        if (req.getDocumentIds() != null && !req.getDocumentIds().isEmpty()) return Optional.of(req.getDocumentIds().get(0));
        if (sessionId == null) return Optional.empty();

        return sessionRepository.findById(sessionId)
                .map(ChatSessionDto::documentId)
                .filter(Objects::nonNull)
                .or(() -> latestReferencedDocumentId(sessionId));
    }

    private void rememberActiveDocument(Integer sessionId, List<SourceDocumentResponse> sources) {
        if (sessionId == null || sources == null || sources.isEmpty()) return;
        sources.stream()
                .map(SourceDocumentResponse::documentId)
                .filter(Objects::nonNull)
                .findFirst()
                .ifPresent(documentId -> sessionRepository.updateDocumentId(sessionId, documentId));
    }

    private Optional<Integer> firstDocumentIdFromSourcesJson(String sourcesJson) {
        try {
            List<SourceDocumentResponse> sources = objectMapper.readValue(
                    sourcesJson,
                    new TypeReference<List<SourceDocumentResponse>>() {}
            );
            return sources.stream()
                    .map(SourceDocumentResponse::documentId)
                    .filter(Objects::nonNull)
                    .findFirst();
        } catch (Exception e) {
            log.warn("Could not parse latest chat sources: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> directAnswer(ChatAskRequest req, SubjectMatch subjectMatch, List<SummaryHit> contextHits) {
        Optional<String> explicitSubject = extractSubjectMention(req.getMessage());
        SubjectMatch effectiveSubjectMatch = subjectMatch != null
                ? subjectMatch
                : subjectMatchFromContext(explicitSubject.orElse(null), contextHits);

        if (explicitSubject.isPresent() && effectiveSubjectMatch == null && contextHits.isEmpty()) {
            return Optional.of("Không tìm thấy tài liệu của " + explicitSubject.get()
                    + " trong Library/AI_SUMMARY hiện tại, nên mình không dùng tài liệu môn khác để trả lời.");
        }

        boolean subjectMentioned = effectiveSubjectMatch != null || explicitSubject.isPresent();
        if (isQuizQuestion(req.getMessage()) && effectiveSubjectMatch != null) {
            QuizStats quizStats = findQuizStats(effectiveSubjectMatch.subjectIds(), req.getUserId());
            if (quizStats.quizCount() > 0) {
                return Optional.of("Có. " + effectiveSubjectMatch.displayName() + " hiện có " + quizStats.quizCount()
                        + " practice test/quiz với tổng " + quizStats.totalQuestions() + " câu hỏi.");
            }
            QuizDocumentStats quizDocumentStats = findQuizDocumentStats(effectiveSubjectMatch.subjectIds(), req.getUserId());
            if (quizDocumentStats.documentCount() > 0) {
                return Optional.of("Có. " + effectiveSubjectMatch.displayName() + " hiện có " + quizDocumentStats.documentCount()
                        + " tài liệu quiz/test, ví dụ: " + quizDocumentStats.sampleTitle()
                        + ". Tài liệu này chưa nhất thiết đã được generate thành practice test trong AI_QUESTION.");
            }
            return Optional.of("Chưa tìm thấy quiz/practice test nào cho " + effectiveSubjectMatch.displayName()
                    + " trong dữ liệu hiện tại.");
        }

        if (subjectMentioned && contextHits.isEmpty()) {
            String subjectLabel = effectiveSubjectMatch != null ? effectiveSubjectMatch.displayName() : explicitSubject.orElse("mon nay");
            return Optional.of("Không tìm thấy tài liệu của " + subjectLabel
                    + " trong Library/AI_SUMMARY hiện tại, nên mình không dùng tài liệu môn khác để trả lời.");
        }

        return Optional.empty();
    }

    private SubjectMatch subjectMatchFromContext(String subjectLabel, List<SummaryHit> contextHits) {
        if (contextHits == null || contextHits.isEmpty()) return null;
        List<Integer> subjectIds = contextHits.stream()
                .map(SummaryHit::subjectId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (subjectIds.isEmpty()) return null;

        SummaryHit first = contextHits.stream()
                .filter(hit -> Objects.equals(hit.subjectId(), subjectIds.get(0)))
                .findFirst()
                .orElse(contextHits.get(0));
        String displayCode = subjectLabel == null || subjectLabel.isBlank()
                ? nullToBlank(first.subjectCode())
                : subjectLabel;
        return new SubjectMatch(subjectIds, displayCode, first.subjectName());
    }

    private boolean isQuizQuestion(String message) {
        Set<String> terms = tokenize(message);
        return terms.contains("quiz")
                || terms.contains("test")
                || terms.contains("practice")
                || terms.contains("kiemtra")
                || (terms.contains("kiem") && terms.contains("tra"));
    }

    private Optional<String> extractSubjectCode(String message) {
        return SUBJECT_CODE_PATTERN.matcher(nullToBlank(message).toUpperCase(Locale.ROOT))
                .results()
                .map(match -> match.group().toUpperCase(Locale.ROOT))
                .findFirst();
    }

    private Optional<String> extractSubjectPrefix(String message) {
        return subjectPrefixCandidates(message).stream()
                .findFirst();
    }

    private Optional<String> extractSubjectMention(String message) {
        Optional<String> code = extractSubjectCode(message);
        return code.isPresent() ? code : extractSubjectPrefix(message);
    }

    private SubjectMatch detectSubject(String message, Integer userId) {
        Optional<String> code = extractSubjectCode(message);
        if (code.isPresent()) return findSubjectsByCode(code.get(), false, userId);

        return subjectPrefixCandidates(message).stream()
                .map(prefix -> findSubjectsByCode(prefix, true, userId))
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private List<String> subjectPrefixCandidates(String message) {
        return TOKEN_PATTERN.matcher(nullToBlank(message))
                .results()
                .map(match -> match.group())
                .map(this::subjectPrefixCandidate)
                .flatMap(Optional::stream)
                .distinct()
                .toList();
    }

    private Optional<String> subjectPrefixCandidate(String rawToken) {
        String token = nullToBlank(rawToken).trim();
        if (token.isBlank()) return Optional.empty();

        String normalized = stripVietnameseMarks(token);
        String upper = normalized.toUpperCase(Locale.ROOT);
        if (!SUBJECT_PREFIX_PATTERN.matcher(upper).matches()) return Optional.empty();
        if (isStopWord(upper)) return Optional.empty();
        if (SUBJECT_PREFIX_ALIASES.containsKey(upper)) return Optional.of(upper);

        boolean typedAsAcronym = token.equals(token.toUpperCase(Locale.ROOT)) && token.matches("[A-Z0-9]+");
        if (typedAsAcronym) return Optional.of(upper);
        return Optional.empty();
    }

    private SubjectMatch findSubjectsByCode(String codeOrPrefix, boolean prefixSearch, Integer userId) {
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        params.put("code", codeOrPrefix);
        params.put("prefixSearch", prefixSearch ? 1 : 0);

        StringBuilder aliasClause = new StringBuilder();
        List<String> aliasTerms = prefixSearch ? subjectAliasTerms(codeOrPrefix) : List.of();
        for (int i = 0; i < aliasTerms.size(); i++) {
            String key = "alias" + i;
            params.put(key, "%" + aliasTerms.get(i).toUpperCase(Locale.ROOT) + "%");
            aliasClause.append("""
                    OR UPPER(COALESCE(s.subject_name, '')) LIKE :%1$s
                    OR UPPER(COALESCE(d.title, '')) LIKE :%1$s
                    OR UPPER(COALESCE(d.document_name, '')) LIKE :%1$s
                    """.formatted(key));
        }

        String sql = """
            SELECT s.subject_id AS subjectId,
                   s.subject_code AS subjectCode,
                   s.subject_name AS subjectName
            FROM dbo.SUBJECT s
            LEFT JOIN dbo.USER_SUBJECT us ON us.subject_id = s.subject_id AND us.user_id = :userId
            LEFT JOIN dbo.DOCUMENT d ON d.subject_id = s.subject_id
                AND (
                    d.user_id = :userId
                    OR UPPER(COALESCE(d.visibility_status, '')) = 'PUBLIC'
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.DOCUMENT_SHARE ds
                        WHERE ds.document_id = d.document_id
                          AND ds.shared_to_user_id = :userId
                          AND ds.share_type = 'USER'
                          AND ds.status = 'ACTIVE'
                    )
                )
            WHERE (:prefixSearch = 0 AND (
                    UPPER(COALESCE(s.subject_code, '')) = :code
                    OR UPPER(COALESCE(s.subject_name, '')) LIKE CONCAT('%', :code, '%')
                  ))
               OR (:prefixSearch = 1 AND (
                    UPPER(COALESCE(s.subject_code, '')) LIKE CONCAT(:code, '%')
                    OR UPPER(COALESCE(s.subject_name, '')) LIKE CONCAT('%', :code, '%')
                    __ALIAS_CLAUSE__
                  ))
            ORDER BY CASE WHEN us.user_subject_id IS NOT NULL OR d.document_id IS NOT NULL THEN 0 ELSE 1 END,
                     s.subject_id
            """.replace("__ALIAS_CLAUSE__", aliasClause.toString());
        List<Map<String, Object>> rows = namedJdbc.queryForList(sql, params);
        if (rows.isEmpty()) return null;

        List<Integer> subjectIds = rows.stream()
                .map(row -> ((Number) row.get("subjectId")).intValue())
                .distinct()
                .toList();
        Map<String, Object> first = rows.get(0);
        return new SubjectMatch(
                subjectIds,
                prefixSearch ? codeOrPrefix : dbString(first.get("subjectCode")),
                dbString(first.get("subjectName"))
        );
    }

    private List<String> subjectAliasTerms(String codeOrPrefix) {
        return SUBJECT_PREFIX_ALIASES.getOrDefault(nullToBlank(codeOrPrefix).toUpperCase(Locale.ROOT), List.of());
    }

    private QuizStats findQuizStats(List<Integer> subjectIds, Integer userId) {
        if (subjectIds == null || subjectIds.isEmpty()) return new QuizStats(0, 0);

        Map<String, Object> params = new HashMap<>();
        params.put("subjectIds", subjectIds);
        params.put("userId", userId);

        Map<String, Object> row = namedJdbc.queryForMap("""
            SELECT COUNT(DISTINCT aq.question_id) AS quizCount,
                   COALESCE(SUM(aq.total_question), 0) AS totalQuestions
            FROM dbo.AI_QUESTION aq
            JOIN dbo.DOCUMENT d ON d.document_id = aq.document_id
            WHERE d.subject_id IN (:subjectIds)
              AND (
                    d.user_id = :userId
                    OR UPPER(COALESCE(d.visibility_status, '')) = 'PUBLIC'
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.DOCUMENT_SHARE ds
                        WHERE ds.document_id = d.document_id
                          AND ds.shared_to_user_id = :userId
                          AND ds.share_type = 'USER'
                          AND ds.status = 'ACTIVE'
                    )
                  )
            """, params);
        return new QuizStats(
                ((Number) row.get("quizCount")).intValue(),
                ((Number) row.get("totalQuestions")).intValue()
        );
    }

    private QuizDocumentStats findQuizDocumentStats(List<Integer> subjectIds, Integer userId) {
        if (subjectIds == null || subjectIds.isEmpty()) return new QuizDocumentStats(0, "");

        Map<String, Object> params = new HashMap<>();
        params.put("subjectIds", subjectIds);
        params.put("userId", userId);

        Map<String, Object> row = namedJdbc.queryForMap("""
            SELECT COUNT(*) AS documentCount,
                   COALESCE(MIN(COALESCE(NULLIF(d.title, ''), d.document_name)), '') AS sampleTitle
            FROM dbo.DOCUMENT d
            WHERE d.subject_id IN (:subjectIds)
              AND (
                    UPPER(COALESCE(d.title, '')) LIKE '%QUIZ%'
                    OR UPPER(COALESCE(d.document_name, '')) LIKE '%QUIZ%'
                    OR UPPER(COALESCE(d.title, '')) LIKE '%TEST%'
                    OR UPPER(COALESCE(d.document_name, '')) LIKE '%TEST%'
                    OR UPPER(COALESCE(d.title, '')) LIKE '%EXAM%'
                    OR UPPER(COALESCE(d.document_name, '')) LIKE '%EXAM%'
                    OR UPPER(COALESCE(d.title, '')) LIKE '%PRACTICE%'
                    OR UPPER(COALESCE(d.document_name, '')) LIKE '%PRACTICE%'
                  )
              AND (
                    d.user_id = :userId
                    OR UPPER(COALESCE(d.visibility_status, '')) = 'PUBLIC'
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.DOCUMENT_SHARE ds
                        WHERE ds.document_id = d.document_id
                          AND ds.shared_to_user_id = :userId
                          AND ds.share_type = 'USER'
                          AND ds.status = 'ACTIVE'
                    )
                  )
            """, params);
        return new QuizDocumentStats(
                ((Number) row.get("documentCount")).intValue(),
                dbString(row.get("sampleTitle"))
        );
    }

    private String preview(String text) {
        String normalized = nullToBlank(text);
        return normalized.length() > 240 ? normalized.substring(0, 240) : normalized;
    }

    private String stripVietnameseMarks(String value) {
        String prepared = nullToBlank(value).replace('\u0111', 'd').replace('\u0110', 'D');
        String normalized = Normalizer.normalize(prepared.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replace("đ", "d");
    }

    private String normalizeKeepMarks(String value) {
        return Normalizer.normalize(nullToBlank(value).toLowerCase(Locale.ROOT), Normalizer.Form.NFC);
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    private String formatSubjectLabel(String subjectCode, String subjectName) {
        if (subjectCode != null && !subjectCode.isBlank() && subjectName != null && !subjectName.isBlank()) {
            return subjectCode + " - " + subjectName;
        }
        return firstNonBlank(subjectCode, subjectName, "môn học này");
    }

    private String dbString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String toSourcesJson(List<SourceDocumentResponse> sources) {
        if (sources == null || sources.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(sources);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize chat sources: {}", e.getMessage());
            return null;
        }
    }

    private List<SourceDocumentResponse> parseSourcesJson(String sourcesJson, List<SourceDocumentResponse> fallback) {
        if (sourcesJson == null || sourcesJson.isBlank()) return fallback;
        try {
            return objectMapper.readValue(sourcesJson, new TypeReference<List<SourceDocumentResponse>>() {});
        } catch (Exception e) {
            log.warn("Could not parse cached chat sources: {}", e.getMessage());
            return fallback;
        }
    }

    private String chatCacheKey(ChatAskRequest req, List<SourceDocumentResponse> sources) {
        String sourceIds = sources.stream()
                .map(SourceDocumentResponse::documentId)
                .filter(Objects::nonNull)
                .map(String::valueOf)
                .reduce("", (left, right) -> left.isBlank() ? right : left + "," + right);
        String raw = nullToBlank(String.valueOf(req.getUserId()))
                + "|" + stripVietnameseMarks(req.getMessage()).trim().replaceAll("\\s+", " ")
                + "|" + sourceIds;
        return sha256(raw);
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(nullToBlank(value).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mapValue(Object value) {
        if (value instanceof Map<?, ?> rawMap) {
            Map<String, Object> result = new HashMap<>();
            rawMap.forEach((key, mapValue) -> {
                if (key != null) result.put(String.valueOf(key), mapValue);
            });
            return result;
        }
        return null;
    }

    private Map<String, Object> estimatedUsage(String provider, String modelName, String prompt, String answer) {
        int promptTokens = estimateTokens(prompt);
        int completionTokens = estimateTokens(answer);
        Map<String, Object> usage = new HashMap<>();
        usage.put("provider", provider);
        usage.put("model_name", modelName);
        usage.put("prompt_tokens", promptTokens);
        usage.put("completion_tokens", completionTokens);
        usage.put("total_tokens", promptTokens + completionTokens);
        usage.put("estimated", true);
        return usage;
    }

    private int estimateTokens(String text) {
        return Math.max(1, Math.round(nullToBlank(text).length() / 4.0f));
    }

    private int contextChars(List<SummaryHit> hits) {
        if (hits == null || hits.isEmpty()) return 0;
        return hits.stream()
                .map(SummaryHit::summaryContent)
                .filter(Objects::nonNull)
                .mapToInt(text -> Math.min(text.length(), MAX_AI_CONTEXT_CHARS))
                .sum();
    }

    private void saveUsageLog(
            ChatAskRequest req,
            String feature,
            Map<String, Object> usage,
            Integer documentId,
            Integer sessionId,
            Integer contextCount,
            Integer contextChars,
            boolean cacheHit,
            boolean success,
            String errorMessage
    ) {
        try {
            usageLogRepository.save(
                    req.getUserId(),
                    feature,
                    usage,
                    documentId,
                    sessionId,
                    contextCount,
                    contextChars,
                    cacheHit,
                    success,
                    errorMessage
            );
        } catch (Exception e) {
            log.warn("Could not save AI usage log: {}", e.getMessage());
        }
    }

    private record SubjectMatch(List<Integer> subjectIds, String subjectCode, String subjectName) {
        Integer subjectId() {
            return subjectIds == null || subjectIds.isEmpty() ? null : subjectIds.get(0);
        }

        String displayName() {
            if (subjectCode != null && !subjectCode.isBlank()) return subjectCode;
            return subjectName == null || subjectName.isBlank() ? "mon nay" : subjectName;
        }
    }

    private record QuizStats(int quizCount, int totalQuestions) {}

    private record QuizDocumentStats(int documentCount, String sampleTitle) {}

    private record RetrievalResult(
            List<SummaryHit> hits,
            String translatedQuery,
            Map<String, Object> translationUsage,
            boolean translationCacheHit
    ) {}

    private record TranslationResult(String translatedQuery, Map<String, Object> usage, boolean cacheHit) {}

    private record RetrievalTerms(Set<String> original, Set<String> ascii, Set<String> all) {}

    private record DocumentSubjectAnswer(
            String answer,
            List<SourceDocumentResponse> sources,
            DetectedSubjectResponse detectedSubject
    ) {}
}
