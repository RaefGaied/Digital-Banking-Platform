package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Account;
import com.fintech.banking.domain.enums.AccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {
    List<Account> findByUserId(UUID userId);
    Optional<Account> findByNumber(String number);
    boolean existsByNumber(String number);
    List<Account> findByUserIdAndStatus(UUID userId, AccountStatus status);
}