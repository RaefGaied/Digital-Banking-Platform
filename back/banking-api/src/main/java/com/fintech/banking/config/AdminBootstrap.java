package com.fintech.banking.config;

import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.UserRole;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Profile("local")
@Order(0)
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String adminEmail = "admin@finbank.local";

        if (userRepository.existsByEmail(adminEmail)) {
            return;
        }

        User admin = User.builder()
            .name("Admin User")
            .email(adminEmail)
            .password(passwordEncoder.encode("Admin@1234!"))
            .role(UserRole.ADMIN)
            .status(UserStatus.ACTIVE)
            .active(true)
            .build();

        userRepository.save(admin);
        log.info("Seeded local admin account: {}", adminEmail);
    }
}