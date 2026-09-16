from tools import *
from rag.rag_engine import search
from memory_store import append_user_mem, get_context
from tool_executor import execute_tool
from llm import ask_llm_agent
from escalation import should_escalate, escalate

import re
import datetime

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
        return decision["tool"], decision.get("arguments", {}) or {}
    
    if any(x in q for x in ["raise ticket", "create ticket", "complaint", "report issue","kaam nahi", "not working", "issue", "problem", "error", "nhi ho rha"]):
        return "raiseComplaint", {}
    
    if any(x in q for x in ["transfer", "send", "bhej"]):
        nums = re.findall(r'-?\d+\.?\d*', q)

        if len(nums) >= 2:
            return "transferMoney", {
                "amount": float(nums[0]),
                "receiverAccno": int(nums[1])
            }
        return "transferMoney", {}

    if any(x in q for x in ["transaction", "transactions", "history", "statement", "txns",
    "recent", "record", "record chahiye"]):
        return "getTransactions", {}
    
    if any(x in q for x in ["balance", "bal", "account balance", "mera balance", "kitna hai", "paise", "paisa"]):
        return "getBalance", {}

    return None, {}

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
def run_agent(query, token, user_id):

    context = get_context(user_id)
    q = query.lower()

    if q.strip() in {"hi", "hello", "hey", "bonjour", "salut"}:
        return "Hello! How can I help you with your banking needs today?"

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
                    return "✅ Transfer successful"

                except Exception as e:
                    print("TRANSFER ERROR:", e)
                    user_sessions.pop(user_id, None)   # 🔥 CLEAR SESSION
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
                    return "Please provide amount and receiver account number"

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
            print("TOOL ERROR:", e)
            return "❌ Operation failed"

    # ===== RAG =====
    rag = None

    # Only skip RAG if tool already handled it
    if not tool:
        rag = search(query)

    if rag:
        return rag

    # ===== FALLBACK =====
    reply = decision.get("reply", "Samajh nahi aaya")

    append_user_mem(user_id, f"User: {query}")
    append_user_mem(user_id, f"Bot: {reply}")

    if should_escalate(user_id, reply) and not session:
        return "⚠️ I'm unable to resolve this. Do you want to raise a support ticket? (yes/no)"

    return reply