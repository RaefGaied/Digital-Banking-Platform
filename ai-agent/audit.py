import json, time

def log_event(user_id, action, payload):
    record = {
        "user_id": user_id,
        "action": action,
        "payload": payload,
        "ts": time.time()
    }
    with open("audit.log", "a") as f:
        f.write(json.dumps(record) + "\n")