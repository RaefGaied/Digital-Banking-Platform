package com.fintech.banking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagKnowledgeService {

    private final JdbcTemplate jdbcTemplate;
    private final KnowledgeBaseService knowledgeBaseService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public RagKnowledgeService() {
        this.jdbcTemplate = null;
        this.knowledgeBaseService = new KnowledgeBaseService();
    }

    @Value("${ai.openai.api-key:}")
    private String apiKey;

    @Value("${ai.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${ai.openai.embedding-model:text-embedding-3-small}")
    private String embeddingModel;

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
                    SELECT metadata ->> 'title' AS title,
                           metadata ->> 'content' AS content,
                           metadata ->> 'source' AS source,
                           1 - (embedding <=> CAST(? AS vector)) AS score
                    FROM embeddings
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(? AS vector)
                    LIMIT ?
                    """,
                    (rs, rowNum) -> {
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
            );

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

    public void indexDocument(String title, String content, String source) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("OpenAI API key missing. Skipping RAG embedding generation for {}.", title);
            return;
        }

        try {
            String embedding = embedText(content);
            if (embedding == null || embedding.isBlank()) {
                return;
            }

            jdbcTemplate.update(
                    """
                    INSERT INTO embeddings (metadata, embedding)
                    VALUES (CAST(? AS JSONB), CAST(? AS vector))
                    """,
                    String.format("{\"title\":%s,\"content\":%s,\"source\":%s}",
                            quoteJson(title),
                            quoteJson(content),
                            quoteJson(source)),
                    embedding
            );
        } catch (Exception e) {
            log.warn("Unable to index knowledge document {}: {}", title, e.getMessage());
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

    private String embedText(String text) throws Exception {
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }

        String requestBody = String.format(
                "{\"model\":\"%s\",\"input\":\"%s\"}",
                embeddingModel,
                text.replace("\\", "\\\\").replace("\"", "\\\"")
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) + "/embeddings" : baseUrl + "/embeddings"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("OpenAI embeddings request failed with status " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode data = root.path("data");
        if (data == null || !data.isArray() || data.isEmpty()) {
            throw new IllegalStateException("OpenAI embedding response did not contain data[].");
        }

        JsonNode embedding = data.get(0).path("embedding");
        if (embedding == null || embedding.isMissingNode() || !embedding.isArray()) {
            throw new IllegalStateException("OpenAI embedding response did not contain a valid embedding vector.");
        }

        return embedding.toString();
    }

    private String quoteJson(String value) {
        if (value == null) {
            return "\"\"";
        }
        String safe = value.replace("\\", "\\\\").replace("\"", "\\\"");
        return "\"" + safe + "\"";
    }
}
