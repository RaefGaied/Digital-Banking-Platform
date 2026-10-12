package com.fintech.banking.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class RagKnowledgeServiceWithEmbeddingTest {

    @Test
    void searchReturnsVectorResultsWhenEmbeddingSucceeds() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        EmbeddingModel embeddingModel = mock(EmbeddingModel.class);
        ObjectProvider<EmbeddingModel> provider = mock(ObjectProvider.class);

        when(provider.getIfAvailable()).thenReturn(embeddingModel);
        when(embeddingModel.embed(anyString())).thenReturn(new float[] {0.1f, 0.2f, 0.3f});
        when(jdbcTemplate.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class),
                any(), any(), any()))
                .thenReturn(List.of("Q: Virement\nA: Le plafond est de 5000e"));

        RagKnowledgeService service = new RagKnowledgeService(
                jdbcTemplate, new KnowledgeBaseService(), provider);

        List<String> results = service.search("Comment faire un virement ?", 3);

        assertEquals(1, results.size());
        assertTrue(results.get(0).contains("Virement"));
    }

    @Test
    void searchFallsBackToKnowledgeBaseWhenEmbeddingModelUnavailable() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ObjectProvider<EmbeddingModel> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);

        RagKnowledgeService service = new RagKnowledgeService(
                jdbcTemplate, new KnowledgeBaseService(), provider);

        List<String> results = service.search("virement", 3);

        assertTrue(results.stream().anyMatch(r -> r.toLowerCase().contains("virement")));
        verify(jdbcTemplate, never()).query(anyString(), any(org.springframework.jdbc.core.RowMapper.class),
                ArgumentMatchers.<Object[]>any());
    }

    @Test
    void searchFindsActiveAdminDocumentsByTextWhenEmbeddingIsUnavailable() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ObjectProvider<EmbeddingModel> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        when(jdbcTemplate.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class),
                ArgumentMatchers.any(Object[].class)))
                .thenReturn(List.of("Q: Virement international\nSource: Guide clientèle\n"
                        + "A: Un virement international peut prendre 2 à 5 jours ouvrables."));

        RagKnowledgeService service = new RagKnowledgeService(
                jdbcTemplate, new KnowledgeBaseService(), provider);

        List<String> results = service.search("Quel est le délai d'un virement international ?", 5);

        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(r -> r.contains("2 à 5 jours ouvrables")));
        verify(jdbcTemplate).query(anyString(), any(org.springframework.jdbc.core.RowMapper.class),
                ArgumentMatchers.any(Object[].class));
    }

    @Test
    void embedAndStorePersistsVectorLiteralWhenEmbeddingSucceeds() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        EmbeddingModel embeddingModel = mock(EmbeddingModel.class);
        ObjectProvider<EmbeddingModel> provider = mock(ObjectProvider.class);

        when(provider.getIfAvailable()).thenReturn(embeddingModel);
        when(embeddingModel.embed(anyString())).thenReturn(new float[] {1f, 2f});

        RagKnowledgeService service = new RagKnowledgeService(
                jdbcTemplate, new KnowledgeBaseService(), provider);

        service.embedAndStore(42L, "Contenu du document");

        verify(jdbcTemplate, times(1)).update(
                eq("UPDATE rag_documents SET embedding = CAST(? AS vector) WHERE id = ?"),
                eq("[1.0,2.0]"), eq(42L));
    }

    @Test
    void embedAndStoreDoesNothingWhenNoEmbeddingModelAvailable() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ObjectProvider<EmbeddingModel> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);

        RagKnowledgeService service = new RagKnowledgeService(
                jdbcTemplate, new KnowledgeBaseService(), provider);

        service.embedAndStore(1L, "some content");

        verify(jdbcTemplate, never()).update(anyString(), ArgumentMatchers.<Object>any());
    }
}
