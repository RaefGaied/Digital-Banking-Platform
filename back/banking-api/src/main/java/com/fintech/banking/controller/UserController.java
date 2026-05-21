package com.fintech.banking.controller;

import com.fintech.banking.dto.request.ChangePasswordRequest;
import com.fintech.banking.dto.response.UserResponse;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        var accounts = accountRepository.findByUserId(user.getId());
        var account = accounts.isEmpty() ? null : accounts.get(0);
        return ResponseEntity.ok(UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .agency(account != null ? account.getAgency() : null)
                .accountNumber(account != null ? account.getNumber() : null)
                .createdAt(user.getCreatedAt())
                .build());
    }

    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request) {
        var user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }
}