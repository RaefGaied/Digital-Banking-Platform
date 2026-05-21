package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.PixKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PixKeyRepository extends JpaRepository<PixKey, UUID> {

    Optional<PixKey> findByKeyValueAndActiveTrue(String keyValue);

    List<PixKey> findByUserIdAndActiveTrue(UUID userId);

    boolean existsByKeyValue(String keyValue);
}
