package com.fintech.banking.service;

import com.fintech.banking.domain.vo.IntentResult;

public interface IntentDetectionService {
    IntentResult detectIntent(String text);
}
