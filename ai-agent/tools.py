import requests
from config import BASE_URL

def headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_balance(token):
    res = requests.get(f"{BASE_URL}/auth/profile", headers=headers(token), timeout=5)

    print("BALANCE STATUS:", res.status_code)
    print("BALANCE RAW:", res.text)   # 🔥 ADD THIS

    if res.status_code != 200:
        raise Exception(res.text)

    return res.json()

def get_transactions(token, accno=None):
    res = requests.get(
        f"{BASE_URL}/transactions/history",
        headers=headers(token),
        timeout=5
    )

    if res.status_code != 200:
        raise Exception(f"Transaction API failed: {res.text}")

    data = res.json()

    if isinstance(data, list):
        return {"content": data}
    if not isinstance(data, dict) or "content" not in data:
        raise Exception("Invalid transaction response format")

    return data

def get_available_account_numbers(token):
    res = requests.get(
        f"{BASE_URL}/accounts/available",
        headers=headers(token),
        timeout=5
    )
    if res.status_code != 200:
        raise Exception(f"Account lookup failed: {res.text}")
    data = res.json()
    if not isinstance(data, list):
        raise Exception("Invalid account response format")
    return data

def transfer_money(token, payload):
    res = requests.post(
        f"{BASE_URL}/transactions/transfer",
        json=payload, 
        headers=headers(token),
        timeout=5
    )
    if not 200 <= res.status_code < 300:
        detail = res.text.strip()
        try:
            body = res.json()
            detail = body.get("error") or body.get("message") or detail
            if not detail and body.get("fields"):
                detail = "; ".join(str(value) for value in body["fields"].values())
        except (ValueError, TypeError):
            pass
        raise Exception(f"Transfer failed ({res.status_code}): {detail or 'backend returned no details'}")

    try:
        data = res.json()
    except (ValueError, TypeError) as exc:
        raise Exception(f"Transfer returned invalid JSON ({res.status_code})") from exc

    # optional safety check
    if not isinstance(data, dict):
        raise Exception("Invalid transfer response")

    return data