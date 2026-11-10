#!/usr/bin/env node
/**
 * Servidor Mock de Webhook para CotaFácil (Node.js Puro - Sem npm install / sem dependências)
 * Executa em: http://localhost:3000/webhook
 * 
 * Como rodar:
 *    node scripts/mock_webhook.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Token esperado para autenticação.
// Deixe como "" ou null se quiser aceitar qualquer requisição sem exigir token.
const EXPECTED_TOKEN = process.env.WEBHOOK_TOKEN || 'meu-token-secreto-123';

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Secret');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Verificação simples via GET
  if (req.method === 'GET') {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      status: 'online',
      message: 'Servidor Mock de Webhook CotaFácil ativo. Envie requisições POST para /webhook'
    }, null, 2));
  }

  // Recepção de Webhook POST
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const now = new Date().toLocaleTimeString('pt-BR');
      console.log('\n' + '='.repeat(60));
      console.log(`📥 [${now}] Nova requisição POST recebida em: ${req.url}`);
      console.log('-'.repeat(60));

      const auth = req.headers['authorization'] || req.headers['x-webhook-secret'] || '';
      
      if (EXPECTED_TOKEN) {
        let tokenReceived = auth;
        if (tokenReceived.toLowerCase().startsWith('bearer ')) {
          tokenReceived = tokenReceived.slice(7).trim();
        } else {
          tokenReceived = tokenReceived.trim();
        }

        if (tokenReceived !== EXPECTED_TOKEN) {
          console.log('❌ Falha de Autenticação: Token ausente ou inválido!');
          console.log(`   Recebido: '${auth}'`);
          console.log(`   Esperado: 'Bearer ${EXPECTED_TOKEN}' ou '${EXPECTED_TOKEN}'`);
          console.log('='.repeat(60) + '\n');
          res.statusCode = 401;
          return res.end(JSON.stringify({
            success: false,
            error: 'Não autorizado. Token de autenticação inválido ou ausente.',
            expectedToken: EXPECTED_TOKEN
          }));
        }

        console.log(`🔑 Header de Autenticação: ${auth} (✅ Token Válido!)`);
      } else if (auth) {
        console.log(`🔑 Header de Autenticação: ${auth}`);
      }

      try {
        const payload = JSON.parse(body || '{}');
        const event = payload.event || 'desconhecido';

        if (event === 'webhook.test') {
          console.log('🧪 EVENTO DE TESTE RECEBIDO!');
          console.log(`Mensagem: ${payload.message}`);
          console.log(`Disparado em: ${payload.sentAt}`);

          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            message: 'Teste de conexão recebido com sucesso!',
            receivedAt: new Date().toISOString()
          }));
        }

        if (event === 'budget.sent') {
          const budget = payload.budget || {};
          console.log(`🚀 ORÇAMENTO RECEBIDO: "${budget.name}" (ID: ${budget.id})`);
          console.log(`💰 Total Geral: R$ ${Number(budget.totalAmount || 0).toFixed(2)}`);
          console.log(`📦 Total de Itens: ${budget.totalItems || 0}`);
          console.log('\nItens do orçamento:');

          const outputDir = path.join(__dirname, '..', 'webhook_images');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          (budget.items || []).forEach((item, idx) => {
            const price = Number(item.price || 0);
            const qty = Number(item.quantity || 1);
            const subtotal = Number(item.subtotal || price * qty);
            console.log(`   ${idx + 1}. ${item.title}`);
            console.log(`      Qtd: {qty} | Unit: R$ ${price.toFixed(2)} | Subtotal: R$ ${subtotal.toFixed(2)}`);
            console.log(`      Link: ${item.url || 'N/A'}`);

            const screenshot = item.screenshotDataUrl;
            if (screenshot && typeof screenshot === 'string') {
              try {
                const isJpeg = screenshot.includes('jpeg') || screenshot.includes('jpg');
                const ext = isJpeg ? 'jpg' : 'png';
                const base64Data = screenshot.includes(',') ? screenshot.split(',')[1] : screenshot;
                const buffer = Buffer.from(base64Data, 'base64');
                const sizeKb = (buffer.length / 1024).toFixed(1);

                const safeTitle = (item.title || `item_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 35);
                const filename = `item_${idx + 1}_${safeTitle}.${ext}`;
                const filepath = path.join(outputDir, filename);

                fs.writeFileSync(filepath, buffer);
                console.log(`      🖼️  Imagem decodificada (${sizeKb} KB) -> Salva em: ${path.relative(process.cwd(), filepath)}`);
              } catch (e) {
                console.log(`      ⚠️  Imagem recebida, mas erro ao salvar: ${e.message}`);
              }
            } else {
              console.log('      Print: [Sem imagem enviada - modo leve]');
            }
          });

          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            message: `Orçamento "${budget.name}" processado com sucesso!`,
            receivedAt: new Date().toISOString(),
            totalProcessed: (budget.items || []).length
          }));
        }

        // Outros eventos
        console.log('⚠️ Payload recebido:', JSON.stringify(payload, null, 2));
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, payload }));

      } catch (err) {
        console.error('❌ Erro ao parsear JSON:', err.message);
        res.statusCode = 400;
        return res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });

    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor Mock de Webhook rodando em: http://localhost:${PORT}/webhook`);
  if (EXPECTED_TOKEN) {
    console.log(`🔒 Autenticação ATIVADA!`);
    console.log(`   Token esperado: '${EXPECTED_TOKEN}'`);
    console.log(`   (No CotaFácil, configure no campo Token / Secret: ${EXPECTED_TOKEN})`);
  } else {
    console.log(`🔓 Autenticação DESATIVADA (qualquer requisição sem token será aceita)`);
  }
  console.log('Pressione Ctrl+C para encerrar.\n');
});
