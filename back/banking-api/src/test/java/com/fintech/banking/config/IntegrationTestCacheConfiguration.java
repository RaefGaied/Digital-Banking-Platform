package com.fintech.banking.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class IntegrationTestCacheConfiguration {

    @Bean
    @Primary
    CacheManager integrationTestCacheManager() {
        return new ConcurrentMapCacheManager();
    }
}
