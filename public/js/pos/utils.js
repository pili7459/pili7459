import { state } from './state.js';
// ---------------------------------------- [提示訊息 Toast] 開始 ----------------------------------------
let toastTimeout = null;

export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast-msg');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
// ---------------------------------------- [提示訊息 Toast] 結束 ----------------------------------------


// ---------------------------------------- [取得今日日期字串] 開始 ----------------------------------------
export function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// ---------------------------------------- [取得今日日期字串] 結束 ----------------------------------------


// ---------------------------------------- [取得格式化時間] 開始 ----------------------------------------
export function getFormattedTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
// ---------------------------------------- [取得格式化時間] 結束 ----------------------------------------


// ---------------------------------------- [格式化餐點明細文字] 開始 ----------------------------------------
export function formatDetailsText(name, qty, optionsText) {
  let nl = String.fromCharCode(10);
  let text = `${name} x ${qty}` + nl;
  if (optionsText) {
    text += `  ✬ ${optionsText}` + nl;
  }
  return text;
}
// ---------------------------------------- [格式化餐點明細文字] 結束 ----------------------------------------


// ---------------------------------------- [生成餐點明細HTML] 開始 ----------------------------------------
export function generateItemHTML(name, optionsText) {
  let lines = name.split(/\r?\n/);
  let mainName = lines[0];
  let subItems = lines.slice(1);
  let html = `<div style="font-weight:900; font-size:1.15em; color:#0f172a;">${mainName}</div>`;
  if (subItems.length > 0) {
    html += subItems.map(s => `<div style="color:#64748b; font-size:0.95em; padding-left:8px;">- ${s}</div>`).join('');
  }
  if (optionsText) {
    html += `<div style="color:#ea580c; font-size:0.9em; font-weight:bold; margin-top:3px;">${optionsText}</div>`;
  }
  return html;
}
// ---------------------------------------- [生成餐點明細HTML] 結束 ----------------------------------------


// ---------------------------------------- [開啟錢櫃] 開始 ----------------------------------------
export function openCashDrawer() {
  showToast("🗄️ 已發送指令開啟錢櫃");
}
// ---------------------------------------- [開啟錢櫃] 結束 ----------------------------------------


// ---------------------------------------- [列印小白單] 開始 ----------------------------------------
export function printReceipts(orderNumber) {
  console.log(`[Printer] 列印小白單: #${orderNumber}`);
}
// ---------------------------------------- [列印小白單] 結束 ----------------------------------------


// ---------------------------------------- [列印標籤貼紙] 開始 ----------------------------------------
export function printStickers(orderNumber) {
  console.log(`[Printer] 列印標籤貼紙: #${orderNumber}`);
}
// ---------------------------------------- [列印標籤貼紙] 結束 ----------------------------------------


// ---------------------------------------- [測試列印] 開始 ----------------------------------------
export function testPrint() {
  showToast("🖨️ 正在傳送測試列印指令...");
  printReceipts("TEST-01");
  printStickers("TEST-01");
}
// ---------------------------------------- [測試列印] 結束 ----------------------------------------


// ---------------------------------------- [列印尺寸與排版預覽邏輯] 開始 ----------------------------------------
let currentPpType = 'sticker';

const PP_MODELS = {
  sticker: [
    { value: '32x25', label: '32*25 (32mm × 25mm)', wMm: 32, hMm: 25 },
    { value: '40x30', label: '40*30 (40mm × 30mm)', wMm: 40, hMm: 30 },
    { value: '50x30', label: '50*30 (50mm × 30mm)', wMm: 50, hMm: 30 }
  ],
  receipt: [
    { value: '80x80x12', label: '80*80*12 (紙寬 80mm / 有效 72mm)', wMm: 80, hMm: null },
    { value: '58x40x12', label: '58*40*12 (紙寬 58mm / 有效 48mm)', wMm: 58, hMm: null }
  ]
};

function isDrinkItemName(name) {
  if (!name) return false;
  const keywords = ['飲', '茶', '咖啡', '豆漿', '拿鐵', '冬瓜', '可可', '牛奶', '鮮奶', '果汁', '可樂', '雪碧'];
  return keywords.some(k => name.includes(k));
}

function formatStickerDiningLabel(diningType) {
  if (!diningType) return '';
  const str = String(diningType).trim();
  if (str.includes('內用')) {
    const numMatch = str.match(/(\d+)/);
    return numMatch ? `桌號：${numMatch[1]}` : '';
  }
  return str.replace(/\(盡快取餐\)/g, '').trim();
}

function parseCartItemForPrint(item) {
  const nameLines = (item.name || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const comboTitle = nameLines[0] || '';
  const subItems = nameLines.slice(1);
  const isCombo = subItems.length > 0;

  let mainItemName = '';
  let drinkItemName = '';
  let rawSideItems = [];

  if (isCombo) {
    let foundDrink = false;
    subItems.forEach(line => {
      if (isDrinkItemName(line) && !foundDrink) {
        drinkItemName = line;
        foundDrink = true;
      } else if (!foundDrink) {
        if (!mainItemName) mainItemName = line;
        else rawSideItems.push(line);
      } else {
        rawSideItems.push(line);
      }
    });
  } else {
    mainItemName = comboTitle;
  }

  let mainModifiers = [];
  let drinkModifiers = [];
  let drinkPriceAdd = 0;
  let sideGroupsMap = {};
  let extraAddons = [];

  (item.structuredOptions || []).forEach(opt => {
    const title = opt.groupTitle || '';
    const extraText = opt.price > 0 ? `+${opt.price}` : '';
    const displayMod = `${opt.name}${extraText}`;

    if (title.includes('主餐')) {
      mainModifiers.push(displayMod);
    } else if (title.includes('飲料') || title.includes('飲品')) {
      drinkItemName = opt.name;
      drinkPriceAdd = opt.price || 0;
      if (opt.subModifiers && opt.subModifiers.length > 0) {
        drinkModifiers.push(...opt.subModifiers);
      }
    } else if (title.includes('加購') || title.includes('加點')) {
      extraAddons.push({ name: opt.name, price: opt.price || 0 });
    } else if (title.includes('副餐')) {
      const match = title.match(/副餐(\d+)/);
      const sideIdx = match ? parseInt(match[1], 10) : 1;
      if (!sideGroupsMap[sideIdx]) sideGroupsMap[sideIdx] = [];
      sideGroupsMap[sideIdx].push(displayMod);
    } else {
      if (title.includes('口感') || title.includes('加料') || title.includes('減料') || title.includes('熟度') || title.includes('口味') || title.includes('醬')) {
        mainModifiers.push(displayMod);
      } else if (title.includes('冰') || title.includes('糖')) {
        drinkModifiers.push(displayMod);
      } else {
        if (!sideGroupsMap[1]) sideGroupsMap[1] = [];
        sideGroupsMap[1].push(displayMod);
      }
    }
  });

  const sideList = [];
  const maxSideCount = Math.max(rawSideItems.length, Object.keys(sideGroupsMap).length);
  for (let i = 1; i <= maxSideCount; i++) {
    const name = rawSideItems[i - 1] || (Object.keys(sideGroupsMap).length > 1 ? `副餐${i}` : '副餐');
    const mods = sideGroupsMap[i] || [];
    sideList.push({ name, mods });
  }

  return {
    isCombo,
    comboTitle,
    mainItemName,
    mainModifiers,
    drinkItemName,
    drinkPriceAdd,
    drinkModifiers,
    sideList,
    extraAddons,
    note: item.note || '',
    qty: item.qty || 1,
    totalPrice: item.isComp ? 0 : (item.price * (item.qty || 1))
  };
}

function getPreviewSampleData() {
  const cartKeys = Object.keys(state.cart || {});
  if (cartKeys.length > 0) {
    const diningType = document.getElementById('pos-dining-type')?.value || '內用';
    const tableNum = document.getElementById('pos-table-number')?.value || '5';
    const parsedItems = cartKeys.map(k => parseCartItemForPrint(state.cart[k]));
    const total = parsedItems.reduce((sum, i) => sum + i.totalPrice, 0);
    return {
      sourceLabel: '資料來源：目前購物車餐點',
      orderNum: '018',
      diningType: diningType === '內用' ? `內用(桌號:${tableNum})` : diningType,
      time: getFormattedTime(),
      parsedItems,
      total
    };
  }

  if (state.selectedOrder && state.selectedOrder.detailsText) {
    const rawLines = state.selectedOrder.detailsText.split(/\r?\n/);
    const parsedItems = [];
    let cur = null;

    rawLines.forEach(rawLine => {
      const t = rawLine.trim();
      if (!t || t.includes('---')) return;

      if (t.includes(':::') && !t.includes('小計') && !t.includes('總額') && !t.includes('優惠')) {
        if (cur) parsedItems.push(cur);
        const [left, right] = t.split(':::');
        const qtyMatch = left.trim().match(/^(\d+)x\s*(.*)$/);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const title = qtyMatch ? qtyMatch[2].trim() : left.trim();
        cur = {
          isCombo: false,
          comboTitle: title,
          mainItemName: title,
          mainModifiers: [],
          drinkItemName: '',
          drinkPriceAdd: 0,
          drinkModifiers: [],
          sideList: [],
          extraAddons: [],
          note: '',
          qty,
          totalPrice: parseInt((right || '').replace(/[^0-9]/g, ''), 10) || 0,
          _lastTarget: 'main'
        };
      } else if (cur) {
        if (t.startsWith('▸')) {
          cur.isCombo = true;
          const subName = t.replace(/^▸\s*/, '').trim();
          if (isDrinkItemName(subName)) {
            cur.drinkItemName = subName;
            cur._lastTarget = 'drink';
          } else if (cur.mainItemName === cur.comboTitle) {
            cur.mainItemName = subName;
            cur._lastTarget = 'main';
          } else {
            cur.sideList.push({ name: subName, mods: [] });
            cur._lastTarget = 'side';
          }
        } else if (t.startsWith('└')) {
          const mods = t.replace(/^└\s*/, '').split('/').map(s => s.trim()).filter(Boolean);
          if (cur._lastTarget === 'drink') cur.drinkModifiers.push(...mods);
          else if (cur._lastTarget === 'side' && cur.sideList.length > 0) cur.sideList[cur.sideList.length - 1].mods.push(...mods);
          else cur.mainModifiers.push(...mods);
        } else if (t.startsWith('＋加購：')) {
          const addons = t.replace(/^＋加購：/, '').split('/').map(s => s.trim()).filter(Boolean);
          addons.forEach(a => cur.extraAddons.push({ name: a, price: 0 }));
        } else if (t.startsWith('※ 備註：')) {
          cur.note = t.replace(/^※ 備註：/, '').trim();
        }
      }
    });
    if (cur) parsedItems.push(cur);

    if (parsedItems.length > 0) {
      return {
        sourceLabel: `資料來源：目前選取訂單 (#${state.selectedOrder.orderNumber})`,
        orderNum: state.selectedOrder.orderNumber || '001',
        diningType: state.selectedOrder.diningType || '內用',
        time: state.selectedOrder.time || getFormattedTime(),
        parsedItems,
        total: Math.abs(parseInt(state.selectedOrder.totalAmount || 0, 10))
      };
    }
  }

  return {
    sourceLabel: '資料來源：範例測試餐點（測試自動放大與超長自動分張）',
    orderNum: '012',
    diningType: '內用(桌號:5)',
    time: getFormattedTime(),
    parsedItems: [
      {
        isCombo: true,
        comboTitle: '一號餐',
        mainItemName: '嫩煎雞腿蛋餅',
        mainModifiers: ['焦一點', '加起司+10', '加九層塔+15', '加玉米+10', '加雙蛋+20', '不要蔥', '加辣'],
        drinkItemName: '招牌日十紅茶',
        drinkPriceAdd: 0,
        drinkModifiers: ['冰', '甜度固定'],
        sideList: [{ name: '炸物雙拼', mods: [] }],
        extraAddons: [{ name: '熱狗', price: 16 }],
        note: '蛋餅切小塊、不要醬油膏',
        qty: 1,
        totalPrice: 243
      },
      {
        isCombo: false,
        comboTitle: '杉林溪青茶 (大)',
        mainItemName: '杉林溪青茶 (大)',
        mainModifiers: ['固定冰', '固定無糖'],
        drinkItemName: '',
        drinkPriceAdd: 0,
        drinkModifiers: [],
        sideList: [],
        extraAddons: [],
        note: '',
        qty: 2,
        totalPrice: 100
      }
    ],
    total: 343
  };
}

// 依據貼紙寬高計算單張可容納的客製化字數上限，超出自動拆出「(續)餐點名稱」且沿用原本餐點序號
function splitTicketIfOverflow(rawTicket, wMm, hMm, itemIndex, totalItems) {
  const mods = rawTicket.mods || [];
  const countBadge = `${itemIndex}/${totalItems}`;

  if (mods.length === 0) {
    return [{ title: rawTicket.title, mods: [], isCont: false, countBadge }];
  }

  const areaFactor = (wMm * hMm) / (32 * 25);
  const maxFirstChars = Math.max(22, Math.floor(28 * areaFactor));
  const maxNextChars = Math.max(26, Math.floor(34 * areaFactor));

  const pages = [];
  let currentMods = [];
  let currentLen = 0;

  mods.forEach(mod => {
    const addLen = mod.length + (currentMods.length > 0 ? 3 : 0);
    const limit = pages.length === 0 ? maxFirstChars : maxNextChars;

    if (currentMods.length > 0 && currentLen + addLen > limit) {
      pages.push({
        title: pages.length === 0 ? rawTicket.title : `(續)${rawTicket.title}`,
        mods: currentMods,
        isCont: pages.length > 0,
        countBadge
      });
      currentMods = [mod];
      currentLen = mod.length;
    } else {
      currentMods.push(mod);
      currentLen += addLen;
    }
  });

  if (currentMods.length > 0) {
    pages.push({
      title: pages.length === 0 ? rawTicket.title : `(續)${rawTicket.title}`,
      mods: currentMods,
      isCont: pages.length > 0,
      countBadge
    });
  }

  return pages;
}

function buildStickerTickets(parsedItems, wMm = 32, hMm = 25) {
  const rawTickets = [];
  parsedItems.forEach(item => {
    const qty = item.qty || 1;
    for (let q = 0; q < qty; q++) {
      if (item.isCombo) {
        if (item.mainItemName && !isDrinkItemName(item.mainItemName)) {
          rawTickets.push({ title: item.mainItemName, mods: item.mainModifiers });
        }
        (item.sideList || []).forEach(s => {
          if (s.name && !isDrinkItemName(s.name)) {
            rawTickets.push({ title: s.name, mods: s.mods });
          }
        });
      } else {
        if (item.mainItemName && !isDrinkItemName(item.mainItemName)) {
          rawTickets.push({ title: item.mainItemName, mods: item.mainModifiers });
        }
      }

      (item.extraAddons || []).forEach(ad => {
        if (ad.name && !isDrinkItemName(ad.name)) {
          rawTickets.push({ title: ad.name, mods: [] });
        }
      });
    }
  });

  const totalItems = rawTickets.length;
  const finalTickets = [];
  rawTickets.forEach((rt, idx) => {
    finalTickets.push(...splitTicketIfOverflow(rt, wMm, hMm, idx + 1, totalItems));
  });
  return finalTickets;
}

function calcAutoStickerFontSizes(title, modLine, wMm, hMm) {
  const scale = Math.min(wMm / 32, hMm / 25);
  const titleLen = title.length;
  const modLen = modLine.length;

  if (modLen === 0) {
    let baseTitle = 16;
    if (titleLen <= 4) baseTitle = 17.5;
    else if (titleLen <= 6) baseTitle = 15.5;
    else if (titleLen <= 9) baseTitle = 13.5;
    else baseTitle = 11.5;
    return {
      titlePx: +(baseTitle * scale).toFixed(1),
      modPx: 0,
      centerOnly: true
    };
  }

  let baseTitle = titleLen <= 6 ? 11.5 : 10;
  let baseMod = 9.5;
  if (modLen > 24) {
    baseTitle = 9.5;
    baseMod = 7.5;
  } else if (modLen > 16) {
    baseTitle = 10;
    baseMod = 8.2;
  } else if (modLen > 8) {
    baseTitle = 10.5;
    baseMod = 9;
  }

  return {
    titlePx: +(baseTitle * scale).toFixed(1),
    modPx: +(baseMod * scale).toFixed(1),
    centerOnly: false
  };
}

export function openPrintPreviewModal() {
  const modal = document.getElementById('print-preview-modal');
  if (!modal) return;
  switchPrintPreviewType(currentPpType);
  modal.style.display = 'flex';
}

export function closePrintPreviewModal() {
  const modal = document.getElementById('print-preview-modal');
  if (modal) modal.style.display = 'none';
}

export function switchPrintPreviewType(type) {
  currentPpType = type;
  const btnSticker = document.getElementById('btn-pp-type-sticker');
  const btnReceipt = document.getElementById('btn-pp-type-receipt');
  const modelSel = document.getElementById('pp-model-select');

  if (btnSticker && btnReceipt) {
    if (type === 'sticker') {
      btnSticker.style.background = '#3b82f6';
      btnSticker.style.color = '#fff';
      btnSticker.style.borderColor = '#3b82f6';
      btnReceipt.style.background = '#fff';
      btnReceipt.style.color = '#334155';
      btnReceipt.style.borderColor = '#cbd5e1';
    } else {
      btnReceipt.style.background = '#3b82f6';
      btnReceipt.style.color = '#fff';
      btnReceipt.style.borderColor = '#3b82f6';
      btnSticker.style.background = '#fff';
      btnSticker.style.color = '#334155';
      btnSticker.style.borderColor = '#cbd5e1';
    }
  }

  if (modelSel) {
    const list = PP_MODELS[type] || [];
    modelSel.innerHTML = list.map((m, idx) => `<option value="${m.value}" ${idx === 0 ? 'selected' : ''}>${m.label}</option>`).join('');
  }

  updatePrintPreviewRender();
}

export function updatePrintPreviewRender() {
  const wrapper = document.getElementById('pp-canvas-wrapper');
  const modelSel = document.getElementById('pp-model-select');
  const zoomSel = document.getElementById('pp-zoom-select');
  const dimInfo = document.getElementById('pp-dim-info');
  const warnEl = document.getElementById('pp-overflow-warning');
  const srcInfo = document.getElementById('pp-source-info');
  if (!wrapper || !modelSel) return;

  const modelVal = modelSel.value;
  const zoom = parseFloat(zoomSel ? zoomSel.value : '1.5') || 1.5;
  const modelCfg = (PP_MODELS[currentPpType] || []).find(m => m.value === modelVal) || PP_MODELS[currentPpType][0];
  const data = getPreviewSampleData();

  if (srcInfo) srcInfo.innerText = data.sourceLabel;

  const wPx = modelCfg.wMm * 3.7795;
  const hPx = modelCfg.hMm ? modelCfg.hMm * 3.7795 : null;

  if (dimInfo) {
    dimInfo.innerText = modelCfg.hMm
      ? `目前尺寸：寬 ${modelCfg.wMm}mm × 高 ${modelCfg.hMm}mm (字體自動縮放，超長自動續印下張)`
      : `目前尺寸：紙寬 ${modelCfg.wMm}mm (連續出紙，左右超出會被切掉)`;
  }

  wrapper.innerHTML = '';
  let hasAnyClip = false;

  if (currentPpType === 'sticker') {
    const tickets = buildStickerTickets(data.parsedItems, modelCfg.wMm, modelCfg.hMm);
    const stickerDiningLabel = formatStickerDiningLabel(data.diningType);

    if (tickets.length === 0) {
      wrapper.innerHTML = '<div style="color:#475569; font-weight:bold; padding:30px;">目前只有飲料品項，依照規則不列印貼紙。</div>';
    } else {
      tickets.forEach((tk) => {
        const modLine = (tk.mods && tk.mods.length > 0) ? tk.mods.join(' / ') : '';
        const fonts = calcAutoStickerFontSizes(tk.title, modLine, modelCfg.wMm, modelCfg.hMm);

        const outer = document.createElement('div');
        outer.style.cssText = `width: ${wPx * zoom}px; height: ${hPx * zoom}px; flex-shrink: 0; position: relative;`;

        const paper = document.createElement('div');
        paper.style.cssText = `
          width: ${wPx}px;
          height: ${hPx}px;
          transform: scale(${zoom});
          transform-origin: top left;
          background: #ffffff;
          color: #000000;
          border: 1.5px solid #000000;
          border-radius: 3px;
          padding: 1.5mm 2mm;
          box-sizing: border-box;
          overflow: hidden;
          font-family: 'Microsoft JhengHei', sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        `;

        const centerHtml = fonts.centerOnly
          ? `<div style="flex:1; display:flex; align-items:center; justify-content:center; text-align:center; font-size:${fonts.titlePx}px; font-weight:900; line-height:1.15; word-break:break-all;">${tk.title}</div>`
          : `
            <div style="font-size:${fonts.titlePx}px; font-weight:900; line-height:1.15; margin-top:1px; word-break:break-all;">${tk.title}</div>
            <div style="font-size:${fonts.modPx}px; font-weight:700; line-height:1.2; word-break:break-all; flex:1; overflow:hidden; margin-top:2px;">${modLine}</div>
          `;

        paper.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #000; padding-bottom:1px; font-size:8px; font-weight:900; line-height:1.1;">
            <span>#${data.orderNum}</span>
            <span>${stickerDiningLabel}</span>
            <span>${tk.countBadge}</span>
          </div>
          ${centerHtml}
          <div style="display:flex; justify-content:space-between; font-size:7px; font-weight:bold; border-top:1px dashed #000; padding-top:1px; line-height:1;">
            <span>日十。大里店</span>
            <span>${data.time}</span>
          </div>
        `;

        outer.appendChild(paper);
        wrapper.appendChild(outer);

        if (paper.scrollHeight > paper.clientHeight + 1 || paper.scrollWidth > paper.clientWidth + 1) {
          hasAnyClip = true;
          paper.style.border = '2px solid #ef4444';
        }
      });
    }
  } else {
    const itemsHtml = data.parsedItems.map(it => {
      let bodyHtml = '';

      if (it.isCombo) {
        if (it.mainItemName) {
          bodyHtml += `<div style="padding-left:6px; font-size:10px; font-weight:bold;">▸ ${it.mainItemName}</div>`;
          if (it.mainModifiers.length > 0) {
            bodyHtml += `<div style="padding-left:14px; font-size:9.5px;">└ ${it.mainModifiers.join(' / ')}</div>`;
          }
        }
        if (it.drinkItemName) {
          const drinkAdd = it.drinkPriceAdd > 0 ? ` +${it.drinkPriceAdd}` : '';
          bodyHtml += `<div style="padding-left:6px; font-size:10px; font-weight:bold;">▸ ${it.drinkItemName}${drinkAdd}</div>`;
          if (it.drinkModifiers.length > 0) {
            bodyHtml += `<div style="padding-left:14px; font-size:9.5px;">└ ${it.drinkModifiers.join(' / ')}</div>`;
          }
        }
        (it.sideList || []).forEach(s => {
          bodyHtml += `<div style="padding-left:6px; font-size:10px; font-weight:bold;">▸ ${s.name}</div>`;
          if (s.mods.length > 0) {
            bodyHtml += `<div style="padding-left:14px; font-size:9.5px;">└ ${s.mods.join(' / ')}</div>`;
          }
        });
      } else {
        if (it.mainModifiers.length > 0) {
          bodyHtml += `<div style="padding-left:8px; font-size:9.5px;">└ ${it.mainModifiers.join(' / ')}</div>`;
        }
      }

      if (it.extraAddons && it.extraAddons.length > 0) {
        const addonText = it.extraAddons.map(a => a.price > 0 ? `${a.name}+${a.price}` : a.name).join(' / ');
        bodyHtml += `<div style="padding-left:6px; font-size:9.5px; font-weight:bold;">＋加購：${addonText}</div>`;
      }

      if (it.note) {
        bodyHtml += `<div style="padding-left:6px; font-size:9.5px; font-weight:bold;">※ 備註：${it.note}</div>`;
      }

      return `
        <div style="margin-bottom:5px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:900;">
            <span style="word-break:break-all;">${it.qty}x ${it.comboTitle}</span>
            <span style="flex-shrink:0; margin-left:4px;">$${it.totalPrice}</span>
          </div>
          ${bodyHtml}
        </div>
      `;
    }).join('');

    const paper = document.createElement('div');
    paper.style.cssText = `
      width: ${wPx}px;
      background: #ffffff;
      color: #000000;
      border: 1px solid #000000;
      padding: 3mm 2.5mm;
      box-sizing: border-box;
      overflow: hidden;
      font-family: 'Microsoft JhengHei', monospace;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    `;

    paper.innerHTML = `
      <div style="text-align:center; font-size:13px; font-weight:900; border-bottom:1.5px solid #000; padding-bottom:3px; margin-bottom:4px;">
        日十。台中大里店
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10.5px; font-weight:900; margin-bottom:2px;">
        <span>單號：#${data.orderNum}</span>
        <span>${data.diningType}</span>
      </div>
      <div style="font-size:9.5px; border-bottom:1px dashed #000; padding-bottom:3px; margin-bottom:4px;">
        時間：${data.time}
      </div>
      ${itemsHtml}
      <div style="border-top:1px dashed #000; padding-top:4px; margin-top:4px; display:flex; justify-content:space-between; font-size:13px; font-weight:900;">
        <span>合計金額</span>
        <span>$${data.total}</span>
      </div>
      <div style="text-align:center; font-size:9px; margin-top:6px; border-top:1px solid #000; padding-top:3px;">
        謝謝光臨・歡迎再次光臨
      </div>
    `;

    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `width: ${wPx * zoom}px; flex-shrink: 0;`;
    paper.style.transform = `scale(${zoom})`;
    paper.style.transformOrigin = 'top left';
    tempContainer.appendChild(paper);
    wrapper.appendChild(tempContainer);

    requestAnimationFrame(() => {
      tempContainer.style.height = `${paper.offsetHeight * zoom}px`;
      if (paper.scrollWidth > paper.clientWidth + 1) {
        hasAnyClip = true;
        paper.style.border = '2px solid #ef4444';
      }
    });
  }

  if (warnEl) {
    if (hasAnyClip) {
      warnEl.style.color = '#dc2626';
      warnEl.innerText = '⚠️ 警告：內容超出紙張邊界，實際列印會被切掉！';
    } else {
      warnEl.style.color = '#059669';
      warnEl.innerText = '✅ 排版正常，文字完整顯示不會被切掉';
    }
  }
}
// ---------------------------------------- [列印尺寸與排版預覽邏輯] 結束 ----------------------------------------