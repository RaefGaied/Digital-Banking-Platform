import requests
from config import BASE_URL

def create_ticket_api(token, query):
    try:
        res = requests.post(
            f"{BASE_URL}/customers/ticket",
            json={"issue": query},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )

        if res.status_code != 200:
            print("TICKET API ERROR:", res.status_code, res.text)
            return None

        data = res.json()

        print("TICKET API RESPONSE:", data)

        return data

    except Exception as e:
        print("TICKET EXCEPTION:", e)
        return None