package com.fintech.banking.service;

import com.fintech.banking.domain.enums.AgentDecision;
import com.fintech.banking.domain.vo.IntentResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AgentWorkflowService {

    private final BankingAgentService bankingAgentService;

    public void recordAgentAction(UUID agentId,
                                  String action,
                                  IntentResult intentResult,
                                  AgentDecision decision,
                                  Map<String, Object> details) {
        if (agentId == null || decision == null) {
            return;
        }

        Map<String, Object> trace = new HashMap<>();
        trace.put("action", action);
        trace.put("decision", decision.name());
        trace.put("timestamp", LocalDateTime.now().toString());

        if (intentResult != null) {
            if (intentResult.getIntent() != null) {
                trace.put("intent", intentResult.getIntent().name());
            }
            trace.put("confidence", intentResult.getConfidence());
            trace.put("isSensitive", intentResult.getIsSensitive());
            trace.put("message", intentResult.getMessage());
            if (intentResult.getParameters() != null) {
                trace.put("parameters", intentResult.getParameters());
            }
        }

        if (details != null) {
            trace.putAll(details);
        }

        bankingAgentService.appendActivityTrace(agentId, trace);
        bankingAgentService.updateDecision(agentId, decision);
        log.info("Recorded agent workflow action for {}: {}", agentId, action);
    }
}
