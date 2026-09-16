from tools import get_balance, get_transactions, transfer_money
from ticket import create_ticket_api
import hashlib
import time

_recent_calls = {}  # replace with Redis in prod

def _retry(fn, retries=3):
    for i in range(retries):
        try:
            return fn()
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(0.5 * (i + 1))

def _make_key(user_id, tool, args):
    raw = f"{user_id}:{tool}:{str(args)}"
    return hashlib.sha256(raw.encode()).hexdigest()

def execute_tool(tool, args, token, user_id):
    key = _make_key(user_id, tool, args)

    # 10 sec idempotency window
    now = time.time()
    if key in _recent_calls and now - _recent_calls[key] < 10:
        return {"status": "duplicate_ignored"}

    _recent_calls[key] = now

    # ===== actual execution =====
    if tool == "getBalance":
        return get_balance(token)

    if tool == "getTransactions":
        return get_transactions(token, user_id)

    if tool == "transferMoney":
        amount = float(args.get("amount", 0))
        receiver = args.get("receiverAccno")

    # ❌ BLOCK NEGATIVE / ZERO
        if amount <= 0:
            return {
                "error": "Invalid amount. Please enter a value greater than 0."
            }

    # ❌ BLOCK SELF TRANSFER (optional but pro)
        if str(receiver) == str(user_id):
            return {
                "error": "You cannot transfer money to your own account."
            }

        return _retry(lambda: transfer_money(token, {
            "receiverAccno": receiver,
            "amount": amount
        }))
    
    if tool == "raiseComplaint":
        return create_ticket_api(token, args.get("issue", ""))

    raise Exception("Unknown tool")