# api/analyze.py
from http.server import BaseHTTPRequestHandler
import json
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests

analyzer = SentimentIntensityAnalyzer()

# Enhanced model loading with detailed debugging
try:
    current_dir = os.getcwd()
    api_dir = os.path.dirname(__file__)
    
    # Try multiple possible paths for the models
    possible_paths = [
        os.path.join(api_dir, '..', 'models'),
        os.path.join(current_dir, 'models'),
        os.path.join('models'),
        os.path.join(api_dir, 'models'),
        os.path.join(api_dir, '..', '..', 'models'),
    ]
    
    nb_clf = None
    vectorizer = None
    debug_paths = []
    
    for models_dir in possible_paths:
        nb_path = os.path.join(models_dir, 'nb-model.pkl')
        vec_path = os.path.join(models_dir, 'nb-vectorizer.pkl')
        
        debug_paths.append({
            "models_dir": models_dir,
            "nb_path": nb_path,
            "vec_path": vec_path,
            "nb_exists": os.path.exists(nb_path),
            "vec_exists": os.path.exists(vec_path),
            "dir_exists": os.path.exists(models_dir),
            "dir_contents": glob.glob(os.path.join(models_dir, '*')) if os.path.exists(models_dir) else []
        })
        
        if os.path.exists(nb_path) and os.path.exists(vec_path):
            nb_clf = joblib.load(nb_path)
            vectorizer = joblib.load(vec_path)
            break
    
    # Store debug info for later use
    model_debug_info = {
        "current_dir": current_dir,
        "api_dir": api_dir,
        "paths_tried": debug_paths,
        "models_loaded": nb_clf is not None and vectorizer is not None,
        "root_contents": glob.glob(os.path.join(current_dir, '*')),
        "api_parent_contents": glob.glob(os.path.join(api_dir, '..', '*')) if os.path.exists(os.path.join(api_dir, '..')) else []
    }
            
except Exception as e:
    nb_clf = None
    vectorizer = None
    model_debug_info = {"loading_error": str(e)}

HF_API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment"
HF_TOKEN = os.environ.get("HF_TOKEN")

class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self._send_response(405, {"ok": False, "error": "GET not allowed"})

    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Parse JSON
            try:
                payload = json.loads(post_data.decode('utf-8')) if post_data else {}
            except json.JSONDecodeError:
                self._send_response(400, {"ok": False, "error": "Invalid JSON"})
                return
            
            text = (payload.get("text") or "").strip()
            if not text:
                self._send_response(400, {"ok": False, "error": "Missing 'text'"})
                return

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

            # Naive Bayes with enhanced debugging
            try:
                if nb_clf and vectorizer:
                    X = vectorizer.transform([truncated])
                    if hasattr(nb_clf, "predict_proba"):
                        proba = nb_clf.predict_proba(X)[0]
                        classes = [str(c) for c in getattr(nb_clf, "classes_", ["negative","positive"])]
                        idx = max(range(len(proba)), key=lambda i: proba[i])
                        n = {
                            "label": classes[idx], 
                            "proba": float(proba[idx]), 
                            "classes": classes,
                            "all_probabilities": [float(p) for p in proba]
                        }
                    else:
                        prediction = nb_clf.predict(X)[0]
                        n = {"label": str(prediction)}
                else:
                    n = {"label": "unavailable", "error": "Naive Bayes model not found", "debug": model_debug_info}
            except Exception as e:
                n = {"label": "error", "error": str(e)}

            # RoBERTa
            try:
                headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
                r = requests.post(HF_API_URL, headers=headers, json={"inputs": truncated}, timeout=5)
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
            except requests.exceptions.Timeout:
                r_result = {"label":"unknown","score":0.0,"error": "HuggingFace API timeout"}
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

            self._send_response(200, res)

        except Exception as e:
            self._send_response(500, {"ok": False, "error": str(e)})