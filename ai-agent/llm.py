import requests, json, re, os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# ================= JSON PARSER =================
def extract_json(text):
    try:
        # split multiple JSON objects
        parts = text.split("}")

        for part in parts:
            part = part.strip()
            if not part:
                continue

            candidate = part + "}"
            try:
                parsed = json.loads(candidate)
                if parsed.get("action"):
                    return parsed
            except:
                continue

    except Exception as e:
        print("JSON PARSE ERROR:", e)

    # try:
    #     # fallback: find first { ... last }
    #     start = text.find("{")
    #     end = text.rfind("}") + 1

    #     if start != -1 and end != -1:
    #         return json.loads(text[start:end])

    # except Exception as e:
    #     print("JSON PARSE ERROR:", e)

    return None


# ================= OPENAI =================
def call_openai(prompt):
    try:
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2
            },
            timeout=10
        )

        data = res.json()
        print("OPENAI RESPONSE:", data)

        if "choices" not in data:
            return None

        content = data["choices"][0]["message"]["content"]

        print("RAW OPENAI TEXT:", content)

        return extract_json(content)

    except Exception as e:
        print("OPENAI ERROR:", e)
        return None


# ================= GROQ =================
def call_groq(prompt):
    try:
        res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0
            },
            timeout=10
        )

        data = res.json()
        print("GROQ RESPONSE:", data)

        if "choices" not in data:
            return None

        content = data["choices"][0]["message"]["content"]

        print("RAW GROQ TEXT:", content)

        return extract_json(content)

    except Exception as e:
        print("GROQ ERROR:", e)
        return None

# ================= MAIN =================
def ask_llm_agent(query, context=""):

    prompt = f"""
You are a banking AI agent.

You MUST decide whether to:
1. Reply directly
2. Call a tool

AVAILABLE TOOLS:
- getBalance()
- getTransactions()
- transferMoney(receiverAccno, amount)
- raiseComplaint(issue)

STRICT RULES:
- If user asks for balance → MUST use getBalance
- If user asks for transactions → MUST use getTransactions
- If user asks to transfer → MUST use transferMoney
- NEVER answer these manually
- DO NOT use "reply" if a tool is available
- NEVER call transferMoney unless user clearly provides BOTH amount AND receiver

Return ONLY JSON:

{{
  "action": "tool" or "reply",
  "tool": "",
  "arguments": {{}},
  "reply": ""
}}

Context:
{context}

User: {query}
"""

    # ===== TRY OPENAI =====
    if OPENAI_API_KEY:
        result = call_openai(prompt)
        if result and result.get("action"):
            print("✅ USING OPENAI")
            return result

    # ===== FALLBACK TO GROQ =====
    if GROQ_API_KEY:
        result = call_groq(prompt)
        if result and result.get("action"):
            print("🚀 USING GROQ")
            return result

    # ===== FINAL FAILSAFE =====
    return {
        "action": "reply",
        "reply": "System busy, please try again"
    }