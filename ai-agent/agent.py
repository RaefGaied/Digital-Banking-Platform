from tools import *
from rag.rag_engine import search
from memory_store import append_user_mem, get_context
from tool_executor import execute_tool
from llm import ask_llm_agent
from escalation import should_escalate, escalate

import re
import datetime
import os

# ================= SESSION STORE =================
user_sessions = {
    # user_id: {
    #   type: "transfer" / "support",
    #   status: "pending" / "awaiting_issue" / "awaiting_image",
    #   tool: "",
    #   args: {},
    #   data: {}
    # }
}

HIGH_VALUE_TRANSFER_THRESHOLD = float(
    os.getenv("HIGH_VALUE_TRANSFER_THRESHOLD", "5000")
)

# ================= QUERY PARSER =================
def parse_transaction_query(query):
    q = query.lower()

    limit = 5
    min_amount = None
    today_only = False

    match = re.search(r'last (\d+)', q)
    if match:
        limit = int(match.group(1))

    match = re.search(r'(above|greater than) (\d+)', q)
    if match:
        min_amount = int(match.group(2))

    if "today" in q:
        today_only = True

    return {
        "limit": max(1, min(limit, 20)),
        "min_amount": min_amount,
        "today_only": today_only
    }

# ================= FRAUD =================
def detect_fraud(txns, amount):
    if not txns:
        return False

    avg = sum(t["amount"] for t in txns) / len(txns)
    HIGH_AMOUNT = 10000

    if amount > HIGH_AMOUNT:
        return True

    if avg > 0 and amount > avg * 5:
        return True

    return False

# ================= ANALYTICS =================
def analyze_spending(txns, user_id):
    sent, received = 0, 0

    for t in txns:
        if t["senderAccno"] == user_id:
            sent += t["amount"]
        else:
            received += t["amount"]

    return sent, received

# ================= INTENT =================
def detect_intent(query, decision):
    q = query.lower()

    VALID_TOOLS = ["getBalance", "getTransactions", "transferMoney", "raiseComplaint"]

    if decision.get("tool") in VALID_TOOLS:
        arguments = decision.get("arguments", {}) or {}
        if decision["tool"] == "transferMoney":
            extracted = extract_transfer_details(query)
            merged_arguments = dict(arguments)
            merged_arguments.update(extracted)
            if merged_arguments.get("amount") is not None and merged_arguments.get("receiverAccno") is not None:
                return "transferMoney", merged_arguments
        return decision["tool"], arguments
    
    if any(x in q for x in ["raise ticket", "create ticket", "complaint", "report issue","kaam nahi", "not working", "issue", "problem", "error", "nhi ho rha"]):
        return "raiseComplaint", {}
    
    if any(x in q for x in ["transfer", "send", "bhej"]):
        details = extract_transfer_details(query)
        return "transferMoney", details

    if any(x in q for x in ["transaction", "transactions", "history", "statement", "txns",
    "recent", "record", "record chahiye"]):
        return "getTransactions", {}
    
    if any(x in q for x in ["balance", "bal", "account balance", "mera balance", "kitna hai", "paise", "paisa"]):
        return "getBalance", {}

    return None, {}


def extract_transfer_details(query):
    """Extract amount and destination without requiring a specific transfer verb."""
    normalized = query.lower().replace(",", "")
    details = {}

    standalone_account = re.fullmatch(r"\s*(\d[\d-]*)\s*", normalized)
    if standalone_account:
        return {"receiverAccno": standalone_account.group(1)}

    amount_match = re.search(r"\bamount\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)", normalized)
    if amount_match:
        details["amount"] = float(amount_match.group(1))

    receiver_match = re.search(
        r"\b(?:receiver|recipient|destination|account(?:\s+number)?|acc(?:ount)?\s*no)\D*"
        r"(\d[\d-]*)",
        normalized,
    )
    if receiver_match:
        details["receiverAccno"] = receiver_match.group(1)

    key_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", normalized) or re.search(
        r"\b(?:key|cl[ée]|pix)(?:\s+(?:de\s+)?(?:payment|paiement))?\s*:?\s*(\+?[\w.@-]{4,})", normalized
    )
    if key_match and "receiverAccno" not in details:
        details["receiverAccno"] = key_match.group(1) if key_match.lastindex else key_match.group(0)

    numbers = re.findall(r"\b\d+(?:\.\d+)?\b", normalized)
    if "amount" not in details and len(numbers) > 1:
        details["amount"] = float(numbers[0])
    if "receiverAccno" not in details and len(numbers) > 1:
        details["receiverAccno"] = numbers[1]

    return details

# ================= FORMAT =================
def format_transactions(txns, user_id):
    lines = []

    for i, t in enumerate(txns, 1):
        amount = int(t["amount"])
        date = t["dateTime"][:10]

        direction = (
            f"Sent → {t['receiverAccno']}"
            if t["senderAccno"] == user_id
            else f"Received ← {t['senderAccno']}"
        )

        lines.append(f"{i}. {t['type']} | ₹{amount} | {direction} | {date}")

    sent, received = analyze_spending(txns, user_id)

    return (
        "📊 Last Transactions:\n\n"
        + "\n".join(lines)
        + f"\n\n💡 Insights:\nSent: ₹{int(sent)} | Received: ₹{int(received)}"
    )

# ================= MAIN =================
def run_agent(query, token, user_id, conversation_context=""):

    # Prefer the authenticated, database-backed chat session context from Java.
    # The file-based user memory is only a backward-compatible fallback and can
    # otherwise mix messages from separate chat sessions.
    context = conversation_context.strip() if conversation_context and conversation_context.strip() else get_context(user_id)
    q = query.lower()

    if q.strip() in {"bonjour", "salut", "bonsoir", "coucou"}:
        return "Bonjour ! Comment puis-je vous aider pour vos opérations bancaires aujourd’hui ?"

    if q.strip() in {"hi", "hello", "hey"}:
        return "Hello! How can I help you with your banking needs today?"

    if (
        ("account" in q or "accounts" in q)
        and ("number" in q or "numbers" in q)
        and any(word in q for word in ["all", "available", "exist", "existing", "which", "what", "show", "see"])
    ):
        try:
            numbers = get_available_account_numbers(token)
            if not numbers:
                return "No active account numbers are currently available."
            return "Available account numbers: " + ", ".join(str(number) for number in numbers)
        except Exception as exc:
            print("ACCOUNT LOOKUP ERROR:", exc)
            return "I could not retrieve the available account numbers. Please try again later."

    session = user_sessions.get(user_id)

    # ===== SESSION EXPIRY =====
    if session and session.get("created_at"):
        age = datetime.datetime.now().timestamp() - session["created_at"]
        if age > 120:  # 2 minutes
            user_sessions.pop(user_id, None)
            session = None

    # ===== SESSION LOCK =====
    if session:
        if session.get("type") == "transfer" and session.get("status") == "pending":
            if q not in ["yes", "haan", "no", "cancel"]:
                return "⚠️ Please confirm previous transaction (yes/no)"

        if session.get("type") == "transfer" and session.get("status") == "awaiting_details":
            session["args"].update(extract_transfer_details(query))
            if session["args"].get("amount") is None or session["args"].get("receiverAccno") is None:
                return "Please provide both the amount and receiver account number"
            session["status"] = "pending"
            return f"⚠️ Confirm transfer ₹{session['args']['amount']} to account {session['args']['receiverAccno']}? (yes/no)"

        if session.get("type") == "support":
            pass  # allow flow to continue

    # ===== CONFIRM =====
    if q.strip() in ["yes", "haan"]:
        if session:
            if session.get("type") == "support":
                if "issue" not in session.get("data", {}):
                    user_sessions.pop(user_id, None)
                    return "⚠️ Something went wrong. Please start again."
            if session.get("type") == "support" and session.get("status") == "confirming":
                try:
                    res = execute_tool(
                        "raiseComplaint",
                        {"issue": session["data"]["issue"]},
                        token,
                        user_id
                    )

                    if not res or "ticketId" not in res:
                        user_sessions.pop(user_id, None)
                        return "❌ Ticket creation failed. Try again."

                    ticket_id = res.get("ticketId")
                    assigned = res.get("assignedTo", "Support Team")
                    status = res.get("status", "OPEN")

                    user_sessions.pop(user_id, None)

                    return f"""✅ Ticket created

           🆔 ID: {ticket_id}
            👤 Assigned to: Agent {assigned}
            📌 Status: {status}

            Our support team will contact you shortly.
            """

                except Exception as e:
                    print("TICKET ERROR:", e)
                    user_sessions.pop(user_id, None)
                    return "❌ Failed to create ticket"

            # TRANSFER FLOW
            if session.get("type") == "transfer" and session.get("status") == "pending":
                try:
                    res = execute_tool(session["tool"], session["args"], token, user_id)

                    print("TRANSFER REQUEST:", session["args"])
                    print("TRANSFER RESPONSE:", res)

                    # 🔥 CHECK RESPONSE
                    if not res:
                        raise Exception("Empty response from transfer API")

        # OPTIONAL: check status field if exists
                    if not res:
                        raise Exception("Empty response")

                    if isinstance(res, dict) and res.get("error"):
                        raise Exception(res.get("error"))

                    user_sessions.pop(user_id, None)
                    if (
                        isinstance(res, dict)
                        and (
                            str(res.get("status", "")).upper() == "PENDING"
                            or str(res.get("agentDecision", "")).upper() == "TRIGGER_BPMN"
                            or res.get("flowableProcessId")
                        )
                    ):
                        return (
                            "⏳ Transfer submitted for validation. "
                            "Because this is a high-value transfer, it must be approved "
                            "through the banking validation workflow before completion."
                        )
                    return "✅ Transfer successful"

                except Exception as e:
                    print("TRANSFER ERROR:", e)
                    if "destination account" in str(e).lower():
                        user_sessions[user_id] = {
                            "type": "transfer",
                            "tool": "transferMoney",
                            "args": {
                                "amount": session["args"].get("amount"),
                            },
                            "status": "awaiting_details",
                            "created_at": datetime.datetime.now().timestamp()
                        }
                        return "The recipient was not found. Please provide a valid destination account number or payment key."
                    user_sessions.pop(user_id, None)
                    return "❌ Transfer failed. Please try again."

        return "⚠️ No pending action"

    if q.strip() in ["no", "cancel", "stop"]:
        if session:
            user_sessions.pop(user_id, None)
            return "❌ Action cancelled"
        return "Nothing to cancel"
    
    # ================= SUPPORT FLOW =================
    if session and session.get("type") == "support":

        if session.get("status") != "awaiting_issue" and query.lower() not in ["yes", "no", "cancel"]:
            return "⚠️ Please complete your ticket request first (yes/no)"

    # ✅ STEP 1 → ASK ISSUE
        if session.get("status") == "awaiting_issue":

            # 🚫 Ignore accidental yes/no here
            if query.lower() in ["yes", "no"]:
                return "⚠️ Please describe your issue first"
            session.setdefault("data", {})
            session["data"]["issue"] = query
            session["status"] = "confirming"

            return f"""⚠️ Confirm ticket creation?

    📝 Issue: "{query}"

    Type 'yes' to proceed or 'no' to cancel
    """


        # ===== BLOCK AFTER SUPPORT COMPLETE =====
    if session and session.get("type") == "support" and session.get("status") == "completed":
        return "📩 Your issue is being handled by our support team."
        
    # ===== LLM =====
    # ===== CRITICAL FIX: DO NOT DETECT INTENT DURING SUPPORT FLOW =====
    if session and session.get("type") == "support":
        tool, args = None, {}
    else:
        tool, args = detect_intent(query, {})

    # ===== LLM FALLBACK =====
    # ===== LLM FALLBACK (BLOCK DURING SUPPORT FLOW) =====
    if not tool and not (session and session.get("type") == "support"):
        decision = ask_llm_agent(query, context)
        tool, args = detect_intent(query, decision)

    # ===== TOOL =====
    if tool:
        try:
            if tool == "getBalance":
                data = execute_tool(tool, {}, token, user_id)
                return f"💰 Your balance is ₹{int(data.get('balance', 0))}"

            if tool == "getTransactions":
                data = execute_tool(tool, {}, token, user_id)
                txns = data.get("content", [])

                filters = parse_transaction_query(query)

                if filters["min_amount"]:
                    txns = [t for t in txns if t["amount"] >= filters["min_amount"]]

                if filters["today_only"]:
                    today = str(datetime.date.today())
                    txns = [t for t in txns if t["dateTime"].startswith(today)]

                txns = txns[:filters["limit"]]

                if not txns:
                    return "No transactions found"

                return format_transactions(txns, user_id)
            
            if tool == "raiseComplaint":

    # ✅ FIX: START WITH ISSUE, NOT CONFIRM
                user_sessions[user_id] = {
                    "type": "support",
                    "status": "awaiting_issue",   # 🔥 FIXED
                    "data": {},
                    "created_at": datetime.datetime.now().timestamp()
                }

                return "📝 Please describe your issue"

            if tool == "transferMoney":
                amount = args.get("amount")
                receiver = args.get("receiverAccno")

    # VALIDATE INPUT PRESENCE
                if amount is None or receiver is None:
                    partial_args = dict(args)
                    partial_args.update(extract_transfer_details(query))
                    if partial_args.get("amount") is None or partial_args.get("receiverAccno") is None:
                        user_sessions[user_id] = {
                            "type": "transfer",
                            "tool": tool,
                            "args": partial_args,
                            "status": "awaiting_details",
                            "created_at": datetime.datetime.now().timestamp()
                        }
                        return "Please provide both the amount and receiver account number"
                    args = partial_args
                    amount = args.get("amount")
                    receiver = args.get("receiverAccno")

    # SAFE CONVERSION
                try:
                    amount = float(amount)
                except:
                    return "⚠️ Invalid amount format. Please enter a valid number."

    # BUSINESS VALIDATION
                if amount <= 0:
                    return "⚠️ Amount must be greater than 0."

                if str(receiver) == str(user_id):
                    return "⚠️ You cannot transfer to your own account."

                # High-value transfers are validated by the backend BPMN workflow.
                # Do not call auxiliary balance/transaction endpoints before confirmation:
                # those checks can fail independently and prevent the workflow from starting.
                if amount > HIGH_VALUE_TRANSFER_THRESHOLD:
                    user_sessions[user_id] = {
                        "type": "transfer",
                        "tool": tool,
                        "args": {
                            "amount": amount,
                            "receiverAccno": receiver,
                        },
                        "status": "pending",
                        "high_risk": True,
                        "created_at": datetime.datetime.now().timestamp()
                    }
                    return (
                        f"⚠️ This high-value transfer of {amount:g} requires validation. "
                        f"Do you confirm the transfer of {amount:g} to account {receiver}? (yes/no)"
                    )

    # HIGH VALUE FLAG (NOT BLOCK)
                if amount > 500000:
                    user_sessions[user_id] = {
                        "type": "transfer",
                        "tool": tool,
                        "args": args,
                        "status": "pending",
                        "high_risk": True,
                        "created_at": datetime.datetime.now().timestamp()
                    }
                    return f"🚨 High value transaction ₹{amount}. Confirm carefully (yes/no)"
                
                # 🔥 GET CURRENT BALANCE
                balance_data = execute_tool("getBalance", {}, token, user_id)
                current_balance = float(balance_data.get("balance", 0))

# ❌ BLOCK IF INSUFFICIENT
                if amount > current_balance:
                    return f"❌ Insufficient balance. You can transfer up to ₹{int(current_balance)}"


    # FRAUD CHECK
                txn_data = execute_tool("getTransactions", {}, token, user_id)
                txns = txn_data.get("content", [])

                if detect_fraud(txns, amount):
                    user_sessions[user_id] = {
                        "type": "transfer",
                        "tool": tool,
                        "args": args,
                        "status": "pending",
                        "fraud": True,
                        "created_at": datetime.datetime.now().timestamp()
                    }
                    return f"🚨 Unusual transaction ₹{amount}. Confirm to proceed (yes/no)"

    # NORMAL FLOW
                user_sessions[user_id] = {
                    "type": "transfer",
                    "tool": tool,
                    "args": args,
                    "status": "pending",
                    "created_at": datetime.datetime.now().timestamp()
                }

                return f"⚠️ Confirm transfer ₹{amount} to account {receiver}? (yes/no)"

        except Exception as e:
            print("TOOL ERROR:", repr(e))
            detail = str(e).strip() or "The banking service returned no error details."
            return f"❌ Operation failed: {detail}"

    # ===== RAG =====
    rag = None

    # Only skip RAG if tool already handled it
    if not tool:
        rag = search(query)

    if rag:
        return rag

    # ===== FALLBACK =====
    reply = decision.get("reply", "Samajh nahi aaya")

    if should_escalate(user_id, reply) and not session:
        return "⚠️ I'm unable to resolve this. Do you want to raise a support ticket? (yes/no)"

    return reply