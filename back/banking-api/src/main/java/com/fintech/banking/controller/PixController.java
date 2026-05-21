package com.fintech.banking.controller;

import com.fintech.banking.dto.request.PixTransferRequest;
import com.fintech.banking.dto.request.RegisterPixKeyRequest;
import com.fintech.banking.dto.response.PixKeyResponse;
import com.fintech.banking.dto.response.TransactionResponse;
import com.fintech.banking.service.PixService;
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
public class PixController {

    private final PixService pixService;

    @PostMapping("/keys")
    public ResponseEntity<PixKeyResponse> registerKey(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RegisterPixKeyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pixService.registerKey(userDetails.getUsername(), request));
    }

    @GetMapping("/keys")
    public ResponseEntity<List<PixKeyResponse>> getMyKeys(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(pixService.getMyKeys(userDetails.getUsername()));
    }

    @GetMapping("/keys/{pixKey}")
    public ResponseEntity<PixKeyResponse> findKey(@PathVariable String pixKey) {
        return ResponseEntity.ok(pixService.findKey(pixKey));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PixTransferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pixService.transfer(userDetails.getUsername(), request));
    }
}
