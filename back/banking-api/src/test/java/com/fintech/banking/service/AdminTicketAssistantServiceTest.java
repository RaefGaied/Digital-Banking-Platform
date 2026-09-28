package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.enums.TicketStatus;
import com.fintech.banking.domain.enums.TicketType;
import com.fintech.banking.repository.SupportTicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminTicketAssistantServiceTest {

    @Mock private SupportTicketRepository supportTicketRepository;
    @Mock private IntentDetectionService intentDetectionService;
    @Mock private KnowledgeBaseService knowledgeBaseService;
    @Mock private RagKnowledgeService ragKnowledgeService;

    @InjectMocks
    private AdminTicketAssistantService assistantService;

    @Test
    void draftsCustomerReplyFromAdminQuestionTicketAndVerifiedHelp() {
        SupportTicket ticket = SupportTicket.builder()
                .id(27L)
                .subject("Card payment issue")
                .description("I do not recognize a card payment from yesterday.")
                .ticketType(TicketType.GENERAL)
                .status(TicketStatus.OPEN)
                .build();
        when(supportTicketRepository.findById(27L)).thenReturn(Optional.of(ticket));
        when(knowledgeBaseService.buildContextSnippet("Card payment issue\nHow can the customer dispute it?"))
                .thenReturn("Verified help: card disputes can be filed from Transactions.");
        when(intentDetectionService.generateReply(
                anyString(),
                anyString(),
                anyString()))
                .thenReturn("Open Transactions, select the payment, and choose Report an issue.");

        String draft = assistantService.draftReply(27L, "How can the customer dispute it?");

        assertEquals("Open Transactions, select the payment, and choose Report an issue.", draft);
        verify(intentDetectionService).generateReply(
                org.mockito.ArgumentMatchers.argThat(prompt ->
                        prompt.contains("Reply in English")
                                && prompt.contains("How can the customer dispute it?")
                                && prompt.contains("will review and edit")),
                org.mockito.ArgumentMatchers.argThat(context ->
                        context.contains(ticket.getSubject())
                                && context.contains(ticket.getDescription())),
                org.mockito.ArgumentMatchers.contains("Verified help"));
        verify(ragKnowledgeService, never()).buildContextSnippet(anyString());
    }

    @Test
    void usesRagHelpWhenLocalFaqHasNoAnswer() {
        SupportTicket ticket = SupportTicket.builder()
                .id(28L)
                .subject("Card issue")
                .description("A card payment looks unusual.")
                .ticketType(TicketType.GENERAL)
                .status(TicketStatus.IN_PROGRESS)
                .build();
        when(supportTicketRepository.findById(28L)).thenReturn(Optional.of(ticket));
        when(knowledgeBaseService.buildContextSnippet(anyString())).thenReturn("");
        when(ragKnowledgeService.buildContextSnippet(anyString())).thenReturn("Verified RAG guidance.");
        when(intentDetectionService.generateReply(anyString(), anyString(), anyString()))
                .thenReturn("Please review the card payment in Transactions.");

        assertEquals("Please review the card payment in Transactions.",
                assistantService.draftReply(28L, "Explain how to inspect it."));

        verify(intentDetectionService).generateReply(anyString(), anyString(),
                org.mockito.ArgumentMatchers.eq("Verified RAG guidance."));
    }

    @Test
    void doesNotCallAiForSensitiveOrClosedTickets() {
        SupportTicket ticket = SupportTicket.builder()
                .id(29L)
                .subject("Email change")
                .description("Please change the email address.")
                .ticketType(TicketType.DATA_UPDATE)
                .status(TicketStatus.OPEN)
                .build();
        when(supportTicketRepository.findById(29L)).thenReturn(Optional.of(ticket));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> assistantService.draftReply(29L, "What should the client do?"));

        assertEquals(400, exception.getStatusCode().value());
        verify(intentDetectionService, never()).generateReply(anyString(), anyString(), anyString());
    }

    @Test
    void returnsUnavailableWhenProviderCannotGenerateADraft() {
        SupportTicket ticket = SupportTicket.builder()
                .id(30L)
                .subject("Card issue")
                .description("A card payment is missing.")
                .ticketType(TicketType.GENERAL)
                .status(TicketStatus.OPEN)
                .build();
        when(supportTicketRepository.findById(30L)).thenReturn(Optional.of(ticket));
        when(knowledgeBaseService.buildContextSnippet(anyString())).thenReturn("");
        when(ragKnowledgeService.buildContextSnippet(anyString())).thenReturn("");
        when(intentDetectionService.generateReply(anyString(), anyString(), anyString())).thenReturn(null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> assistantService.draftReply(30L, "Explain the process."));

        assertEquals(503, exception.getStatusCode().value());
    }
}
