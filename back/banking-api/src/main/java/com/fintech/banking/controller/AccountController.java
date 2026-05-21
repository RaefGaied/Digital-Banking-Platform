package com.fintech.banking.controller;

import com.fintech.banking.dto.response.AccountResponse;
import com.fintech.banking.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/me")
    public ResponseEntity<AccountResponse> getMyAccount(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(accountService.getMyAccount(userDetails.getUsername()));
    }
}
