package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.TransactionStatus;
import com.fintech.banking.domain.enums.TransactionType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findBySourceAccountIdOrderByCreatedAtDesc(UUID accountId);
    List<Transaction> findByTargetAccountIdOrderByCreatedAtDesc(UUID accountId);

    @Query("""
        SELECT t FROM Transaction t
        WHERE t.sourceAccount.id = :accountId
           OR t.targetAccount.id = :accountId
        ORDER BY t.createdAt DESC
    """)
    List<Transaction> findAllByAccountId(@Param("accountId") UUID accountId);

    List<Transaction> findByStatus(TransactionStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select transaction from Transaction transaction where transaction.id = :id")
    java.util.Optional<Transaction> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select transaction from Transaction transaction
            where transaction.type = :type
              and transaction.status = :status
              and transaction.withdrawalCodeHash is not null
              and transaction.withdrawalCodeExpiresAt <= :now
            """)
    List<Transaction> findExpiredPendingWithdrawals(
            @Param("type") TransactionType type,
            @Param("status") TransactionStatus status,
            @Param("now") LocalDateTime now);
}