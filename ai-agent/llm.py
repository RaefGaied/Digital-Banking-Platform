import requests, json, re, os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")


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
                "model": "openai/gpt-oss-20b",
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


def call_ollama(prompt):
    try:
        res = requests.post(
            f"{OLLAMA_BASE_URL.rstrip('/')}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "format": "json",
            },
            timeout=60,
        )
        if res.status_code != 200:
            print("OLLAMA RESPONSE:", res.status_code, res.text[:200])
            return None
        content = res.json().get("message", {}).get("content", "")
        return extract_json(content)
    except requests.RequestException as exc:
        print("OLLAMA ERROR:", exc)
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
- Use recent conversation only to understand references and follow-up questions.
- Classify the current message, not a previous request.
- Never reuse a previous amount, destination account, or confirmation as authorization for a new financial action.
- If the current message does not explicitly provide required transfer details, ask the user to provide them again.

Return ONLY JSON:

{{
  "action": "tool" or "reply",
  "tool": "",
  "arguments": {{}},
  "reply": ""
}}

Recent conversation (oldest to newest):
{context}

Current user message:
{query}
"""

    # ===== TRY LOCAL OLLAMA (no API key or provider quota) =====
    result = call_ollama(prompt)
    if result and result.get("action"):
        print("✅ USING LOCAL OLLAMA")
        return result

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
        "reply": "I can help with your balance, transactions, transfers, account numbers, or support requests."
    }