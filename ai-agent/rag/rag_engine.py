import pickle, os, re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data.txt")
STORE_PATH = os.path.join(BASE_DIR, "vector_store.pkl")

def load_data():
    with open(DATA_PATH, encoding="utf-8") as f:
        text = f.read()
    # Split into sections at each 🔹 marker, keeping header + body together
    sections = re.split(r'\n(?=🔹)', text)
    return [s.strip() for s in sections if s.strip()]

def create_vector_store():
    data = load_data()
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(data)
    with open(STORE_PATH, "wb") as f:
        pickle.dump({"vectorizer": vectorizer, "matrix": matrix, "data": data}, f)

_cache = None

def load_store():
    global _cache
    if _cache is None:
        if not os.path.exists(STORE_PATH):
            create_vector_store()
        with open(STORE_PATH, "rb") as f:
            _cache = pickle.load(f)
    return _cache

def search(query, k=1, threshold=0.2):
    store = load_store()
    q_vec = store["vectorizer"].transform([query])
    sims = cosine_similarity(q_vec, store["matrix"])[0]

    top_idx = sims.argsort()[::-1][:k]
    top_idx = [i for i in top_idx if sims[i] >= threshold]

    if not top_idx:
        return None

    return " ".join([store["data"][i] for i in top_idx])