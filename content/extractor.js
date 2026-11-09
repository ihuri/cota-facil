/**
 * Extractor de Dados de Produtos para E-commerces
 * Suporta Schema.org (JSON-LD), OpenGraph, Meta Tags e seletores específicos
 * para Mercado Livre, Amazon, Shopee, Magazine Luiza, KaBuM, etc.
 */

function extractProductData() {
  // 1. Limpeza de URL (remover UTMs e rastreadores)
  function getCleanUrl() {
    try {
      const canonical = document.querySelector('link[rel="canonical"]');
      const rawUrl = (canonical && canonical.href) ? canonical.href : window.location.href;
      const urlObj = new URL(rawUrl);
      
      const paramsToRemove = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'ref', 'ref_', 'pd_rd_r', 'pd_rd_w', 
        'pd_rd_wg', 'pf_rd_r', 'pf_rd_p', 'tracking_id', 'wid'
      ];
      paramsToRemove.forEach(p => urlObj.searchParams.delete(p));
      return urlObj.toString();
    } catch (e) {
      return window.location.href;
    }
  }

  // 2. Extrair dados de JSON-LD (Schema.org)
  function parseJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const text = script.textContent ? script.textContent.trim() : '';
        if (!text) continue;
        const data = JSON.parse(text);
        
        const findProduct = (item) => {
          if (!item) return null;
          if (Array.isArray(item)) {
            for (const sub of item) {
              const res = findProduct(sub);
              if (res) return res;
            }
          }
          if (typeof item === 'object') {
            const type = item['@type'];
            if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
              return item;
            }
            if (item['@graph'] && Array.isArray(item['@graph'])) {
              return findProduct(item['@graph']);
            }
          }
          return null;
        };

        const prod = findProduct(data);
        if (prod) {
          let price = null;
          if (prod.offers) {
            const offers = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
            if (offers && offers.price !== undefined) {
              price = parseFloat(offers.price);
            } else if (offers && offers.lowPrice !== undefined) {
              price = parseFloat(offers.lowPrice);
            }
          }

          let image = null;
          if (prod.image) {
            if (typeof prod.image === 'string') image = prod.image;
            else if (Array.isArray(prod.image) && prod.image.length > 0) {
              image = typeof prod.image[0] === 'string' ? prod.image[0] : prod.image[0].url;
            } else if (prod.image.url) {
              image = prod.image.url;
            }
          }

          return {
            title: prod.name || null,
            price: (price && !isNaN(price)) ? price : null,
            image: image || null
          };
        }
      } catch (err) {
        // Ignora erros de JSON mal formatado na página
      }
    }
    return null;
  }

  // 3. Normalizador numérico de preço (pt-BR e en-US)
  function parsePriceString(str) {
    if (!str || typeof str !== 'string') return null;
    let clean = str.replace(/[^\d.,]/g, '').trim();
    if (!clean) return null;

    // Se tem tanto ponto quanto vírgula (ex: 1.250,50 ou 1,250.50)
    if (clean.includes('.') && clean.includes(',')) {
      if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        // Padrão brasileiro: 1.250,50
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // Padrão americano: 1,250.50
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes(',')) {
      // Apenas vírgula: 250,50 -> 250.50
      clean = clean.replace(',', '.');
    }
    // Caso tenha múltiplos pontos (ex: 1.250.000)
    const parts = clean.split('.');
    if (parts.length > 2) {
      const decimals = parts.pop();
      clean = parts.join('') + '.' + decimals;
    }

    const val = parseFloat(clean);
    return (!isNaN(val) && val > 0) ? val : null;
  }

  // 4. Extração por seletores de e-commerces conhecidos
  function extractStoreSpecific() {
    const host = window.location.hostname;
    let title = null;
    let price = null;
    let image = null;

    // Mercado Livre
    if (host.includes('mercadolivre.com')) {
      const tEl = document.querySelector('.ui-pdp-title');
      if (tEl) title = tEl.textContent.trim();

      const fraction = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction, .ui-pdp-price .andes-money-amount__fraction');
      const cents = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__cents, .ui-pdp-price .andes-money-amount__cents');
      if (fraction) {
        let priceStr = fraction.textContent.trim();
        if (cents && cents.textContent.trim()) {
          priceStr += '.' + cents.textContent.trim();
        }
        price = parsePriceString(priceStr);
      }

      const imgEl = document.querySelector('.ui-pdp-gallery__figure img, .ui-pdp-image');
      if (imgEl) image = imgEl.src;
    }

    // Amazon
    else if (host.includes('amazon.com')) {
      const tEl = document.querySelector('#productTitle, #title');
      if (tEl) title = tEl.textContent.trim();

      const pEl = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .priceToPay .a-offscreen');
      if (pEl) price = parsePriceString(pEl.textContent);

      const imgEl = document.querySelector('#landingImage, #imgBlkFront');
      if (imgEl) image = imgEl.src;
    }

    // Magazine Luiza
    else if (host.includes('magazineluiza.com')) {
      const tEl = document.querySelector('[data-testid="heading-product-title"]');
      if (tEl) title = tEl.textContent.trim();

      const pEl = document.querySelector('[data-testid="price-value"], [data-testid="price-default"]');
      if (pEl) price = parsePriceString(pEl.textContent);

      const imgEl = document.querySelector('[data-testid="image-selected-thumbnail"] img, [data-testid="main-image"]');
      if (imgEl) image = imgEl.src;
    }

    // Shopee
    else if (host.includes('shopee.com')) {
      const tEl = document.querySelector('div.V3eGfx, ._44qnta');
      if (tEl) title = tEl.textContent.trim();

      const pEl = document.querySelector('div.pqTWkA, ._3n5NQx');
      if (pEl) price = parsePriceString(pEl.textContent);
    }

    // KaBuM
    else if (host.includes('kabum.com')) {
      const tEl = document.querySelector('h1');
      if (tEl) title = tEl.textContent.trim();

      const pEl = document.querySelector('h4.finalPrice, .finalPrice');
      if (pEl) price = parsePriceString(pEl.textContent);
    }

    return { title, price, image };
  }

  // 5. Extração genérica via Meta tags e OpenGraph
  function extractGeneric() {
    let title = null;
    let price = null;
    let image = null;

    // Título
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    const h1 = document.querySelector('h1');

    if (ogTitle && ogTitle.content) title = ogTitle.content.trim();
    else if (twTitle && twTitle.content) title = twTitle.content.trim();
    else if (h1) title = h1.textContent.trim();
    else title = document.title;

    // Limpar sufixos comuns no título (ex: " | Loja X", " - Mercado Livre")
    if (title) {
      title = title.split(/\s+[-|–—]\s+(?:Mercado Livre|Amazon|Shopee|Magalu|Magazine Luiza)/i)[0].trim();
    }

    // Preço
    const metaPrice = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]');
    if (metaPrice && metaPrice.content) {
      price = parsePriceString(metaPrice.content);
    } else {
      // Busca por tags com itemprop="price"
      const itemPrice = document.querySelector('[itemprop="price"]');
      if (itemPrice) {
        const val = itemPrice.getAttribute('content') || itemPrice.textContent;
        price = parsePriceString(val);
      }
    }

    // Imagem
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.content) image = ogImg.content;

    return { title, price, image };
  }

  // Consolidação por ordem de prioridade
  const jsonLdData = parseJsonLd() || {};
  const storeData = extractStoreSpecific();
  const genericData = extractGeneric();

  const finalTitle = storeData.title || jsonLdData.title || genericData.title || document.title || 'Produto sem título';
  const finalPrice = storeData.price || jsonLdData.price || genericData.price || 0;
  const finalImage = storeData.image || jsonLdData.image || genericData.image || '';
  const finalUrl = getCleanUrl();

  return {
    title: finalTitle.replace(/\s+/g, ' ').trim(),
    price: finalPrice,
    imageUrl: finalImage,
    url: finalUrl
  };
}

// Suporte para execução direta como content_script ou mensagem
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT') {
      try {
        const data = extractProductData();
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });
}
