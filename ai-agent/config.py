import os
from dotenv import load_dotenv

load_dotenv()

# ================= CORE =================
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-this-secret-in-production")
BASE_URL = os.getenv("BASE_URL", "http://backend:8080/api/v1")

# ================= AI =================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ================= EMAIL =================
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL")

# ================= VALIDATION =================
# Hard requirements — app cannot function without these
# Soft requirements — warn only, don't crash startup
if not OPENAI_API_KEY and not GROQ_API_KEY:
    print("⚠️ WARNING: No LLM API key set (OpenAI or Groq) — chatbot replies will fail")

if not EMAIL_USER or not EMAIL_PASS:
    print("⚠️ WARNING: Email credentials missing — escalation emails disabled")