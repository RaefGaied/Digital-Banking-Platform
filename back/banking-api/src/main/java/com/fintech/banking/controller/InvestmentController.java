package com.fintech.banking.controller;

import com.fintech.banking.dto.request.CreateInvestmentRequest;
import com.fintech.banking.dto.response.InvestmentResponse;
import com.fintech.banking.service.InvestmentService;
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
@RequestMapping("/investments")
@RequiredArgsConstructor
public class InvestmentController {

    private final InvestmentService investmentService;

    @GetMapping
    public ResponseEntity<List<InvestmentResponse>> getMyInvestments(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(investmentService.getMyInvestments(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<InvestmentResponse> invest(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateInvestmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(investmentService.invest(userDetails.getUsername(), request));
    }

    @PostMapping("/{investmentId}/redeem")
    public ResponseEntity<InvestmentResponse> redeem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID investmentId) {
        return ResponseEntity.ok(investmentService.redeem(userDetails.getUsername(), investmentId));
    }
}
