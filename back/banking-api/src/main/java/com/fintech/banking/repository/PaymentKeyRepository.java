package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.PaymentKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentKeyRepository extends JpaRepository<PaymentKey, UUID> {

    Optional<PaymentKey> findByKeyValueAndActiveTrue(String keyValue);

    List<PaymentKey> findByUserIdAndActiveTrue(UUID userId);

    boolean existsByKeyValue(String keyValue);
}
