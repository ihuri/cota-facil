/**
 * Background Service Worker (Manifest V3)
 * Gerencia ciclo de vida, captura de tela, prints e varredura de preços em lote
 */

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['budgets', 'activeBudgetId']);
  if (!data.budgets || data.budgets.length === 0) {
    const defaultId = 'budget-' + Date.now();
    await chrome.storage.local.set({
      activeBudgetId: defaultId,
      budgets: [
        {
          id: defaultId,
          name: 'Meu Primeiro Orçamento',
          createdAt: new Date().toISOString(),
          items: []
        }
      ]
    });
  }
});

// Listener para mensagens de captura e automação
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 75 }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Falha ao capturar a tela' });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true; // resposta assíncrona
  }

  // Captura em lote de prints para o PDF
  if (message.action === 'BATCH_CAPTURE_ITEMS') {
    handleBatchCapture(message.items)
      .then(updatedItems => sendResponse({ success: true, items: updatedItems }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // assíncrono
  }

  // Varredura completa: atualiza preços E prints de todos os produtos do orçamento
  if (message.action === 'SWEEP_AND_UPDATE_BUDGET') {
    handleSweepAndUpdate(message.items)
      .then(result => sendResponse({ success: true, items: result.items, updatedCount: result.updatedCount }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // assíncrono
  }

  // Testar conexão de Webhook
  if (message.action === 'TEST_WEBHOOK') {
    handleTestWebhook(message.config)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // assíncrono
  }

  // Enviar orçamento via Webhook
  if (message.action === 'SEND_BUDGET_WEBHOOK') {
    handleSendWebhook(message.config, message.budget)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // assíncrono
  }
});

/**
 * Varre todos os itens: abre cada URL, re-extrai o preço mais recente e tira novo print
 */
async function handleSweepAndUpdate(items) {
  const results = [];
  let updatedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };

    // Notifica o progresso para a interface do popup
    chrome.runtime.sendMessage({
      action: 'SWEEP_PROGRESS',
      current: i + 1,
      total: items.length,
      title: item.title || 'Produto'
    }).catch(() => {}); // ignora se popup fechou

    if (!item.url || !item.url.startsWith('http')) {
      results.push(item);
      continue;
    }

    try {
      // Abre aba temporária
      const tab = await chrome.tabs.create({ url: item.url, active: false });

      // Aguarda carregamento inicial
      await waitForTabLoaded(tab.id, 9000);

      // Pequena pausa para garantir execução de scripts da página (preços dinâmicos)
      await new Promise(r => setTimeout(r, 1500));

      // Injeta o extractor de dados na página
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/extractor.js']
        });

        // Extrai os dados atualizados
        const extractRes = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' }, (res) => {
            resolve(res && res.success ? res.data : null);
          });
        });

        if (extractRes) {
          if (extractRes.price && extractRes.price > 0) {
            item.price = extractRes.price;
          }
          if (extractRes.title && (!item.title || item.title === 'Produto sem título')) {
            item.title = extractRes.title;
          }
        }
      } catch (errExtract) {
        console.warn('Erro na extração de dados do item:', item.url, errExtract);
      }

      // Ativa momentaneamente a aba para captura de print fiel
      await chrome.tabs.update(tab.id, { active: true });
      await new Promise(r => setTimeout(r, 450));

      const screenshot = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 75 }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(dataUrl);
          }
        });
      });

      if (screenshot) {
        item.screenshotDataUrl = screenshot;
      }

      item.lastCheckedAt = new Date().toISOString();
      updatedCount++;

      // Fecha a aba temporária
      await chrome.tabs.remove(tab.id);
    } catch (e) {
      console.warn('Erro ao varrer URL:', item.url, e);
    }

    results.push(item);
  }

  return { items: results, updatedCount };
}

/**
 * Abre cada item em aba secundária, captura a tela e fecha
 */
async function handleBatchCapture(items) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };
    if (!item.url || !item.url.startsWith('http')) {
      results.push(item);
      continue;
    }

    try {
      const tab = await chrome.tabs.create({ url: item.url, active: false });
      await waitForTabLoaded(tab.id, 8000);
      await new Promise(r => setTimeout(r, 1200));

      await chrome.tabs.update(tab.id, { active: true });
      await new Promise(r => setTimeout(r, 400));

      const screenshot = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 75 }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(dataUrl);
          }
        });
      });

      if (screenshot) {
        item.screenshotDataUrl = screenshot;
      }

      await chrome.tabs.remove(tab.id);
    } catch (e) {
      console.warn('Erro ao capturar URL:', item.url, e);
    }

    results.push(item);
  }

  return results;
}

function waitForTabLoaded(tabId, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }, timeoutMs);

    function listener(id, changeInfo) {
      if (id === tabId && changeInfo.status === 'complete') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Lógica de Webhook para envio a sistemas terceiros
 */
async function handleSendWebhook(config, budget) {
  if (!config || !config.url) {
    throw new Error('URL do Webhook não configurada. Acesse as configurações para informar o endpoint.');
  }
  if (!budget) {
    throw new Error('Nenhum orçamento selecionado para envio.');
  }

  const items = (budget.items || []).map(item => {
    const itemCopy = { ...item };
    if (!config.includeScreenshots) {
      delete itemCopy.screenshotDataUrl;
    }
    return itemCopy;
  });

  const totalItems = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const totalAmount = items.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);

  const payload = {
    event: 'budget.sent',
    app: 'CotaFácil',
    version: '1.1.0',
    sentAt: new Date().toISOString(),
    budget: {
      id: budget.id,
      name: budget.name,
      createdAt: budget.createdAt,
      totalItems,
      totalAmount,
      items
    }
  };

  return await executeWebhookRequest(config, payload);
}

async function handleTestWebhook(config) {
  if (!config || !config.url) {
    throw new Error('Informe a URL do Webhook antes de testar.');
  }

  const testPayload = {
    event: 'webhook.test',
    app: 'CotaFácil',
    version: '1.1.0',
    sentAt: new Date().toISOString(),
    message: 'Teste de conexão de Webhook realizado com sucesso pelo CotaFácil!'
  };

  return await executeWebhookRequest(config, testPayload);
}

async function executeWebhookRequest(config, payload) {
  const url = (config.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL inválida. O endereço do Webhook deve iniciar com http:// ou https://');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.token && config.token.trim()) {
    const headerName = (config.authHeader && config.authHeader.trim()) ? config.authHeader.trim() : 'Authorization';
    const tokenVal = config.token.trim();
    if (headerName.toLowerCase() === 'authorization' && !tokenVal.toLowerCase().startsWith('bearer ')) {
      headers[headerName] = `Bearer ${tokenVal}`;
    } else {
      headers[headerName] = tokenVal;
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let responseData = null;
    try {
      responseData = await res.json();
    } catch {
      try {
        responseData = await res.text();
      } catch {}
    }

    if (!res.ok) {
      throw new Error(`Falha HTTP ${res.status}: ${res.statusText || 'Erro na resposta do servidor terceiro'}`);
    }

    return {
      status: res.status,
      statusText: res.statusText,
      data: responseData
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('A requisição ao Webhook excedeu o tempo limite de 15 segundos (Timeout).');
    }
    throw err;
  }
}
