package com.fintech.banking.service;

import com.fintech.banking.domain.entity.SupportTicket;
import com.fintech.banking.domain.entity.Transaction;
import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.enums.IntentType;
import com.fintech.banking.domain.enums.TransactionType;
import com.fintech.banking.domain.vo.IntentResult;
import com.fintech.banking.repository.AuditLogRepository;
import com.fintech.banking.repository.BankingAgentRepository;
import com.fintech.banking.repository.SupportTicketRepository;
import com.fintech.banking.repository.WorkflowTaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.lang.reflect.Field;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class TransactionValidationServiceTest {

    private final SecurityEventService securityEventService = Mockito.mock(SecurityEventService.class);
    private final SupportTicketRepository supportTicketRepository = Mockito.mock(SupportTicketRepository.class);
    private final WorkflowTaskRepository workflowTaskRepository = Mockito.mock(WorkflowTaskRepository.class);
    private final NotificationService notificationService = Mockito.mock(NotificationService.class);
    private final AuditLogRepository auditLogRepository = Mockito.mock(AuditLogRepository.class);
    private final FlowableService flowableService = Mockito.mock(FlowableService.class);
    private final BankingAgentRepository bankingAgentRepository = Mockito.mock(BankingAgentRepository.class);
    private final TransactionValidationService service = new TransactionValidationService(
            securityEventService,
            supportTicketRepository,
            workflowTaskRepository,
            notificationService,
            auditLogRepository,
            flowableService,
            bankingAgentRepository
    );

    @BeforeEach
    void configureSensitiveLineThreshold() throws Exception {
        Field threshold = TransactionValidationService.class.getDeclaredField("highRiskThreshold");
        threshold.setAccessible(true);
        threshold.set(service, new BigDecimal("5000"));
    }

    @Test
    void keepsExactlyThresholdAutomatic() {
        AgentDecision decision = service.validateTransactionAndDecide(
                transaction("5000"), intent(IntentType.TRANSFER, 0.9), UUID.randomUUID());

        assertEquals(AgentDecision.AUTO_EXECUTE, decision);
    }

    @Test
    void sendsAmountAboveThresholdToBpmn() {
        SupportTicket ticket = SupportTicket.builder().id(1L).build();
        when(supportTicketRepository.save(any(SupportTicket.class))).thenReturn(ticket);
        when(flowableService.startProcessInstance(any(String.class), any())).thenReturn("process-1");

        AgentDecision decision = service.validateTransactionAndDecide(
                transaction("5000.01"), intent(IntentType.TRANSFER, 0.9), UUID.randomUUID());

        assertEquals(AgentDecision.TRIGGER_BPMN, decision);
    }

    @Test
    void sendsSensitiveIntentToBpmnRegardlessOfAmount() {
        SupportTicket ticket = SupportTicket.builder().id(2L).build();
        when(supportTicketRepository.save(any(SupportTicket.class))).thenReturn(ticket);
        when(flowableService.startProcessInstance(any(String.class), any())).thenReturn("process-2");

        AgentDecision decision = service.validateTransactionAndDecide(
                transaction("10"), intent(IntentType.FRAUD, 0.95), UUID.randomUUID());

        assertEquals(AgentDecision.TRIGGER_BPMN, decision);
    }

    private Transaction transaction(String amount) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .amount(new BigDecimal(amount))
                .type(TransactionType.TRANSFER)
                .build();
    }

    private IntentResult intent(IntentType type, double confidence) {
        IntentResult result = new IntentResult();
        result.setIntent(type);
        result.setConfidence(confidence);
        return result;
    }
}
