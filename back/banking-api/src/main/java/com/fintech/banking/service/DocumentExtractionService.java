package com.fintech.banking.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DocumentExtractionService {

    public Map<String, String> extractFromText(String rawText) {
        String text = rawText == null ? "" : rawText.trim();
        Map<String, String> result = new LinkedHashMap<>();

        if (text.isBlank()) {
            return result;
        }

        Map<String, String> keyedFields = extractKeyValuePairs(text);
        String documentType = firstNonBlank(
                keyedFields.get("documentType"),
                keyedFields.get("document type"),
                detectDocumentType(text)
        );

        result.put("documentType", normalizeDocumentType(documentType));
        result.put("fullName", firstNonBlank(
                keyedFields.get("customer name"),
                keyedFields.get("customer"),
                keyedFields.get("name"),
                extractName(text)
        ));
        result.put("email", firstNonBlank(keyedFields.get("email"), extractEmail(text)));
        result.put("phone", firstNonBlank(keyedFields.get("phone"), extractPhone(text)));
        result.put("address", firstNonBlank(keyedFields.get("address"), extractAddress(text)));
        result.put("amount", firstNonBlank(keyedFields.get("amount"), extractAmount(text)));
        result.put("accountNumber", firstNonBlank(keyedFields.get("account number"), keyedFields.get("accountNumber"), extractAccountNumber(text)));
        result.put("product", normalizeProduct(firstNonBlank(keyedFields.get("product"), extractProduct(text))));
        result.put("source", "uploaded-document");

        return result;
    }

    public Map<String, String> extractFromMultipart(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return Map.of();
        }

        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        return extractFromText(content);
    }

    private String detectDocumentType(String text) {
        String lower = normalize(text);
        for (String line : text.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            String lowerLine = trimmed.toLowerCase(Locale.ROOT);
            if (lowerLine.contains("document type") || lowerLine.contains("type de document")) {
                int colon = trimmed.indexOf(':');
                if (colon >= 0) {
                    String value = trimmed.substring(colon + 1).trim();
                    if (!value.isBlank()) {
                        return normalizeDocumentType(value);
                    }
                }
            }
        }
        if (lower.contains("bank transfer") || lower.contains("virement") || lower.contains("transfer")) {
            return "TRANSFER";
        }
        if (lower.contains("card blocked") || lower.contains("carte bloquee") || lower.contains("card") || lower.contains("carte")) {
            return "CARD";
        }
        if (lower.contains("fraud") || lower.contains("fraude")) {
            return "FRAUD";
        }
        if (lower.contains("profile") || lower.contains("profil")) {
            return "PROFILE";
        }
        return "GENERAL";
    }

    private String normalizeDocumentType(String value) {
        String normalized = value.trim();
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("transfer") || lower.contains("virement")) return "TRANSFER";
        if (lower.contains("card") || lower.contains("carte")) return "CARD";
        if (lower.contains("fraud") || lower.contains("fraude")) return "FRAUD";
        if (lower.contains("profile") || lower.contains("profil")) return "PROFILE";
        return normalized;
    }

    private String normalizeProduct(String value) {
        String normalized = value == null ? "" : value.trim();
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("credit card") || lower.contains("credit")) return "CREDIT_CARD";
        if (lower.contains("current account") || lower.contains("account")) return "CURRENT_ACCOUNT";
        if (lower.contains("investment") || lower.contains("investissement")) return "INVESTMENT";
        return normalized;
    }

    private Map<String, String> extractKeyValuePairs(String text) {
        Map<String, String> values = new LinkedHashMap<>();
        String[] lines = text.split("\\r?\\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isBlank() || !trimmed.contains(":")) {
                continue;
            }

            int index = trimmed.indexOf(':');
            String key = trimmed.substring(0, index).trim();
            String value = trimmed.substring(index + 1).trim();
            if (value.isBlank()) {
                continue;
            }
            String normalizedKey = normalizeKey(key);
            if (!normalizedKey.isBlank()) {
                values.put(normalizedKey, value);
            }
        }

        return values;
    }

    private String normalizeKey(String key) {
        String normalized = key.trim();
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("customer name") || lower.equals("customer")) return "customer name";
        if (lower.equals("name") || (lower.contains("name") && !lower.contains("document"))) return "name";
        if (lower.contains("email")) return "email";
        if (lower.contains("phone")) return "phone";
        if (lower.contains("address")) return "address";
        if (lower.contains("amount")) return "amount";
        if (lower.contains("account number") || lower.equals("account") || lower.contains("account number") || lower.contains("iban")) return "account number";
        if (lower.contains("product")) return "product";
        if (lower.contains("document type") || lower.contains("type de document")) return "documentType";
        return "";
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return "";
    }

    private String extractName(String text) {
        Pattern pattern = Pattern.compile("(?:Name|Nom|Customer|Client)[:\\s]+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        Pattern alt = Pattern.compile("([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,3})");
        Matcher altMatcher = alt.matcher(text);
        while (altMatcher.find()) {
            String candidate = altMatcher.group(1);
            if (!candidate.toLowerCase(Locale.ROOT).contains("bank") && !candidate.toLowerCase(Locale.ROOT).contains("customer")) {
                return candidate;
            }
        }

        return "";
    }

    private String extractEmail(String text) {
        Pattern pattern = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group() : "";
    }

    private String extractPhone(String text) {
        Pattern pattern = Pattern.compile("(?:\\+?\\d{1,3}[-.\\s]?)?(?:\\(?\\d{2,4}\\)?[-.\\s]?)\\d{3}[-.\\s]?\\d{4}");
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group().replaceAll("[^0-9+\\-]", "").trim() : "";
    }

    private String extractAddress(String text) {
        Pattern pattern = Pattern.compile("(?:Address|Adresse|Street|Rue|City|Ville)[:\\s]+([A-Za-z0-9, .'-]+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    private String extractAmount(String text) {
        Pattern pattern = Pattern.compile("(?:amount|montant|value|valeur)[:\\s]*€?\\s*([-+]?\\d+(?:[.,]\\d{1,2})?)");
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    private String extractAccountNumber(String text) {
        Pattern pattern = Pattern.compile("(?:account|compte|iban|numero de compte|account number)[:\\s]*([A-Z0-9-]{6,34})", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    private String extractProduct(String text) {
        String lower = normalize(text);
        if (lower.contains("credit card") || lower.contains("carte de credit") || lower.contains("credit")) {
            return "CREDIT_CARD";
        }
        if (lower.contains("current account") || lower.contains("compte courant") || lower.contains("account")) {
            return "CURRENT_ACCOUNT";
        }
        if (lower.contains("investment") || lower.contains("investissement")) {
            return "INVESTMENT";
        }
        return "";
    }

    private String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
