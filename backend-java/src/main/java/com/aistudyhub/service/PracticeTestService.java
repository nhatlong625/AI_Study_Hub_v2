package com.aistudyhub.service;

import com.aistudyhub.dto.python.PythonQuizGenerateRequest;
import com.aistudyhub.dto.quiz.PracticeTestGenerateRequest;
import com.aistudyhub.dto.quiz.PracticeTestSubmitRequest;
import com.aistudyhub.dto.quiz.SaveProgressRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.aistudyhub.exception.BadRequestException;
import com.aistudyhub.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PracticeTestService {
    private final NamedParameterJdbcTemplate jdbc;
    private final DocumentService documentService;
    private final WebClient pythonAiWebClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> list(Integer userId) {
        return jdbc.queryForList("""
            SELECT aq.question_id AS id, aq.title, aq.description,
                   aq.total_question AS questions, aq.time_limit AS timeLimit,
                   CONVERT(NVARCHAR(19), aq.created_at, 120) AS createdAt,
                   d.document_id AS documentId, d.title AS sourceTitle, d.document_name AS sourceName,
                   sub.subject_name AS course,
                   latest.attempt_id AS attemptId,
                   latest.score AS score,
                   CASE WHEN latest.status = 'Completed' THEN 'Completed' ELSE 'Ready' END AS status
            FROM dbo.AI_QUESTION aq
            JOIN dbo.DOCUMENT d ON d.document_id = aq.document_id
            JOIN dbo.SUBJECT sub ON sub.subject_id = d.subject_id
            OUTER APPLY (
                SELECT TOP 1 ta.attempt_id, ta.score, ta.status
                FROM dbo.TEST_ATTEMPT ta
                WHERE ta.question_id = aq.question_id AND ta.user_id = :userId
                ORDER BY ta.attempt_id DESC
            ) latest
            WHERE d.user_id = :userId
            ORDER BY aq.question_id DESC
            """, Map.of("userId", userId)).stream().map(this::testShape).toList();
    }

    public Map<String, Object> get(Integer id) {
        Map<String, Object> test = testHeader(id);
        test.put("questions", questions(id, false));
        return test;
    }

    /**
     *
     *
     */
    public Map<String, Object> getResult(Integer attemptId) {
        // Normalized note.
        List<Map<String, Object>> attemptRows = jdbc.queryForList("""
            SELECT ta.attempt_id AS attemptId,
                   ta.question_id AS testId,
                   ta.score AS score,
                   CONVERT(NVARCHAR(19), ta.start_time, 120) AS startTime,
                   CONVERT(NVARCHAR(19), ta.end_time, 120) AS endTime,
                   DATEDIFF(second, ta.start_time, ta.end_time) AS timeSpentSeconds,
                   tr.total_question AS total,
                   tr.correct_answer AS correct,
                   tr.grade AS grade,
                   aq.title AS title,
                   d.title AS sourceTitle,
                   d.document_name AS sourceName,
                   sub.subject_name AS course
            FROM dbo.TEST_ATTEMPT ta
            JOIN dbo.TEST_RESULT tr ON tr.attempt_id = ta.attempt_id
            JOIN dbo.AI_QUESTION aq ON aq.question_id = ta.question_id
            JOIN dbo.DOCUMENT d ON d.document_id = aq.document_id
            JOIN dbo.SUBJECT sub ON sub.subject_id = d.subject_id
            WHERE ta.attempt_id = :attemptId
            """, Map.of("attemptId", attemptId));

        if (attemptRows.isEmpty()) throw new ResourceNotFoundException("Attempt not found: " + attemptId);
        Map<String, Object> attempt = new LinkedHashMap<>(attemptRows.get(0));

        Integer testId = number(attempt.get("testId")).intValue();
        int total = number(attempt.get("total")).intValue();
        int correct = number(attempt.get("correct")).intValue();
        attempt.put("wrong", total - correct);
        attempt.put("source", attempt.get("sourceTitle") != null ? attempt.get("sourceTitle") : attempt.get("sourceName"));

        // Normalized note.
        List<Map<String, Object>> questionRows = jdbc.queryForList("""
            SELECT qt.quiz_id AS id,
                   qt.question_content AS question,
                   qt.question_type AS type,
                   qt.difficulty_level AS difficulty,
                   qt.correct_answer AS correctAnswer
            FROM dbo.QUIZ_TEST qt
            WHERE qt.question_id = :testId
            ORDER BY qt.quiz_id
            """, Map.of("testId", testId));

        // Normalized note.
        List<Map<String, Object>> userAnswerRows = jdbc.queryForList("""
            SELECT ua.question_id AS quizId,
                   ua.selected_answer AS selectedAnswer,
                   ua.is_correct AS isCorrect,
                   ua.option_id AS selectedOptionId
            FROM dbo.USER_ANSWER ua
            WHERE ua.attempt_id = :attemptId
            """, Map.of("attemptId", attemptId));

        // Normalized note.
        Map<Integer, Map<String, Object>> userAnswerMap = new LinkedHashMap<>();
        for (Map<String, Object> ua : userAnswerRows) {
            userAnswerMap.put(number(ua.get("quizId")).intValue(), ua);
        }

        List<Map<String, Object>> questionResults = new ArrayList<>();
        for (Map<String, Object> row : questionRows) {
            Map<String, Object> q = new LinkedHashMap<>(row);
            Integer quizId = number(row.get("id")).intValue();

            // Normalized note.
            List<Map<String, Object>> options = jdbc.queryForList("""
                SELECT option_id AS id, option_content AS content, is_correct AS isCorrect
                FROM dbo.ANSWER_OPTION
                WHERE question_id = :quizId
                ORDER BY option_id
                """, Map.of("quizId", quizId)).stream().map(opt -> {
                    Map<String, Object> o = new LinkedHashMap<>(opt);
                    return o;
                }).toList();
            q.put("options", options);

            // Normalized note.
            Map<String, Object> ua = userAnswerMap.get(quizId);
            if (ua != null) {
                q.put("selectedAnswer", ua.get("selectedAnswer"));
                q.put("selectedOptionId", ua.get("selectedOptionId"));
                q.put("isCorrect", ua.get("isCorrect"));
            } else {
                q.put("selectedAnswer", null);
                q.put("selectedOptionId", null);
                q.put("isCorrect", false);
            }

            questionResults.add(q);
        }

        attempt.put("questions", questionResults);
        return attempt;
    }

    /**
     *
     *
     */
    @Transactional
    public Map<String, Object> saveProgress(Integer testId, SaveProgressRequest request) {
        String answersJson;
        try {
            answersJson = request.getAnswers() == null ? "{}" : objectMapper.writeValueAsString(request.getAnswers());
        } catch (JsonProcessingException e) {
            answersJson = "{}";
        }

        // Normalized note.
        List<Map<String, Object>> existing = jdbc.queryForList("""
            SELECT TOP 1 attempt_id FROM dbo.TEST_ATTEMPT
            WHERE question_id = :testId AND user_id = :userId AND status = 'In Progress'
            ORDER BY attempt_id DESC
            """, params("testId", testId).addValue("userId", request.getUserId()));

        if (existing.isEmpty()) {
            // Normalized note.
            Integer attemptId = jdbc.queryForObject("""
                INSERT INTO dbo.TEST_ATTEMPT
                    (user_id, test_id, question_id, start_time, end_time, score, status, last_question_index, answers_snapshot)
                OUTPUT INSERTED.attempt_id
                VALUES (:userId, :testId, :testId, DATEADD(second, -:seconds, GETDATE()), NULL, NULL, 'In Progress', :lastIndex, :snapshot)
                """, params("userId", request.getUserId())
                    .addValue("testId", testId)
                    .addValue("seconds", request.getTimeSpentSeconds() == null ? 0 : request.getTimeSpentSeconds())
                    .addValue("lastIndex", request.getLastQuestionIndex())
                    .addValue("snapshot", answersJson), Integer.class);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("attemptId", attemptId);
            return result;
        } else {
            Integer attemptId = number(existing.get(0).get("attempt_id")).intValue();
            jdbc.update("""
                UPDATE dbo.TEST_ATTEMPT
                SET last_question_index = :lastIndex,
                    answers_snapshot = :snapshot,
                    start_time = DATEADD(second, -:seconds, GETDATE())
                WHERE attempt_id = :attemptId
                """, params("lastIndex", request.getLastQuestionIndex())
                    .addValue("snapshot", answersJson)
                    .addValue("seconds", request.getTimeSpentSeconds() == null ? 0 : request.getTimeSpentSeconds())
                    .addValue("attemptId", attemptId));

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("attemptId", attemptId);
            return result;
        }
    }

    /**
     *
     */
    public List<Map<String, Object>> getInProgress(Integer userId) {
        return jdbc.queryForList("""
            SELECT ta.attempt_id AS attemptId,
                   ta.question_id AS testId,
                   ta.last_question_index AS lastQuestionIndex,
                   ta.answers_snapshot AS answersSnapshot,
                   DATEDIFF(second, ta.start_time, GETDATE()) AS timeSpentSeconds,
                   aq.title AS title,
                   aq.time_limit AS timeLimit,
                   aq.total_question AS totalQuestions,
                   sub.subject_name AS course
            FROM dbo.TEST_ATTEMPT ta
            JOIN dbo.AI_QUESTION aq ON aq.question_id = ta.question_id
            JOIN dbo.DOCUMENT d ON d.document_id = aq.document_id
            JOIN dbo.SUBJECT sub ON sub.subject_id = d.subject_id
            WHERE ta.user_id = :userId AND ta.status = 'In Progress'
            ORDER BY ta.attempt_id DESC
            """, Map.of("userId", userId));
    }

    @Transactional
    public Map<String, Object> generate(PracticeTestGenerateRequest request) {
        if (request.getUserId() == null) {
            throw new BadRequestException("User id is required to generate a practice test.");
        }
        Map<String, Object> doc = documentRow(request.getDocumentId());
        Integer ownerId = number(doc.get("userId")).intValue();
        if (!ownerId.equals(request.getUserId())) {
            throw new BadRequestException("This document does not belong to the selected student.");
        }
        // Quiz limit check.
        checkQuizLimit(request.getUserId());

        String text = resolveQuizSourceText(request.getDocumentId(), ownerId);
        String title = blank(request.getTitle())
                ? String.valueOf(doc.get("title")) + " Practice Test"
                : request.getTitle().trim();

        Map<String, Object> aiResult;
        try {
            aiResult = pythonAiWebClient.post()
                    .uri("/api/quiz/generate")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(new PythonQuizGenerateRequest(
                            request.getDocumentId(),
                            String.valueOf(doc.get("documentName")),
                            title,
                            text,
                            request.getTotalQuestions(),
                            request.getQuestionType(),
                            request.getDifficulty()))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            throw new BadRequestException("AI quiz generation service unavailable: " + e.getMessage());
        }

        List<Map<String, Object>> generatedQuestions = extractQuestions(aiResult);
        if (generatedQuestions.isEmpty()) {
            throw new BadRequestException("AI service returned no quiz questions.");
        }

        Integer testId = jdbc.queryForObject("""
            INSERT INTO dbo.AI_QUESTION (document_id, title, description, total_question, time_limit, created_at)
            OUTPUT INSERTED.question_id
            VALUES (:documentId, :title, :description, :totalQuestion, :timeLimit, GETDATE())
            """, params("documentId", request.getDocumentId())
                .addValue("title", title)
                .addValue("description", "Generated from " + doc.get("documentName"))
                .addValue("totalQuestion", generatedQuestions.size())
                .addValue("timeLimit", request.getTimeLimit()), Integer.class);

        for (Map<String, Object> question : generatedQuestions) {
            saveQuestion(testId, question, request);
        }

        return get(testId);
    }

    @Transactional
    public Map<String, Object> submit(Integer testId, PracticeTestSubmitRequest request) {
        Map<String, Object> test = testHeader(testId);
        List<Map<String, Object>> questions = questions(testId, true);
        if (questions.isEmpty()) throw new ResourceNotFoundException("Practice test has no questions.");

        int correct = 0;
        Map<Integer, Integer> answers = request.getAnswers() == null ? Map.of() : request.getAnswers();

        for (Map<String, Object> question : questions) {
            Integer selected = answers.get(number(question.get("id")).intValue());
            if (selected != null && Boolean.TRUE.equals(optionById(question, selected).get("isCorrect"))) {
                correct++;
            }
        }

        BigDecimal score = BigDecimal.valueOf(correct * 100.0 / questions.size()).setScale(2, RoundingMode.HALF_UP);

        // Normalized note.
        List<Map<String, Object>> existing = jdbc.queryForList("""
            SELECT TOP 1 attempt_id FROM dbo.TEST_ATTEMPT
            WHERE question_id = :testId AND user_id = :userId AND status = 'In Progress'
            ORDER BY attempt_id DESC
            """, params("testId", testId).addValue("userId", request.getUserId()));

        Integer attemptId;
        if (!existing.isEmpty()) {
            attemptId = number(existing.get(0).get("attempt_id")).intValue();
            jdbc.update("""
                UPDATE dbo.TEST_ATTEMPT
                SET end_time = GETDATE(),
                    score = :score,
                    status = 'Completed',
                    answers_snapshot = NULL,
                    last_question_index = 0
                WHERE attempt_id = :attemptId
                """, params("score", score).addValue("attemptId", attemptId));
        } else {
            attemptId = jdbc.queryForObject("""
                INSERT INTO dbo.TEST_ATTEMPT
                    (user_id, test_id, question_id, start_time, end_time, score, status, last_question_index, answers_snapshot)
                OUTPUT INSERTED.attempt_id
                VALUES (:userId, :firstQuizId, :testId, DATEADD(second, -:seconds, GETDATE()), GETDATE(), :score, 'Completed', 0, NULL)
                """, params("userId", request.getUserId())
                    .addValue("firstQuizId", questions.get(0).get("id"))
                    .addValue("testId", testId)
                    .addValue("seconds", request.getTimeSpentSeconds() == null ? 0 : request.getTimeSpentSeconds())
                    .addValue("score", score), Integer.class);
        }

        for (Map<String, Object> question : questions) {
            Integer quizId = number(question.get("id")).intValue();
            Integer selected = answers.get(quizId);
            if (selected == null) continue;
            Map<String, Object> option = optionById(question, selected);
            jdbc.update("""
                INSERT INTO dbo.USER_ANSWER (attempt_id, question_id, option_id, selected_answer, is_correct, answered_at)
                VALUES (:attemptId, :quizId, :optionId, :selectedAnswer, :isCorrect, GETDATE())
                """, params("attemptId", attemptId)
                    .addValue("quizId", quizId)
                    .addValue("optionId", selected)
                    .addValue("selectedAnswer", option.getOrDefault("content", ""))
                    .addValue("isCorrect", Boolean.TRUE.equals(option.get("isCorrect"))));
        }

        jdbc.update("""
            INSERT INTO dbo.TEST_RESULT (attempt_id, total_question, correct_answer, score, grade, generated_at)
            VALUES (:attemptId, :totalQuestion, :correctAnswer, :score, :grade, GETDATE())
            """, params("attemptId", attemptId)
                .addValue("totalQuestion", questions.size())
                .addValue("correctAnswer", correct)
                .addValue("score", score)
                .addValue("grade", grade(score)));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("attemptId", attemptId);
        result.put("testId", testId);
        result.put("title", test.get("title"));
        result.put("total", questions.size());
        result.put("correct", correct);
        result.put("wrong", questions.size() - correct);
        result.put("score", score);
        result.put("grade", grade(score));
        return result;
    }

    private void saveQuestion(Integer testId, Map<String, Object> question, PracticeTestGenerateRequest request) {
        String content = str(question.get("question"), "Untitled question");
        String type = str(question.get("type"), request.getQuestionType());
        String difficulty = str(question.get("difficulty"), request.getDifficulty());
        String correctAnswer = str(question.get("correctAnswer"), str(question.get("correct_answer"), ""));

        Integer quizId = jdbc.queryForObject("""
            INSERT INTO dbo.QUIZ_TEST (question_id, question_content, question_type, correct_answer, difficulty_level)
            OUTPUT INSERTED.quiz_id
            VALUES (:testId, :content, :type, :correctAnswer, :difficulty)
            """, params("testId", testId)
                .addValue("content", content)
                .addValue("type", type)
                .addValue("correctAnswer", correctAnswer)
                .addValue("difficulty", difficulty), Integer.class);

        List<?> rawOptions = question.get("options") instanceof List<?> list ? list : List.of();
        if (rawOptions.isEmpty() && !blank(correctAnswer)) {
            rawOptions = List.of(correctAnswer);
        }

        for (Object rawOption : rawOptions) {
            String optionContent;
            boolean isCorrect = false;
            if (rawOption instanceof Map<?, ?> map) {
                optionContent = str(map.get("content"), str(map.get("text"), ""));
                Object correct = map.get("isCorrect") == null ? map.get("is_correct") : map.get("isCorrect");
                isCorrect = Boolean.TRUE.equals(correct) || "true".equalsIgnoreCase(String.valueOf(correct));
            } else {
                optionContent = String.valueOf(rawOption);
            }
            if (blank(optionContent)) continue;
            if (!blank(correctAnswer) && optionContent.trim().equalsIgnoreCase(correctAnswer.trim())) {
                isCorrect = true;
            }
            jdbc.update("""
                INSERT INTO dbo.ANSWER_OPTION (question_id, option_content, is_correct)
                VALUES (:quizId, :content, :isCorrect)
                """, params("quizId", quizId).addValue("content", optionContent).addValue("isCorrect", isCorrect));
        }
    }

    private Map<String, Object> testHeader(Integer id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT aq.question_id AS id, aq.title, aq.description,
                   aq.total_question AS totalQuestions, aq.time_limit AS timeLimit,
                   CONVERT(NVARCHAR(19), aq.created_at, 120) AS createdAt,
                   d.document_id AS documentId, d.title AS sourceTitle, d.document_name AS sourceName,
                   sub.subject_name AS course
            FROM dbo.AI_QUESTION aq
            JOIN dbo.DOCUMENT d ON d.document_id = aq.document_id
            JOIN dbo.SUBJECT sub ON sub.subject_id = d.subject_id
            WHERE aq.question_id = :id
            """, Map.of("id", id));
        if (rows.isEmpty()) throw new ResourceNotFoundException("Practice test not found: " + id);
        return new LinkedHashMap<>(rows.get(0));
    }

    private List<Map<String, Object>> questions(Integer testId, boolean includeCorrect) {
        List<Map<String, Object>> questionRows = jdbc.queryForList("""
            SELECT quiz_id AS id, question_content AS question, question_type AS type,
                   difficulty_level AS difficulty, correct_answer AS correctAnswer
            FROM dbo.QUIZ_TEST
            WHERE question_id = :testId
            ORDER BY quiz_id
            """, Map.of("testId", testId));

        List<Map<String, Object>> shaped = new ArrayList<>();
        for (Map<String, Object> row : questionRows) {
            Map<String, Object> question = new LinkedHashMap<>(row);
            List<Map<String, Object>> options = jdbc.queryForList("""
                SELECT option_id AS id, option_content AS content, is_correct AS isCorrect
                FROM dbo.ANSWER_OPTION
                WHERE question_id = :quizId
                ORDER BY option_id
                """, Map.of("quizId", row.get("id"))).stream().map(option -> {
                Map<String, Object> shapedOption = new LinkedHashMap<>(option);
                if (!includeCorrect) shapedOption.remove("isCorrect");
                return shapedOption;
            }).toList();
            if (!includeCorrect) question.remove("correctAnswer");
            question.put("options", options);
            shaped.add(question);
        }
        return shaped;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractQuestions(Map<String, Object> aiResult) {
        if (aiResult == null || !(aiResult.get("questions") instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(Map.class::isInstance)
                .map(item -> (Map<String, Object>) item)
                .toList();
    }

    private Map<String, Object> documentRow(Integer documentId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT document_id AS documentId, user_id AS userId, title, document_name AS documentName
            FROM dbo.DOCUMENT
            WHERE document_id = :documentId
            """, Map.of("documentId", documentId));
        if (rows.isEmpty()) throw new ResourceNotFoundException("Document not found: " + documentId);
        return rows.get(0);
    }

    private String resolveQuizSourceText(Integer documentId, Integer ownerId) {
        List<String> summaries = jdbc.queryForList("""
            SELECT TOP 1 summary_content
            FROM dbo.AI_SUMMARY
            WHERE document_id = :documentId
              AND model_name = 'python-ai-service-full'
              AND summary_content NOT LIKE 'AI quota/rate limit has been reached.%'
              AND summary_content NOT LIKE 'Mock mode is active%'
              AND summary_content NOT LIKE 'Demo mode is active%'
            ORDER BY
              CASE WHEN user_id = :ownerId THEN 0 ELSE 1 END,
              created_at DESC,
              summary_id DESC
            """, params("documentId", documentId).addValue("ownerId", ownerId), String.class);
        if (!summaries.isEmpty() && !blank(summaries.get(0))) {
            return summaries.get(0);
        }

        String extractedText = documentService.getAiReadableText(documentId);
        if (blank(extractedText) || extractedText.trim().length() < 20) {
            throw new BadRequestException("This document does not contain enough readable text to generate a quiz. Please upload a text-based PDF/DOCX/PPTX or generate a summary first.");
        }
        return extractedText;
    }

    private Map<String, Object> testShape(Map<String, Object> row) {
        Map<String, Object> shaped = new LinkedHashMap<>(row);
        shaped.put("source", row.get("sourceTitle") == null ? row.get("sourceName") : row.get("sourceTitle"));
        return shaped;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> optionById(Map<String, Object> question, Integer optionId) {
        List<Map<String, Object>> options = (List<Map<String, Object>>) question.get("options");
        return options.stream()
                .filter(option -> number(option.get("id")).intValue() == optionId)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Invalid answer option: " + optionId));
    }

    private MapSqlParameterSource params(String key, Object value) {
        return new MapSqlParameterSource(key, value);
    }

    private BigDecimal number(Object value) {
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (value == null) return BigDecimal.ZERO;
        return new BigDecimal(String.valueOf(value));
    }

    private String grade(BigDecimal score) {
        if (score.compareTo(BigDecimal.valueOf(85)) >= 0) return "Excellent";
        if (score.compareTo(BigDecimal.valueOf(70)) >= 0) return "Good";
        if (score.compareTo(BigDecimal.valueOf(50)) >= 0) return "Review";
        return "Needs Practice";
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private String str(Object value, String fallback) {
        return value == null || String.valueOf(value).isBlank() ? fallback : String.valueOf(value);
    }

    // Normalized note.

    private void checkQuizLimit(Integer userId) {
        List<Map<String, Object>> planRows = jdbc.queryForList("""
                SELECT TOP 1 pv.max_quiz_per_month
                FROM dbo.USER_SUBSCRIPTION us
                JOIN dbo.SUBSCRIPTION_PLAN_VERSION pv ON pv.version_id = us.version_id
                WHERE us.user_id = :userId AND us.status = 'Active'
                ORDER BY us.end_date DESC, us.subscription_id DESC
                """, Map.of("userId", userId));

        int maxQuiz = planRows.isEmpty()
                ? 10
                : ((Number) planRows.get(0).get("max_quiz_per_month")).intValue();

        if (maxQuiz == -1) return;

        List<Map<String, Object>> countRows = jdbc.queryForList("""
                SELECT COUNT(*) AS cnt
                FROM dbo.AI_QUESTION aq
                JOIN dbo.DOCUMENT d ON d.document_id = aq.document_id
                WHERE d.user_id = :userId
                  AND YEAR(aq.created_at)  = YEAR(GETDATE())
                  AND MONTH(aq.created_at) = MONTH(GETDATE())
                """, Map.of("userId", userId));

        int used = countRows.isEmpty()
                ? 0
                : ((Number) countRows.get(0).get("cnt")).intValue();

        if (used >= maxQuiz) {
            throw new BadRequestException("QUIZ_LIMIT_REACHED:" + used + ":" + maxQuiz);
        }
    }
}
