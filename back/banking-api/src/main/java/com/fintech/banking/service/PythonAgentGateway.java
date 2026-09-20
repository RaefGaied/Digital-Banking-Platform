package com.fintech.banking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class PythonAgentGateway {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${ai.agent.enabled:false}")
    private boolean enabled;

    @Value("${ai.agent.base-url:http://ai-agent:8001}")
    private String baseUrl;

    public PythonAgentGateway(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(1))
                .build();
    }

    public Optional<String> ask(String query, String bearerToken) {
        if (!enabled || query == null || query.isBlank() || bearerToken == null || bearerToken.isBlank()) {
            return Optional.empty();
        }

        try {
            String body = objectMapper.writeValueAsString(Map.of("query", query));
            log.debug("Sending Python agent chat payload: {}", body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl.replaceAll("/$", "") + "/chat"))
                    .timeout(Duration.ofSeconds(3))
                    .header("Authorization", bearerToken.startsWith("Bearer ") ? bearerToken : "Bearer " + bearerToken)
                    .header("Content-Type", "application/json")
                    .header("X-Agent-Query", query)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body.getBytes(StandardCharsets.UTF_8)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Python agent returned HTTP {}: {}", response.statusCode(), response.body());
                return Optional.empty();
            }

            JsonNode reply = objectMapper.readTree(response.body()).path("reply");
            if (reply.isTextual() && !reply.asText().isBlank()
                    && !reply.asText().startsWith("⚠️ System issue")) {
                return Optional.of(reply.asText());
            }
        } catch (Exception ex) {
            log.warn("Python agent unavailable; using Java fallback: {}", ex.getMessage());
        }
        return Optional.empty();
    }
}
