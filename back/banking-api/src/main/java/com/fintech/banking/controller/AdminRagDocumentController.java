package com.fintech.banking.controller;

import com.fintech.banking.domain.entity.RagDocument;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.RagDocumentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminRagDocumentController {

    private final RagDocumentService ragDocumentService;
    private final UserRepository userRepository;

    @GetMapping("/rag-documents")
    public ResponseEntity<List<RagDocument>> list(Authentication authentication) {
        requireAdmin(authentication);
        return ResponseEntity.ok(ragDocumentService.listAll());
    }

    @PostMapping("/rag-documents")
    public ResponseEntity<RagDocument> create(Authentication authentication,
                                            @Valid @RequestBody CreateRequest request) {
        requireAdmin(authentication);
        RagDocument saved = ragDocumentService.create(request.title(), request.content(), request.source(), request.active());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/rag-documents/{id}")
    public ResponseEntity<RagDocument> update(Authentication authentication,
                                            @PathVariable Long id,
                                            @Valid @RequestBody UpdateRequest request) {
        requireAdmin(authentication);
        RagDocument saved = ragDocumentService.update(id, request.title(), request.content(), request.source(), request.active());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/rag-documents/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        requireAdmin(authentication);
        ragDocumentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rag-documents/{id}/reindex")
    public ResponseEntity<RagDocument> reindex(Authentication authentication, @PathVariable Long id) {
        requireAdmin(authentication);
        return ResponseEntity.ok(ragDocumentService.reindex(id));
    }

    private void requireAdmin(Authentication authentication) {
        if (authentication == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Admin access required");
        }

        boolean isAdmin = userRepository.findByEmail(authentication.getName())
                .map(user -> user.getRole().name().equals("ADMIN"))
                .orElse(false);
        if (!isAdmin) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    public record CreateRequest(
            @NotBlank(message = "Title is required") String title,
            @NotBlank(message = "Content is required") String content,
            String source,
            Boolean active
    ) {}

    public record UpdateRequest(
            @NotBlank(message = "Title is required") String title,
            @NotBlank(message = "Content is required") String content,
            String source,
            Boolean active
    ) {}
}
