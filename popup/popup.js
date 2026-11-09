/**
 * Lógica do Popup da Extensão (JavaScript Vanilla)
 * Gerencia múltiplos orçamentos, captura ativa e exportação em PDF
 */

let state = {
  budgets: [],
  activeBudgetId: null,
  currentTab: null,
  detectedData: null,
  currentScreenshot: null,
  editingBudgetId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  setupEventListeners();
  await captureCurrentPageData();
});

// 1. Carrega dados salvos no chrome.storage.local
async function loadState() {
  const data = await chrome.storage.local.get(['budgets', 'activeBudgetId']);
  
  if (!data.budgets || data.budgets.length === 0) {
    const defaultId = 'budget-' + Date.now();
    state.budgets = [{
      id: defaultId,
      name: 'Meu Primeiro Orçamento',
      createdAt: new Date().toISOString(),
      items: []
    }];
    state.activeBudgetId = defaultId;
    await saveState();
  } else {
    state.budgets = data.budgets;
    state.activeBudgetId = data.activeBudgetId || state.budgets[0].id;
  }

  renderBudgetSelect();
  renderActiveBudgetItems();
}

async function saveState() {
  await chrome.storage.local.set({
    budgets: state.budgets,
    activeBudgetId: state.activeBudgetId
  });
}

function getActiveBudget() {
  return state.budgets.find(b => b.id === state.activeBudgetId) || state.budgets[0];
}

// 2. Renderiza Dropdown de Orçamentos
function renderBudgetSelect() {
  const select = document.getElementById('budget-select');
  select.innerHTML = '';

  state.budgets.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    const itemsCount = (b.items || []).length;
    opt.textContent = `${b.name} (${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'})`;
    if (b.id === state.activeBudgetId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

// 3. Renderiza a lista de itens do orçamento ativo
function renderActiveBudgetItems() {
  const budget = getActiveBudget();
  const listEl = document.getElementById('items-list');
  const countEl = document.getElementById('items-count');
  const totalEl = document.getElementById('footer-total-price');

  const items = budget.items || [];
  countEl.textContent = items.length;

  const total = items.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
  totalEl.textContent = formatCurrency(total);

  listEl.innerHTML = '';

  if (items.length === 0) {
    listEl.innerHTML = '<div class="empty-items-msg">Nenhum produto neste orçamento. Capture da página acima!</div>';
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';

    const imgSrc = item.screenshotDataUrl || item.imageUrl || '../icons/icon48.png';
    const unitPrice = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    const subtotal = unitPrice * qty;

    row.innerHTML = `
      <img src="${imgSrc}" class="item-thumb" alt="Thumb" />
      <div class="item-details">
        <a href="${escapeHtml(item.url || '#')}" target="_blank" class="item-name" title="${escapeHtml(item.title)}">
          ${escapeHtml(item.title)}
        </a>
        <div class="item-price-qty">
          <strong>${formatCurrency(unitPrice)}</strong>
          ${qty > 1 ? `<span> • Subtotal: ${formatCurrency(subtotal)}</span>` : ''}
        </div>
      </div>
      <div class="item-qty-controls">
        <button class="qty-btn btn-dec" data-id="${item.id}">-</button>
        <span class="qty-display">${qty}</span>
        <button class="qty-btn btn-inc" data-id="${item.id}">+</button>
      </div>
      <button class="btn-remove-item" data-id="${item.id}" title="Remover item">✕</button>
    `;

    // Eventos de quantidade e exclusão
    row.querySelector('.btn-dec').addEventListener('click', () => updateItemQty(item.id, -1));
    row.querySelector('.btn-inc').addEventListener('click', () => updateItemQty(item.id, 1));
    row.querySelector('.btn-remove-item').addEventListener('click', () => removeItem(item.id));

    listEl.appendChild(row);
  });
}

// 4. Captura dados da aba ativa
async function captureCurrentPageData() {
  setStatus('info', 'Lendo dados da página atual...');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.currentTab = tab;

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      setStatus('info', 'Abra uma página de produto para capturar automaticamente.');
      document.getElementById('product-title').value = '';
      document.getElementById('product-price').value = '';
      document.getElementById('product-url').value = tab ? tab.url : '';
      return;
    }

    document.getElementById('product-url').value = tab.url;

    // Executa a função de extração na página
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/extractor.js']
    });

    // Chama EXTRACT_PRODUCT via mensagem
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        // Se a mensagem falhar, tenta extração básica com o título da aba
        fillProductForm({
          title: tab.title || '',
          price: 0,
          url: tab.url,
          imageUrl: ''
        });
      } else {
        fillProductForm(response.data);
      }
    });

    // Captura screenshot da tela imediatamente
    await takeScreenshot();

  } catch (err) {
    console.warn('Erro ao inspecionar aba ativa:', err);
    setStatus('info', 'Não foi possível ler a aba automaticamente. Preencha manualmente.');
  }
}

function fillProductForm(data) {
  state.detectedData = data;
  document.getElementById('product-title').value = data.title || '';
  document.getElementById('product-price').value = data.price ? Number(data.price).toFixed(2) : '';
  document.getElementById('product-url').value = data.url || (state.currentTab ? state.currentTab.url : '');
  setStatus('success', 'Dados do produto detectados com sucesso!');
}

async function takeScreenshot() {
  const container = document.getElementById('screenshot-container');
  container.innerHTML = '<span class="placeholder-text">Tirando print da tela...</span>';

  try {
    chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB' }, (res) => {
      if (res && res.success && res.dataUrl) {
        state.currentScreenshot = res.dataUrl;
        container.innerHTML = `<img src="${res.dataUrl}" alt="Print da tela" />`;
      } else {
        // Fallback: se houver imagem de produto detectada, usa ela
        if (state.detectedData && state.detectedData.imageUrl) {
          state.currentScreenshot = state.detectedData.imageUrl;
          container.innerHTML = `<img src="${state.detectedData.imageUrl}" alt="Imagem do produto" />`;
        } else {
          container.innerHTML = '<span class="placeholder-text">Sem print disponível</span>';
        }
      }
    });
  } catch (err) {
    container.innerHTML = '<span class="placeholder-text">Erro ao capturar print</span>';
  }
}

// 5. Configuração de Eventos
function setupEventListeners() {
  // Troca de Orçamento
  document.getElementById('budget-select').addEventListener('change', async (e) => {
    state.activeBudgetId = e.target.value;
    await saveState();
    renderBudgetSelect();
    renderActiveBudgetItems();
  });

  // Criar Novo Orçamento
  document.getElementById('btn-new-budget').addEventListener('click', () => {
    state.editingBudgetId = null;
    document.getElementById('modal-title').textContent = 'Criar Novo Orçamento';
    document.getElementById('modal-budget-name').value = '';
    document.getElementById('budget-modal').classList.remove('hidden');
    document.getElementById('modal-budget-name').focus();
  });

  // Duplicar Orçamento
  document.getElementById('btn-duplicate-budget').addEventListener('click', duplicateActiveBudget);

  // Renomear Orçamento
  document.getElementById('btn-edit-budget').addEventListener('click', () => {
    const budget = getActiveBudget();
    state.editingBudgetId = budget.id;
    document.getElementById('modal-title').textContent = 'Renomear Orçamento';
    document.getElementById('modal-budget-name').value = budget.name;
    document.getElementById('budget-modal').classList.remove('hidden');
    document.getElementById('modal-budget-name').focus();
  });

  // Excluir Orçamento
  document.getElementById('btn-delete-budget').addEventListener('click', async () => {
    const budget = getActiveBudget();
    if (confirm(`Tem certeza que deseja excluir o orçamento "${budget.name}"?`)) {
      state.budgets = state.budgets.filter(b => b.id !== budget.id);
      if (state.budgets.length === 0) {
        const newId = 'budget-' + Date.now();
        state.budgets.push({
          id: newId,
          name: 'Novo Orçamento',
          createdAt: new Date().toISOString(),
          items: []
        });
        state.activeBudgetId = newId;
      } else {
        state.activeBudgetId = state.budgets[0].id;
      }
      await saveState();
      renderBudgetSelect();
      renderActiveBudgetItems();
    }
  });

  // Salvar Modal
  document.getElementById('btn-modal-save').addEventListener('click', async () => {
    const nameInput = document.getElementById('modal-budget-name').value.trim();
    if (!nameInput) {
      alert('Informe um nome para o orçamento.');
      return;
    }

    if (state.editingBudgetId) {
      const budget = state.budgets.find(b => b.id === state.editingBudgetId);
      if (budget) budget.name = nameInput;
    } else {
      const newId = 'budget-' + Date.now();
      state.budgets.push({
        id: newId,
        name: nameInput,
        createdAt: new Date().toISOString(),
        items: []
      });
      state.activeBudgetId = newId;
    }

    await saveState();
    document.getElementById('budget-modal').classList.add('hidden');
    renderBudgetSelect();
    renderActiveBudgetItems();
  });

  // Cancelar Modal
  document.getElementById('btn-modal-cancel').addEventListener('click', () => {
    document.getElementById('budget-modal').classList.add('hidden');
  });

  // Recarregar dados da página
  document.getElementById('btn-refresh-capture').addEventListener('click', (e) => {
    e.preventDefault();
    captureCurrentPageData();
  });

  // Tirar novo print
  document.getElementById('btn-retake-screenshot').addEventListener('click', (e) => {
    e.preventDefault();
    takeScreenshot();
  });

  // Submeter formulário de produto
  document.getElementById('form-add-product').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('product-title').value.trim();
    const price = parseFloat(document.getElementById('product-price').value) || 0;
    const quantity = parseInt(document.getElementById('product-quantity').value, 10) || 1;
    const url = document.getElementById('product-url').value.trim();

    if (!title) {
      alert('Por favor, informe o nome do produto.');
      return;
    }

    const budget = getActiveBudget();
    if (!budget.items) budget.items = [];

    const newItem = {
      id: 'item-' + Date.now(),
      title: title,
      price: price,
      quantity: quantity,
      url: url,
      screenshotDataUrl: state.currentScreenshot || (state.detectedData?.imageUrl || null),
      imageUrl: state.detectedData?.imageUrl || null,
      addedAt: new Date().toISOString()
    };

    budget.items.push(newItem);
    await saveState();

    renderBudgetSelect();
    renderActiveBudgetItems();
    setStatus('success', `"${title}" adicionado ao orçamento!`);
  });

  // Limpar itens
  document.getElementById('btn-clear-items').addEventListener('click', async () => {
    const budget = getActiveBudget();
    if ((budget.items || []).length === 0) return;

    if (confirm(`Deseja limpar todos os itens do orçamento "${budget.name}"?`)) {
      budget.items = [];
      await saveState();
      renderBudgetSelect();
      renderActiveBudgetItems();
    }
  });

  // Gerar PDF direto
  document.getElementById('btn-generate-pdf').addEventListener('click', async () => {
    const budget = getActiveBudget();
    if (!budget.items || budget.items.length === 0) {
      alert('Adicione pelo menos um produto ao orçamento antes de gerar o PDF.');
      return;
    }

    const btn = document.getElementById('btn-generate-pdf');
    const originalText = btn.innerHTML;

    try {
      btn.disabled = true;

      // Se a opção de atualizar prints estiver marcada, executa captura em lote
      const shouldUpdatePrints = document.getElementById('chk-update-prints').checked;
      if (shouldUpdatePrints) {
        btn.innerHTML = 'Atualizando prints...';
        const batchResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'BATCH_CAPTURE_ITEMS',
            items: budget.items
          }, resolve);
        });

        if (batchResponse && batchResponse.success && batchResponse.items) {
          budget.items = batchResponse.items;
          await saveState();
          renderActiveBudgetItems();
        }
      }

      btn.innerHTML = 'Compilando PDF...';
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

      setStatus('success', 'PDF gerado e baixado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Visualizar Relatório
  document.getElementById('btn-view-report').addEventListener('click', () => {
    const budget = getActiveBudget();
    chrome.tabs.create({
      url: chrome.runtime.getURL(`report/report.html?id=${budget.id}`)
    });
  });

  // Copiar dados formatados para IA
  document.getElementById('btn-copy-ai').addEventListener('click', copyBudgetForAI);
}

// 6. Funções de Duplicação e Exportação para IA
async function duplicateActiveBudget() {
  const budget = getActiveBudget();
  if (!budget) return;

  const newId = 'budget-' + Date.now();
  const clonedItems = (budget.items || []).map(item => ({
    ...item,
    id: 'item-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now()
  }));

  const newBudget = {
    id: newId,
    name: `${budget.name || 'Orçamento'} (Cópia)`,
    createdAt: new Date().toISOString(),
    items: clonedItems
  };

  state.budgets.push(newBudget);
  state.activeBudgetId = newId;
  await saveState();

  renderBudgetSelect();
  renderActiveBudgetItems();
  setStatus('success', `Orçamento duplicado como "${newBudget.name}"!`);
}

async function copyBudgetForAI() {
  const budget = getActiveBudget();
  if (!budget || !budget.items || budget.items.length === 0) {
    alert('Adicione pelo menos um produto ao orçamento antes de copiar para a IA.');
    return;
  }

  const totalItems = budget.items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const totalAmount = budget.items.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
  const dateStr = budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

  let text = `📦 DADOS DE COTAÇÃO / ORÇAMENTO PARA REVISÃO\n`;
  text += `Orçamento: ${budget.name || 'Orçamento de Compras'}\n`;
  text += `Data de Emissão: ${dateStr}\n`;
  text += `Quantidade Total de Produtos: ${totalItems}\n`;
  text += `Valor Total: ${formatCurrency(totalAmount)}\n\n`;
  text += `--- LISTA DE ITENS ---\n`;

  budget.items.forEach((item, index) => {
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
    setStatus('success', '📋 Dados copiados! Cole no ChatGPT, Claude ou Gemini.');
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setStatus('success', '📋 Dados copiados! Cole na sua IA favorita.');
  }
}

// 7. Helpers de manipulação de itens
async function updateItemQty(itemId, delta) {
  const budget = getActiveBudget();
  const item = (budget.items || []).find(it => it.id === itemId);
  if (!item) return;

  item.quantity = (Number(item.quantity) || 1) + delta;
  if (item.quantity <= 0) {
    budget.items = budget.items.filter(it => it.id !== itemId);
  }
  await saveState();
  renderBudgetSelect();
  renderActiveBudgetItems();
}

async function removeItem(itemId) {
  const budget = getActiveBudget();
  budget.items = (budget.items || []).filter(it => it.id !== itemId);
  await saveState();
  renderBudgetSelect();
  renderActiveBudgetItems();
}

function setStatus(type, message) {
  const statusEl = document.getElementById('capture-status');
  statusEl.className = `status-msg ${type}`;
  statusEl.textContent = message;
  statusEl.classList.remove('hidden');

  if (type === 'success') {
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 3500);
  }
}

function formatCurrency(val) {
  return 'R$ ' + Number(val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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
