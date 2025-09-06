# api/analyze.py
from http.server import BaseHTTPRequestHandler
import json
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests

analyzer = SentimentIntensityAnalyzer()

HF_API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment"
HF_TOKEN = os.environ.get("HF_TOKEN")

# Replace with your actual Hugging Face Space URL
# Format should be: https://your-username-space-name.hf.space/predict
NB_API_URL = "https://maksimilijankatavic-nb-sentiment-classifier.hf.space/predict"

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

            # Naive Bayes via external API
            try:
                # Updated to match HuggingFace Space API format
                nb_response = requests.post(
                    NB_API_URL,
                    json={"data": [truncated]},  # HF Spaces typically expect this format
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                if nb_response.status_code == 200:
                    nb_data = nb_response.json()
                    
                    # Handle the actual response format you showed
                    if isinstance(nb_data, dict) and "label" in nb_data:
                        # Direct response format
                        n = {
                            "label": nb_data["label"],
                            "score": nb_data.get("proba", 0.0),
                            "all_probabilities": nb_data.get("all_probabilities", [])
                        }
                    elif isinstance(nb_data, list) and len(nb_data) > 0 and "label" in nb_data[0]:
                        # List response format
                        result = nb_data[0]
                        n = {
                            "label": result["label"],
                            "score": result.get("proba", 0.0),
                            "all_probabilities": result.get("all_probabilities", [])
                        }
                    else:
                        n = {"label": "error", "error": "Unexpected response format", "raw_response": nb_data}
                else:
                    n = {"label": "error", "error": f"NB API returned {nb_response.status_code}: {nb_response.text}"}
                    
            except requests.exceptions.Timeout:
                n = {"label": "error", "error": "Naive Bayes API timeout"}
            except requests.exceptions.ConnectionError:
                n = {"label": "unavailable", "error": "Cannot connect to Naive Bayes API"}
            except Exception as e:
                n = {"label": "unavailable", "error": f"NB API error: {str(e)}"}

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

            # Majority vote (only count models that actually worked)
            working_models = []
            if v.get("label") not in ["error", "unavailable"]:
                working_models.append(v.get("label"))
            if n.get("label") not in ["error", "unavailable"]:
                working_models.append(n.get("label"))
            if r_result.get("label") not in ["error", "unknown", "unavailable"]:
                working_models.append(r_result.get("label"))

            if working_models:
                counts = {k: working_models.count(k) for k in set(working_models)}
                consensus_label, agreement = max(counts.items(), key=lambda kv: kv[1])
                consensus = {"label": consensus_label, "agreement": agreement / len(working_models)}
            else:
                consensus = {"label": "unknown", "agreement": 0.0}

            res = {
                "ok": True,
                "input_chars": len(text),
                "used_chars": len(truncated),
                "models": {"vader": v, "naive_bayes": n, "roberta": r_result},
                "consensus": consensus
            }

            self._send_response(200, res)

        except Exception as e:
            self._send_response(500, {"ok": False, "error": str(e)})