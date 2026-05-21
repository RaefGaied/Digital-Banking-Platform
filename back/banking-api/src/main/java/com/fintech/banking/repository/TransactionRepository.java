package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

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
}