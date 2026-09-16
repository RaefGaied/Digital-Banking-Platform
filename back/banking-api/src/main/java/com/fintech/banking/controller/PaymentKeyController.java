package com.fintech.banking.controller;

import com.fintech.banking.dto.request.PaymentTransferRequest;
import com.fintech.banking.dto.request.RegisterPaymentKeyRequest;
import com.fintech.banking.dto.response.PaymentKeyResponse;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.service.PaymentKeyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pix")
@RequiredArgsConstructor
public class PaymentKeyController {

    private final PaymentKeyService paymentKeyService;


    @PostMapping("/keys")
    public ResponseEntity<PaymentKeyResponse> registerKey(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RegisterPaymentKeyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentKeyService.registerKey(userDetails.getUsername(), request));
    }

    @GetMapping("/keys")
    public ResponseEntity<List<PaymentKeyResponse>> getMyKeys(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(paymentKeyService.getMyKeys(userDetails.getUsername()));
    }

    @GetMapping("/keys/{pixKey}")
    public ResponseEntity<PaymentKeyResponse> findKey(@PathVariable("pixKey") String keyValue) {
        return ResponseEntity.ok(paymentKeyService.findKey(keyValue));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentTransferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentKeyService.transfer(userDetails.getUsername(), request));
    }
}
