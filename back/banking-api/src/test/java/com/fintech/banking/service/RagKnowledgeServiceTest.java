package com.fintech.banking.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RagKnowledgeServiceTest {

    @Test
    void shouldBuildContextFromKnowledgeBase() {
        RagKnowledgeService service = new RagKnowledgeService();
        String snippet = service.buildContextSnippet("virement");
        assertNotNull(snippet);
        assertTrue(snippet.toLowerCase().contains("virement"));
    }
}
