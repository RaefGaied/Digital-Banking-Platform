package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Investment;
import com.fintech.banking.domain.enums.InvestmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, UUID> {
    List<Investment> findByUserIdAndStatus(UUID userId, InvestmentStatus status);
    List<Investment> findByUserId(UUID userId);
}
