# api/analyze.py
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import joblib
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

analyzer = SentimentIntensityAnalyzer()

NB_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'nb-model.pkl')
VEC_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'nb-vectorizer.pkl')
nb_clf = joblib.load(NB_MODEL_PATH) if os.path.exists(NB_MODEL_PATH) else None
vectorizer = joblib.load(VEC_PATH) if os.path.exists(VEC_PATH) else None

HF_API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment"
HF_TOKEN = os.environ.get("HF_TOKEN")


@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    try:
        if request.method == 'OPTIONS':
            return '', 200
            
        if request.method != 'POST':
            return jsonify({"ok": False, "error": f"{request.method} not allowed"}), 405

        payload = request.get_json() or {}
        text = (payload.get("text") or "").strip()
        if not text:
            return jsonify({"ok": False, "error": "Missing 'text'"}), 400

        truncated = text[:2048]

        # VADER sentiment
        try:
            s = analyzer.polarity_scores(truncated)
            if s["compound"] >= 0.05:
                v = {"label": "positive", "compound": s["compound"], "raw": s}
            elif s["compound"] <= -0.05:
                v = {"label": "negative", "compound": s["compound"], "raw": s}
            else:
                v = {"label": "neutral", "compound": s["compound"], "raw": s}
        except Exception as e:
            v = {"label": "error", "error": str(e)}

        # Naive Bayes
        try:
            if nb_clf and vectorizer:
                X = vectorizer.transform([truncated])
                if hasattr(nb_clf, "predict_proba"):
                    proba = nb_clf.predict_proba(X)[0]
                    classes = [str(c) for c in getattr(nb_clf, "classes_", ["negative","positive"])]
                    idx = max(range(len(proba)), key=lambda i: proba[i])
                    n = {"label": classes[idx], "proba": float(proba[idx]), "classes": classes}
                else:
                    n = {"label": str(nb_clf.predict(X)[0])}
            else:
                n = {"label": "unavailable", "error": "Naive Bayes model not found"}
        except Exception as e:
            n = {"label": "error", "error": str(e)}

        # RoBERTa
        try:
            headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
            r = requests.post(HF_API_URL, headers=headers, json={"inputs": truncated}, timeout=10)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict) and "error" in data:
                r_result = {"label": "unknown", "score": 0.0, "error": data["error"]}
            else:
                candidates = data[0] if isinstance(data, list) else data
                if isinstance(candidates, list) and candidates and "label" in candidates[0]:
                    best = max(candidates, key=lambda c: c.get("score",0))
                    mapping = {"LABEL_0":"negative","LABEL_1":"neutral","LABEL_2":"positive"}
                    r_result = {"label": mapping.get(best["label"], best["label"].lower()), "score": float(best["score"])}
                else:
                    r_result = {"label": "unknown", "score": 0.0}
        except Exception as e:
            r_result = {"label":"unknown","score":0.0,"error": str(e)}

        # Majority vote
        labels = [v.get("label"), n.get("label"), r_result.get("label")]
        counts = {k: labels.count(k) for k in set(labels)}
        consensus_label, agreement = max(counts.items(), key=lambda kv: kv[1])

        res = {
            "ok": True,
            "input_chars": len(text),
            "used_chars": len(truncated),
            "models": {"vader": v, "naive_bayes": n, "roberta": r_result},
            "consensus": {"label": consensus_label, "agreement": agreement / max(1,len(labels))}
        }

        return jsonify(res), 200

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# For Vercel
def handler(environ, start_response):
    return app(environ, start_response)


if __name__ == '__main__':
    app.run(debug=True)