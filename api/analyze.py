# api/analyze.py
from http.server import BaseHTTPRequestHandler
import json
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests

# At the top of your file, add:
from gradio_client import Client

# Initialize once (outside handler class to avoid re-connecting every request)
nb_client = Client("maksimilijankatavic/nb-sentiment-classifier")

analyzer = SentimentIntensityAnalyzer()

HF_API_URL = "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-roberta-base-sentiment"
HF_TOKEN = os.environ.get("HF_TOKEN")

# Replace with your actual Hugging Face Space URL
# Format should be: https://your-username-space-name.hf.space/predict
NB_API_URL = "https://maksimilijankatavic-nb-sentiment-classifier.hf.space/run/predict"

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
                vader_result = analyzer.polarity_scores(truncated)
            except Exception as e:
                vader_result = {"error": str(e)}

            # Naive Bayes via Hugging Face Space (gradio_client)
            try:
                naive_bayes_result = nb_client.predict(
                    text=truncated,
                    api_name="/predict"
                )

                # If the result comes back as a string, try parsing JSON
                if isinstance(naive_bayes_result, str):
                    try:
                        naive_bayes_result = json.loads(naive_bayes_result)
                    except json.JSONDecodeError:
                        # Keep the string as is if it can't be parsed
                        pass

            except Exception as e:
                naive_bayes_result = {"error": str(e)}

            # RoBERTa
            try:
                headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
                r = requests.post(HF_API_URL, headers=headers, json={"inputs": truncated}, timeout=5)
                r.raise_for_status()
                roberta_result = r.json()
            except requests.exceptions.Timeout:
                roberta_result = {"error": "HuggingFace API timeout"}
            except Exception as e:
                roberta_result = {"error": str(e)}

            res = {
                "ok": True,
                "input_chars": len(text),
                "used_chars": len(truncated),
                "vader": vader_result,
                "naive_bayes": naive_bayes_result,
                "roberta": roberta_result
            }

            self._send_response(200, res)

        except Exception as e:
            self._send_response(500, {"ok": False, "error": str(e)})