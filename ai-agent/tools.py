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

def get_transactions(token, accno):
    res = requests.get(
        f"{BASE_URL}/transactions/user/{accno}",
        headers=headers(token),
        timeout=5
    )

    if res.status_code != 200:
        raise Exception(f"Transaction API failed: {res.text}")

    data = res.json()

    if not isinstance(data, dict) or "content" not in data:
        raise Exception("Invalid transaction response format")

    return data

def transfer_money(token, payload):
    res = requests.post(
        f"{BASE_URL}/transactions/transfer",
        json=payload, 
        headers=headers(token),
        timeout=5
    )
    if res.status_code != 200:
        raise Exception(f"Transfer failed: {res.text}")

    data = res.json()

    # optional safety check
    if not isinstance(data, dict):
        raise Exception("Invalid transfer response")

    return data