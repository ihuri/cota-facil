/**
 * Script da Página de Relatório Completo do Orçamento
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const budgetId = urlParams.get('id');

  const data = await chrome.storage.local.get(['budgets', 'activeBudgetId']);
  const budgets = data.budgets || [];
  const targetId = budgetId || data.activeBudgetId;
  const budget = budgets.find(b => b.id === targetId) || budgets[0];

  if (!budget) {
    document.getElementById('top-title').textContent = 'Orçamento não encontrado';
    document.getElementById('budget-name').textContent = 'Nenhum orçamento disponível';
    return;
  }

  renderReport(budget);

  // Botão de Impressão / Salvar como PDF nativo do navegador
  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  // Botão de Download direto de arquivo .PDF via NativePdfBuilder
  document.getElementById('btn-download-pdf').addEventListener('click', async () => {
    const btn = document.getElementById('btn-download-pdf');
    const originalText = btn.innerHTML;
    try {
      btn.innerHTML = 'Gerando arquivo PDF...';
      btn.disabled = true;

      const builder = new NativePdfBuilder();
      const pdfBytes = await builder.buildBudgetPdf(budget);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (budget.name || 'Orcamento').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href = downloadUrl;
      a.download = `${safeName}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Botão de Copiar dados para IA
  document.getElementById('btn-copy-ai').addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy-ai');
    const originalHtml = btn.innerHTML;

    const items = budget.items || [];
    if (items.length === 0) {
      alert('Não há itens neste orçamento para copiar.');
      return;
    }

    const totalItems = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
    const totalAmount = items.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
    const dateStr = budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

    let text = `📦 DADOS DE COTAÇÃO / ORÇAMENTO PARA REVISÃO\n`;
    text += `Orçamento: ${budget.name || 'Orçamento de Compras'}\n`;
    text += `Data de Emissão: ${dateStr}\n`;
    text += `Quantidade Total de Produtos: ${totalItems}\n`;
    text += `Valor Total: ${formatCurrency(totalAmount)}\n\n`;
    text += `--- LISTA DE ITENS ---\n`;

    items.forEach((item, index) => {
      const unitPrice = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const subtotal = unitPrice * qty;
      text += `${index + 1}. ${item.title || 'Produto sem título'}\n`;
      text += `   - Preço Unitário: ${formatCurrency(unitPrice)}\n`;
      text += `   - Quantidade: ${qty}\n`;
      if (qty > 1) {
        text += `   - Subtotal: ${formatCurrency(subtotal)}\n`;
      }
      text += `   - Link: ${item.url || 'Não informado'}\n\n`;
    });

    text += `--- TOTAL GERAL: ${formatCurrency(totalAmount)} ---\n\n`;
    text += `🤖 INSTRUÇÕES PARA A IA:\n`;
    text += `Por favor, revise este orçamento de compras:\n`;
    text += `1. Avalie se os preços estão competitivos e condizentes com o mercado.\n`;
    text += `2. Analise se os itens são compatíveis entre si ou atendem bem ao objetivo da compra.\n`;
    text += `3. Sugira alternativas de melhor custo-benefício, marcas recomendadas ou possíveis itens esquecidos.\n`;

    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = '✓ Copiado p/ IA!';
      setTimeout(() => { btn.innerHTML = originalHtml; }, 2500);
    } catch (err) {
      alert('Erro ao copiar: ' + err.message);
    }
  });
});

function formatCurrency(val) {
  return 'R$ ' + Number(val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function renderReport(budget) {
  document.title = `Orçamento - ${budget.name || 'Cotação'}`;
  document.getElementById('top-title').textContent = budget.name || 'Orçamento de Compras';
  document.getElementById('budget-name').textContent = budget.name || 'Orçamento de Compras';
  
  const createdDate = budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  document.getElementById('budget-date').textContent = createdDate;

  const items = budget.items || [];
  const totalItemsCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const totalAmount = items.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);

  document.getElementById('budget-items-count').textContent = totalItemsCount;
  document.getElementById('budget-header-total').textContent = formatCurrency(totalAmount);
  document.getElementById('footer-total-items').textContent = totalItemsCount;
  document.getElementById('footer-total-amount').textContent = formatCurrency(totalAmount);

  const container = document.getElementById('items-container');
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = `
      <div class="quote-item-card" style="text-align: center; padding: 40px; color: #64748b;">
        <p style="font-size: 16px;">Nenhum produto adicionado a este orçamento ainda.</p>
        <p style="font-size: 13px; margin-top: 8px;">Navegue por qualquer site de compras e utilize a extensão para adicionar itens.</p>
      </div>
    `;
    return;
  }

  items.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'quote-item-card';

    const unitPrice = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    const subtotal = unitPrice * qty;

    // LINHA 1: Nome do Produto - Valor
    let priceDisplay = formatCurrency(unitPrice);
    if (qty > 1) {
      priceDisplay += ` <span class="item-qty-badge">(${qty}x = ${formatCurrency(subtotal)})</span>`;
    }

    // LINHA 2: Imagem / Print da Tela
    let imageHtml = '';
    const imgSrc = item.screenshotDataUrl || item.imageUrl;
    if (imgSrc) {
      imageHtml = `
        <div class="item-line-image">
          <img src="${imgSrc}" alt="${escapeHtml(item.title || 'Print do produto')}" loading="lazy" />
        </div>
      `;
    } else {
      imageHtml = `
        <div class="item-line-image item-no-image">
          <span>Sem print ou imagem capturada</span>
        </div>
      `;
    }

    // LINHA 3: Link do Produto
    const productUrl = item.url || '#';
    const linkHtml = item.url ? `
      <div class="item-line-link">
        <span>Link:</span>
        <a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(productUrl)}</a>
      </div>
    ` : `
      <div class="item-line-link">
        <span>Link:</span> <em>Não informado</em>
      </div>
    `;

    card.innerHTML = `
      <div class="item-line-header">
        <h3 class="item-title-text">${index + 1}. ${escapeHtml(item.title || 'Produto sem título')}</h3>
        <div class="item-price-text">${priceDisplay}</div>
      </div>
      ${imageHtml}
      ${linkHtml}
    `;

    container.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
