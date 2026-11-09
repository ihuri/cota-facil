# Gestor de Orçamentos e Cotações - Extensão Google Chrome

Extensão moderna e leve (sem dependências de compilação ou bundlers) para o Google Chrome (Manifest V3), desenvolvida para capturar produtos de e-commerces, gerenciar múltiplos orçamentos concorrentes e exportar relatórios consolidados em PDF com prints da tela, preços e links diretos.

---

## 🚀 Como Instalar no Google Chrome

1. Abra o Google Chrome e acesse o endereço:
   ```text
   chrome://extensions/
   ```
2. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer mode).
3. Clique no botão **"Carregar sem compactação"** (Load unpacked) no canto superior esquerdo.
4. Selecione esta pasta do projeto:
   ```text
   /Users/ihuri.barboza/Projetos Pessoais /Orçamentos Extensão
   ```
5. Pronto! O ícone do **Gestor de Orçamentos** (carrinho de compras azul com prancheta) aparecerá na barra de extensões do Chrome. Recomendamos fixar o ícone na barra clicando no quebra-cabeça.

---

## 🛠️ Como Utilizar

### 1. Criar, Gerenciar e Duplicar Orçamentos
- Ao clicar no ícone da extensão, você verá o seletor de orçamentos no topo.
- Clique em **`+ Novo`** para criar um novo orçamento (ex: *"PC Gamer"*, *"Reforma Cozinha"*, *"Suprimentos Escritório"*).
- Você pode alternar entre orçamentos a qualquer momento através do menu dropdown.
- **📑 Duplicar Orçamento**: Cria instantaneamente uma cópia independente do orçamento ativo com todos os produtos, links e prints. Ideal para testar alternativas de peças ou trocar de fornecedor sem perder o histórico do orçamento original.
- Utilize os botões **✏️** (renomear) e **🗑️** (excluir) para organizar seus orçamentos.

### 2. Capturar Produtos em Lojas Online
- Navegue normalmente em sites de compras como **Mercado Livre, Amazon, Shopee, Magazine Luiza, KaBuM, etc.**
- Abra a página do produto desejado.
- Clique no ícone da extensão:
  - O **Nome do produto**, **Preço** e **URL limpa** são detectados automaticamente.
  - Um **print da tela / produto** é capturado no mesmo instante.
  - Você pode ajustar o nome, editar o preço ou quantidade se desejar.
- Clique no botão verde **`➕ Adicionar ao Orçamento`**.

### 3. Gerenciar Itens e Visualizar Totais
- Os itens adicionados aparecem na seção inferior com foto, link e botões de quantidade (`+` e `-`).
- O **Total Geral** do orçamento selecionado é calculado e atualizado em tempo real.

### 4. Gerar Relatório em PDF e Enviar para IA

1. **Botão `🤖 Copiar p/ IA`**:
   - Copia com 1 clique todo o resumo do orçamento (título, quantidade de itens, produtos detalhados com valores unitários, quantidades, subtotais, links e total geral).
   - Inclui instruções automáticas para a IA avaliar compatibilidade, pesquisar se os preços estão competitivos e recomendar alternativas de melhor custo-benefício.
   - Basta clicar e colar diretamente no ChatGPT, Claude, Gemini ou qualquer outro assistente!

2. **Botão `📄 Gerar PDF` (Download Direto)**:
   - Compila e faz o download imediato do arquivo `.pdf` formatado no seu computador.
   - Cada produto é apresentado na estrutura solicitada:
     - **Linha 1**: `Nome do Produto - R$ Valor (Qtd: X = Subtotal)`
     - **Linha 2**: Print / Foto da tela capturada
     - **Linha 3**: Link clicável do produto
     - **Rodapé**: Total Consolidado do Orçamento.
   - *Opção adicional*: Você pode marcar a caixa *"Atualizar prints das páginas ao gerar PDF"* se desejar que a extensão reabra as URLs em segundo plano para tirar prints novos antes de compilar.

3. **Botão `🖨️ Relatório` (Visualização Web & Impressão)**:
   - Abre uma aba com o relatório completo formatado.
   - Permite usar o botão nativo do Chrome para **Salvar como PDF** com alta resolução ou imprimir diretamente em papel.

---

## 📁 Estrutura de Arquivos

```text
├── manifest.json              # Configuração Manifest V3
├── icons/                     # Ícones da extensão (16px, 48px, 128px)
├── popup/
│   ├── popup.html             # Interface do popup tradicional
│   ├── popup.css              # Estilos inspirados em Tailwind
│   ├── popup.js               # Lógica de múltiplos orçamentos e captura
│   └── pdf-builder.js         # Gerador nativo de PDF binário em JS puro
├── content/
│   └── extractor.js           # Extrator de dados (JSON-LD, OpenGraph, DOM)
├── background/
│   └── background.js          # Service worker para captura de tela e abas
├── report/
│   ├── report.html            # Visualização do relatório imprimível
│   ├── report.css             # Estilos de página e regras @media print
│   └── report.js              # Interações e exportação da página de relatório
└── docs/
    └── plano-extensao-orcamentos.md
```
