package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.BankingAgent;
import com.fintech.banking.domain.enums.AgentDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankingAgentRepository extends JpaRepository<BankingAgent, UUID> {
    Optional<BankingAgent> findBySessionId(UUID sessionId);

    List<BankingAgent> findByUserId(UUID userId);

    List<BankingAgent> findByDecision(AgentDecision decision);

    List<BankingAgent> findByDefaultPolicy(AgentDecision defaultPolicy);

    Optional<BankingAgent> findBySessionIdAndUserId(UUID sessionId, UUID userId);
}
