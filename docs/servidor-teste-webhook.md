# Guia: Servidor Fake / Mock para Testar o Webhook

Este guia apresenta as formas mais rápidas e práticas de criar um servidor local ou utilizar serviços gratuitos para receber e inspecionar as requisições de Webhook enviadas pelo **CotaFácil**.

---

## ⚡ Opção 1: Python Puro (Recomendado — Zero Dependências)

Se você tem o Python 3 instalado na sua máquina, não precisa instalar nenhuma biblioteca (`pip`). O script utiliza apenas a biblioteca padrão do Python (`http.server`).

O script já está criado no projeto em: [`scripts/mock_webhook.py`](../scripts/mock_webhook.py).

### Como rodar:

```bash
python3 scripts/mock_webhook.py
```

### O que o servidor faz:
- Sobe na porta `3000` em: `http://localhost:3000/webhook`
- Exibe os **Headers** recebidos (incluindo autenticação `Authorization` ou `X-Webhook-Secret`).
- Identifica se é o evento de teste (`webhook.test`) ou envio de orçamento (`budget.sent`).
- Imprime de forma legível no terminal o título do orçamento, total geral, quantidade e cada item (preço, quantidade, subtotal e link).
- Responde com status HTTP `200 OK` e JSON de confirmação.

---

## 🟢 Opção 2: Node.js Puro (Zero `npm install`)

Se você prefere o ecossistema Node/JavaScript, também incluímos um servidor nativo usando apenas o módulo `http` padrão do Node.js.

O script já está criado em: [`scripts/mock_webhook.js`](../scripts/mock_webhook.js).

### Como rodar:

```bash
node scripts/mock_webhook.js
```

### O que o servidor faz:
- Sobe em: `http://localhost:3000/webhook`
- Trata requisições assíncronas em chunks, faz o parse do JSON e loga todo o orçamento estruturado no console.
- Responde com status HTTP `200 OK`.

---

## 🌐 Opção 3: Ferramentas na Nuvem (Zero Código / Sem Terminal)

Se quiser testar sem rodar nenhum comando local ou simular um ambiente de produção real com HTTPS:

### 1. [Webhook.site](https://webhook.site) (A mais recomendada para nuvem)
1. Acesse [https://webhook.site](https://webhook.site).
2. O site gera automaticamente uma URL exclusiva (ex: `https://webhook.site/a1b2c3d4-...`).
3. Copie essa URL e cole nas configurações de Webhook do CotaFácil.
4. Ao clicar em **🧪 Testar** ou **🚀 Webhook**, a página do Webhook.site atualiza em tempo real mostrando os headers e o JSON completo recebido.

### 2. [Beeceptor](https://beeceptor.com)
- Permite criar endpoints mock gratuitos com regras personalizadas de resposta e códigos de status (ex: simular erros 400, 500, etc.).

---

## 🔐 Testando com Token de Autenticação

Os servidores mock já vêm configurados com validação de token ativada por padrão:
- **Token Esperado**: `meu-token-secreto-123`
- **Header Padrão**: `Authorization: Bearer meu-token-secreto-123` (ou `X-Webhook-Secret`)

### Cenário A: Teste com Token Válido (HTTP 200 OK)
1. No popup do CotaFácil, abra as configurações de **Webhook**.
2. No campo **Token / Secret**, digite: `meu-token-secreto-123`.
3. Clique em **🧪 Testar** ou **🚀 Webhook**.
4. **Resultado**: 
   - A extensão confirmará o envio com `HTTP 200`.
   - O terminal exibirá: `🔑 Header de Autenticação: Bearer meu-token-secreto-123 (✅ Token Válido!)`.

### Cenário B: Teste sem Token ou com Token Inválido (HTTP 401 Unauthorized)
1. No popup do CotaFácil, apague o token ou digite uma senha errada (ex: `token-errado`).
2. Clique em **🧪 Testar** ou **🚀 Webhook**.
3. **Resultado**:
   - A extensão exibirá o erro na hora: `❌ Falha: Falha HTTP 401: Unauthorized`.
   - O terminal exibirá:
     ```text
     ❌ Falha de Autenticação: Token ausente ou inválido!
        Recebido: 'Bearer token-errado'
        Esperado: 'Bearer meu-token-secreto-123'
     ```

---

## 🚀 Passo a Passo para Testar na Extensão

1. **Inicie o servidor local** no seu terminal:
   ```bash
   python3 scripts/mock_webhook.py
   # ou
   node scripts/mock_webhook.js
   ```
2. **Abra o CotaFácil** no Chrome clicando no ícone da extensão.
3. Clique no botão **Webhook** (na barra superior, ao lado de *Exportar JSON*).
4. No campo **URL do Webhook**, digite:
   ```text
   http://localhost:3000/webhook
   ```
5. *(Opcional)* Preencha um token de teste no campo **Token / Secret** (ex: `meu-token-secreto-123`).
6. Clique no botão **`🧪 Testar`**:
   - O popup exibirá: `✅ Sucesso! Conexão validada (HTTP 200)`.
   - No seu terminal, você verá o log imediato do evento `webhook.test`.
7. Clique em **Salvar**.
8. Agora clique no botão **`🚀 Webhook`** no rodapé:
   - A extensão enviará todos os dados do orçamento ativo.
   - No terminal, você verá a listagem detalhada de todos os itens com os valores calculados.

---

## 🔍 Exemplo da Saída no Terminal

```text
============================================================
📥 [10:20:15] Nova requisição POST recebida em: /webhook
------------------------------------------------------------
🔑 Header de Autenticação: Bearer meu-token-secreto-123
🚀 ORÇAMENTO RECEBIDO: "PC Gamer 2026" (ID: budget-1731240000000)
💰 Total Geral: R$ 5499.80
📦 Total de Itens: 3

Itens do orçamento:
   1. Processador AMD Ryzen 7
      Qtd: 1 | Unit: R$ 1899.90 | Subtotal: R$ 1899.90
      Link: https://kabum.com.br/produto/123
   2. Placa de Vídeo RTX 4060
      Qtd: 1 | Unit: R$ 2299.90 | Subtotal: R$ 2299.90
      Link: https://terabyteshop.com.br/produto/456
   3. Memória RAM 32GB (2x16GB) DDR5
      Qtd: 2 | Unit: R$ 650.00 | Subtotal: R$ 1300.00
      Link: https://amazon.com.br/dp/B000XYZ
============================================================
```

---

## ❓ Resolução de Problemas

- **Erro "Address already in use" (Porta 3000 ocupada)**:
  - Altere a constante `PORT = 3000` para `PORT = 3001` (ou outra de sua preferência) dentro de `scripts/mock_webhook.py` ou `scripts/mock_webhook.js`.
- **Deseja testar de outro computador ou celular na mesma rede local?**
  - Use o IP local da sua máquina (ex: `http://192.168.0.15:3000/webhook`).
