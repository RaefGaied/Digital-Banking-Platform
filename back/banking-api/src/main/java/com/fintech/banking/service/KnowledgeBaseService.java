package com.fintech.banking.service;

import com.fintech.banking.repository.RagDocumentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class KnowledgeBaseService {

    private static final Set<String> STOP_WORDS = Set.of(
        "a", "an", "and", "are", "can", "do", "for", "how", "i", "if", "in", "is", "it", "my", "of", "on", "or", "the", "to", "what", "where", "with",
        "au", "aux", "comment", "dans", "de", "des", "du", "est", "faire", "je", "la", "le", "les", "mon", "ou", "pour", "que", "un", "une", "vous"
    );

    private static final Map<String, String> SYNONYMS = Map.ofEntries(
        Map.entry("transfer", "transfer"), Map.entry("transfers", "transfer"), Map.entry("virement", "transfer"), Map.entry("virements", "transfer"),
        Map.entry("bank", "bank"), Map.entry("banque", "bank"),
        Map.entry("card", "card"), Map.entry("cards", "card"), Map.entry("carte", "card"), Map.entry("cartes", "card"),
        Map.entry("blocked", "blocked"), Map.entry("block", "blocked"), Map.entry("bloquee", "blocked"), Map.entry("bloque", "blocked"),
        Map.entry("fraud", "fraud"), Map.entry("fraude", "fraud"), Map.entry("support", "support"), Map.entry("help", "support"),
        Map.entry("balance", "balance"), Map.entry("solde", "balance"), Map.entry("account", "account"), Map.entry("compte", "account"),
        Map.entry("payment", "payment"), Map.entry("paiement", "payment"), Map.entry("withdrawal", "withdrawal"), Map.entry("retrait", "withdrawal"),
        Map.entry("profile", "profile"), Map.entry("profil", "profile"), Map.entry("notifications", "notifications"), Map.entry("notification", "notifications"),
        Map.entry("invest", "investment"), Map.entry("investissement", "investment"), Map.entry("investment", "investment")
    );

    private static final Set<String> ENGLISH_HINTS = Set.of(
        "how", "what", "when", "where", "bank", "transfer", "money", "make", "blocked", "card",
        "fraud", "support", "account", "balance", "payment", "profile", "notification", "investment", "customer"
    );

    private static final Set<String> FRENCH_HINTS = Set.of(
        "comment", "quel", "quand", "ou", "banque", "virement", "argent", "bloquee", "carte", "fraude",
        "support", "compte", "solde", "paiement", "profil", "notification", "investissement", "client"
    );

    private RagDocumentRepository ragDocumentRepository;

    @Autowired(required = false)
    public void setRagDocumentRepository(RagDocumentRepository ragDocumentRepository) {
        this.ragDocumentRepository = ragDocumentRepository;
    }

    public List<String> search(String query) {
        List<String> matches = new ArrayList<>();
        List<ScoredMatch> candidates = new ArrayList<>();

        loadFaqBlocks(candidates, query, "faq-bank.txt");
        loadFaqBlocks(candidates, query, "faq-bank-en.txt");

        if (ragDocumentRepository != null) {
            ragDocumentRepository.findByActiveTrueOrderByUpdatedAtDesc().forEach(document -> {
                if (document == null) {
                    return;
                }
                String title = document.getTitle() == null ? "" : document.getTitle();
                String content = document.getContent() == null ? "" : document.getContent();
                if (query != null && !query.isBlank()) {
                    StringBuilder result = new StringBuilder();
                    result.append("Q: ").append(title).append("\n");
                    if (document.getSource() != null && !document.getSource().isBlank()) {
                        result.append("Source: ").append(document.getSource()).append("\n");
                    }
                    result.append("A: ").append(content);
                    addCandidate(candidates, query, title + " " + content, result.toString());
                }
            });
        }

        candidates.sort(Comparator.comparingInt(ScoredMatch::score).reversed());
        candidates.stream().filter(candidate -> candidate.score() > 0).map(ScoredMatch::value).forEach(matches::add);
        return matches;
    }

    private void loadFaqBlocks(List<ScoredMatch> candidates, String query, String resourceName) {
        if (query == null || query.isBlank()) {
            return;
        }

        try (InputStream resourceStream = getClass().getClassLoader().getResourceAsStream(resourceName)) {
            if (resourceStream == null) {
                return;
            }

            String content = new String(resourceStream.readAllBytes(), StandardCharsets.UTF_8);
            String[] blocks = content.split("\\n\\s*\\n");
            for (String block : blocks) {
                String[] lines = block.split("\\n");
                String question = null;
                String answer = null;
                for (String line : lines) {
                    String trimmed = line.strip();
                    if (trimmed.startsWith("Q:")) {
                        question = trimmed.substring(2).trim();
                    } else if (trimmed.startsWith("A:")) {
                        answer = trimmed.substring(2).trim();
                    }
                }
                if (question != null && answer != null) {
                    addCandidate(candidates, query, question + " " + answer, "Q: " + question + "\nA: " + answer);
                }
            }
        } catch (IOException e) {
            log.warn("Unable to load FAQ knowledge base {}", resourceName, e);
        }
    }

    public String buildContextSnippet(String query) {
        List<String> matches = search(query);
        if (matches.isEmpty()) {
            return "";
        }
        return String.join("\n\n", matches.stream().limit(3).toList());
    }

    private void addCandidate(List<ScoredMatch> candidates, String query, String searchableText, String value) {
        int score = score(query, searchableText);
        if (score > 0) {
            candidates.add(new ScoredMatch(score, value));
        }
    }

    private int score(String query, String searchableText) {
        Set<String> queryTerms = tokenize(query);
        Set<String> documentTerms = tokenize(searchableText);
        if (queryTerms.isEmpty() || documentTerms.isEmpty()) {
            return 0;
        }
        int score = 0;
        for (String term : queryTerms) {
            if (documentTerms.contains(term)) {
                score += 2;
            }
        }

        String language = detectLanguage(query);
        if ("en".equals(language) && containsAny(searchableText, ENGLISH_HINTS)) {
            score += 5;
        }
        if ("fr".equals(language) && containsAny(searchableText, FRENCH_HINTS)) {
            score += 5;
        }

        return score;
    }

    private String detectLanguage(String value) {
        if (value == null || value.isBlank()) {
            return "fr";
        }

        String normalized = normalize(value);
        if (containsAny(normalized, ENGLISH_HINTS)) {
            return "en";
        }
        if (containsAny(normalized, FRENCH_HINTS)) {
            return "fr";
        }
        return containsAccentedCharacters(value) ? "fr" : "en";
    }

    private boolean containsAny(String value, Set<String> hints) {
        String normalized = normalize(value);
        for (String hint : hints) {
            if (normalized.contains(hint)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAccentedCharacters(String value) {
        return value.matches(".*[À-ÖØ-öø-ÿ].*");
    }

    private String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private Set<String> tokenize(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        Set<String> terms = new HashSet<>();
        Arrays.stream(normalized.split("[^a-z0-9]+"))
                .filter(term -> term.length() > 2 && !STOP_WORDS.contains(term))
                .map(term -> SYNONYMS.getOrDefault(term, term))
                .forEach(terms::add);
        return terms;
    }

    private record ScoredMatch(int score, String value) {}
}
