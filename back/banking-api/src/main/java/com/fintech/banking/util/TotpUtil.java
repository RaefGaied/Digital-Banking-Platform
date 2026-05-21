package com.fintech.banking.util;

import org.apache.commons.codec.binary.Base32;
import java.security.SecureRandom;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Utility class for TOTP (Time-based One-Time Password) operations.
 * Implements RFC 6238.
 */
public class TotpUtil {

    private static final int SECRET_SIZE = 20; // 160 bits
    private static final int TIME_STEP_SIZE = 30; // seconds
    private static final int MODULUS = 1000000; // 6 digits

    private TotpUtil() {
        // Utility class
    }

    /**
     * Generates a random base32-encoded secret key for TOTP.
     *
     * @return base32-encoded secret key
     */
    public static String generateSecret() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[SECRET_SIZE];
        random.nextBytes(bytes);
        Base32 encoder = new Base32();
        return encoder.encodeToString(bytes).replace("=", "").toUpperCase();
    }

    /**
     * Verifies a TOTP code against the secret.
     * Allows for one time-step drift in either direction to account for clock skew.
     *
     * @param secret base32-encoded secret key
     * @param code   TOTP code to verify (6 digits)
     * @return true if the code is valid
     */
    public static boolean verifyTotp(String secret, int code) {
        if (secret == null || secret.isBlank()) {
            return false;
        }

        long timeStep = Instant.now().getEpochSecond() / TIME_STEP_SIZE;

        // Check current, previous, and next time step to allow for clock skew
        for (int i = -1; i <= 1; i++) {
            try {
                long calculatedCode = calculateTotp(secret, timeStep + i);
                if (calculatedCode == code) {
                    return true;
                }
            } catch (IllegalArgumentException ex) {
                return false;
            }
        }
        return false;
    }

    /**
     * Calculates the TOTP code for a given secret and time step.
     *
     * @param secret  base32-encoded secret key
     * @param timeStep time step (Unix time divided by TIME_STEP_SIZE)
     * @return TOTP code (6 digits)
     */
    private static long calculateTotp(String secret, long timeStep) {
        Base32 decoder = new Base32();
        byte[] keyBytes = decoder.decode(secret);
        byte[] timeBytes = new byte[8];
        for (int i = 7; i >= 0; i--) {
            timeBytes[i] = (byte) (timeStep & 0xFF);
            timeStep >>= 8;
        }

        try {
            Mac hmac = Mac.getInstance("HmacSHA1");
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "HmacSHA1");
            hmac.init(keySpec);
            byte[] hash = hmac.doFinal(timeBytes);

            // Dynamic truncation (RFC 4226)
            int offset = hash[hash.length - 1] & 0x0F;
            int truncatedHash = 0;
            for (int i = 0; i < 4; i++) {
                truncatedHash <<= 8;
                truncatedHash |= (hash[offset + i] & 0xFF);
            }
            truncatedHash &= 0x7FFFFFFF; // Remove most significant bit
            return truncatedHash % MODULUS;
        } catch (Exception e) {
            throw new RuntimeException("Error calculating TOTP", e);
        }
    }
}