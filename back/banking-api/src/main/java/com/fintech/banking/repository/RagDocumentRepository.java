package com.fintech.banking.repository;

import com.fintech.banking.domain.entity.RagDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RagDocumentRepository extends JpaRepository<RagDocument, Long> {
    List<RagDocument> findAllByOrderByUpdatedAtDesc();
    List<RagDocument> findByActiveTrueOrderByUpdatedAtDesc();
}
