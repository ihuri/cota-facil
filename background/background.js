/**
 * Background Service Worker (Manifest V3)
 * Gerencia ciclo de vida, captura de tela e suporte a prints em lote
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

  // Captura em lote: abre cada URL, aguarda carregar, tira print e fecha aba
  if (message.action === 'BATCH_CAPTURE_ITEMS') {
    handleBatchCapture(message.items)
      .then(updatedItems => sendResponse({ success: true, items: updatedItems }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // assíncrono
  }
});

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
      // Abre aba temporária inativa
      const tab = await chrome.tabs.create({ url: item.url, active: false });

      // Aguarda carregamento com timeout de segurança
      await waitForTabLoaded(tab.id, 8000);

      // Pequena pausa para garantir renderização de imagens e preços
      await new Promise(r => setTimeout(r, 1200));

      // Ativa momentaneamente para captura confiável
      await chrome.tabs.update(tab.id, { active: true });
      await new Promise(r => setTimeout(r, 400));

      // Captura a tela
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

      // Fecha a aba temporária
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
