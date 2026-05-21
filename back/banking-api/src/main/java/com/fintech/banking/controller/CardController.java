package com.fintech.banking.controller;

import com.fintech.banking.dto.request.CreateCardRequest;
import com.fintech.banking.dto.response.CardResponse;
import com.fintech.banking.service.CardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @GetMapping
    public ResponseEntity<List<CardResponse>> getMyCards(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(cardService.getMyCards(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<CardResponse> createCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateCardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cardService.createCard(userDetails.getUsername(), request));
    }

    @PutMapping("/{cardId}")
    public ResponseEntity<CardResponse> updateCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID cardId,
            @Valid @RequestBody CreateCardRequest request) {
        return ResponseEntity.ok(cardService.updateCard(userDetails.getUsername(), cardId, request));
    }

    @DeleteMapping("/{cardId}")
    public ResponseEntity<Void> deleteCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID cardId) {
        cardService.deleteCard(userDetails.getUsername(), cardId);
        return ResponseEntity.noContent().build();
    }
}
