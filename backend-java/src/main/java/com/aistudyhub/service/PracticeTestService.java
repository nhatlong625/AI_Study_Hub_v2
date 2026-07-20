package com.aistudyhub.service;

import com.aistudyhub.dto.quiz.PracticeTestGenerateRequest;
import com.aistudyhub.dto.quiz.PracticeTestSubmitRequest;
import com.aistudyhub.dto.quiz.SaveProgressRequest;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class PracticeTestService {

    public List<Map<String, Object>> list(Integer userId) {
        return Collections.emptyList();
    }

    public Map<String, Object> get(Integer id) {
        return Collections.emptyMap();
    }

    public List<Map<String, Object>> getInProgress(Integer userId) {
        return Collections.emptyList();
    }

    public Map<String, Object> generate(PracticeTestGenerateRequest request) {
        return Collections.emptyMap();
    }

    public Map<String, Object> saveProgress(Integer id, SaveProgressRequest request) {
        return Collections.emptyMap();
    }

    public Map<String, Object> submit(Integer id, PracticeTestSubmitRequest request) {
        return Collections.emptyMap();
    }

    public Map<String, Object> getResult(Integer attemptId) {
        return Collections.emptyMap();
    }
}
