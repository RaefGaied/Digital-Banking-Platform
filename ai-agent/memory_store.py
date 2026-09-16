import json, os, time

FILE = "memory.json"
MAX_HISTORY = 20   # 🔥 limit per user


# ================= LOAD =================
def load():
    if not os.path.exists(FILE):
        return {}

    try:
        with open(FILE, "r") as f:
            return json.load(f)
    except:
        return {}


# ================= SAVE =================
def save(data):
    try:
        with open(FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print("MEMORY SAVE ERROR:", e)


# ================= GET =================
def get_user_mem(uid):
    data = load()
    history = data.get(str(uid), [])

    # 🔥 backward compatibility (string → dict)
    cleaned = []
    for item in history:
        if isinstance(item, dict):
            cleaned.append(item)
        else:
            cleaned.append({
                "msg": item,
                "time": 0
            })

    return cleaned


# ================= APPEND =================
def append_user_mem(uid, msg):
    data = load()

    entry = {
        "msg": msg,
        "time": time.time()
    }

    user_key = str(uid)
    data.setdefault(user_key, []).append(entry)

    # 🔥 limit memory
    data[user_key] = data[user_key][-MAX_HISTORY:]

    save(data)


# ================= CONTEXT HELPER =================
def get_context(uid, limit=5):
    data = load()
    history = data.get(str(uid), [])

    return "\n".join([x["msg"] for x in history[-limit:]])