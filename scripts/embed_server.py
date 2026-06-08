"""
KOMPASSI - Local Embedding Server
Uses sentence-transformers (all-MiniLM-L6-v2) to generate 384-dim embeddings.
Run: python scripts/embed_server.py

The server listens on http://localhost:5001 and exposes:
  GET  /health          Health check
  POST /embed           {"texts": ["text1", "text2", ...]} → {"embeddings": [[...], ...]}

Requirements: pip install -r scripts/requirements.txt
"""

import sys
import json
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler

# Lazy-load the model on first request to keep startup fast
_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        print("[embed_server] Loading all-MiniLM-L6-v2 model...", flush=True)
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        print("[embed_server] Model loaded.", flush=True)
    return _model

class EmbedHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path != "/embed":
            self.send_response(404)
            self.end_headers()
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            texts = data.get("texts", [])

            if not texts or not isinstance(texts, list):
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing or invalid 'texts' field"}).encode())
                return

            model = get_model()
            embeddings = model.encode(texts, normalize_embeddings=True)

            result = {
                "embeddings": [emb.tolist() for emb in embeddings],
                "dimensions": embeddings.shape[1],
                "count": len(embeddings),
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            print(f"[embed_server] Error: {e}", flush=True)
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, format, *args):
        # Suppress default HTTP log noise
        pass

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    server = HTTPServer(("127.0.0.1", port), EmbedHandler)
    print(f"[embed_server] Listening on http://127.0.0.1:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[embed_server] Shutting down.")
        server.shutdown()

if __name__ == "__main__":
    main()
