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

function getPreviewSampleData() {
  const cartKeys = Object.keys(state.cart || {});
  if (cartKeys.length > 0) {
    const diningType = document.getElementById('pos-dining-type')?.value || '內用';
    const tableNum = document.getElementById('pos-table-number')?.value || '3';
    const items = cartKeys.map(k => {
      const it = state.cart[k];
      const opts = (it.structuredOptions || []).map(o => o.price > 0 ? `${o.name}+${o.price}` : o.name);
      return {
        name: it.name,
        qty: it.qty,
        price: it.isComp ? 0 : it.price * it.qty,
        opts: opts,
        note: it.note || ''
      };
    });
    const total = items.reduce((sum, i) => sum + i.price, 0);
    return {
      sourceLabel: '資料來源：目前購物車餐點',
      orderNum: '018',
      diningType: diningType === '內用' ? `內用(${tableNum}號桌)` : diningType,
      time: getFormattedTime(),
      items,
      total
    };
  }

  if (state.selectedOrder && state.selectedOrder.detailsText) {
    const rawLines = state.selectedOrder.detailsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const items = [];
    rawLines.forEach(l => {
      if (l.includes(':::') && !l.includes('小計') && !l.includes('總額') && !l.includes('優惠')) {
        const [left, right] = l.split(':::');
        items.push({
          name: left.replace(/^\d+x\s*/, '').trim(),
          qty: parseInt(left) || 1,
          price: parseInt((right || '').replace(/[^0-9]/g, '')) || 0,
          opts: [],
          note: ''
        });
      } else if (items.length > 0 && (l.startsWith('▸') || l.startsWith('└') || l.startsWith('＋') || l.startsWith('※'))) {
        items[items.length - 1].opts.push(l);
      }
    });
    if (items.length > 0) {
      return {
        sourceLabel: `資料來源：目前選取訂單 (#${state.selectedOrder.orderNumber})`,
        orderNum: state.selectedOrder.orderNumber || '001',
        diningType: state.selectedOrder.diningType || '內用',
        time: state.selectedOrder.time || getFormattedTime(),
        items,
        total: Math.abs(parseInt(state.selectedOrder.totalAmount || 0, 10))
      };
    }
  }

  return {
    sourceLabel: '資料來源：範例測試餐點（測試長字數是否被裁切）',
    orderNum: '012',
    diningType: '內用(5號桌)',
    time: getFormattedTime(),
    items: [
      {
        name: '一號餐\n嫩煎雞腿蛋餅\n炸物雙拼\n招牌日十紅茶',
        qty: 1,
        price: 208,
        opts: ['▸ 嫩煎雞腿蛋餅', '└ 焦一點 / 加起司+10 / 加九層塔+15', '▸ 招牌日十紅茶', '└ 冰 / 甜度固定', '＋加購：熱狗+16'],
        note: '蛋餅切小塊、不要醬油膏'
      },
      {
        name: '杉林溪青茶 (大)',
        qty: 2,
        price: 100,
        opts: ['└ 固定冰 / 固定無糖'],
        note: ''
      }
    ],
    total: 308
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
      ? `目前尺寸：寬 ${modelCfg.wMm}mm × 高 ${modelCfg.hMm}mm (固定高度，超出會被切掉)`
      : `目前尺寸：紙寬 ${modelCfg.wMm}mm (連續出紙，左右超出會被切掉)`;
  }

  wrapper.innerHTML = '';
  let hasAnyClip = false;

  if (currentPpType === 'sticker') {
    data.items.forEach((it, idx) => {
      const mainTitle = (it.name || '').split('\n')[0];
      const optText = [...it.opts, it.note ? `備註:${it.note}` : ''].filter(Boolean).join(' / ');

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

      paper.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #000; padding-bottom:1px; font-size:8px; font-weight:900; line-height:1.1;">
          <span>#${data.orderNum} ${data.diningType}</span>
          <span>${idx + 1}/${data.items.length}</span>
        </div>
        <div style="font-size:10px; font-weight:900; line-height:1.15; margin-top:1px; word-break:break-all;">${mainTitle}</div>
        <div style="font-size:7.5px; font-weight:700; line-height:1.15; word-break:break-all; flex:1; overflow:hidden;">${optText || '正常'}</div>
        <div style="display:flex; justify-content:space-between; font-size:7px; font-weight:bold; border-top:1px dashed #000; padding-top:1px; line-height:1;">
          <span>日十。大里店</span>
          <span>$${it.price}</span>
        </div>
      `;

      outer.appendChild(paper);
      wrapper.appendChild(outer);

      if (paper.scrollHeight > paper.clientHeight + 1 || paper.scrollWidth > paper.clientWidth + 1) {
        hasAnyClip = true;
        paper.style.border = '2px solid #ef4444';
      }
    });
  } else {
    const itemsHtml = data.items.map(it => {
      const lines = (it.name || '').split('\n');
      const head = lines[0];
      const subs = lines.slice(1).map(s => `<div style="padding-left:6px; font-size:10px;">▸ ${s}</div>`).join('');
      const opts = it.opts.map(o => `<div style="padding-left:6px; font-size:9.5px;">${o}</div>`).join('');
      const note = it.note ? `<div style="padding-left:6px; font-size:9.5px; font-weight:bold;">※ 備註：${it.note}</div>` : '';
      return `
        <div style="margin-bottom:4px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:900;">
            <span style="word-break:break-all;">${it.qty}x ${head}</span>
            <span style="flex-shrink:0; margin-left:4px;">$${it.price}</span>
          </div>
          ${subs}${opts}${note}
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