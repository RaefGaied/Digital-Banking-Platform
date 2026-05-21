package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CardRepository extends JpaRepository<Card, UUID> {
    List<Card> findByUserIdAndActiveTrue(UUID userId);
}
