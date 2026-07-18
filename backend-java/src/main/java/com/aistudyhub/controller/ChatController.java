package com.aistudyhub.controller;

import com.aistudyhub.dto.request.*;
import com.aistudyhub.dto.response.*;
import com.aistudyhub.service.ChatService;
import com.aistudyhub.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final CurrentUser currentUser;

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionDto>> listSessions(@RequestParam Integer userId) {
        return ResponseEntity.ok(chatService.listSessions(currentUser.id()));
    }

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionDto> createSession(@Valid @RequestBody CreateChatSessionRequest req) {
        req.setUserId(currentUser.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.createSession(req));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageDto>> listMessages(
            @PathVariable Integer sessionId,
            @RequestParam(required = false) Integer userId) {
        return ResponseEntity.ok(chatService.listMessages(sessionId, currentUser.id()));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(
            @PathVariable Integer sessionId,
            @RequestParam(required = false) Integer userId) {
        chatService.deleteSession(sessionId, currentUser.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ask")
    public ResponseEntity<ChatAskResponse> ask(@Valid @RequestBody ChatAskRequest req) {
        req.setUserId(currentUser.id());
        return ResponseEntity.ok(chatService.ask(req));
    }
}
