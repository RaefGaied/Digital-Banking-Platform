package com.fintech.banking.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

/**
 * RAG knowledge search backed by pgvector. Embeddings are generated locally through
 * Spring AI's Ollama {@link EmbeddingModel} (nomic-embed-text, 768 dimensions), as
 * required by the cahier des charges (zero-cost, no external API). The static
 * file-based {@link KnowledgeBaseService} is the last-resort fallback used when no
 * embedding provider is available or the vector search returns no result above the
 * similarity threshold.
 */
@Service
@Slf4j
public class RagKnowledgeService {

    private final JdbcTemplate jdbcTemplate;
    private final KnowledgeBaseService knowledgeBaseService;
    private final ObjectProvider<EmbeddingModel> embeddingModelProvider;

    @Value("${rag.similarity-threshold:0.72}")
    private double similarityThreshold = 0.72;

    public RagKnowledgeService(JdbcTemplate jdbcTemplate,
                                KnowledgeBaseService knowledgeBaseService,
                                ObjectProvider<EmbeddingModel> embeddingModelProvider) {
        this.jdbcTemplate = jdbcTemplate;
        this.knowledgeBaseService = knowledgeBaseService;
        this.embeddingModelProvider = embeddingModelProvider;
    }

    /** Test-only constructor: forces the file-based knowledge fallback. */
    public RagKnowledgeService() {
        this.jdbcTemplate = null;
        this.knowledgeBaseService = new KnowledgeBaseService();
        this.embeddingModelProvider = null;
    }

    public List<String> search(String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        if (jdbcTemplate == null) {
            return fallbackSearch(query, limit);
        }

        try {
            String embedding = embedText(query);
            if (embedding == null || embedding.isBlank()) {
                return fallbackSearch(query, limit);
            }

            List<String> rows = jdbcTemplate.query(
                    """
                    SELECT title, content, source,
                           1 - (embedding <=> CAST(? AS vector)) AS score
                    FROM rag_documents
                    WHERE active = TRUE AND embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(? AS vector)
                    LIMIT ?
                    """,
                    (rs, rowNum) -> {
                        double score = rs.getDouble("score");
                        if (score < similarityThreshold) {
                            return null;
                        }
                        String title = rs.getString("title");
                        String content = rs.getString("content");
                        String source = rs.getString("source");
                        StringBuilder builder = new StringBuilder();
                        if (title != null && !title.isBlank()) {
                            builder.append("Q: ").append(title).append("\n");
                        }
                        if (source != null && !source.isBlank()) {
                            builder.append("Source: ").append(source).append("\n");
                        }
                        if (content != null && !content.isBlank()) {
                            builder.append("A: ").append(content);
                        }
                        return builder.toString().trim();
                    },
                    embedding,
                    embedding,
                    limit
            ).stream().filter(Objects::nonNull).toList();

            if (rows.isEmpty()) {
                return fallbackSearch(query, limit);
            }
            return rows;
        } catch (Exception e) {
            log.warn("Falling back to file-based knowledge search for query '{}': {}", query, e.getMessage());
            return fallbackSearch(query, limit);
        }
    }

    public String buildContextSnippet(String query) {
        List<String> results = search(query, 3);
        if (results.isEmpty()) {
            return "";
        }
        return String.join("\n\n", results);
    }

    /**
     * Computes and persists the embedding for a RAG document. Called after a document
     * is created or updated through {@link RagDocumentService} (BF-A08).
     */
    public void embedAndStore(Long documentId, String content) {
        if (jdbcTemplate == null || documentId == null || content == null || content.isBlank()) {
            return;
        }
        try {
            String embedding = embedText(content);
            if (embedding == null || embedding.isBlank()) {
                log.debug("No embedding provider available; RAG document {} stored without a vector.", documentId);
                return;
            }
            jdbcTemplate.update(
                    "UPDATE rag_documents SET embedding = CAST(? AS vector) WHERE id = ?",
                    embedding, documentId);
        } catch (Exception e) {
            log.warn("Unable to embed RAG document {}: {}", documentId, e.getMessage());
        }
    }

    private List<String> fallbackSearch(String query, int limit) {
        KnowledgeBaseService effectiveService = knowledgeBaseService != null ? knowledgeBaseService : new KnowledgeBaseService();
        List<String> results = effectiveService.search(query);
        if (results == null || results.isEmpty()) {
            return List.of();
        }
        return results.stream().limit(Math.max(1, limit)).toList();
    }

    /** Embeds text locally via the Ollama embedding model (nomic-embed-text, 768 dims). */
    private String embedText(String text) {
        EmbeddingModel embeddingModel = embeddingModelProvider != null ? embeddingModelProvider.getIfAvailable() : null;
        if (embeddingModel == null) {
            return null;
        }
        try {
            float[] vector = embeddingModel.embed(text);
            return toVectorLiteral(vector);
        } catch (Exception e) {
            log.warn("Ollama embedding request failed: {}", e.getMessage());
            return null;
        }
    }

    private String toVectorLiteral(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(vector[i]);
        }
        return sb.append(']').toString();
    }
}
