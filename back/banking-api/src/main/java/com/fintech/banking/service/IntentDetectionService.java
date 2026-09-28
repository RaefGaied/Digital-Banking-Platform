package com.fintech.banking.service;

import com.fintech.banking.domain.vo.IntentResult;

public interface IntentDetectionService {
    IntentResult detectIntent(String text);

    default boolean isAvailable() {
        return false;
    }

    default IntentResult detectIntent(String text, String conversationContext) {
        return detectIntent(text);
    }

    default String generateReply(String text, String conversationContext, String knowledgeContext) {
        return null;
    }
}
