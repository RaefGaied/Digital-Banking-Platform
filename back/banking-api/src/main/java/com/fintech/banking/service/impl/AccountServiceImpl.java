package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.dto.response.AccountResponse;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.AccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    @Override
    @Cacheable(value = "accounts", key = "#email")
    public AccountResponse getMyAccount(String email) {
        log.info("[CACHE] Cache miss - loading account from database for: {}", email);
        var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        var accounts = accountRepository.findByUserId(user.getId());
        if (accounts.isEmpty()) {
            throw new IllegalArgumentException("Account not found");
        }

        Account account = accounts.get(0);

        return AccountResponse.builder()
                .id(account.getId())
                .agency(account.getAgency())
                .number(account.getNumber())
                .balance(account.getBalance())
                .status(account.getStatus())
                .ownerName(user.getName())
                .createdAt(account.getCreatedAt())
                .build();
    }
}
