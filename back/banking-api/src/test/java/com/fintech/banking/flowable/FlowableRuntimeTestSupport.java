package com.fintech.banking.flowable;

import com.fintech.banking.config.IntegrationTestConfig;
import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.entity.User;
import com.fintech.banking.domain.enums.AccountStatus;
import com.fintech.banking.domain.enums.UserRole;
import com.fintech.banking.domain.enums.UserStatus;
import com.fintech.banking.repository.AccountRepository;
import com.fintech.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.UUID;

abstract class FlowableRuntimeTestSupport extends IntegrationTestConfig {

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected AccountRepository accountRepository;

    protected User createUser() {
        String unique = UUID.randomUUID().toString();
        return userRepository.save(User.builder()
                .name("Workflow test user")
                .email("flowable-" + unique + "@example.test")
                .password("test-password")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .active(true)
                .build());
    }

    protected User createAdmin() {
        String unique = UUID.randomUUID().toString();
        return userRepository.save(User.builder()
                .name("Workflow test admin")
                .email("flowable-admin-" + unique + "@example.test")
                .password("test-password")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .active(true)
                .build());
    }

    protected Account createAccount(User user, BigDecimal balance) {
        return accountRepository.save(Account.builder()
                .user(user)
                .agency("TEST")
                .number(UUID.randomUUID().toString().replace("-", "").substring(0, 16))
                .balance(balance)
                .status(AccountStatus.ACTIVE)
                .build());
    }
}
