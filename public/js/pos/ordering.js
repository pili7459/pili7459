// ---------------------------------------- [模組引入與長按計時器] 開始 ----------------------------------------
import { state } from './state.js';
import { showToast, generateItemHTML, getTodayDateString, getFormattedTime, printReceipts, printStickers } from './utils.js';
import { sendOrder, sendStatusUpdate, sendMenuUpdate } from './api.js';
import * as checkout from './checkout.js';

let menuLongPressTimer = null;
// ---------------------------------------- [模組引入與長按計時器] 結束 ----------------------------------------


// ---------------------------------------- [渲染內用桌號選單] 開始 ----------------------------------------
export function renderTableOptions() {
  const sel = document.getElementById('pos-table-number');
  if (!sel) return;
  const s = state.globalSettings || {};
  const start = parseInt(s.tableNumberStart || s['內用桌號起']) || 1;
  const end = parseInt(s.tableNumberEnd || s['內用桌號迄']) || 8;

  const currentVal = sel.value;
  sel.innerHTML = '<option value="" disabled selected>👉 請選擇桌號</option>';
  for (let i = start; i <= end; i++) {
    sel.innerHTML += `<option value="${i}">${i} 號桌</option>`;
  }
  if (currentVal && parseInt(currentVal) >= start && parseInt(currentVal) <= end) {
    sel.value = currentVal;
  }
}
// ---------------------------------------- [渲染內用桌號選單] 結束 ----------------------------------------


// ---------------------------------------- [渲染取餐時間選單] 開始 ----------------------------------------
export function renderPosTimeOptions() {
  const sel = document.getElementById('pos-pickup-time');
  if (!sel) return;

  const s = state.globalSettings || {};
  const openTime = s.openTime || s['營業時間起'] || '06:00';
  const closeTime = s.closeTime || s['營業時間迄'] || '13:00';

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  sel.innerHTML = '<option value="盡快取餐" selected>⏰ 盡快取餐</option>';

  let h = openH;
  let m = openM;
  while (h < closeH || (h === closeH && m <= closeM)) {
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    sel.innerHTML += `<option value="${timeStr}">⏰ ${timeStr}</option>`;
    m += 15;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }
}
// ---------------------------------------- [渲染取餐時間選單] 結束 ----------------------------------------


// ---------------------------------------- [切換桌號或取餐時間輸入] 開始 ----------------------------------------
export function togglePosTableOrTime() {
  const diningType = document.querySelector('input[name="posDiningType"]:checked')?.value || '內用';
  const tableSel = document.getElementById('pos-table-number');
  const timeSel = document.getElementById('pos-pickup-time');

  if (diningType === '內用') {
    if (tableSel) tableSel.style.display = 'block';
    if (timeSel) timeSel.style.display = 'none';
  } else {
    if (tableSel) tableSel.style.display = 'none';
    if (timeSel) {
      timeSel.style.display = 'block';
      renderPosTimeOptions();
    }
  }
}
window.togglePosTableOrTime = togglePosTableOrTime;
window.togglePosTableInput = togglePosTableOrTime;
// ---------------------------------------- [切換桌號或取餐時間輸入] 結束 ----------------------------------------


// ---------------------------------------- [解析客製化選項群組配置] 開始 ----------------------------------------
function getOptionGroupConfig(grp) {
  const rawTitle = (grp.title || grp.name || '').trim();
  const first2 = rawTitle.slice(0, 2);

  let type = '';
  if (first2 === '必選' || grp.type === '必選' || grp.required === true) {
    type = '必選';
  } else if (first2 === '複選' || first2 === '多選' || grp.type === '複選' || grp.type === '多選' || grp.multiple === true) {
    type = '複選';
  } else if (first2 === '單選' || grp.type === '單選') {
    type = '單選';
  } else if (rawTitle.includes('必選')) {
    type = '必選';
  } else if (rawTitle.includes('複選') || rawTitle.includes('多選') || rawTitle.includes('加料') || rawTitle.includes('配料') || rawTitle.includes('減料')) {
    type = '複選';
  } else {
    type = '單選';
  }

  const cleanTitle = rawTitle.replace(/^(必選|單選|複選|多選)[:：]?/, '').trim() || rawTitle;

  return {
    type: type,
    isRequired: (type === '必選'),
    isMultiple: (type === '複選'),
    cleanTitle: cleanTitle
  };
}
// ---------------------------------------- [解析客製化選項群組配置] 結束 ----------------------------------------


// ---------------------------------------- [渲染菜單分類導航列] 開始 ----------------------------------------
export function renderPosCategoryNav() {
  const nav = document.getElementById('pos-category-nav');
  if (!nav) return;
  nav.innerHTML = '';

  state.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `pos-cat-btn ${state.currentCategoryFilter === cat ? 'active' : ''}`;
    btn.innerText = cat;
    btn.onclick = () => {
      state.currentCategoryFilter = cat;
      renderPosCategoryNav();
      renderPosMenu();
    };
    nav.appendChild(btn);
  });
}
// ---------------------------------------- [渲染菜單分類導航列] 結束 ----------------------------------------


// ---------------------------------------- [渲染菜單餐點網格] 開始 ----------------------------------------
export function renderPosMenu() {
  const grid = document.getElementById('pos-menu-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!state.menuData || state.menuData.length === 0) {
    grid.innerHTML = '<div style="grid-column: span 2; text-align:center; padding:50px; color:#94a3b8; font-size:1.3em; font-weight:bold;">尚未載入菜單，請點右側「系統」➔「從試算表同步」</div>';
    return;
  }

  let items = state.menuData.filter(item => item.category === state.currentCategoryFilter);
  if (items.length === 0 && state.categories.length > 0) {
    state.currentCategoryFilter = state.categories[0];
    items = state.menuData.filter(item => item.category === state.currentCategoryFilter);
    renderPosCategoryNav();
  }

  items.forEach(item => {
    let isSoldOut = item.status === "售完" || (item.status && item.status.includes("完售")) || item.status === "停售";
    let hasOptions = item.options && item.options.length > 0;
    let displayTitle = item.name.split(/\r?\n/)[0];

    const card = document.createElement('div');
    card.className = `pos-menu-item ${isSoldOut ? 'sold-out' : ''}`;

    card.onclick = () => {
      if (isSoldOut) {
        showToast('⚠️ 此餐點已售完或停售！');
        return;
      }
      if (hasOptions) {
        openModal(item.id);
      } else {
        updateCart(item.id.toString(), item.id, item.name, item.price, "", 1);
        showToast(`已加入：${displayTitle}`);
      }
    };

    card.onpointerdown = (e) => startMenuLongPress(e, item.id);
    card.onpointerup = cancelMenuLongPress;
    card.onpointerleave = cancelMenuLongPress;

    let priceText = isSoldOut ? '售完' : `$${item.price}`;

    card.innerHTML = `
      <div class="pos-menu-item-title">${displayTitle}</div>
      <div class="pos-menu-item-price">${priceText}</div>
    `;
    grid.appendChild(card);
  });
}
// ---------------------------------------- [渲染菜單餐點網格] 結束 ----------------------------------------


// ---------------------------------------- [購物車數量與項目異動] 開始 ----------------------------------------
export function updateCart(cartKey, baseId, name, price, optionsText, delta) {
  if (!state.cart[cartKey]) {
    state.cart[cartKey] = { baseId, name, price, optionsText, qty: 0, isComp: false };
  }
  state.cart[cartKey].qty += delta;
  if (state.cart[cartKey].qty <= 0) {
    delete state.cart[cartKey];
  }
  updateCartUI();
}
// ---------------------------------------- [購物車數量與項目異動] 結束 ----------------------------------------


// ---------------------------------------- [切換商品招待狀態] 開始 ----------------------------------------
export function toggleItemComp(cartKey) {
  if (state.cart[cartKey]) {
    state.cart[cartKey].isComp = !state.cart[cartKey].isComp;
    updateCartUI();
  }
}
// ---------------------------------------- [切換商品招待狀態] 結束 ----------------------------------------


// ---------------------------------------- [套用促銷優惠碼] 開始 ----------------------------------------
export function applyPromoCode() {
  const inputEl = document.getElementById('promo-code-input');
  const msgEl = document.getElementById('promo-message');
  if (!inputEl) return;
  const code = inputEl.value.trim();

  if (!code) {
    state.appliedPromo = null;
    if (msgEl) msgEl.innerText = '';
    updateCartUI();
    return;
  }

  const s = state.globalSettings || {};
  const discountCode = (s.promoDiscountCode || s['打折優惠碼'] || 'vip8888').toString().trim();
  const discountRate = parseFloat(s.promoDiscountRate || s['打折折數']) || 0.9;
  const deductCode = (s.promoDeductCode || s['直扣優惠碼'] || '').toString().trim();
  const deductAmt = parseInt(s.promoDeductAmount || s['直扣金額']) || 0;

  if (code.toLowerCase() === discountCode.toLowerCase()) {
    const foldText = Math.round(discountRate * 100) % 10 === 0 ? (discountRate * 10) + '折' : (discountRate * 100) + '折';
    state.appliedPromo = { code: code, type: 'discount', rate: discountRate, text: foldText };
    if (msgEl) {
      msgEl.style.color = '#10b981';
      msgEl.innerText = `✅ 套用成功：整單 ${foldText}`;
    }
    showToast(`✅ 套用優惠碼：整單 ${foldText}`);
  } else if (deductCode && code.toLowerCase() === deductCode.toLowerCase()) {
    state.appliedPromo = { code: code, type: 'deduct', amount: deductAmt, text: `折抵$${deductAmt}` };
    if (msgEl) {
      msgEl.style.color = '#10b981';
      msgEl.innerText = `✅ 套用成功：現折 $${deductAmt}`;
    }
    showToast(`✅ 套用優惠碼：現折 $${deductAmt}`);
  } else {
    state.appliedPromo = null;
    if (msgEl) {
      msgEl.style.color = '#ef4444';
      msgEl.innerText = '❌ 優惠碼無效或過期';
    }
    showToast('⚠️ 優惠碼不存在或已停用');
  }

  updateCartUI();
}
window.applyPromoCode = applyPromoCode;
// ---------------------------------------- [套用促銷優惠碼] 結束 ----------------------------------------


// ---------------------------------------- [更新購物車介面UI] 開始 ----------------------------------------
export function updateCartUI() {
  const cartDiv = document.getElementById("pos-cart-items");
  const totalSpan = document.getElementById("pos-total-price");
  const subtotalSpan = document.getElementById("display-subtotal");
  if (!cartDiv || !totalSpan) return;

  const keys = Object.keys(state.cart);
  if (keys.length === 0) {
    cartDiv.innerHTML = '<p style="text-align:center; color:#94a3b8; font-weight:bold; margin-top:50px;">目前沒有餐點喔！</p>';
    totalSpan.innerText = "0";
    if (subtotalSpan) subtotalSpan.style.display = "none";
    return;
  }

  cartDiv.innerHTML = "";
  let subtotal = 0;

  for (let cartKey in state.cart) {
    let item = state.cart[cartKey];
    let effectiveUnitPrice = item.isComp ? 0 : item.price;
    let itemTotal = effectiveUnitPrice * item.qty;
    subtotal += itemTotal;

    let optHtml = item.optionsText ? `<div class="cart-item-options">${item.optionsText}</div>` : '';
    let safeNameStr = JSON.stringify(item.name);
    let safeOptsStr = JSON.stringify(item.optionsText || "");

    let compBtnBg = item.isComp ? "#ef4444" : "#f1f5f9";
    let compBtnColor = item.isComp ? "#fff" : "#64748b";
    let compBorder = item.isComp ? "1px solid #ef4444" : "1px solid #cbd5e1";

    let priceDisplay = item.isComp 
      ? `<span style="color:#ef4444; font-weight:900; font-size:1.2em;">$0</span>` 
      : `$${itemTotal}`;

    cartDiv.innerHTML += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div style="flex:1; padding-right:8px;">
            <div style="font-size:1.15em; font-weight:800; color:#0f172a;">${item.name.split('\n')[0]}</div>
            ${optHtml}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" onclick="toggleItemComp('${cartKey}')" style="background:${compBtnBg}; color:${compBtnColor}; border:${compBorder}; padding:5px 8px; border-radius:6px; font-weight:bold; font-size:0.85em; cursor:pointer; white-space:nowrap;">🎁 招待</button>
            <div class="qty-control">
              <button class="qty-btn" onclick='updateCart("${cartKey}", ${item.baseId}, ${safeNameStr}, ${item.price}, ${safeOptsStr}, -1)'>-</button>
              <span class="qty-number">${item.qty}</span>
              <button class="qty-btn" onclick='updateCart("${cartKey}", ${item.baseId}, ${safeNameStr}, ${item.price}, ${safeOptsStr}, 1)'>+</button>
            </div>
            <div style="font-weight: 900; font-size: 1.15em; color:#ea580c; min-width: 50px; text-align: right;">${priceDisplay}</div>
          </div>
        </div>
      </div>`;
  }

  let finalTotal = subtotal;
  if (state.appliedPromo && subtotal > 0) {
    let discountAmt = 0;
    if (state.appliedPromo.type === 'discount') {
      discountAmt = Math.round(subtotal * (1 - state.appliedPromo.rate));
    } else if (state.appliedPromo.type === 'deduct') {
      discountAmt = Math.min(subtotal, state.appliedPromo.amount);
    }
    finalTotal = Math.max(0, subtotal - discountAmt);

    if (subtotalSpan) {
      subtotalSpan.style.display = "inline";
      subtotalSpan.innerText = "$" + subtotal;
    }
  } else {
    if (subtotalSpan) subtotalSpan.style.display = "none";
  }

  totalSpan.innerText = finalTotal;
}
// ---------------------------------------- [更新購物車介面UI] 結束 ----------------------------------------


// ---------------------------------------- [點餐選項視窗開啟與關閉] 開始 ----------------------------------------
export function handleModalOverlayClick(e) {
  if (e.target.id === 'option-modal') {
    closeModal();
  }
}

export function openModal(itemId) {
  const item = state.menuData.find(i => i.id === itemId);
  if (!item) return;
  state.currentModalItem = item;

  document.getElementById("modal-item-name").innerText = item.name;
  document.getElementById("modal-base-price").innerText = `$${item.price}`;
  const container = document.getElementById("modal-options-container");
  container.innerHTML = "";

  (item.options || []).forEach((grp, gIdx) => {
    const config = getOptionGroupConfig(grp);
    const isRequired = config.isRequired;
    const isMultiple = config.isMultiple;
    const cleanTitle = config.cleanTitle;

    let badgeText = config.type;
    let badgeColor = isRequired ? '#ef4444' : (isMultiple ? '#10b981' : '#3b82f6');

    let grpHtml = `
      <div class="option-group" data-group-index="${gIdx}" data-required="${isRequired}" data-clean-title="${cleanTitle}">
        <div class="option-group-title" style="display:flex; justify-content:space-between; align-items:center;">
          <span>${cleanTitle}</span>
          <span style="font-size:0.8em; padding:2px 8px; border-radius:12px; background:${badgeColor}; color:#fff; font-weight:bold;">${badgeText}</span>
        </div>`;

    grp.items.forEach((opt, oIdx) => {
      let optPrice = opt.price ? ` (+$${opt.price})` : "";
      let inputType = isMultiple ? "checkbox" : "radio";
      let isChecked = (isRequired && oIdx === 0) ? "checked" : "";

      grpHtml += `
        <div class="option-item">
          <label>
            <input type="${inputType}" name="modal_group_${gIdx}" value="${opt.name}" data-price="${opt.price || 0}" ${isChecked} onchange="calcModalPrice()">
            ${opt.name}
          </label>
          <span class="option-price">${optPrice}</span>
        </div>`;
    });
    grpHtml += `</div>`;
    container.innerHTML += grpHtml;
  });

  calcModalPrice();
  const modalEl = document.getElementById("option-modal");
  modalEl.style.display = "flex";
  modalEl.onclick = handleModalOverlayClick;
}

export function closeModal() {
  document.getElementById("option-modal").style.display = "none";
  state.currentModalItem = null;
}
// ---------------------------------------- [點餐選項視窗開啟與關閉] 結束 ----------------------------------------


// ---------------------------------------- [選項即時計價與確認加入] 開始 ----------------------------------------
export function calcModalPrice() {
  if (!state.currentModalItem) return;
  let total = state.currentModalItem.price;
  document.querySelectorAll("#modal-options-container input:checked").forEach(inp => {
    total += parseInt(inp.getAttribute("data-price") || 0);
  });
  document.getElementById("modal-calc-price").innerText = total;
}

export function confirmOptions() {
  if (!state.currentModalItem) return;

  const groups = document.querySelectorAll("#modal-options-container .option-group");
  for (let grpEl of groups) {
    const isRequired = grpEl.getAttribute("data-required") === "true";
    if (isRequired) {
      const hasChecked = grpEl.querySelector("input:checked");
      if (!hasChecked) {
        const title = grpEl.getAttribute("data-clean-title") || '必選項目';
        showToast(`⚠️ 請選擇【${title}】！`);
        return;
      }
    }
  }

  let selected = [];
  let extraPrice = 0;
  document.querySelectorAll("#modal-options-container input:checked").forEach(inp => {
    let p = parseInt(inp.getAttribute("data-price") || 0);
    extraPrice += p;
    if (p > 0) {
      selected.push(`${inp.value} +$${p}`);
    } else {
      selected.push(inp.value);
    }
  });

  let optionsText = selected.join(', ');
  let cartKey = `${state.currentModalItem.id}_${optionsText}`;
  let itemPrice = state.currentModalItem.price + extraPrice;

  updateCart(cartKey, state.currentModalItem.id, state.currentModalItem.name, itemPrice, optionsText, 1);
  closeModal();
}
// ---------------------------------------- [選項即時計價與確認加入] 結束 ----------------------------------------


// ---------------------------------------- [建構訂單文字與總額] 開始 ----------------------------------------
function buildOrderDetailsPayload() {
  let details = "";
  let subtotal = 0;
  let nl = "\n";

  for (let k in state.cart) {
    let item = state.cart[k];
    let effectivePrice = item.isComp ? 0 : item.price;
    let itemTotal = effectivePrice * item.qty;
    subtotal += itemTotal;

    let compTag = item.isComp ? " (🎁招待)" : "";
    let mainName = item.name.split('\n')[0];

    details += `${item.qty}x ${mainName}${compTag} ::: $${itemTotal}${nl}`;

    let subLines = item.name.split('\n').slice(1);
    subLines.forEach(sub => {
      details += `  - ${sub}${nl}`;
    });

    if (item.optionsText) {
      details += `  ✬ ${item.optionsText}${nl}`;
    }
  }

  details += `----------------------${nl}`;
  details += `小計 ::: $${subtotal}${nl}`;

  let finalTotal = subtotal;
  if (state.appliedPromo && subtotal > 0) {
    let discountAmt = 0;
    if (state.appliedPromo.type === 'discount') {
      discountAmt = Math.round(subtotal * (1 - state.appliedPromo.rate));
    } else if (state.appliedPromo.type === 'deduct') {
      discountAmt = Math.min(subtotal, state.appliedPromo.amount);
    }
    finalTotal = Math.max(0, subtotal - discountAmt);
    details += `🎟️ 優惠折抵 (${state.appliedPromo.code}) ::: -$${discountAmt}${nl}`;
    details += `----------------------${nl}`;
  }

  details += `總額 ::: $${finalTotal}${nl}`;

  return { details, finalTotal };
}
// ---------------------------------------- [建構訂單文字與總額] 結束 ----------------------------------------


// ---------------------------------------- [提交現場未結訂單] 開始 ----------------------------------------
export async function submitPosUnpaidOrder() {
  if (Object.keys(state.cart).length === 0) {
    showToast("⚠️ 購物車是空的！");
    return;
  }
  let diningType = document.querySelector('input[name="posDiningType"]:checked')?.value || '內用';
  let tableNum = document.getElementById("pos-table-number")?.value || '';
  let pickupTime = document.getElementById("pos-pickup-time")?.value || '盡快取餐';

  if (diningType === "內用" && !tableNum) {
    showToast("⚠️ 請選擇內用桌號！");
    document.getElementById("pos-table-number").focus();
    return;
  }

  const { details, finalTotal } = buildOrderDetailsPayload();
  let finalDiningType = diningType === "內用" 
    ? `內用(桌號:${tableNum})` 
    : `${diningType} (${pickupTime})`;

  showToast("🔄 訂單傳送中...", 2000);

  try {
    let backendData = {
      diningType: finalDiningType,
      tableNumber: diningType === '內用' ? tableNum : '',
      customerName: "現場客",
      customerPhone: "",
      detailsText: details,
      totalAmount: finalTotal,
      orderDate: getTodayDateString(),
      status: "👩‍🍳 已接單"
    };

    let res = await sendOrder(backendData);
    let newOrderNum = (res && res.orderNumber) ? res.orderNumber : ("OD" + Date.now().toString().slice(-3));

    let newOrder = {
      id: Date.now(),
      isPosDirect: false,
      orderNumber: newOrderNum,
      orderDate: getTodayDateString(),
      time: getFormattedTime(),
      diningType: finalDiningType,
      customerName: "現場客",
      detailsText: details,
      totalAmount: finalTotal,
      status: "👩‍🍳 已接單",
      paymentStatus: "尚未結帳"
    };

    state.allOrders.unshift(newOrder);
    await sendStatusUpdate(newOrderNum, "👩‍🍳 已接單", getTodayDateString());

    window.updateBadges();
    window.switchTab('unpaid');

    printReceipts(newOrderNum);
    printStickers(newOrderNum);
    state.autoPrintedOrders.push(newOrderNum);
    localStorage.setItem('autoPrintedOrders', JSON.stringify(state.autoPrintedOrders));

    state.cart = {};
    state.appliedPromo = null;
    if (document.getElementById("promo-code-input")) document.getElementById("promo-code-input").value = "";
    if (document.getElementById("promo-message")) document.getElementById("promo-message").innerText = "";
    updateCartUI();
    if (document.getElementById("pos-table-number")) document.getElementById("pos-table-number").value = "";
    showToast(`✅ 已送單！單號：#${newOrderNum}`);
  } catch (err) {
    showToast("❌ 送單失敗，請檢查網路連線");
  }
}
// ---------------------------------------- [提交現場未結訂單] 結束 ----------------------------------------


// ---------------------------------------- [準備現場點餐直接結帳] 開始 ----------------------------------------
export function preparePosCheckout() {
  if (Object.keys(state.cart).length === 0) {
    showToast("⚠️ 購物車是空的！");
    return;
  }
  let diningType = document.querySelector('input[name="posDiningType"]:checked')?.value || '內用';
  let tableNum = document.getElementById("pos-table-number")?.value || '';
  let pickupTime = document.getElementById("pos-pickup-time")?.value || '盡快取餐';

  if (diningType === "內用" && !tableNum) {
    showToast("⚠️ 請選擇內用桌號！");
    return;
  }

  const { details, finalTotal } = buildOrderDetailsPayload();
  let finalDiningType = diningType === "內用" 
    ? `內用(桌號:${tableNum})` 
    : `${diningType} (${pickupTime})`;

  const directOrder = {
    id: 'POS_DIRECT_' + Date.now(),
    isPosDirect: true,
    orderNumber: "現場單",
    orderDate: getTodayDateString(),
    time: getFormattedTime(),
    diningType: finalDiningType,
    customerName: "現場客",
    detailsText: details,
    totalAmount: finalTotal,
    status: "👩‍🍳 已接單",
    paymentStatus: "尚未結帳"
  };

  state.selectedOrder = directOrder;

  if (window.switchMainView) {
    window.switchMainView('checkout');
  }

  const dispTotal = document.getElementById("display-total");
  if (dispTotal) dispTotal.innerText = `$${finalTotal}`;
  state.tenderedAmount = '';
  if (typeof checkout.updateCalcUI === 'function') {
    checkout.updateCalcUI();
  }

  if (window.updateOrderDetails) {
    window.updateOrderDetails(directOrder);
  }

  document.querySelectorAll('.order-card').forEach(c => c.classList.remove('selected'));
}
// ---------------------------------------- [準備現場點餐直接結帳] 結束 ----------------------------------------


// ---------------------------------------- [菜單長按狀態修改] 開始 ----------------------------------------
export function startMenuLongPress(e, itemId) {
  menuLongPressTimer = setTimeout(() => {
    openMenuStatusModal(itemId);
  }, 1000);
}

export function cancelMenuLongPress() {
  clearTimeout(menuLongPressTimer);
}

export function openMenuStatusModal(itemId) {
  state.msTargetItemId = itemId;
  const item = state.menuData.find(i => i.id === itemId);
  if (!item) return;
  document.getElementById('ms-title').innerText = `修改狀態：${item.name.split('\n')[0]}`;
  setMsMode(item.status || '上架');
  document.getElementById('menu-status-modal').style.display = 'flex';
}

export function setMsMode(mode) {
  state.msMode = mode;
  ['btn-ms-on', 'btn-ms-soldout', 'btn-ms-off'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.background = '#f1f5f9';
      el.style.color = '#334155';
    }
  });
  if (mode === '上架') {
    document.getElementById('btn-ms-on').style.background = '#10b981';
    document.getElementById('btn-ms-on').style.color = 'white';
  } else if (mode === '完售' || mode === '售完') {
    document.getElementById('btn-ms-soldout').style.background = '#f59e0b';
    document.getElementById('btn-ms-soldout').style.color = 'white';
  } else {
    document.getElementById('btn-ms-off').style.background = '#ef4444';
    document.getElementById('btn-ms-off').style.color = 'white';
  }
}

export async function saveMenuStatus() {
  const item = state.menuData.find(i => i.id === state.msTargetItemId);
  if (item) {
    item.status = state.msMode;
    await sendMenuUpdate(state.menuData);
    renderPosMenu();
    showToast(`✅ 已將「${item.name.split('\n')[0]}」狀態修改為【${state.msMode}】`);
  }
  document.getElementById('menu-status-modal').style.display = 'none';
}
// ---------------------------------------- [菜單長按狀態修改] 結束 ----------------------------------------