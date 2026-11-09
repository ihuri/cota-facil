# Plano de Desenvolvimento: Extensão Chrome para Cotação e Orçamentos

## 1. Visão Geral

Desenvolver uma extensão para Google Chrome (Manifest V3) em **JavaScript Vanilla + CSS puro/Tailwind (sem etapa de build/bundler)** com **Popup Tradicional**. A extensão permite navegar por e-commerces, capturar dados de produtos (nome, preço, URL e captura de imagem/print), agrupar os itens em múltiplos orçamentos concorrentes e exportar o resultado consolidado em PDF com o layout estruturado (Nome - Valor, Print/Imagem, Link).

---

## 2. Requisitos e Definições Aprovadas

### 2.1 Modelo e Formato de Interface
- **Popup Tradicional (`popup.html` + `popup.js` + `popup.css`)**:
  - Abre diretamente ao clicar no ícone da extensão.
  - Interface compacta, responsiva e objetiva.
  - Seletor de orçamento ativo no topo.

### 2.2 Captura de Dados & Captura Visual (Print/Imagem)
- **Dados Textuais**: Nome do produto, Preço (R$), URL original limpa (sem UTMs de rastreio).
- **Captura da Imagem/Print da Tela**:
  - **Estratégia Recomendada (Captura Imediata na Adição)**: Ao clicar para adicionar o produto, a extensão utiliza a API nativa `chrome.tabs.captureVisibleTab` para capturar imediatamente um print da tela atual (ou a imagem do produto). Isso garante velocidade imediata, sem necessidade de reabrir abas ou sofrer bloqueios de captcha/cloudflare no momento de exportar.
  - **Fluxo Automatizado na Geração do PDF (Batch Re-check opcional)**: Caso solicitado, a extensão pode iterar sobre as URLs salvas, abrindo abas temporárias em segundo plano (`chrome.tabs.create`), aguardando o carregamento completo (`webNavigation`/`tabs.onUpdated`), tirando o print via `captureVisibleTab` e fechando a aba em seguida.

### 2.3 Formato do PDF Solicitado
Layout por item no relatório PDF:
1. **Linha 1**: `[Nome do Produto] - [Valor (ex: R$ 1.499,00)]`
2. **Linha 2**: Imagem / Print da tela do produto (renderizada com proporção preservada)
3. **Linha 3**: Link clicável do produto (`URL`)
4. **Fechamento**: Valor Total Geral Consolidado e Data de Emissão.

### 2.4 Stack Tecnológica Definida
- **Sem complexidade de build (Zero-build)**:
  - HTML5, CSS moderno (com variáveis CSS e design limpo inspirado em Tailwind) e JavaScript Vanilla moderno (ES6+).
  - Manifest V3 nativo.
  - Biblioteca `jspdf` via script local (embutida na pasta `libs/jspdf.umd.min.js`) para não depender de conexões externas e rodar 100% offline.


---

## 3. Estrutura do Projeto (Zero-Build)

```text
├── docs/
│   └── plano-extensao-orcamentos.md
├── manifest.json              # Configuração Manifest V3
├── popup/
│   ├── popup.html             # Interface do popup (HTML semântico)
│   ├── popup.css              # Estilos modernos inspirados em Tailwind
│   └── popup.js               # Lógica de interface, orçamentos e captura
├── content/
│   └── extractor.js           # Script injetado para ler metadados do e-commerce
├── background/
│   └── background.js          # Service worker para suporte a tabs e captura
├── libs/
│   └── jspdf.umd.min.js       # Biblioteca local para PDF (sem dependência externa)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 5. Fases de Execução

### Fase 1: Fundação do Projeto & Manifest V3
1. Configuração do ambiente (Node.js/Vite ou estrutura pura Manifest V3).
2. Definição do `manifest.json` com permissões mínimas necessárias (`activeTab`, `storage`, `sidePanel`).
3. Modelagem de dados para Orçamentos e Itens:
   ```typescript
   interface Budget {
     id: string;
     name: string;
     createdAt: string;
     updatedAt: string;
     items: BudgetItem[];
   }

   interface BudgetItem {
     id: string;
     title: string;
     price: number;
     quantity: number;
     url: string;
     imageUrl?: string;
     notes?: string;
   }
   ```

### Fase 2: Módulo de Extração de Dados (Content Script)
1. Algoritmo em camadas para identificação do produto:
   - **Camada 1**: Tags JSON-LD (`application/ld+json`) com tipo `Product`.
   - **Camada 2**: Metatags OpenGraph (`og:title`, `og:image`, `product:price:amount`).
   - **Camada 3**: Heurística de DOM (busca por seletores comuns de título e preço em grandes marketplaces como Amazon, Mercado Livre, Magalu, Shopee, etc.).
2. Normalizador de preços (converte strings como `"R$ 1.299,90"`, `"1299.90"` para float numérico).
3. Testes em diferentes e-commerces.

### Fase 3: Interface do Usuário (SidePanel / Popup)
1. Cabeçalho com seletor de orçamento ativo e botão "+ Novo Orçamento".
2. Card dinâmico "Adicionar da página atual":
   - Botão para ler a aba e preencher automaticamente.
   - Campos editáveis para validação antes de confirmar.
3. Lista de itens do orçamento ativo:
   - Controles de quantidade (`+` / `-`).
   - Botão de exclusão de item.
   - Link externo para o produto.
4. Barra inferior de fechamento com total acumulado e botão de ação ("Exportar PDF").

### Fase 4: Exportação em PDF
1. Integração da biblioteca de PDF.
2. Criação do template visual limpo e legível para impressão ou envio por e-mail/WhatsApp.
3. Tratamento de paginação automática para orçamentos extensos com muitos itens.

### Fase 5: Testes, Refinamento e Empacotamento
1. Teste de fluxo completo: navegação por múltiplos sites -> captura -> alternância de orçamentos -> soma -> exportação de PDF.
2. Instruções de instalação em modo desenvolvedor no Google Chrome (`chrome://extensions`).

---

## 6. Próximos Passos

Aguardar validação do usuário sobre:
1. Preferência de stack: **JavaScript Vanilla + Tailwind** (mais leve e direto) ou **React + Tailwind** (modular e componentizado).
2. Formato de interface: **Side Panel** (barra lateral fixa enquanto navega) ou **Popup tradicional** (abre e fecha ao clicar no ícone).
