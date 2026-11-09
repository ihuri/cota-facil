# Plano: Novas Funcionalidades (Copiar p/ IA e Duplicar Orçamento)

## 1. Objetivo

Adicionar duas novas ferramentas de produtividade ao **Gestor de Orçamentos**:
1. **Copiar Dados Formatados para IA**: Permite copiar com 1 clique todos os dados do orçamento ativo (título, itens, quantidades, preços unitários, subtotais, links e total geral) em um formato de texto estruturado e otimizado para envio a Inteligências Artificiais (ChatGPT, Gemini, Claude).
2. **Duplicar Orçamento (Clonagem)**: Permite clonar o orçamento ativo com todos os seus produtos e prints, gerando uma cópia independente (ex: `"[Nome] (Cópia)"`) para simular cenários de troca de peças, comparação de fornecedores ou redução de custos sem perder o histórico do orçamento original.

---

## 2. Detalhamento das Funcionalidades

### 2.1 Botão "Copiar para IA" (Área de Transferência)
- **Localização na Interface**:
  - Na barra de ações do orçamento ativo (ao lado de "Gerar PDF" ou no cabeçalho do orçamento).
- **Formato do Texto Copiado (Clipboard)**:
  ```text
  # Orçamento: [Nome do Orçamento]
  Data: 09/11/2026
  Total de Itens: X
  Valor Total: R$ Y.YYY,YY

  ## Lista de Itens:
  1. [Nome do Produto]
     - Preço Unitário: R$ X,XX
     - Quantidade: Y
     - Subtotal: R$ Z,ZZ
     - Link: https://...

  2. [Nome do Produto]
     ...

  ## Total Geral: R$ Y.YYY,YY

  ---
  Instrução para IA: Revise esta cotação/orçamento, analise a compatibilidade dos itens, avalie se os preços estão coerentes e sugira alternativas com melhor custo-benefício.
  ```
- **Feedback Visual**:
  - Toast/mensagem rápida: *"Copiado! Pronto para colar na sua IA."*

---

### 2.2 Botão "Duplicar Orçamento"
- **Localização na Interface**:
  - Na barra do seletor de orçamento, ao lado dos botões de renomear (✏️) e excluir (🗑️), adicionando o botão com ícone 📑 (`btn-duplicate-budget`).
- **Comportamento do Fluxo**:
  1. O usuário clica no botão 📑.
  2. A extensão cria um clone exato do orçamento atual:
     - Novo identificador único (`id: 'budget-' + Date.now()`).
     - Novo nome: `"[Nome Atual] (Cópia)"`.
     - Cópia profunda dos itens (títulos, preços, quantidades, URLs e prints salvos).
     - Nova data de criação (`createdAt: new Date().toISOString()`).
  3. O novo orçamento duplicado é selecionado como o ativo automaticamente.
  4. Salva no `chrome.storage.local` e re-renderiza a tela.
  5. Mensagem de sucesso: *"Orçamento duplicado com sucesso! Você já está editando a cópia."*

---

## 3. Arquivos Impactados

1. **`popup/popup.html`**:
   - Inclusão do botão de duplicar 📑 na barra do seletor.
   - Inclusão do botão de copiar para IA na barra de ações.
2. **`popup/popup.js`**:
   - Implementação da função `duplicateActiveBudget()`.
   - Implementação da função `copyBudgetForAI()`.
   - Registro dos eventos de clique e mensagens de feedback.
3. **`popup/popup.css`**:
   - Estilização do novo botão de ação e ícone.
4. **`report/report.html` & `report/report.js`** (Opcional):
   - Adição do botão "Copiar p/ IA" também na tela cheia de relatório para conveniência.

---

## 4. Status de Aprovação
Aguardando aprovação explícita do desenvolvedor para iniciar a codificação.
