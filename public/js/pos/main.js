// ---------------------------------------- [模組引入與輔助函式] 開始 ----------------------------------------
import { state } from './state.js';
import * as api from './api.js';
import * as utils from './utils.js';
import * as ordering from './ordering.js';
import * as checkout from './checkout.js';
import * as system from './system.js';

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function cleanNum(num) {
  if (!num) return '';
  return String(num).replace(/[^0-9]/g, '').padStart(3, '0');
}
// ---------------------------------------- [模組引入與輔助函式] 結束 ----------------------------------------


// ---------------------------------------- [工具列結帳點擊導航] 開始 ----------------------------------------
window.handleToolbarCheckout = function() {
  if (state.currentView === 'ordering' && Object.keys(state.cart || {}).length > 0) {
    ordering.preparePosCheckout();
  } else {
    switchMainView('checkout');
  }
};

window.toggleToolbarPage = function(page) {
  const mainPage = document.getElementById('toolbar-page-main');
  const morePage = document.getElementById('toolbar-page-more');
  if (!mainPage || !morePage) return;
  if (page === 'more') {
    mainPage.style.display = 'none';
    morePage.style.display = 'flex';
  } else {
    morePage.style.display = 'none';
    mainPage.style.display = 'flex';
  }
};
// ---------------------------------------- [工具列結帳點擊導航] 結束 ----------------------------------------


// ---------------------------------------- [收支數字鍵盤與常用詞] 開始 ----------------------------------------
const txAmounts = { expense: '', income: '' };

window.inputTxNum = function(type, numStr) {
  txAmounts[type] += numStr;
  updateTxDisplay(type);
};

window.clearTxNum = function(type) {
  txAmounts[type] = '';
  updateTxDisplay(type);
};

window.setTxAmount = function(type, valStr) {
  txAmounts[type] = valStr;
  updateTxDisplay(type);
};

function updateTxDisplay(type) {
  const el = document.getElementById(`tx-amount-${type}`);
  if (el) {
    el.innerText = `$${txAmounts[type] || '0'}`;
  }
}

function resetAllQuickWords() {
  ['expense', 'income'].forEach(type => {
    const qwArea = document.getElementById(`tx-qw-area-${type}`);
    const numpadArea = document.getElementById(`tx-numpad-area-${type}`);
    if (qwArea && numpadArea) {
      qwArea.style.display = 'none';
      numpadArea.style.display = 'flex';
    }
  });
}

window.toggleTxQuickWords = function(type) {
  const qwArea = document.getElementById(`tx-qw-area-${type}`);
  const numpadArea = document.getElementById(`tx-numpad-area-${type}`);
  if (!qwArea || !numpadArea) return;

  if (qwArea.style.display === 'flex') {
    qwArea.style.display = 'none';
    numpadArea.style.display = 'flex';
  } else {
    renderTxQuickWords(type);
    qwArea.style.display = 'flex';
    numpadArea.style.display = 'none';
  }
};

function renderTxQuickWords(type) {
  const grid = document.getElementById(`quick-words-grid-${type}`);
  if (!grid) return;
  grid.innerHTML = '';
  const list = type === 'income' ? state.incomeQuickWordsList : state.expenseQuickWordsList;
  (list || []).forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'qw-btn';
    btn.innerText = w;
    btn.onclick = () => {
      const noteInput = document.getElementById(`tx-note-${type}`);
      if (noteInput) noteInput.value = w;
      window.toggleTxQuickWords(type);
    };
    grid.appendChild(btn);
  });
}

window.submitTxDirect = async function(type) {
  const amt = parseInt(txAmounts[type], 10);
  if (!amt || amt <= 0) {
    utils.showToast('⚠️ 請先輸入金額');
    return;
  }
  const noteInput = document.getElementById(`tx-note-${type}`);
  const note = (noteInput ? noteInput.value.trim() : '') || (type === 'expense' ? '日常支出' : '日常收入');

  try {
    await api.sendTransaction(type, amt, note);
    utils.showToast(`✅ 已記錄${type === 'expense' ? '支出' : '收入'} $${amt}`);
    txAmounts[type] = '';
    updateTxDisplay(type);
    if (noteInput) noteInput.value = '';
    await loadOrders();
  } catch (e) {
    utils.showToast('❌ 記帳失敗');
  }
};
// ---------------------------------------- [收支數字鍵盤與常用詞] 結束 ----------------------------------------


// ---------------------------------------- [更新導航列按鈕高亮] 開始 ----------------------------------------
function updateNavButtonsActive(activeView) {
  const navMap = {
    'ordering': 'btn-nav-ordering',
    'checkout': 'btn-nav-checkout',
    'tx': 'btn-nav-tx',
    'chat': 'btn-nav-chat',
    'system': 'btn-nav-system'
  };

  document.querySelectorAll('.toolbar-panel .tool-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtnId = navMap[activeView];
  if (activeBtnId) {
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');
  }
}
// ---------------------------------------- [更新導航列按鈕高亮] 結束 ----------------------------------------


// ---------------------------------------- [訂單頁籤切換與版面配置] 開始 ----------------------------------------
export function switchTab(tabName) {
  state.currentTab = tabName;
  ['new-order', 'unpaid', 'tomorrow', 'history', 'tx'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.className = (t === tabName) ? 'tab active' : 'tab';
  });

  // 🌟 手動切換頁籤時清空餐點清單與結帳計算機
  clearOrderDetails();

  if (state.currentView !== 'checkout') {
    switchMainView('checkout');
  } else {
    adjustCheckoutLayoutByTab();
  }

  renderOrderList();
}

function clearOrderDetails() {
  state.selectedOrder = null;
  state.tenderedAmount = '';

  const rightOrderNum = document.getElementById("right-order-num");
  if (rightOrderNum) rightOrderNum.innerText = "👉 餐點清單";

  const sel = document.getElementById("pos-status-select");
  if (sel) sel.style.display = "none";

  const detailsContent = document.getElementById("right-details-content");
  if (detailsContent) {
    detailsContent.innerHTML = '<div class="empty-state" id="details-empty-state">尚未選擇訂單</div>';
  }

  const dispTotal = document.getElementById("display-total");
  if (dispTotal) dispTotal.innerText = "$0";

  if (typeof checkout.updateCalcUI === 'function') {
    checkout.updateCalcUI();
  }
}

function adjustCheckoutLayoutByTab() {
  const middlePanel = document.getElementById('pos-middle-panel');
  const rightPanel = document.getElementById('pos-right-panel');
  if (!middlePanel || !rightPanel) return;

  const isWideMode = (state.currentTab === 'history' || state.currentTab === 'tx');

  if (isWideMode) {
    middlePanel.style.display = 'none';
    rightPanel.style.width = '100%';
  } else {
    middlePanel.style.display = 'flex';
    middlePanel.style.width = '50%';
    rightPanel.style.width = 'auto';
  }
}
// ---------------------------------------- [訂單頁籤切換與版面配置] 結束 ----------------------------------------


// ---------------------------------------- [更新頁籤未讀角標與營收] 開始 ----------------------------------------
export function updateBadges() {
  let newCount = 0;
  let unpaidCount = 0;
  let tomorrowCount = 0;
  let revenue = 0;
  const today = utils.getTodayDateString();
  const tomorrow = getTomorrowDateString();

  (state.allOrders || []).forEach(o => {
    let isCancelled = (o.status || '').includes("取消") || (o.paymentStatus || '').includes("取消");
    let isTx = (o.diningType || '').includes("支出") || (o.diningType || '').includes("收入");
    let isNew = (o.status || '').includes("新訂單");
    let isCompleted = isOrderFullyCompleted(o);

    if (o.orderDate === today) {
      if (isNew && !isCancelled && !isTx) newCount++;
      if (!isNew && !isCancelled && !isTx && !isCompleted) unpaidCount++;

      if ((o.paymentStatus || '').includes("已結帳") && !isCancelled) {
        if ((o.diningType || '').includes('支出')) revenue -= parseInt(o.totalAmount || 0);
        else revenue += parseInt(o.totalAmount || 0);
      }
    }

    if (o.orderDate === tomorrow && !isCancelled && !isTx) {
      tomorrowCount++;
    }
  });

  const badgeNew = document.getElementById('badge-new-order');
  const badgeUnpaid = document.getElementById('badge-unpaid');
  const badgeTomorrow = document.getElementById('badge-tomorrow');

  if (badgeNew) {
    badgeNew.innerText = newCount;
    badgeNew.style.display = newCount > 0 ? 'inline-block' : 'none';
  }
  if (badgeUnpaid) {
    badgeUnpaid.innerText = unpaidCount;
    badgeUnpaid.style.display = unpaidCount > 0 ? 'inline-block' : 'none';
  }
  if (badgeTomorrow) {
    badgeTomorrow.innerText = tomorrowCount;
    badgeTomorrow.style.display = tomorrowCount > 0 ? 'inline-block' : 'none';
  }
  const revEl = document.getElementById('daily-revenue');
  if (revEl) revEl.innerText = `本日營收: $${revenue}`;
}
// ---------------------------------------- [更新頁籤未讀角標與營收] 結束 ----------------------------------------


// ---------------------------------------- [渲染左側訂單列表] 開始 ----------------------------------------
export function renderOrderList() {
  const listDiv = document.getElementById('order-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  const today = utils.getTodayDateString();
  const tomorrow = getTomorrowDateString();

  const filtered = (state.allOrders || []).filter(order => {
    let isCancelled = (order.status || '').includes("取消") || (order.paymentStatus || '').includes("取消");
    let isTx = (order.diningType || '').includes("支出") || (order.diningType || '').includes("收入");
    let isNew = (order.status || '').includes("新訂單");
    let isCompleted = isOrderFullyCompleted(order);

    if (state.currentTab === 'tomorrow') {
      return (order.orderDate === tomorrow) && !isCancelled && !isTx;
    }

    if (order.orderDate && order.orderDate !== today) return false;

    if (state.currentTab === 'new-order') return isNew && !isCancelled && !isTx;
    if (state.currentTab === 'unpaid') return !isNew && !isCancelled && !isTx && !isCompleted;
    if (state.currentTab === 'history') return isCompleted || isCancelled;
    if (state.currentTab === 'tx') return isTx;
    return false;
  });

  if (filtered.length === 0) {
    const emptyTip = state.currentTab === 'tomorrow' ? '明天目前沒有預約訂單喔！' : '今天這個分類沒有紀錄喔！';
    listDiv.innerHTML = `<div class="empty-state">${emptyTip}</div>`;
    return;
  }

  filtered.forEach(order => {
    const isTx = (order.diningType || '').includes("支出") || (order.diningType || '').includes("收入");
    const isSelected = state.selectedOrder && (state.selectedOrder.id === order.id || (order.orderNumber && cleanNum(state.selectedOrder.orderNumber) === cleanNum(order.orderNumber))) ? 'selected' : '';
    const isPaid = (order.paymentStatus || '').includes("已結帳") ? 'paid' : '';
    const isCancelled = (order.status || '').includes("取消") ? 'cancelled-card' : '';
    const isCooked = (order.status || '').includes("完成");
    const isNew = (order.status || '').includes("新訂單");
    const isPickup = (order.diningType || '').includes("自取");
    const isPickedUp = order.pickupStatus === '✅ 已取餐';

    let badge = '';
    let actionBtn = '';
    let headerTitle = '';

    if (isTx) {
      const isExpense = order.diningType.includes('支出');
      headerTitle = `<span class="order-type" style="background:${isExpense ? '#fee2e2' : '#eff6ff'}; color:${isExpense ? '#dc2626' : '#2563eb'}; font-size:1.05em; padding:6px 14px; border-radius:8px;">${isExpense ? '💸 支出項目' : '💰 收入項目'}</span>`;
      badge = isExpense ? `<span style="color:#ef4444; font-weight:bold;">💸 支出</span>` : `<span style="color:#3b82f6; font-weight:bold;">💰 收入</span>`;
    } else if (isCancelled) {
      headerTitle = `<span class="order-num">#${order.orderNumber}</span>`;
      badge = `<span style="background:#fee2e2; color:#dc2626; padding:4px 8px; border-radius:6px; font-weight:900;">❌ 已取消</span>`;
    } else if (isNew) {
      headerTitle = `<span class="order-num">#${order.orderNumber}</span>`;
      badge = `<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:6px; font-weight:bold;">⏳ 待確認接單</span>`;
      actionBtn = `
        <button type="button" onclick="acceptNewOrder('${order.orderNumber}', event)" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">
          👩‍🍳 點此接單
        </button>
      `;
    } else {
      headerTitle = `<span class="order-num">#${order.orderNumber}</span>`;
      let pay = isPaid 
        ? `<span style="background:#d1fae5; color:#059669; padding:4px 8px; border-radius:6px; font-weight:bold; margin-right:4px;">✅ 已結</span>` 
        : `<span style="background:#fee2e2; color:#dc2626; padding:4px 8px; border-radius:6px; font-weight:bold; margin-right:4px;">⚠️ 未結</span>`;
      let cook = isCooked 
        ? `<span style="background:#dbeafe; color:#2563eb; padding:4px 8px; border-radius:6px; font-weight:bold; margin-right:4px;">🍔 已出餐</span>` 
        : `<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:6px; font-weight:bold; margin-right:4px;">待出餐</span>`;

      let pickupTag = '';
      if (isPickup) {
        pickupTag = isPickedUp
          ? `<span style="background:#d1fae5; color:#059669; padding:4px 8px; border-radius:6px; font-weight:bold;">📦 已取</span>`
          : `<span style="background:#f1f5f9; color:#64748b; padding:4px 8px; border-radius:6px; font-weight:bold;">未取餐</span>`;
      }

      badge = `${pay}${cook}${pickupTag}`;

      actionBtn = `
        <button type="button" class="cook-checkbox-btn ${isCooked ? 'checked' : ''}" 
                onclick="toggleCookStatus('${order.id || order.orderNumber}', event)" 
                title="${isCooked ? '點擊變更為待出餐' : '點擊標記為已出餐'}">
          ${isCooked ? '✔' : ''}
        </button>
      `;
    }

    let tomorrowBadge = (order.orderDate === tomorrow) ? `<span style="background:#ede9fe; color:#6d28d9; padding:2px 6px; border-radius:6px; font-size:0.8em; font-weight:900; margin-left:6px;">📅 明日預約</span>` : '';

    const card = document.createElement('div');
    card.className = `order-card ${isSelected} ${isPaid} ${isCancelled}`;
    
    card.onclick = (e) => {
      if (e.target.closest('button') || e.target.closest('.cook-checkbox-btn')) {
        return;
      }
      selectOrder(order);
    };

    const typeRightHtml = isTx ? '' : `<span class="order-type">${order.diningType}</span>`;

    card.innerHTML = `
      <div class="order-meta">
        <div style="display:flex; align-items:center;">
          ${actionBtn}
          ${headerTitle}
          ${tomorrowBadge}
        </div>
        ${typeRightHtml}
      </div>
      <div style="font-size:0.85em; color:#64748b; font-weight:bold; margin-top:4px;">${order.time} | ${order.customerName || (isTx ? '收支紀錄' : '現場客')}</div>
      <div style="display:flex; justify-content:space-between; margin-top:12px; align-items:center;">
        <span style="font-size:0.9em;">${badge}</span>
        <span class="order-price">$${order.totalAmount}</span>
      </div>`;
    listDiv.appendChild(card);
  });
}
// ---------------------------------------- [渲染左側訂單列表] 結束 ----------------------------------------


// ---------------------------------------- [更新右側訂單明細內容] 開始 ----------------------------------------
export function updateOrderDetails(order) {
  state.selectedOrder = order;

  const isTx = (order.diningType || '').includes("支出") || (order.diningType || '').includes("收入");
  const isDirect = order.isPosDirect === true;
  const rightOrderNum = document.getElementById("right-order-num");

  if (rightOrderNum) {
    if (isDirect) {
      rightOrderNum.innerText = `📝 現場點餐結帳`;
    } else if (isTx) {
      rightOrderNum.innerText = `${order.diningType} 明細`;
    } else {
      rightOrderNum.innerText = `#${order.orderNumber} 餐點明細`;
    }
  }

  const sel = document.getElementById("pos-status-select");
  if (sel) {
    sel.style.display = (isTx || isDirect) ? "none" : "inline-block";
    sel.value = order.status || '👩‍🍳 已接單';
  }

  const isPickup = (order.diningType || '').includes("自取");
  const isPaid = (order.paymentStatus || '').includes("已結帳");
  const isCooked = (order.status || '').includes("完成");
  const isPickedUp = order.pickupStatus === '✅ 已取餐';

  let pickupBtnHtml = '';
  if (isPickup && isPaid && isCooked && !isTx && !isDirect) {
    pickupBtnHtml = `
      <button type="button" onclick="togglePickupStatus('${order.orderNumber}', event)" style="background:${isPickedUp ? '#059669' : '#10b981'}; color:white; border:none; padding:12px 10px; border-radius:10px; font-weight:800; font-size:1.05em; cursor:pointer; flex:1; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${isPickedUp ? '📦 已取餐(撤銷)' : '📦 客人已取餐'}
      </button>
    `;
  }

  const isNew = (order.status || '').includes("新訂單");
  const acceptBtnHtml = (isNew && !isTx && !isDirect) ? `
    <button type="button" onclick="acceptNewOrder('${order.orderNumber}', event)" style="background:#10b981; color:white; border:none; padding:10px 16px; border-radius:8px; font-weight:bold; font-size:1.1em; cursor:pointer; margin-bottom:12px;">
      👩‍🍳 點此接受新訂單
    </button>
  ` : '';

  const detailsContent = document.getElementById("right-details-content");
  if (detailsContent) {
    detailsContent.style.overflow = "hidden";
    detailsContent.style.display = "flex";
    detailsContent.style.flexDirection = "column";
    detailsContent.style.padding = "20px 20px 15px 20px";

    const bottomButtonsHtml = (isTx || isDirect) ? '' : `
      <div style="flex-shrink: 0; padding-top: 14px; margin-top: 10px; border-top: 2px dashed #cbd5e1; background: #ffffff;">
        <div style="display:flex; gap:8px; align-items:center;">
          ${pickupBtnHtml}
          <button class="reprint-btn" style="background:#3b82f6; flex:1; padding:12px 10px; border:none; border-radius:10px; color:white; font-weight:800; font-size:1.05em; cursor:pointer; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="utils.printReceipts('${order.orderNumber}')">🖨️ 補印小白單</button>
          <button class="reprint-btn" style="background:#f59e0b; flex:1; padding:12px 10px; border:none; border-radius:10px; color:white; font-weight:800; font-size:1.05em; cursor:pointer; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="utils.printStickers('${order.orderNumber}')">🏷️ 補印標籤貼紙</button>
        </div>
      </div>
    `;

    detailsContent.innerHTML = `
      <div style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 6px;">
        <div class="detail-special" style="font-size:1.15em; font-weight:bold; margin-bottom:12px;">🍽️ ${isTx ? '類別' : '用餐方式'}：${order.diningType}</div>
        ${acceptBtnHtml}
        ${window.renderOrderDetailsHtml(order.detailsText)}
      </div>
      ${bottomButtonsHtml}`;
  }

  const dispTotal = document.getElementById("display-total");
  if (dispTotal) dispTotal.innerText = `$${Math.abs(order.totalAmount)}`;
}
// ---------------------------------------- [更新右側訂單明細內容] 結束 ----------------------------------------


// ---------------------------------------- [選擇訂單項目] 開始 ----------------------------------------
function selectOrder(order) {
  const isPaid = (order.paymentStatus || '').includes("已結帳");

  if (state.currentView !== 'checkout') {
    switchMainView('checkout');
  }

  updateOrderDetails(order);

  if (!isPaid) {
    state.tenderedAmount = '';
    if (typeof checkout.updateCalcUI === 'function') {
      checkout.updateCalcUI();
    }
  }

  renderOrderList();
}
// ---------------------------------------- [選擇訂單項目] 結束 ----------------------------------------


// ---------------------------------------- [主畫面視圖切換] 開始 ----------------------------------------
export function switchMainView(viewName) {
  state.currentView = viewName;

  resetAllQuickWords();
  updateNavButtonsActive(viewName);

  ['checkout', 'chat', 'ordering', 'system'].forEach(v => {
    const el = document.getElementById(`${v}-main-container`);
    if (el) el.style.display = 'none';
  });
  const txSplitEl = document.getElementById('tx-split-container');
  if (txSplitEl) txSplitEl.style.display = 'none';

  const leftPanel = document.getElementById('pos-left-panel');
  const mainWrapper = document.getElementById('pos-main-wrapper');

  if (viewName === 'checkout') {
    if (leftPanel) leftPanel.style.display = 'flex';
    if (mainWrapper) mainWrapper.style.width = 'auto';

    const checkoutEl = document.getElementById('checkout-main-container');
    if (checkoutEl) checkoutEl.style.display = 'flex';

    adjustCheckoutLayoutByTab();
    checkout.setAppMode('checkout');

  } else if (viewName === 'tx') {
    if (leftPanel) leftPanel.style.display = 'none';
    if (mainWrapper) mainWrapper.style.width = '100%';
    if (txSplitEl) txSplitEl.style.display = 'flex';

  } else if (viewName === 'ordering') {
    if (leftPanel) leftPanel.style.display = 'none';
    if (mainWrapper) mainWrapper.style.width = '100%';
    const orderEl = document.getElementById('ordering-main-container');
    if (orderEl) orderEl.style.display = 'flex';
    ordering.renderPosCategoryNav();
    ordering.renderPosMenu();
    ordering.renderTableOptions();

  } else if (viewName === 'system') {
    if (leftPanel) leftPanel.style.display = 'none';
    if (mainWrapper) mainWrapper.style.width = '100%';
    const sysEl = document.getElementById('system-main-container');
    if (sysEl) sysEl.style.display = 'flex';

  } else if (viewName === 'chat') {
    if (leftPanel) leftPanel.style.display = 'none';
    if (mainWrapper) mainWrapper.style.width = '100%';
    const chatEl = document.getElementById('chat-main-container');
    if (chatEl) chatEl.style.display = 'flex';
    resetChatSelection();
    renderChatList();
  }
}
// ---------------------------------------- [主畫面視圖切換] 結束 ----------------------------------------


// ---------------------------------------- [接受新訂單] 開始 ----------------------------------------
export async function acceptNewOrder(orderNumber, event, isAuto = false) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const targetNum = cleanNum(orderNumber);
  const order = state.allOrders.find(o => cleanNum(o.orderNumber) === targetNum || String(o.orderNumber) === String(orderNumber));
  if (!order) return;

  try {
    await fetch('/api/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateStatus',
        orderNumber: String(order.orderNumber),
        newStatus: '👩‍🍳 已接單',
        orderDate: order.orderDate || utils.getTodayDateString()
      })
    });
    order.status = '👩‍🍳 已接單';
    
    utils.showToast(`🔔 訂單 #${order.orderNumber} 已接單`);

    updateBadges();
    renderOrderList();
    if (state.selectedOrder && cleanNum(state.selectedOrder.orderNumber) === targetNum) {
      updateOrderDetails(order);
    }
  } catch (e) {
    if (!isAuto) utils.showToast('❌ 接單失敗');
  }
}
// ---------------------------------------- [接受新訂單] 結束 ----------------------------------------


// ---------------------------------------- [自動接單計時器] 開始 ----------------------------------------
const orderArrivedTimeMap = {};

function checkAutoAcceptTimer() {
  const isAuto = state.globalSettings && (state.globalSettings.autoAccept === '開啟' || state.globalSettings['自動接單模式'] === '開啟');
  if (!isAuto) return;

  const now = Date.now();
  (state.allOrders || []).forEach(order => {
    const isPosOrder = order.customerName === '現場客' || (order.diningType || '').includes('現場');
    
    if (order.status && order.status.includes('新訂單') && !isPosOrder) {
      const key = cleanNum(order.orderNumber) || String(order.orderNumber);
      if (!orderArrivedTimeMap[key]) {
        orderArrivedTimeMap[key] = (order.id && order.id > 1700000000000) ? order.id : now;
      }
      if (now - orderArrivedTimeMap[key] >= 5000) {
        delete orderArrivedTimeMap[key];
        acceptNewOrder(order.orderNumber, null, true);
      }
    } else {
      delete orderArrivedTimeMap[cleanNum(order.orderNumber) || String(order.orderNumber)];
    }
  });
}
// ---------------------------------------- [自動接單計時器] 結束 ----------------------------------------


// ---------------------------------------- [切換出餐狀態] 開始 ----------------------------------------
export async function toggleCookStatus(uniqueKey, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const cleanTarget = cleanNum(uniqueKey);
  const order = state.allOrders.find(o => String(o.id) === String(uniqueKey) || cleanNum(o.orderNumber) === cleanTarget || String(o.orderNumber) === String(uniqueKey));
  if (!order) return;

  const isCurrentlyDone = (order.status || '').includes('完成');
  const nextStatus = isCurrentlyDone ? '👩‍🍳 已接單' : '✅ 已完成';

  try {
    await fetch('/api/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateStatus',
        orderNumber: String(order.orderNumber),
        newStatus: nextStatus,
        orderDate: order.orderDate || utils.getTodayDateString()
      })
    });

    order.status = nextStatus;
    utils.showToast(`訂單 #${order.orderNumber} ${nextStatus === '✅ 已完成' ? '🍔 已出餐！' : '設為待出餐'}`);
    updateBadges();
    renderOrderList();
    if (state.selectedOrder && String(state.selectedOrder.orderNumber) === String(order.orderNumber)) {
      updateOrderDetails(order);
    }
  } catch (err) {
    utils.showToast('❌ 更新失敗');
  }
}
// ---------------------------------------- [切換出餐狀態] 結束 ----------------------------------------


// ---------------------------------------- [切換取餐狀態] 開始 ----------------------------------------
export async function togglePickupStatus(orderNumber, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const cleanTarget = cleanNum(orderNumber);
  const order = state.allOrders.find(o => cleanNum(o.orderNumber) === cleanTarget || String(o.orderNumber) === String(orderNumber));
  if (!order) return;

  const isCurrentlyPickedUp = order.pickupStatus === '✅ 已取餐';

  if (!isCurrentlyPickedUp) {
    const nextPickup = '✅ 已取餐';
    const nextStatus = '✅ 已完成';
    const nextPayment = '✅ 已結帳';

    try {
      await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStatus',
          orderNumber: String(order.orderNumber),
          newStatus: nextStatus,
          pickupStatus: nextPickup,
          paymentStatus: nextPayment,
          orderDate: order.orderDate || utils.getTodayDateString()
        })
      });

      order.pickupStatus = nextPickup;
      order.status = nextStatus;
      order.paymentStatus = nextPayment;

      utils.showToast(`🎉 訂單 #${order.orderNumber} 已結、已出餐、已取餐，全單完成歸檔！`);
      updateBadges();
      renderOrderList();
      updateOrderDetails(order);
    } catch (e) {
      utils.showToast('❌ 更新取餐失敗');
    }
  } else {
    const nextPickup = '尚未取餐';
    try {
      await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStatus',
          orderNumber: String(order.orderNumber),
          pickupStatus: nextPickup,
          orderDate: order.orderDate || utils.getTodayDateString()
        })
      });

      order.pickupStatus = nextPickup;
      utils.showToast(`訂單 #${order.orderNumber} 撤銷取餐狀態`);
      updateBadges();
      renderOrderList();
      updateOrderDetails(order);
    } catch (e) {
      utils.showToast('❌ 撤銷失敗');
    }
  }
}
// ---------------------------------------- [切換取餐狀態] 結束 ----------------------------------------


// ---------------------------------------- [判斷訂單完全完成] 開始 ----------------------------------------
function isOrderFullyCompleted(order) {
  const isPaid = order.paymentStatus && order.paymentStatus.includes('已結帳');
  const isCooked = order.status && order.status.includes('完成');

  if (order.diningType && order.diningType.includes('自取')) {
    const isPickedUp = order.pickupStatus === '✅ 已取餐';
    return isPaid && isCooked && isPickedUp;
  }
  return isPaid && isCooked;
}
// ---------------------------------------- [判斷訂單完全完成] 結束 ----------------------------------------


// ---------------------------------------- [全域視窗函式綁定] 開始 ----------------------------------------
window.switchTab = switchTab;
window.switchMainView = switchMainView;
window.updateBadges = updateBadges;
window.renderOrderList = renderOrderList;
window.loadOrders = loadOrders;
window.toggleCookStatus = toggleCookStatus;
window.acceptNewOrder = acceptNewOrder;
window.togglePickupStatus = togglePickupStatus;
window.updateOrderDetails = updateOrderDetails;
window.openOpenShiftModal = checkout.openOpenShiftModal;
window.closeOpenShiftModal = checkout.closeOpenShiftModal;
window.submitOpenShift = checkout.submitOpenShift;

window.selectChatCustomer = selectChatCustomer;
window.sendOwnerMsg = sendOwnerMsg;

window.inputNum = checkout.inputNum;
window.clearTendered = checkout.clearTendered;
window.quickCash = checkout.quickCash;
window.processAction = checkout.processAction;
window.closeSuccessModal = checkout.closeSuccessModal;
window.startLongPress = checkout.startLongPress;
window.cancelLongPress = checkout.cancelLongPress;
window.changeOrderStatus = checkout.changeOrderStatus;
window.toggleQuickWords = checkout.toggleQuickWords;

window.openDailySettlementModal = checkout.openDailySettlementModal;
window.closeDailySettlementModal = checkout.closeDailySettlementModal;
window.calcDenominations = checkout.calcDenominations;
window.submitDailySettlement = checkout.submitDailySettlement;
window.toggleSettleTxList = checkout.toggleSettleTxList;

window.updateCart = ordering.updateCart;
window.toggleItemComp = ordering.toggleItemComp;
window.updateCartUI = ordering.updateCartUI;
window.applyPromoCode = ordering.applyPromoCode;
window.submitPosUnpaidOrder = ordering.submitPosUnpaidOrder;
window.preparePosCheckout = ordering.preparePosCheckout;
window.togglePosTableInput = ordering.togglePosTableInput;
window.openModal = ordering.openModal;
window.closeModal = ordering.closeModal;
window.confirmOptions = ordering.confirmOptions;
window.calcModalPrice = ordering.calcModalPrice;
window.startMenuLongPress = ordering.startMenuLongPress;
window.cancelMenuLongPress = ordering.cancelMenuLongPress;
window.setMsMode = ordering.setMsMode;
window.saveMenuStatus = ordering.saveMenuStatus;

window.openSystemUI = system.openSystemUI;
window.openClockModal = system.openClockModal;
window.closeClockModal = system.closeClockModal;
window.updateClockButtons = system.updateClockButtons;
window.submitClock = system.submitClock;
window.saveSystemSettings = system.saveSystemSettings;
window.openItemEditor = system.openItemEditor;
window.saveItemEditor = system.saveItemEditor;
window.addOptGroup = system.addOptGroup;

window.openCashDrawer = utils.openCashDrawer;
window.testPrint = utils.testPrint;
window.openPrintPreviewModal = utils.openPrintPreviewModal;
window.closePrintPreviewModal = utils.closePrintPreviewModal;
window.switchPrintPreviewType = utils.switchPrintPreviewType;
window.updatePrintPreviewRender = utils.updatePrintPreviewRender;

window.syncMenuFromSheets = async () => {
  try {
    await initApp();
    utils.showToast('✅ 菜單、員工名單、客服與設定已成功同步！');
  } catch (e) {
    utils.showToast('❌ 同步失敗');
  }
};
// ---------------------------------------- [全域視窗函式綁定] 結束 ----------------------------------------


// ---------------------------------------- [客服訊息處理與渲染] 開始 ----------------------------------------
let posReadCountsMap = JSON.parse(localStorage.getItem('posReadCountsMap') || 'null');

function savePosReadCountsMap() {
  if (posReadCountsMap) {
    localStorage.setItem('posReadCountsMap', JSON.stringify(posReadCountsMap));
  }
}

function parsePosChatDateAndTime(rawTime) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (!rawTime) return { date: todayStr, time: nowTimeStr };

  const str = String(rawTime).trim();
  const parts = str.split(/\s+/);
  if (parts.length >= 2) {
    let d = parts[0];
    if (/^\d{1,2}\/\d{1,2}$/.test(d)) d = `${now.getFullYear()}/${d}`;
    let t = parts[1].slice(0, 5);
    return { date: d, time: t };
  }
  return { date: todayStr, time: str.slice(0, 5) };
}

function updatePosChatUnreadBadge() {
  const chatBtn = document.getElementById('btn-nav-chat');
  const chatBadge = document.getElementById('chat-badge');
  if (!chatBtn || !chatBadge) return;

  let totalUnread = 0;
  Object.keys(state.chatGroups || {}).forEach(k => {
    const custCount = state.chatGroups[k].messages.filter(m => m.sender !== 'owner').length;
    const readCount = (posReadCountsMap && posReadCountsMap[k] !== undefined) ? posReadCountsMap[k] : 0;
    totalUnread += Math.max(0, custCount - readCount);
  });

  if (totalUnread > 0) {
    chatBtn.classList.add('has-unread');
    chatBadge.innerText = totalUnread > 99 ? '99+' : totalUnread;
    chatBadge.style.display = 'flex';
  } else {
    chatBtn.classList.remove('has-unread');
    chatBadge.style.display = 'none';
  }
}

export function resetChatSelection() {
  state.currentChatPhone = null;
  const titleEl = document.getElementById('chat-customer-title');
  const historyBox = document.getElementById('chat-history-box');
  const inputBox = document.getElementById('chat-input-box');
  if (titleEl) titleEl.innerText = '💬 請從左側選擇一位客人開始對話';
  if (historyBox) historyBox.innerHTML = '<div class="empty-state" style="margin-top: 150px;">等待選擇對話...</div>';
  if (inputBox) inputBox.style.display = 'none';
}

export function processMessages(messages) {
  state.allMessages = messages || [];
  state.chatGroups = {};

  state.allMessages.forEach(rawMsg => {
    const phone = String(rawMsg.customerPhone || rawMsg.phone || rawMsg['電話'] || '').trim();
    const name = rawMsg.customerName || rawMsg.name || rawMsg['姓名'] || '客人';
    const text = rawMsg.text || rawMsg.message || rawMsg.content || rawMsg['內容'] || '';
    const time = rawMsg.time || rawMsg['時間'] || '';
    const sender = rawMsg.sender || rawMsg['傳送者'] || 'customer';

    const key = phone || name || '一般客人';
    if (!state.chatGroups[key]) {
      state.chatGroups[key] = {
        name: name,
        phone: phone || name,
        messages: []
      };
    }
    state.chatGroups[key].messages.push({
      customerName: name,
      customerPhone: phone,
      sender: sender,
      text: text,
      time: time
    });
  });

  if (posReadCountsMap === null) {
    posReadCountsMap = {};
    Object.keys(state.chatGroups).forEach(k => {
      posReadCountsMap[k] = state.chatGroups[k].messages.filter(m => m.sender !== 'owner').length;
    });
    savePosReadCountsMap();
  }

  if (state.currentView === 'chat' && state.currentChatPhone && state.chatGroups[state.currentChatPhone]) {
    posReadCountsMap[state.currentChatPhone] = state.chatGroups[state.currentChatPhone].messages.filter(m => m.sender !== 'owner').length;
    savePosReadCountsMap();
  }

  updatePosChatUnreadBadge();
  renderChatList();
  if (state.currentView === 'chat' && state.currentChatPhone && state.chatGroups[state.currentChatPhone]) {
    selectChatCustomer(state.currentChatPhone);
  }
}

export function renderChatList() {
  const box = document.getElementById('chat-customer-list-box');
  if (!box) return;
  box.innerHTML = '';

  const keys = Object.keys(state.chatGroups || {});
  if (keys.length === 0) {
    box.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:30px 10px; font-weight:bold;">目前沒有客服訊息</div>';
    return;
  }

  keys.forEach(k => {
    const group = state.chatGroups[k];
    const lastMsg = group.messages[group.messages.length - 1];
    const custCount = group.messages.filter(m => m.sender !== 'owner').length;
    const readCount = (posReadCountsMap && posReadCountsMap[k] !== undefined) ? posReadCountsMap[k] : 0;
    const unread = (state.currentView === 'chat' && state.currentChatPhone === k) ? 0 : Math.max(0, custCount - readCount);

    let cardStyle = 'background:#fff; border: 1px solid #e2e8f0;';
    if (state.currentChatPhone === k) {
      cardStyle = 'border: 1px solid #bfdbfe; border-left: 5px solid #3b82f6; background:#eff6ff;';
    } else if (unread > 0) {
      cardStyle = 'border: 2px solid #fca5a5; border-left: 5px solid #ef4444; background:#fef2f2;';
    }

    let senderPrefix = '';
    if (lastMsg) {
      const isOwner = (lastMsg.sender === 'owner' || lastMsg['傳送者'] === 'owner');
      senderPrefix = isOwner ? '店家：' : `${group.name}：`;
    }

    const unreadBadgeHtml = unread > 0
      ? `<span style="background:#ef4444; color:#fff; font-size:0.75em; font-weight:900; padding:2px 8px; border-radius:12px; flex-shrink:0;">未讀 ${unread}</span>`
      : '';

    const card = document.createElement('div');
    card.style.cssText = `padding: 14px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; transition: 0.15s; ${cardStyle}`;
    card.onclick = () => selectChatCustomer(k);

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="display:flex; align-items:baseline; gap:8px; overflow:hidden; white-space:nowrap;">
          <strong style="font-size:1.15em; color:#1e293b;">${group.name}</strong>
          <span style="font-size:0.9em; color:#64748b; font-weight:bold;">📱 ${group.phone}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          ${unreadBadgeHtml}
          <span style="font-size:0.75em; color:#94a3b8;">${lastMsg ? (lastMsg.time || '') : ''}</span>
        </div>
      </div>
      <div style="font-size:0.95em; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${lastMsg ? `<span style="font-weight:bold; color:#334155;">${senderPrefix}</span>${lastMsg.text || ''}` : ''}
      </div>
    `;
    box.appendChild(card);
  });
}

export function selectChatCustomer(phoneKey) {
  state.currentChatPhone = phoneKey;

  const group = state.chatGroups[phoneKey];
  if (!group) return;

  if (!posReadCountsMap) posReadCountsMap = {};
  posReadCountsMap[phoneKey] = group.messages.filter(m => m.sender !== 'owner').length;
  savePosReadCountsMap();
  updatePosChatUnreadBadge();
  renderChatList();

  const titleEl = document.getElementById('chat-customer-title');
  const historyBox = document.getElementById('chat-history-box');
  const inputBox = document.getElementById('chat-input-box');

  if (titleEl) titleEl.innerText = `💬 與「${group.name} (${group.phone})」的對話`;
  if (inputBox) inputBox.style.display = 'flex';

  if (historyBox) {
    historyBox.innerHTML = '';
    let lastDate = '';
    group.messages.forEach(m => {
      const isOwner = (m.sender === 'owner' || m['傳送者'] === 'owner');
      const text = m.text || '';
      const { date, time } = parsePosChatDateAndTime(m.time);

      if (date !== lastDate) {
        lastDate = date;
        const dateDiv = document.createElement('div');
        dateDiv.style.cssText = 'display:flex; justify-content:center; margin:8px 0;';
        dateDiv.innerHTML = `<span style="background:rgba(15,23,42,0.12); color:#475569; font-size:0.85em; font-weight:bold; padding:4px 14px; border-radius:16px;">${date}</span>`;
        historyBox.appendChild(dateDiv);
      }

      const row = document.createElement('div');
      row.className = `chat-row ${isOwner ? 'owner-side' : 'customer-side'}`;

      if (isOwner) {
        row.innerHTML = `
          <div class="chat-time">${time}</div>
          <div class="chat-bubble owner">🏪 ${text}</div>
        `;
      } else {
        row.innerHTML = `
          <div class="chat-bubble customer">👤 ${text}</div>
          <div class="chat-time">${time}</div>
        `;
      }
      historyBox.appendChild(row);
    });
    historyBox.scrollTop = historyBox.scrollHeight;
  }
}

export async function sendOwnerMsg() {
  const input = document.getElementById('chat-reply-text');
  if (!input || !state.currentChatPhone) return;
  const msgText = input.value.trim();
  if (!msgText) return;

  const group = state.chatGroups[state.currentChatPhone];
  const { date, time } = parsePosChatDateAndTime('');
  const newMsg = {
    customerName: group ? group.name : '客人',
    customerPhone: state.currentChatPhone,
    sender: 'owner',
    text: msgText,
    time: `${date} ${time}`
  };

  if (!group.messages) group.messages = [];
  group.messages.push(newMsg);
  selectChatCustomer(state.currentChatPhone);
  input.value = '';

  try {
    await fetch('/api/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendCustomerMessage',
        customerName: newMsg.customerName,
        customerPhone: newMsg.customerPhone,
        sender: 'owner',
        content: newMsg.text
      })
    });
  } catch (e) {
    console.error('客服訊息同步失敗');
  }
}
// ---------------------------------------- [客服訊息處理與渲染] 結束 ----------------------------------------


// ---------------------------------------- [解析訂單明細HTML字串] 開始 ----------------------------------------
window.renderOrderDetailsHtml = function(detailsText) {
  if (!detailsText) return '<div class="empty-state">無餐點項目</div>';

  let lines = detailsText.split(/\r?\n/);
  let html = '<div class="detail-list-wrapper" style="display:flex; flex-direction:column; gap:6px;">';

  lines.forEach(line => {
    let t = line.trim();
    if (!t) return;

    if (t.includes('---')) {
      html += '<hr class="detail-divider" style="border:0; border-top:2px dashed #cbd5e1; margin:8px 0;">';
      return;
    }

    if (t.includes(':::')) {
      let parts = t.split(':::');
      let left = parts[0].trim();
      let right = parts[1].trim();

      if (left.includes('小計')) {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.15em; font-weight:bold; color:#475569; padding:2px 0;">
            <span>小計</span>
            <span>${right}</span>
          </div>`;
        return;
      }

      if (left.includes('優惠')) {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.15em; font-weight:bold; color:#10b981; padding:2px 0;">
            <span>🎟️ 優惠折抵</span>
            <span>${right}</span>
          </div>`;
        return;
      }

      if (left.includes('總額') || left.includes('總計')) {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.4em; font-weight:900; color:#ea580c; border-top:1px solid #e2e8f0; padding-top:8px; margin-top:4px;">
            <span>總額</span>
            <span>${right}</span>
          </div>`;
        return;
      }

      let match = left.match(/^(\d+x|\d+份)\s*(.*)$/);
      let qtyStr = match ? match[1] : '';
      let nameStr = match ? match[2] : left;

      html += `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:6px 0 2px 0;">
          <div style="display:flex; align-items:center; gap:8px; flex:1;">
            <span style="font-size:1.1em; font-weight:900; color:#2563eb; background:#eff6ff; padding:2px 8px; border-radius:6px; min-width:36px; text-align:center;">${qtyStr || '1x'}</span>
            <span style="font-size:1.25em; font-weight:900; color:#0f172a;">${nameStr}</span>
          </div>
          <span style="font-size:1.3em; font-weight:900; color:#ea580c; flex-shrink:0; margin-left:15px;">${right}</span>
        </div>`;
      return;
    }

    if (t.startsWith('▸')) {
      html += `<div style="padding-left:44px; font-size:1.05em; font-weight:800; color:#1e293b;">${t}</div>`;
      return;
    }

    if (t.startsWith('└')) {
      const indent = line.startsWith('    ') ? '58px' : '44px';
      html += `<div style="padding-left:${indent}; font-size:0.95em; font-weight:700; color:#475569;">${t}</div>`;
      return;
    }

    if (t.startsWith('＋加購')) {
      html += `<div style="padding-left:44px; font-size:0.95em; font-weight:800; color:#ea580c; margin-top:2px;">${t}</div>`;
      return;
    }

    if (t.startsWith('※ 備註')) {
      html += `<div style="padding-left:44px; font-size:0.95em; font-weight:bold; color:#0284c7; margin-top:2px;">${t}</div>`;
      return;
    }

    if (t.includes('✬')) {
      let optClean = t.replace(/✬/g, '').trim();
      html += `
        <div style="padding-left:44px; margin-top:-2px; margin-bottom:4px;">
          <span style="display:inline-block; background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; padding:4px 12px; border-radius:12px; font-size:0.95em; font-weight:bold;">${optClean}</span>
        </div>`;
      return;
    }

    if (t.startsWith('-')) {
      html += `<div style="padding-left:44px; font-size:1em; font-weight:bold; color:#64748b; margin-top:-2px;">${t}</div>`;
      return;
    }

    if (t.includes('優惠碼')) {
      let amtMatch = t.match(/-\$\d+/);
      let amtStr = amtMatch ? amtMatch[0] : '';
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.15em; font-weight:bold; color:#10b981; padding:2px 0;">
          <span>🎟️ 優惠折抵</span>
          <span>${amtStr}</span>
        </div>`;
      return;
    }

    let oldQtyMatch = t.match(/^(.*?)\s*x\s*(\d+)$/);
    if (oldQtyMatch) {
      let name = oldQtyMatch[1];
      let qty = oldQtyMatch[2];
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.1em; font-weight:900; color:#2563eb; background:#eff6ff; padding:2px 8px; border-radius:6px;">${qty}x</span>
            <span style="font-size:1.25em; font-weight:800; color:#0f172a;">${name}</span>
          </div>
        </div>`;
      return;
    }

    html += `<div style="font-size:1.1em; color:#334155; font-weight:bold;">${t}</div>`;
  });

  html += '</div>';
  return html;
};
// ---------------------------------------- [解析訂單明細HTML字串] 結束 ----------------------------------------


// ---------------------------------------- [系統初始化 App] 開始 ----------------------------------------
async function initApp() {
  const loader = document.getElementById("sync-loader");
  try {
    if (loader) {
      loader.style.display = "block";
      loader.innerText = "🔄 正在與 Google 試算表後台同步最新資料...";
    }

    // 每次重新開啟 POS 端，必先強制向 Google 試算表同步完成後再讀取資料
    await api.triggerSheetsSync();

    const data = await api.fetchInitialData();
    if (loader) loader.style.display = "none";

    if (data.menu && data.menu.length > 0) {
      state.menuData = data.menu;
      state.categories = [...new Set(state.menuData.map(i => i.category))];
      if (state.currentCategoryFilter === '全部' && state.categories.length > 0) {
        state.currentCategoryFilter = state.categories[0];
      }
      ordering.renderPosCategoryNav();
      ordering.renderPosMenu();
    }
    if (data.settings) {
      state.globalSettings = data.settings;
      ordering.renderTableOptions();
    }
    if (data.systemPassword) state.systemPassword = data.systemPassword;
    if (data.announcement) state.storeAnnouncement = data.announcement;
    if (data.expenseQuickWords) state.expenseQuickWordsList = data.expenseQuickWords;
    if (data.incomeQuickWords) state.incomeQuickWordsList = data.incomeQuickWords;

    if (data.employees) {
      if (typeof data.employees === 'string') {
        state.employeeList = data.employees.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        state.employeeList = data.employees;
      }
    }

    if (data.messages && Array.isArray(data.messages)) {
      processMessages(data.messages);
    }

    await loadOrders();
    switchMainView('ordering');
  } catch (e) {
    if (loader) loader.innerText = "⚠️ 無法連線至伺服器";
  }
}
// ---------------------------------------- [系統初始化 App] 結束 ----------------------------------------


// ---------------------------------------- [定期載入同步訂單] 開始 ----------------------------------------
async function loadOrders() {
  try {
    const data = await api.fetchOrdersData();
    if (data.result === 'success') {
      const orders = (data.orders || []).map(o => {
        const isPos = o.customerName === '現場客' || (o.diningType || '').includes('現場');
        if (isPos && (o.status || '').includes('新訂單')) {
          o.status = '👩‍🍳 已接單';
        }
        return o;
      });
      state.allOrders = orders.reverse();

      if (data.employees) {
        if (typeof data.employees === 'string') {
          state.employeeList = data.employees.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          state.employeeList = data.employees;
        }
      }

      if (data.clockStatus) state.clockStatusMap = data.clockStatus;
      if (data.settings) {
        state.globalSettings = data.settings;
        ordering.renderTableOptions();
      }
      if (data.messages && Array.isArray(data.messages)) {
        processMessages(data.messages);
      }

      updateBadges();
      renderOrderList();
    }
  } catch (e) {}
}
// ---------------------------------------- [定期載入同步訂單] 結束 ----------------------------------------


// ---------------------------------------- [網頁載入啟動排程] 開始 ----------------------------------------
window.onload = () => {
  initApp();
  checkout.checkShiftStatus();
  setInterval(loadOrders, 8000);
  setInterval(checkAutoAcceptTimer, 1000);
};
// ---------------------------------------- [網頁載入啟動排程] 結束 ----------------------------------------