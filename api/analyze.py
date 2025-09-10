from http.server import BaseHTTPRequestHandler
import json
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests
from gradio_client import Client

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
        self._send_response(405, {"error": "GET not allowed"})

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8')) if post_data else {}
            except json.JSONDecodeError:
                self._send_response(400, {"error": "Invalid JSON"})
                return
            
            text = (payload.get("text") or "").strip()
            if not text:
                self._send_response(400, {"error": "Missing 'text'"})
                return

            truncated = text[:2048]

            # VADER sentiment
            try:
                vader_raw = analyzer.polarity_scores(truncated)
                if vader_raw["compound"] >= 0.05:
                    vader_sentiment = "positive"
                elif vader_raw["compound"] <= -0.05:
                    vader_sentiment = "negative"
                else:
                    vader_sentiment = "neutral"
                
                vader_result = {
                    "negative": vader_raw["neg"],
                    "neutral": vader_raw["neu"],
                    "positive": vader_raw["pos"],
                    "compound": vader_raw["compound"],
                    "sentiment": vader_sentiment
                }
            except Exception as e:
                vader_result = {"error": str(e)}

            # Naive Bayes
            try:
                nb_raw = nb_client.predict(text=truncated, api_name="/predict")
                if isinstance(nb_raw, str):
                    try:
                        nb_raw = json.loads(nb_raw)
                    except json.JSONDecodeError:
                        pass
                
                if isinstance(nb_raw, dict) and "all_probabilities" in nb_raw:
                    probs = nb_raw["all_probabilities"]
                    naive_bayes_result = {
                        "negative": probs[0] if len(probs) > 0 else 0.0,
                        "neutral": probs[1] if len(probs) > 1 else 0.0,
                        "positive": probs[2] if len(probs) > 2 else 0.0,
                        "sentiment": nb_raw.get("label", "unknown")
                    }
                else:
                    naive_bayes_result = {"error": "Unexpected response format"}
            except Exception as e:
                naive_bayes_result = {"error": str(e)}

            # RoBERTa
            try:
                headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
                response = requests.post(HF_API_URL, headers=headers, json={"inputs": truncated}, timeout=5)
                response.raise_for_status()
                roberta_raw = response.json()
                
                if isinstance(roberta_raw, list) and len(roberta_raw) > 0:
                    scores = roberta_raw[0]
                    label_mapping = {"LABEL_0": "negative", "LABEL_1": "neutral", "LABEL_2": "positive"}
                    
                    neg_score = neu_score = pos_score = 0.0
                    best_sentiment = "unknown"
                    best_score = 0.0
                    
                    for item in scores:
                        label = label_mapping.get(item["label"], item["label"])
                        score = item["score"]
                        
                        if label == "negative":
                            neg_score = score
                        elif label == "neutral":
                            neu_score = score
                        elif label == "positive":
                            pos_score = score
                        
                        if score > best_score:
                            best_score = score
                            best_sentiment = label
                    
                    roberta_result = {
                        "negative": neg_score,
                        "neutral": neu_score,
                        "positive": pos_score,
                        "sentiment": best_sentiment
                    }
                else:
                    roberta_result = {"error": "Unexpected response format"}
            except requests.exceptions.Timeout:
                roberta_result = {"error": "HuggingFace API timeout"}
            except Exception as e:
                roberta_result = {"error": str(e)}

            model_results = {
                "vader": vader_result.get("sentiment", "error"),
                "naive_bayes": naive_bayes_result.get("sentiment", "error"),
                "roberta": roberta_result.get("sentiment", "error")
            }
            
            sentiment_groups = {
                "positive": [],
                "negative": [],
                "neutral": []
            }
            
            valid_votes = {sentiment: 0 for sentiment in ["positive", "negative", "neutral"]}
            
            for model, sentiment in model_results.items():
                if sentiment in sentiment_groups:
                    sentiment_groups[sentiment].append(model)
                    valid_votes[sentiment] += 1
            
            total_valid_votes = sum(valid_votes.values())
            if total_valid_votes > 0:
                final_sentiment = max(valid_votes, key=valid_votes.get)
                max_votes = valid_votes[final_sentiment]
                tied_sentiments = [s for s, count in valid_votes.items() if count == max_votes]
                if len(tied_sentiments) > 1:
                    final_sentiment = "neutral"
            else:
                final_sentiment = "error"
            
            conclusion = {
                "final_sentiment": final_sentiment,
                "positive": sentiment_groups["positive"],
                "negative": sentiment_groups["negative"],
                "neutral": sentiment_groups["neutral"]
            }

            self._send_response(200, {
                "vader": vader_result,
                "naive_bayes": naive_bayes_result,
                "roberta": roberta_result,
                "conclusion": conclusion
            })

        except Exception as e:
            self._send_response(500, {"error": str(e)})