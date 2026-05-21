package com.fintech.banking.util;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Modifier;

import static org.junit.jupiter.api.Assertions.*;

class TotpUtilTest {

    @Test
    void testTotpClassIsPublic() {
        // Test that the class is public and accessible
        assertTrue(Modifier.isPublic(TotpUtil.class.getModifiers()));
    }
    
    @Test
    void testGenerateSecretReturnsNonEmptyString() {
        // Test that generateSecret returns a non-null, non-empty string
        String secret = TotpUtil.generateSecret();
        assertNotNull(secret, "Secret should not be null");
        assertFalse(secret.isEmpty(), "Secret should not be empty");
        // It should be a reasonable length for a base32 encoded 160-bit secret
        // 160 bits / 5 bits per base32 char = 32 characters
        assertTrue(secret.length() >= 32, "Secret should be at least 32 characters");
    }
    
    @Test
    void testVerifyTotpDoesNotThrowOnValidInputs() {
        // Test that verifyTotp doesn't throw exceptions on reasonable inputs
        assertDoesNotThrow(() -> TotpUtil.verifyTotp("SECRET", 0));
        assertDoesNotThrow(() -> TotpUtil.verifyTotp("SECRET", 999999));
        assertDoesNotThrow(() -> TotpUtil.verifyTotp("", 0)); // Edge case
    }
}