# CotaFácil 🛒

> **Extensão para Google Chrome que simplifica a criação de orçamentos e cotações online.**  
> Capture produtos em e-commerces com prints e preços, gerencie múltiplos orçamentos concorrentes e exporte relatórios consolidados em PDF e prompts prontos para IA.

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla_ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![Zero-Build](https://img.shields.io/badge/Build-Zero--Build_(No_npm)-8B5CF6)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981.svg)](LICENSE)

---

## ✨ Principais Funcionalidades

* 🛍️ **Captura Automática em Lojas Online**: Detecta automaticamente **Nome do Produto**, **Preço**, **URL canônica limpa** (sem UTMs de rastreio) e captura instantaneamente o **print da tela / produto** através da API nativa do Chrome.
* 📑 **Múltiplos Orçamentos Simultâneos**: Crie e alterne entre diferentes orçamentos a qualquer momento (ex: *"PC Gamer"*, *"Reforma Cozinha"*, *"Suprimentos Escritório"*).
* 📋 **Duplicar Orçamento com 1 Clique (📑)**: Clone um orçamento completo com todos os produtos e prints para testar variações de peças ou fornecedores sem perder o histórico do original.
* 🔄 **Varredura e Atualização de Preços**: Abre os links em segundo plano, re-extrai os preços vigentes mais recentes, tira novos prints da tela e recalcula o total com barra de progresso em tempo real.
* 🤖 **Copiar Formatado para IA (ChatGPT, Claude, Gemini)**: Copia todos os dados estruturados com instruções automáticas para a IA analisar competitividade de preços, compatibilidade entre peças e sugerir alternativas com melhor custo-benefício.
* 📄 **Geração de Relatório em PDF Profissional**:
  * **Linha 1**: `Nome do Produto - R$ Valor (Qtd: X = Subtotal)`
  * **Linha 2**: Imagem / Print da tela do produto (proporção preservada)
  * **Linha 3**: Link clicável do produto
  * **Rodapé**: Valor Total Consolidado do Orçamento.
* 💾 **Exportação e Importação em JSON**: Salve seus orçamentos em arquivos `.json` e compartilhe com outras pessoas que também utilizam a extensão.
* ⚡ **100% Leve e Passivo (Zero Impacto na Navegação)**: Não injeta scripts contínuos nas suas abas cotidianas. O uso de CPU e memória RAM é 0% durante a sua navegação normal.

---

## 🚀 Como Instalar no Google Chrome

1. Clone ou baixe este repositório no seu computador:
   ```bash
   git clone https://github.com/SEU-USUARIO/cota-facil.git
   ```
2. Abra o Google Chrome e acesse a página de extensões:
   ```text
   chrome://extensions/
   ```
3. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer mode).
4. Clique no botão **"Carregar sem compactação"** (Load unpacked) no canto superior esquerdo.
5. Selecione a pasta onde o projeto está localizado.
6. Pronto! O ícone do **CotaFácil** (🛒) estará disponível na barra de extensões do Chrome. Recomendamos fixá-lo para acesso rápido.

---

## 📖 Como Utilizar

### 1. Criando e Organizando Orçamentos
* Abra o popup do CotaFácil clicando no ícone da extensão.
* Clique em **`+ Novo`** para criar um orçamento com nome personalizado.
* Use o menu suspenso para alternar entre orçamentos.
* Use os botões de ação rápida:
  * **📑 Duplicar**: Cria uma cópia independente do orçamento ativo.
  * **✏️ Renomear**: Altera o nome do orçamento.
  * **❌ Excluir**: Remove o orçamento com confirmação.
  * **⬇️ Exportar JSON / ⬆️ Importar JSON**: Salve ou carregue orçamentos de arquivos `.json`.

### 2. Adicionando Produtos de E-commerces
* Navegue até a página de qualquer produto em lojas como **Mercado Livre, Amazon, KaBuM, Shopee, Magazine Luiza, etc.**
* Clique no ícone do **CotaFácil**:
  * Os dados e o print da tela serão detectados automaticamente.
  * Se desejar, ajuste o nome, edite o preço ou altere a quantidade.
* Clique em **`➕ Adicionar ao Orçamento`**.

### 3. Atualizando Preços e Imagens
* Clique em **`🔄 Atualizar Preços`** no cabeçalho da lista de itens.
* A extensão visitará os links em segundo plano, re-extrairá os preços atualizados e tirará novos prints, recalculando o total final automaticamente.

### 4. Exportando para PDF e Enviando para IA
* **`📄 Gerar PDF`**: Faz o download direto de um arquivo `.pdf` formatado contendo nome, valor, print da tela, link clicável e total.
* **`🖨️ Relatório`**: Abre uma página completa pronta para visualização e impressão em alta resolução.
* **`🤖 Copiar p/ IA`**: Copia o texto formatado para a área de transferência. Basta colar (`Ctrl+V` / `Cmd+V`) no ChatGPT, Claude ou Gemini para receber uma análise instantânea!

---

## 📂 Estrutura do Projeto

```text
cota-facil/
├── manifest.json              # Configuração Manifest V3
├── icons/                     # Ícones da extensão (16px, 48px, 128px)
├── popup/
│   ├── popup.html             # Interface principal do popup
│   ├── popup.css              # Estilos modernos inspirados em Tailwind
│   ├── popup.js               # Lógica de estados, orçamentos e captura
│   └── pdf-builder.js         # Compilador nativo de PDF 1.4 em JavaScript puro
├── content/
│   └── extractor.js           # Extrator de metadados (JSON-LD, OpenGraph, DOM)
├── background/
│   └── background.js          # Service worker para abas e prints em lote
├── report/
│   ├── report.html            # Relatório em tela cheia imprimível
│   ├── report.css             # Estilos de folha e regras @media print
│   └── report.js              # Lógica da visualização e download
├── docs/                      # Documentação e histórico de planejamento
└── LICENSE                    # Licença MIT
```

---

## 🛠️ Tecnologias Utilizadas

* **JavaScript Vanilla (ES6+)**: Sem frameworks pesados ou etapa de build (`npm build`).
* **HTML5 & CSS3 Moderno**: Interface limpa e responsiva inspirada no design system do Tailwind CSS.
* **Chrome Extensions API (Manifest V3)**:
  * `chrome.storage.local` com `unlimitedStorage` para persistência segura de dados e prints em base64.
  * `chrome.tabs.captureVisibleTab` para capturas de tela instantâneas.
  * `chrome.scripting.executeScript` para extração dinâmica sob demanda.
* **Native PDF Builder**: Gerador nativo de arquivos binários `.pdf` desenvolvido em JavaScript puro (zero dependências externas).

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT** — consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com foco em produtividade, economia e compras inteligentes. 🚀
</p>
