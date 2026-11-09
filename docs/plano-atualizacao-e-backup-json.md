# Plano: Varredura de Preços/Imagens e Importação/Exportação JSON

## 1. Visão Geral

Implementar duas ferramentas essenciais para automação e colaboração:
1. **Varredura e Atualização Automática (Preços e Imagens)**: Um botão para iterar por todos os links do orçamento ativo, abrindo cada produto em segundo plano para extrair os preços vigentes mais recentes e capturar novos prints da tela.
2. **Exportar e Importar JSON**: Permitir que o usuário exporte qualquer orçamento em formato `.json` padronizado e que outra pessoa (usando a mesma extensão) importe esse arquivo com 1 clique, preservando nomes, valores, links e prints.

---

## 2. Detalhamento Técnico

### 2.1 Varredura do Orçamento (Atualização em Lote)
- **Localização na Interface**:
  - Botão com ícone `🔄 Atualizar Preços e Prints` localizado na barra de cabeçalho dos itens do orçamento ativo.
- **Fluxo de Execução**:
  1. O usuário clica em "Atualizar Preços e Prints".
  2. O popup exibe uma barra de status com progresso em tempo real (ex: *"Atualizando 2 de 8: Placa-Mãe..."*).
  3. O Service Worker (`background.js`):
     - Para cada item com URL:
       - Abre a aba em segundo plano (`chrome.tabs.create`).
       - Aguarda o carregamento da página com timeout seguro (8s).
       - Injeta `extractor.js` e obtém o novo preço e dados atualizados.
       - Captura a tela atualizada via `chrome.tabs.captureVisibleTab`.
       - Fecha a aba temporária.
  4. Identifica alterações de preço (se aumentou, diminuiu ou manteve).
  5. Salva tudo no `chrome.storage.local` e recalcula o Total Geral.
  6. Notifica o usuário: *"Varredura concluída! X itens atualizados com sucesso."*

---

### 2.2 Exportação e Importação de Arquivo JSON

#### A. Exportar JSON
- **Botão**: `Exportar JSON` (no rodapé ou menu de opções do orçamento).
- **Conteúdo do Arquivo**:
  ```json
  {
    "version": "1.0",
    "exportedAt": "2026-11-09T19:15:00.000Z",
    "budget": {
      "id": "budget-...",
      "name": "PC ENGENHARIA 2",
      "createdAt": "2026-11-09T...",
      "items": [
        {
          "id": "item-...",
          "title": "SSD Kingston 1TB...",
          "price": 993.00,
          "quantity": 1,
          "url": "https://...",
          "screenshotDataUrl": "data:image/jpeg;base64,...",
          "addedAt": "2026-11-09T..."
        }
      ]
    }
  }
  ```
- **Ação**: Dispara o download automático do arquivo `Orcamento_[Nome]_[Data].json`.

#### B. Importar JSON
- **Botão**: `Importar JSON` com input de arquivo oculto (`<input type="file" accept=".json">`).
- **Validação e Fluxo**:
  1. O usuário seleciona o arquivo `.json`.
  2. A extensão lê o arquivo via `FileReader` e valida a estrutura.
  3. Gera um novo ID único para o orçamento importado (evitando colisões).
  4. Se já existir um orçamento com mesmo nome, adiciona o sufixo `(Importado)`.
  5. Adiciona o orçamento à lista no `chrome.storage.local`.
  6. Define o orçamento importado como ativo imediatamente e atualiza o dropdown e a lista na tela.
  7. Exibe aviso: *"Orçamento [Nome] importado com sucesso (X itens)!"*

---

## 3. Arquivos Modificados

1. **`background/background.js`**:
   - Evolução de `BATCH_CAPTURE_ITEMS` para `SWEEP_AND_UPDATE_BUDGET`: agora extrai tanto a imagem quanto o novo preço e dados da página via `extractor.js`.
2. **`popup/popup.html`**:
   - Adição do botão `🔄 Atualizar Preços` no cabeçalho da lista de itens.
   - Adição dos botões `⬇️ Exportar JSON` e `⬆️ Importar JSON`.
   - Elemento indicador de progresso durante a varredura.
3. **`popup/popup.js`**:
   - Lógica de exportação via Blob e download.
   - Lógica de leitura de arquivo JSON via `FileReader` e inserção nos orçamentos.
   - Comunicação com o background para a varredura com atualização visual em tempo real.
4. **`popup/popup.css`**:
   - Estilos para a barra de progresso e botões de importação/exportação.
5. **`README.md`**:
   - Atualização das instruções de uso.

---

## 4. Status de Aprovação
Aguardando aprovação do desenvolvedor para iniciar a codificação.
