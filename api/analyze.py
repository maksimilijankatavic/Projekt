# api/analyze.py
from http.server import BaseHTTPRequestHandler
import json
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests
from gradio_client import Client

# Initialize clients once
nb_client = Client("maksimilijankatavic/nb-sentiment-classifier")
analyzer = SentimentIntensityAnalyzer()

HF_API_URL = "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-roberta-base-sentiment"
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
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
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

            # Naive Bayes
            try:
                naive_bayes_result = nb_client.predict(text=truncated, api_name="/predict")
                if isinstance(naive_bayes_result, str):
                    try:
                        naive_bayes_result = json.loads(naive_bayes_result)
                    except json.JSONDecodeError:
                        pass
            except Exception as e:
                naive_bayes_result = {"error": str(e)}

            # RoBERTa
            try:
                headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
                response = requests.post(HF_API_URL, headers=headers, json={"inputs": truncated}, timeout=5)
                response.raise_for_status()
                roberta_result = response.json()
            except requests.exceptions.Timeout:
                roberta_result = {"error": "HuggingFace API timeout"}
            except Exception as e:
                roberta_result = {"error": str(e)}

            self._send_response(200, {
                "ok": True,
                "input_chars": len(text),
                "used_chars": len(truncated),
                "vader": vader_result,
                "naive_bayes": naive_bayes_result,
                "roberta": roberta_result
            })

        except Exception as e:
            self._send_response(500, {"ok": False, "error": str(e)})