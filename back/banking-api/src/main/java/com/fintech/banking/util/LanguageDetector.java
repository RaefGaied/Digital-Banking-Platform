package com.fintech.banking.util;

import java.util.Arrays;
import java.util.Locale;

/**
 * Lightweight FR/EN language heuristic used to populate {@code detectedLanguage}
 * (cahier des charges section 8.4: bilingual prompt engineering) when the LLM
 * response omits it, and by the rule-based fallback intent detector which has no
 * model to ask.
 */
public final class LanguageDetector {

    private static final String[] ENGLISH_HINTS = {
            " how ", " what ", " where ", " card ", " blocked ", " never ",
            " contact ", " verify ", " secure ", " transfer ", " balance ",
            " account ", " the ", " please ", " thank you "
    };

    private static final String[] FRENCH_HINTS = {
            " comment ", " quelle ", " carte ", " bloquee ", " bloquée ",
            " contactez ", " vérifier ", " sécuriser ", " virement ", " solde ",
            " compte ", " merci ", " svp ", " je "
    };

    private LanguageDetector() {
    }

    /** Returns "EN" or "FR" (default) based on simple keyword heuristics. */
    public static String detect(String text) {
        return isEnglish(text) ? "EN" : "FR";
    }

    public static boolean isEnglish(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String normalized = " " + text.toLowerCase(Locale.ROOT) + " ";
        long englishHints = Arrays.stream(ENGLISH_HINTS).filter(normalized::contains).count();
        long frenchHints = Arrays.stream(FRENCH_HINTS).filter(normalized::contains).count();
        return englishHints > frenchHints;
    }
}
