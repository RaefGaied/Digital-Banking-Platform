from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import jwt, logging, json, os, re, time
from config import JWT_SECRET
from agent import run_agent
from memory_store import append_user_mem

app = FastAPI()

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= LOGGING =================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

SECRET = JWT_SECRET

# ================= RATE LIMIT =================
rate_limit = {}

def check_rate(user_id):
    now = time.time()
    window = rate_limit.get(user_id, [])

    # keep last 10 sec
    window = [t for t in window if now - t < 10]

    if len(window) >= 20:
        return False

    window.append(now)
    rate_limit[user_id] = window
    return True

# ================= JWT =================
def get_accno(token):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        # The Spring Boot JWT identifies users with the email in `sub`.
        return payload.get("sub") or payload.get("accno")
    except Exception as e:
        logging.error(f"JWT ERROR: {e}")
        return None

# ================= REQUEST MODEL =================
class ChatRequest(BaseModel):
    query: str = ""
    message: str = ""

# ================= HEALTH =================
@app.get("/health")
def health():
    return {"status": "ok"}

# ================= CHAT =================
@app.post("/chat")
async def chat(request: Request):

    start = time.time()
    try:
        raw_body = await request.body()
        decoded_body = raw_body.decode("utf-8")
        logging.debug("Chat body length=%d prefix=%r", len(decoded_body), decoded_body[:80])
        payload = json.loads(decoded_body)
        if isinstance(payload, str):
            payload = json.loads(payload)
    except json.JSONDecodeError:
        normalized_body = decoded_body.replace('\\"', '"').strip()
        try:
            payload = json.loads(normalized_body)
            if isinstance(payload, str):
                payload = json.loads(payload)
        except json.JSONDecodeError:
            # Accept the legacy Java map representation while clients update.
            match = re.fullmatch(
                r"\s*\{\s*(?:query|message)\s*[:=]\s*[\"']?(.*?)[\"']?\s*\}\s*",
                normalized_body,
            )
            payload = {"query": match.group(1)} if match else None
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Request body must be valid UTF-8") from exc

    if not isinstance(payload, dict):
        header_query = request.headers.get("x-agent-query", "").strip()
        if header_query:
            payload = {"query": header_query}

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")

    query = str(payload.get("query") or payload.get("message") or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    logging.info(f"Incoming Query: {query}")

    # ===== AUTH =====
    auth = request.headers.get("authorization")
    if not auth:
        raise HTTPException(status_code=401, detail="Login required")

    token = auth.replace("Bearer ", "")
    user_id = get_accno(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")

    # ===== RATE LIMIT =====
    if not check_rate(user_id):
        return {
            "reply": "⚠️ Too many requests. Please slow down.",
            "actions": []
        }

    # ===== MEMORY =====
    append_user_mem(user_id, f"User: {query}")

    # ===== AGENT =====
    try:
        reply = run_agent(query, token, user_id)
    except Exception as e:
        logging.error(f"AGENT FAILURE: {e}")
        reply = "⚠️ System issue, please try again later"
    append_user_mem(user_id, f"Bot: {reply}")

    # ===== SMART ACTIONS =====
    q = query.lower()

    if any(x in q for x in ["balance", "bal"]):
        actions = ["Transfer Money", "View Transactions"]

    elif any(x in q for x in ["transfer", "send", "pay"]):
        actions = ["Check Balance"]

    elif "transaction" in q:
        actions = ["Transfer Money"]

    else:
        actions = ["Check Balance", "Transfer Money"]

    # ===== RESPONSE =====
    response_time = round(time.time() - start, 2)

    return {
        "reply": reply,
        "actions": actions,
        "meta": {
            "response_time": f"{response_time}s"
        }
    }