#!/usr/bin/env python3
"""
Servidor Mock de Webhook para CotaFácil (Python Puro - Sem dependências externas)
Executa em: http://localhost:3000/webhook

Como rodar:
    python3 scripts/mock_webhook.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import base64
import os
import re
from datetime import datetime

PORT = 3000

# Token esperado para autenticação.
# Deixe como "" ou None se quiser aceitar qualquer requisição sem exigir token.
# Pode ser definido via variável de ambiente: WEBHOOK_TOKEN="outro-token" python3 scripts/mock_webhook.py
EXPECTED_TOKEN = os.environ.get("WEBHOOK_TOKEN", "meu-token-secreto-123")

class WebhookHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        # Headers CORS para permitir requisições de qualquer origem
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Secret')
        self.end_headers()

    def do_OPTIONS(self):
        """Responde a preflights CORS"""
        self._set_headers(200)

    def do_GET(self):
        """Status check simples"""
        self._set_headers(200)
        response = {
            "status": "online",
            "message": "Servidor Mock de Webhook CotaFácil está pronto para receber requisições POST em /webhook"
        }
        self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b''

        timestamp = datetime.now().strftime('%H:%M:%S')
        print("\n" + "=" * 60)
        print(f"📥 [{timestamp}] Nova requisição POST recebida em: {self.path}")
        print("-" * 60)

        # Exibe e Valida Headers de Autenticação
        auth_header = self.headers.get('Authorization') or self.headers.get('X-Webhook-Secret') or ''
        
        if EXPECTED_TOKEN:
            token_received = auth_header
            if token_received.lower().startswith('bearer '):
                token_received = token_received[7:].strip()
            else:
                token_received = token_received.strip()

            if token_received != EXPECTED_TOKEN:
                print("❌ Falha de Autenticação: Token ausente ou inválido!")
                print(f"   Recebido: '{auth_header}'")
                print(f"   Esperado: 'Bearer {EXPECTED_TOKEN}' ou '{EXPECTED_TOKEN}'")
                self._set_headers(401)
                res_body = {
                    "success": False,
                    "error": "Não autorizado. Token de autenticação inválido ou ausente.",
                    "expectedToken": EXPECTED_TOKEN
                }
                self.wfile.write(json.dumps(res_body, ensure_ascii=False).encode('utf-8'))
                print("=" * 60 + "\n")
                return

            print(f"🔑 Header de Autenticação: {auth_header} (✅ Token Válido!)")
        elif auth_header:
            print(f"🔑 Header de Autenticação: {auth_header}")

        try:
            payload = json.loads(raw_body.decode('utf-8')) if raw_body else {}
            event = payload.get("event", "desconhecido")

            if event == "webhook.test":
                print("🧪 EVENTO DE TESTE RECEBIDO!")
                print(f"Mensagem: {payload.get('message')}")
                print(f"Disparado em: {payload.get('sentAt')}")
                
                self._set_headers(200)
                res_body = {
                    "success": True,
                    "message": "Teste recebido com sucesso no servidor mock!",
                    "receivedAt": datetime.now().isoformat()
                }
                self.wfile.write(json.dumps(res_body).encode('utf-8'))

            elif event == "budget.sent":
                budget = payload.get("budget", {})
                print(f"🚀 ORÇAMENTO RECEBIDO: \"{budget.get('name')}\" (ID: {budget.get('id')})")
                print(f"💰 Total Geral: R$ {budget.get('totalAmount', 0):.2f}")
                print(f"📦 Total de Itens: {budget.get('totalItems', 0)}")
                print("\nItens do orçamento:")
                
                output_dir = "webhook_images"
                os.makedirs(output_dir, exist_ok=True)

                for idx, item in enumerate(budget.get("items", []), 1):
                    unit_price = item.get("price", 0)
                    qty = item.get("quantity", 1)
                    subtotal = item.get("subtotal", unit_price * qty)
                    print(f"   {idx}. {item.get('title')}")
                    print(f"      Qtd: {qty} | Unit: R$ {unit_price:.2f} | Subtotal: R$ {subtotal:.2f}")
                    print(f"      Link: {item.get('url')}")
                    
                    screenshot = item.get("screenshotDataUrl")
                    if screenshot and isinstance(screenshot, str):
                        try:
                            if "," in screenshot:
                                header_part, b64_data = screenshot.split(",", 1)
                                ext = "jpg" if "jpeg" in header_part or "jpg" in header_part else "png"
                            else:
                                b64_data = screenshot
                                ext = "jpg"

                            img_bytes = base64.b64decode(b64_data)
                            size_kb = len(img_bytes) / 1024

                            safe_title = re.sub(r'[^a-zA-Z0-9_-]', '_', item.get('title', f'item_{idx}'))[:35]
                            filename = f"item_{idx}_{safe_title}.{ext}"
                            filepath = os.path.join(output_dir, filename)

                            with open(filepath, "wb") as f:
                                f.write(img_bytes)

                            print(f"      🖼️  Imagem decodificada ({size_kb:.1f} KB) -> Salva em: {filepath}")
                        except Exception as e:
                            print(f"      ⚠️  Imagem recebida, mas erro ao salvar: {e}")
                    else:
                        print(f"      Print: [Sem imagem enviada - modo leve]")

                self._set_headers(200)
                res_body = {
                    "success": True,
                    "message": f"Orçamento '{budget.get('name')}' processado com sucesso!",
                    "receivedAt": datetime.now().isoformat(),
                    "totalProcessed": len(budget.get("items", []))
                }
                self.wfile.write(json.dumps(res_body).encode('utf-8'))

            else:
                print("⚠️ Payload sem identificação de evento padrão:")
                print(json.dumps(payload, indent=2, ensure_ascii=False))
                self._set_headers(200)
                self.wfile.write(json.dumps({"success": True, "raw": payload}).encode('utf-8'))

        except json.JSONDecodeError:
            print("❌ Erro ao decodificar JSON do corpo da requisição:")
            print(raw_body.decode('utf-8', errors='ignore'))
            self._set_headers(400)
            self.wfile.write(json.dumps({"success": False, "error": "Invalid JSON"}).encode('utf-8'))

        print("=" * 60 + "\n")

def run(port=PORT):
    server_address = ('', port)
    httpd = HTTPServer(server_address, WebhookHandler)
    print(f"\n🚀 Servidor Mock de Webhook rodando em: http://localhost:{port}/webhook")
    if EXPECTED_TOKEN:
        print(f"🔒 Autenticação ATIVADA!")
        print(f"   Token esperado: '{EXPECTED_TOKEN}'")
        print(f"   (No CotaFácil, configure no campo Token / Secret: {EXPECTED_TOKEN})")
    else:
        print("🔓 Autenticação DESATIVADA (qualquer requisição sem token será aceita)")
    print("Pressione Ctrl+C para encerrar.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor encerrado.")
        httpd.server_close()

if __name__ == '__main__':
    run()
