package com.fintech.banking.controller;

import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.service.DocumentExtractionService;
import com.fintech.banking.service.IntentDetectionService;
import com.fintech.banking.service.RagKnowledgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final IntentDetectionService intentDetectionService;
    private final RagKnowledgeService ragKnowledgeService;
    private final DocumentExtractionService documentExtractionService;

    @PostMapping("/intent")
    public ResponseEntity<IntentResult> detectIntent(@RequestBody Map<String, String> payload) {
        String message = payload.getOrDefault("message", payload.getOrDefault("text", ""));
        IntentResult result = intentDetectionService.detectIntent(message);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, Object>> ask(@RequestBody Map<String, String> payload) {
        String question = payload.getOrDefault("question", payload.getOrDefault("query", "")).trim();
        if (question.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "question", "",
                    "matches", List.of(),
                    "context", "",
                    "intent", null,
                    "hasResults", false,
                    "error", "Question is required"
            ));
        }

        List<String> matches = ragKnowledgeService.search(question, 5);
        String context = String.join("\n\n", matches);
        IntentResult intentResult = intentDetectionService.detectIntent(question);

        Map<String, Object> response = new HashMap<>();
        response.put("question", question);
        response.put("matches", matches);
        response.put("context", context);
        response.put("intent", intentResult != null ? intentResult.getIntent() : null);
        response.put("confidence", intentResult != null ? intentResult.getConfidence() : null);
        response.put("hasResults", !matches.isEmpty());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/extract-document")
    public ResponseEntity<Map<String, Object>> extractDocument(
            @RequestParam(value = "text", required = false) String text,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {

        Map<String, String> extracted = (file != null && !file.isEmpty())
                ? documentExtractionService.extractFromMultipart(file)
                : documentExtractionService.extractFromText(text);

        Map<String, Object> response = new HashMap<>();
        response.put("fields", extracted);
        response.put("documentType", extracted.getOrDefault("documentType", "GENERAL"));
        response.put("hasData", !extracted.isEmpty());
        return ResponseEntity.ok(response);
    }
}
