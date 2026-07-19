package com.aistudyhub.controller;

import com.aistudyhub.dto.response.LibraryOverviewResponse;
import com.aistudyhub.service.LibraryService;
import com.aistudyhub.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/library")
@RequiredArgsConstructor
public class LibraryController {
    private final LibraryService libraryService;
    private final CurrentUser currentUser;

    @GetMapping("/users/{userId}")
    public ResponseEntity<LibraryOverviewResponse> getOverview(@PathVariable Integer userId) {
        return ResponseEntity.ok(libraryService.getOverview(currentUser.id()));
    }
}
