package com.fintech.banking.service;

import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenCredential;
import com.azure.core.credential.TokenRequestContext;
import com.azure.identity.ClientSecretCredentialBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Objects;

@Service
@Primary
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${azure.openai.endpoint:}')")
public class OpenAIIntentDetectionService implements IntentDetectionService {

    private static final String AZURE_OPENAI_SCOPE = "https://cognitiveservices.azure.com/.default";

    private final String endpoint;
    private final String deploymentName;
    private final String apiVersion;
    private final String apiKey;
    private final String clientId;
    private final String clientSecret;
    private final String tenantId;
    private final String model;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public OpenAIIntentDetectionService(
            @Value("${azure.openai.endpoint}") String endpoint,
            @Value("${azure.openai.deployment-name}") String deploymentName,
            @Value("${azure.openai.api-version:2024-06-01}") String apiVersion,
            @Value("${azure.openai.api-key:}") String apiKey,
            @Value("${azure.client-id:}") String clientId,
            @Value("${azure.client-secret:}") String clientSecret,
            @Value("${azure.tenant-id:}") String tenantId,
            @Value("${azure.openai.model:gpt-4o}") String model) {
        this.endpoint = endpoint;
        this.deploymentName = deploymentName;
        this.apiVersion = apiVersion;
        this.apiKey = apiKey;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tenantId = tenantId;
        this.model = model;
    }

    @Override
    public IntentResult detectIntent(String text) {
        if (text == null || text.isBlank()) return null;

        try {
            String system = "Tu es un assistant bancaire. Retourne uniquement un JSON avec les champs: intent, parameters, confidence (0-1), message (optionnel).";

            String body = mapper.createObjectNode()
                    .put("model", model)
                    .set("messages", mapper.createArrayNode()
                            .add(mapper.createObjectNode().put("role", "system").put("content", system))
                            .add(mapper.createObjectNode().put("role", "user").put("content", text))
                    ).toString();

                String authorizationHeaderName;
                String authorizationHeaderValue;
                if (apiKey != null && !apiKey.isBlank()) {
                authorizationHeaderName = "api-key";
                authorizationHeaderValue = apiKey;
                } else {
                authorizationHeaderName = "Authorization";
                authorizationHeaderValue = "Bearer " + resolveAzureAccessToken();
                }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(buildAzureOpenAiUrl()))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .header(authorizationHeaderName, authorizationHeaderValue)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) {
                return null;
            }

            JsonNode root = mapper.readTree(resp.body());
            // The model answer text is usually at choices[0].message.content
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            if (contentNode.isMissingNode() || contentNode.isNull()) return null;

            String content = contentNode.asText();

            // Try to extract JSON object from response (the model is asked to return JSON)
            JsonNode json;
            try {
                json = mapper.readTree(content);
            } catch (Exception ex) {
                // If the assistant wrapped JSON inside backticks or markdown, attempt to find first '{'
                int idx = content.indexOf('{');
                if (idx >= 0) {
                    String sub = content.substring(idx);
                    json = mapper.readTree(sub);
                } else {
                    return null;
                }
            }

            String intentStr = json.path("intent").asText(null);
            JsonNode params = json.path("parameters");
            double confidence = json.path("confidence").asDouble(Double.NaN);
            String message = json.path("message").isMissingNode() ? null : json.path("message").asText(null);

            IntentType intent = null;
            if (intentStr != null && !intentStr.isBlank()) {
                try {
                    intent = IntentType.valueOf(intentStr.trim().toUpperCase());
                } catch (Exception ignore) {
                    // unknown intent name
                }
            }

                IntentResult result = new IntentResult();
                result.setIntent(intent);
                result.setParameters(params.isMissingNode() ? null : params);
                result.setConfidence(Double.isNaN(confidence) ? null : confidence);
                result.setMessage(message);
                result.setIsSensitive(null);

            return result;
        } catch (Exception e) {
            return null;
        }
    }

    private String buildAzureOpenAiUrl() {
        String trimmedEndpoint = endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length() - 1) : endpoint;
        return trimmedEndpoint + "/openai/deployments/" + deploymentName + "/chat/completions?api-version=" + apiVersion;
    }

    private String resolveAzureAccessToken() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank() || tenantId == null || tenantId.isBlank()) {
            throw new IllegalStateException("Azure OpenAI authentication is not configured: provide azure.openai.api-key or Azure AD client credentials.");
        }

        TokenCredential credential = new ClientSecretCredentialBuilder()
                .tenantId(tenantId)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .build();

        AccessToken token = Objects.requireNonNull(
                credential.getToken(new TokenRequestContext().addScopes(AZURE_OPENAI_SCOPE)).block(Duration.ofSeconds(10)),
                "Unable to acquire Azure OpenAI access token");

        return token.getToken();
    }
}
