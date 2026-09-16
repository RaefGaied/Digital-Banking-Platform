import argparse
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import requests

ROOT = Path(__file__).resolve().parents[2]
FAQ_PATH = ROOT / "back" / "banking-api" / "src" / "main" / "resources" / "faq-bank.txt"
DEFAULT_BASE_URL = os.getenv("BANKING_API_BASE_URL", "http://localhost:8080/api/v1")


class SimpleRAG:
    def __init__(self, faq_path: Path = FAQ_PATH):
        self.faq_path = faq_path
        self.faq = self._load_faq()

    def _load_faq(self) -> list[str]:
        if not self.faq_path.exists():
            return [
                "Comment puis-je faire un virement ? Décrivez le montant et le compte destinataire.",
                "Comment puis-je signaler une fraude ? Il faut déclencher une validation humaine.",
                "Que faire si mes données doivent être modifiées ? Une validation BPMN est nécessaire.",
            ]

        entries: list[str] = []
        text = self.faq_path.read_text(encoding="utf-8")
        blocks = re.split(r"\n\s*Q:\s*", text)
        for block in blocks:
            if not block.strip():
                continue
            entry = block.strip().replace("\r", "")
            if entry:
                entries.append(entry)
        return entries or [text.strip()]

    def _extract_amount(self, text: str) -> Optional[float]:
        nums = re.findall(r"\d+(?:[.,]\d+)?", text)
        if not nums:
            return None
        try:
            return float(nums[0].replace(",", "."))
        except ValueError:
            return None

    def _detect_intent(self, text: str) -> str:
        lower = text.lower()
        if any(word in lower for word in ["fraud", "fraudulent", "stolen card", "stolen", "suspicious", "unauthorized", "hack", "scam"]):
            return "FRAUD"
        if any(word in lower for word in ["update my data", "change my data", "modify data", "update sensitive", "change identity", "update identity"]):
            return "UPDATE_SENSITIVE_DATA"
        if any(word in lower for word in ["transfer", "send money", "virement", "wire transfer", "pay", "send"]):
            return "TRANSFER"
        if any(word in lower for word in ["balance", "solde", "account balance"]):
            return "BALANCE"
        if any(word in lower for word in ["history", "transactions", "statement", "last movement", "recent transactions"]):
            return "HISTORY"
        if any(word in lower for word in ["claim", "complaint", "support", "problem", "issue"]):
            return "CLAIM"
        return "TRANSFER"

    def analyze(self, query: str) -> Dict[str, Any]:
        lower = query.lower()
        intent = self._detect_intent(query)
        amount = self._extract_amount(query)

        is_sensitive = intent in {"FRAUD", "STOLEN_CARD", "CLAIM", "UPDATE_SENSITIVE_DATA"}
        if amount is not None and amount >= 5000:
            is_sensitive = True

        parameters: Dict[str, Any] = {}
        if amount is not None:
            parameters["amount"] = amount
        if "to" in lower or "dest" in lower or "compte" in lower or "account" in lower:
            parameters["target"] = "external_account"

        confidence = 0.92
        if any(word in lower for word in ["help", "what should", "can you", "maybe"]):
            confidence = 0.74

        message = f"User request classified as {intent}."
        if amount is not None:
            message = f"User requests {intent} with amount {amount}."

        return {
            "intent": intent,
            "confidence": confidence,
            "message": message,
            "isSensitive": is_sensitive,
            "parameters": parameters,
        }


def http_headers(token: Optional[str] = None) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def register_user(base_url: str, email: str, password: str) -> Dict[str, Any]:
    response = requests.post(
        f"{base_url}/auth/register",
        headers=http_headers(),
        json={"name": "RAG Demo User", "email": email, "password": password},
        timeout=20,
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Register failed: {response.status_code} {response.text}")
    return response.json()


def login(base_url: str, email: str, password: str) -> Dict[str, Any]:
    response = requests.post(
        f"{base_url}/auth/login",
        headers=http_headers(),
        json={"email": email, "password": password},
        timeout=20,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Login failed: {response.status_code} {response.text}")
    token = response.json().get("accessToken")
    if not token:
        raise RuntimeError(f"No access token returned: {response.text}")
    return response.json()


def create_session(base_url: str, token: str) -> str:
    response = requests.post(
        f"{base_url}/sessions",
        headers=http_headers(token),
        json={"ipAddress": "127.0.0.1"},
        timeout=20,
    )
    if response.status_code != 201:
        raise RuntimeError(f"Session creation failed: {response.status_code} {response.text}")
    payload = response.json()
    data = payload.get("data") or payload
    return data["id"]


def create_agent(base_url: str, token: str, session_id: str) -> str:
    response = requests.post(
        f"{base_url}/mcp/agent/create",
        headers=http_headers(token),
        json={"sessionId": session_id},
        timeout=20,
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Agent creation failed: {response.status_code} {response.text}")
    payload = response.json()
    return (payload.get("data") or payload)["id"]


def determine_decision(base_url: str, token: str, agent_id: str, intent_payload: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.post(
        f"{base_url}/mcp/agent/determine-decision",
        headers=http_headers(token),
        json={
            "agentId": agent_id,
            **intent_payload,
        },
        timeout=20,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Decision call failed: {response.status_code} {response.text}")
    return response.json()


def run_rag_decision(email: str, password: str, query: str, base_url: str = DEFAULT_BASE_URL) -> Dict[str, Any]:
    rag = SimpleRAG()
    intent_payload = rag.analyze(query)

    try:
        auth = login(base_url, email, password)
    except RuntimeError:
        register_user(base_url, email, password)
        auth = login(base_url, email, password)

    token = auth["accessToken"]
    session_id = create_session(base_url, token)
    agent_id = create_agent(base_url, token, session_id)
    result = determine_decision(base_url, token, agent_id, intent_payload)
    return {
        "intent": intent_payload,
        "result": result,
        "token": token,
        "sessionId": session_id,
        "agentId": agent_id,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a lightweight RAG-to-agent integration with the current banking backend.")
    parser.add_argument("--email", default="rag.demo@example.com", help="User email")
    parser.add_argument("--password", default="Senha123!", help="User password")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Backend Base URL")
    parser.add_argument("--query", default="I need to send 7500 to a suspicious external account, this looks like fraud.", help="User query")
    args = parser.parse_args()

    payload = run_rag_decision(args.email, args.password, args.query, args.base_url)
    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
