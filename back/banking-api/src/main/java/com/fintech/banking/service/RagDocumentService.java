package com.fintech.banking.service;

import com.fintech.banking.domain.entity.RagDocument;
import com.fintech.banking.repository.RagDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RagDocumentService {

    private final RagDocumentRepository ragDocumentRepository;

    public List<RagDocument> listAll() {
        return ragDocumentRepository.findAllByOrderByUpdatedAtDesc();
    }

    public List<RagDocument> listActive() {
        return ragDocumentRepository.findByActiveTrueOrderByUpdatedAtDesc();
    }

    @Transactional
    public RagDocument create(String title, String content, String source, Boolean active) {
        String safeTitle = trimToNull(title);
        String safeContent = trimToNull(content);
        if (safeTitle == null || safeContent == null) {
            throw new IllegalArgumentException("Title and content are required");
        }

        RagDocument document = RagDocument.builder()
                .title(safeTitle)
                .content(safeContent)
                .source(trimToNull(source))
                .active(active == null || active)
                .build();

        return ragDocumentRepository.save(document);
    }

    @Transactional
    public RagDocument update(Long id, String title, String content, String source, Boolean active) {
        RagDocument document = ragDocumentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("RAG document not found: " + id));

        document.setTitle(trimToNull(title, document.getTitle()));
        document.setContent(trimToNull(content, document.getContent()));
        document.setSource(trimToNull(source, document.getSource()));
        document.setActive(active == null ? document.getActive() : active);

        return ragDocumentRepository.save(document);
    }

    @Transactional
    public void delete(Long id) {
        ragDocumentRepository.deleteById(id);
    }

    private String trimToNull(String value) {
        return trimToNull(value, null);
    }

    private String trimToNull(String value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }
}
