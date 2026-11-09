/**
 * PDF Builder Nativo em JavaScript Vanilla (Zero dependências externas)
 * Gera documentos PDF 1.4 binários com suporte a texto, fontes Helvetica,
 * imagens JPEG embutidas nativamente (/DCTDecode), links clicáveis e múltiplas páginas.
 */

class NativePdfBuilder {
  constructor() {
    this.pageWidth = 595.28;  // A4 largura em pontos (pt)
    this.pageHeight = 841.89; // A4 altura em pontos (pt)
    this.pages = [];
    this.images = [];
    this.objects = [];
    this.currentPage = null;
  }

  // Cria uma nova página
  addPage() {
    const page = {
      content: [],
      annots: [],
      imagesUsed: []
    };
    this.pages.push(page);
    this.currentPage = page;
    return page;
  }

  // Sanitiza texto para PDF standard Type 1 (substitui acentos por equivalentes limpos)
  sanitizeText(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
      .replace(/[\(\)\\]/g, '\\$&')   // escapa ( ) e \
      .replace(/[^\x20-\x7E]/g, ' ');  // caracteres fora da tabela ASCII
  }

  // Formata valor em moeda BRL
  formatCurrency(val) {
    return 'R$ ' + Number(val || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Registra imagem JPEG (converte dataURL para Uint8Array e extrai dimensões)
  async registerImage(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;

    // Se a imagem for PNG ou outro formato, converte para JPEG via canvas
    let jpegDataUrl = dataUrl;
    if (!dataUrl.startsWith('data:image/jpeg')) {
      jpegDataUrl = await this.convertToJpeg(dataUrl);
    }

    try {
      const base64Index = jpegDataUrl.indexOf(';base64,');
      if (base64Index === -1) return null;
      const base64Data = jpegDataUrl.substring(base64Index + 8);
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Obtém dimensões da imagem
      const dims = await this.getImageDimensions(jpegDataUrl);

      const imageId = 'Im' + (this.images.length + 1);
      const imgObj = {
        id: imageId,
        width: dims.width || 600,
        height: dims.height || 400,
        bytes: bytes
      };
      this.images.push(imgObj);
      return imgObj;
    } catch (e) {
      console.warn('Erro ao registrar imagem no PDF:', e);
      return null;
    }
  }

  convertToJpeg(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.naturalWidth, 1200);
        canvas.height = (img.naturalHeight / img.naturalWidth) * canvas.width;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  getImageDimensions(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 600, height: 400 });
      img.src = dataUrl;
    });
  }

  /**
   * Constrói o PDF completo do Orçamento
   */
  async buildBudgetPdf(budget) {
    this.pages = [];
    this.images = [];
    const margin = 40;
    const contentWidth = this.pageWidth - (margin * 2);

    let page = this.addPage();
    let currentY = this.pageHeight - margin;

    // --- CABEÇALHO ---
    // Barra superior decorativa azul
    page.content.push(`0.15 0.39 0.92 rg`); // #2563eb
    page.content.push(`${margin} ${currentY - 4} ${contentWidth} 4 re f`);
    currentY -= 20;

    // Título Principal
    page.content.push(`0.08 0.12 0.19 rg`); // Dark #1e293b
    page.content.push(`BT /F2 18 Tf ${margin} ${currentY} Td (${this.sanitizeText('RELATORIO DE ORCAMENTO E COTACAO')}) Tj ET`);
    currentY -= 20;

    // Nome do Orçamento e Data
    const budgetName = budget.name || 'Orcamento de Compras';
    const dateStr = new Date().toLocaleString('pt-BR');
    page.content.push(`0.3 0.35 0.4 rg`);
    page.content.push(`BT /F1 11 Tf ${margin} ${currentY} Td (${this.sanitizeText('Orcamento: ' + budgetName)}) Tj ET`);
    const dateText = this.sanitizeText('Emitido em: ' + dateStr);
    page.content.push(`BT /F1 10 Tf ${this.pageWidth - margin - 180} ${currentY} Td (${dateText}) Tj ET`);
    currentY -= 25;

    // Caixa de Destaque / Resumo
    const totalItems = (budget.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
    const totalValue = (budget.items || []).reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);

    page.content.push(`0.95 0.96 0.98 rg`); // Cinza claro
    page.content.push(`${margin} ${currentY - 30} ${contentWidth} 30 re f`);
    page.content.push(`0.85 0.88 0.92 RG 1 w`);
    page.content.push(`${margin} ${currentY - 30} ${contentWidth} 30 re S`);

    page.content.push(`0.1 0.15 0.25 rg`);
    page.content.push(`BT /F2 11 Tf ${margin + 12} ${currentY - 20} Td (${this.sanitizeText(`Total de Itens: ${totalItems}`)}) Tj ET`);
    const totalStr = this.sanitizeText(`VALOR TOTAL: ${this.formatCurrency(totalValue)}`);
    page.content.push(`0.05 0.55 0.35 rg`); // Verde
    page.content.push(`BT /F2 12 Tf ${this.pageWidth - margin - 220} ${currentY - 20} Td (${totalStr}) Tj ET`);
    currentY -= 50;

    // --- ITENS DO ORÇAMENTO ---
    const items = budget.items || [];
    if (items.length === 0) {
      page.content.push(`0.5 0.5 0.5 rg`);
      page.content.push(`BT /F1 12 Tf ${margin} ${currentY} Td (${this.sanitizeText('Nenhum item adicionado a este orcamento.')}) Tj ET`);
      currentY -= 30;
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const itemNumber = index + 1;
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.price) || 0;
      const subtotal = unitPrice * qty;

      // Pré-carrega imagem se houver
      let imgObj = null;
      if (item.screenshotDataUrl || item.imageUrl) {
        imgObj = await this.registerImage(item.screenshotDataUrl || item.imageUrl);
      }

      // Calcula altura estimada necessária para este item
      const imgHeight = imgObj ? Math.min(180, (imgObj.height / imgObj.width) * contentWidth) : 0;
      const neededHeight = 30 + (imgObj ? (imgHeight + 12) : 0) + 24 + 20;

      // Quebra de página se não couber
      if (currentY - neededHeight < 60) {
        page = this.addPage();
        currentY = this.pageHeight - margin;
      }

      // LINHA 1: Nome do Produto - Valor
      const titleText = `${itemNumber}. ${item.title || 'Produto sem nome'}`;
      let priceText = this.formatCurrency(unitPrice);
      if (qty > 1) {
        priceText += ` (Qtd: ${qty} = ${this.formatCurrency(subtotal)})`;
      }
      const line1 = this.sanitizeText(`${titleText} - ${priceText}`);

      page.content.push(`0.08 0.12 0.2 rg`);
      page.content.push(`BT /F2 11 Tf ${margin} ${currentY} Td (${line1}) Tj ET`);
      currentY -= 16;

      // LINHA 2: Imagem / Print da Tela
      if (imgObj) {
        page.imagesUsed.push(imgObj.id);
        const displayWidth = Math.min(contentWidth, 480);
        const displayHeight = Math.min(180, (imgObj.height / imgObj.width) * displayWidth);
        const imgX = margin;
        const imgY = currentY - displayHeight;

        // Borda sutil na imagem
        page.content.push(`0.9 0.9 0.9 RG 0.5 w`);
        page.content.push(`${imgX} ${imgY} ${displayWidth} ${displayHeight} re S`);

        // Desenha a imagem no PDF
        page.content.push(`q ${displayWidth} 0 0 ${displayHeight} ${imgX} ${imgY} cm /${imgObj.id} Do Q`);
        currentY = imgY - 12;
      }

      // LINHA 3: Link do Produto
      const urlText = item.url ? item.url : 'Sem link disponivel';
      const cleanUrlDisplay = urlText.length > 80 ? urlText.substring(0, 77) + '...' : urlText;
      const line3 = this.sanitizeText(`Link: ${cleanUrlDisplay}`);

      // Texto do link em azul
      page.content.push(`0.12 0.38 0.88 rg`);
      page.content.push(`BT /F1 9 Tf ${margin} ${currentY} Td (${line3}) Tj ET`);

      // Sublinhado do link
      page.content.push(`0.12 0.38 0.88 RG 0.5 w`);
      page.content.push(`${margin} ${currentY - 2} ${Math.min(contentWidth, line3.length * 5)} 0.5 re f`);

      // Anotação de Link Clicável no PDF
      if (item.url && item.url.startsWith('http')) {
        const linkRect = [margin, currentY - 4, margin + Math.min(contentWidth, line3.length * 6), currentY + 10];
        page.annots.push({
          rect: linkRect,
          url: item.url
        });
      }

      currentY -= 18;

      // Linha separadora sutil
      page.content.push(`0.9 0.92 0.95 RG 0.5 w`);
      page.content.push(`${margin} ${currentY} ${contentWidth} 0.5 re f`);
      currentY -= 16;
    }

    // --- RODAPÉ COM TOTAL FINAL (se couber, ou na última página) ---
    if (currentY < 70) {
      page = this.addPage();
      currentY = this.pageHeight - margin;
    }

    page.content.push(`0.93 0.96 0.95 rg`);
    page.content.push(`${margin} ${currentY - 32} ${contentWidth} 32 re f`);
    page.content.push(`0.1 0.6 0.35 RG 1.5 w`);
    page.content.push(`${margin} ${currentY - 32} ${contentWidth} 32 re S`);

    page.content.push(`0.05 0.45 0.25 rg`);
    const finalTotalText = this.sanitizeText(`TOTAL GERAL DO ORCAMENTO: ${this.formatCurrency(totalValue)}`);
    page.content.push(`BT /F2 13 Tf ${margin + 14} ${currentY - 21} Td (${finalTotalText}) Tj ET`);

    // Numeração de páginas no rodapé de todas as páginas
    const totalPagesCount = this.pages.length;
    this.pages.forEach((p, pIdx) => {
      p.content.push(`0.5 0.55 0.6 rg`);
      const pageNumberStr = this.sanitizeText(`Pagina ${pIdx + 1} de ${totalPagesCount}`);
      p.content.push(`BT /F1 9 Tf ${this.pageWidth - margin - 80} 25 Td (${pageNumberStr}) Tj ET`);
      p.content.push(`BT /F1 8 Tf ${margin} 25 Td (${this.sanitizeText('Gerado por CotaFacil - Extensao Google Chrome')}) Tj ET`);
    });

    return this.compilePdf();
  }

  /**
   * Compila toda a estrutura em um Uint8Array válido de PDF 1.4
   */
  compilePdf() {
    let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];

    // Helper para converter string ASCII em bytes
    const strToBytes = (str) => {
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i) & 0xFF;
      }
      return arr;
    };

    // Colecionador de chunks binários
    const chunks = [strToBytes(output)];
    let currentOffset = output.length;

    const addChunk = (chunk) => {
      chunks.push(chunk);
      currentOffset += chunk.length;
    };

    const addStringObj = (objId, strContent) => {
      offsets[objId] = currentOffset;
      const objHeader = `${objId} 0 obj\n`;
      const objFooter = `\nendobj\n`;
      const full = objHeader + strContent + objFooter;
      addChunk(strToBytes(full));
    };

    let nextId = 1;
    const catalogId = nextId++;
    const pagesRootId = nextId++;
    const fontNormalId = nextId++;
    const fontBoldId = nextId++;

    // Mapeamento de imagens
    const imageObjIds = {};
    for (const img of this.images) {
      imageObjIds[img.id] = nextId++;
    }

    // Mapeamento de páginas e seus streams
    const pageObjIds = [];
    const contentObjIds = [];
    const annotObjIds = [];

    for (let i = 0; i < this.pages.length; i++) {
      pageObjIds.push(nextId++);
      contentObjIds.push(nextId++);
      const pageAnnots = [];
      for (const ann of this.pages[i].annots) {
        pageAnnots.push(nextId++);
      }
      annotObjIds.push(pageAnnots);
    }

    // 1. Catalog
    addStringObj(catalogId, `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`);

    // 2. Pages Root
    const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(' ');
    addStringObj(pagesRootId, `<< /Type /Pages /Kids [${kidsStr}] /Count ${this.pages.length} >>`);

    // 3. Fonts
    addStringObj(fontNormalId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
    addStringObj(fontBoldId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

    // 4. Imagens (XObjects)
    for (const img of this.images) {
      const imgObjId = imageObjIds[img.id];
      offsets[imgObjId] = currentOffset;

      const header = `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`;
      addChunk(strToBytes(header));
      addChunk(img.bytes);
      const footer = `\nendstream\nendobj\n`;
      addChunk(strToBytes(footer));
    }

    // 5. Páginas, Conteúdos e Anotações
    for (let i = 0; i < this.pages.length; i++) {
      const p = this.pages[i];
      const pId = pageObjIds[i];
      const cId = contentObjIds[i];
      const pAnnots = annotObjIds[i];

      // Recursos da página (Fontes e Imagens)
      let xObjStr = '';
      if (p.imagesUsed.length > 0) {
        xObjStr = ' /XObject << ' + p.imagesUsed.map(imgId => `/${imgId} ${imageObjIds[imgId]} 0 R`).join(' ') + ' >>';
      }

      const annotsRefStr = pAnnots.length > 0 ? ` /Annots [${pAnnots.map(a => `${a} 0 R`).join(' ')}]` : '';

      // Page Object
      addStringObj(pId, `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${fontNormalId} 0 R /F2 ${fontBoldId} 0 R >>${xObjStr} >> /Contents ${cId} 0 R${annotsRefStr} >>`);

      // Content Stream
      const streamText = p.content.join('\n');
      const streamHeader = `<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream`;
      addStringObj(cId, streamHeader);

      // Link Annotations da página
      for (let j = 0; j < p.annots.length; j++) {
        const ann = p.annots[j];
        const aId = pAnnots[j];
        const escapedUrl = ann.url.replace(/[\(\)\\]/g, '\\$&');
        const [x1, y1, x2, y2] = ann.rect;
        addStringObj(aId, `<< /Type /Annot /Subtype /Link /Rect [${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${escapedUrl}) >> >>`);
      }
    }

    // XREF Table
    const xrefOffset = currentOffset;
    let xrefText = `xref\n0 ${nextId}\n0000000000 65535 f \r\n`;
    for (let i = 1; i < nextId; i++) {
      const off = offsets[i] || 0;
      xrefText += String(off).padStart(10, '0') + ' 00000 n \r\n';
    }

    xrefText += `trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    addChunk(strToBytes(xrefText));

    // Junta todos os pedaços num único Uint8Array
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;

    const finalPdf = new Uint8Array(totalLen);
    let pos = 0;
    for (const c of chunks) {
      finalPdf.set(c, pos);
      pos += c.length;
    }

    return finalPdf;
  }
}

// Exporta globalmente para uso no popup e no relatório
if (typeof window !== 'undefined') {
  window.NativePdfBuilder = NativePdfBuilder;
}
