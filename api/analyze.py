from http.server import BaseHTTPRequestHandler
import json, os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import joblib
import requests

# Initialize VADER once
analyzer = SentimentIntensityAnalyzer()

# Load Naive Bayes model (precomputed probabilities / tiny model)
BASE = os.path.dirname(__file__)
NB_MODEL_PATH = os.path.join(BASE, '..', 'models', 'nb-model.pkl')
VEC_PATH = os.path.join(BASE, '..', 'models', 'nb-vectorizer.pkl')
nb_clf = joblib.load(NB_MODEL_PATH) if os.path.exists(NB_MODEL_PATH) else None
vectorizer = joblib.load(VEC_PATH) if os.path.exists(VEC_PATH) else None

# Hugging Face API
HF_API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment"
HF_TOKEN = os.environ.get("HF_TOKEN")


def vader_sentiment(text):
    s = analyzer.polarity_scores(text)
    if s["compound"] >= 0.05:
        label = "positive"
    elif s["compound"] <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    return {"label": label, "compound": s["compound"], "raw": s}


def nb_sentiment(text):
    if nb_clf is None or vectorizer is None:
        return {"label": "unavailable", "error": "Naive Bayes model not found"}
    X = vectorizer.transform([text])
    if hasattr(nb_clf, "predict_proba"):
        proba = nb_clf.predict_proba(X)[0]
        classes = [str(c) for c in getattr(nb_clf, "classes_", ["negative", "positive"])]
        idx = max(range(len(proba)), key=lambda i: proba[i])  # no numpy
        return {"label": classes[idx], "proba": float(proba[idx]), "classes": classes}
    label = nb_clf.predict(X)[0]
    return {"label": str(label)}


def roberta_sentiment(text):
    headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
    try:
        r = requests.post(HF_API_URL, headers=headers, json={"inputs": text}, timeout=15)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict) and "error" in data:
            return {"label": "unknown", "score": 0.0, "error": data["error"]}
        candidates = data[0] if isinstance(data, list) else data
        if isinstance(candidates, list) and candidates and "label" in candidates[0]:
            best = max(candidates, key=lambda c: c.get("score", 0))
            mapping = {"LABEL_0": "negative", "LABEL_1": "neutral", "LABEL_2": "positive"}
            label = mapping.get(best["label"], best["label"].lower())
            return {"label": label, "score": float(best["score"])}
        return {"label": "unknown", "score": 0.0}
    except Exception as e:
        return {"label": "unknown", "score": 0.0, "error": str(e)}


def majority_vote(labels):
    norm = []
    for l in labels:
        l = (l or "").lower()
        if l.startswith("pos"):
            norm.append("positive")
        elif l.startswith("neg"):
            norm.append("negative")
        elif l.startswith("neu"):
            norm.append("neutral")
        else:
            norm.append(l)
    counts = {k: norm.count(k) for k in set(norm)}
    best = max(counts.items(), key=lambda kv: kv[1])
    return best[0], best[1] / max(1, len(norm))


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length or 0)
            payload = json.loads(body.decode("utf-8")) if body else {}
            text = (payload.get("text") or "").strip()
            if not text:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing 'text'"}).encode("utf-8"))
                return

            truncated = text[:2048]

            v = vader_sentiment(truncated)
            n = nb_sentiment(truncated)
            r = roberta_sentiment(truncated)

            labels = [v.get("label"), n.get("label"), r.get("label")]
            consensus, strength = majority_vote(labels)

            res = {
                "ok": True,
                "input_chars": len(text),
                "used_chars": len(truncated),
                "models": {"vader": v, "naive_bayes": n, "roberta": r},
                "consensus": {"label": consensus, "agreement": strength},
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
