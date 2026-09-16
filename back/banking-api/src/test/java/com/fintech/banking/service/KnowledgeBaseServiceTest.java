package com.fintech.banking.service;

import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

class KnowledgeBaseServiceTest {

    private final KnowledgeBaseService knowledgeBaseService = new KnowledgeBaseService();

    @Test
    void shouldReturnRelevantFaqEntries() {
        var results = knowledgeBaseService.search("virement");
        assertFalse(results.isEmpty());
        assertTrue(results.get(0).toLowerCase().contains("virement"));
    }

    @Test
    void shouldBuildContextSnippet() {
        var snippet = knowledgeBaseService.buildContextSnippet("solde");
        assertNotNull(snippet);
        assertTrue(snippet.toLowerCase().contains("solde"));
    }

    @Test
    void shouldPreferEnglishFaqEntriesForEnglishQueries() {
        var results = knowledgeBaseService.search("How can I make a bank transfer?");
        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(result ->
                result.toLowerCase(Locale.ROOT).contains("how can i make a bank transfer")
                        || result.toLowerCase(Locale.ROOT).contains("how can i transfer money")));
    }
}
