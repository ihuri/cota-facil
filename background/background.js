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
