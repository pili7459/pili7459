// ---------------------------------------- [模組引入與變數定義] 開始 ----------------------------------------
import { state } from './state.js';
import * as utils from './utils.js';
import { openCashDrawer, showToast, printReceipts, printStickers } from './utils.js';
import { sendOrder, sendPayment, sendStatusUpdate, sendTransaction } from './api.js';

let successTimer = null;
let orderLongPressTimer = null;
// ---------------------------------------- [模組引入與變數定義] 結束 ----------------------------------------


// ---------------------------------------- [數字鍵盤輸入] 開始 ----------------------------------------
export function inputNum(numStr) {
  if (state.currentView !== 'checkout' && state.currentView !== 'expense' && state.currentView !== 'income') return;
  state.tenderedAmount += numStr;
  if (state.appMode === 'checkout') updateCalcUI();
  else updateTxUI();
}
// ---------------------------------------- [數字鍵盤輸入] 結束 ----------------------------------------


// ---------------------------------------- [清除輸入金額] 開始 ----------------------------------------
export function clearTendered() {
  state.tenderedAmount = '';
  if (state.appMode === 'checkout') updateCalcUI();
  else updateTxUI();
}
// ---------------------------------------- [清除輸入金額] 結束 ----------------------------------------


// ---------------------------------------- [快捷金額按鈕] 開始 ----------------------------------------
export function quickCash(type) {
  if (state.appMode !== 'checkout') {
    if (type !== 'exact') state.tenderedAmount = type;
    updateTxUI();
    return;
  }
  if (!state.selectedOrder) return;
  if (type === 'exact') {
    state.tenderedAmount = Math.abs(state.selectedOrder.totalAmount).toString();
  } else {
    state.tenderedAmount = type;
  }
  updateCalcUI();
}
// ---------------------------------------- [快捷金額按鈕] 結束 ----------------------------------------


// ---------------------------------------- [更新計算機螢幕UI] 開始 ----------------------------------------
export function updateCalcUI() {
  const displayTendered = document.getElementById("display-tendered");
  const displayChange = document.getElementById("display-change");
  const checkoutBtn = document.getElementById("checkout-btn");
  if (!displayTendered || !displayChange || !checkoutBtn) return;

  if (state.selectedOrder && state.selectedOrder.status && state.selectedOrder.status.includes("取消")) {
    displayTendered.innerText = "_";
    displayChange.innerHTML = `<span style="font-size: 0.6em; color: #94a3b8;">訂單已取消</span>`;
    checkoutBtn.innerText = "已取消";
    checkoutBtn.className = "action-btn checkout";
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.innerText = "結帳";

  if (state.tenderedAmount === '') {
    displayTendered.innerText = "_";
    displayChange.innerHTML = "$0";
    checkoutBtn.className = "action-btn checkout";
    checkoutBtn.disabled = true;
    return;
  }

  const tenderedVal = parseInt(state.tenderedAmount, 10);
  const totalVal = state.selectedOrder ? Math.abs(parseInt(state.selectedOrder.totalAmount, 10)) : 0;
  displayTendered.innerText = `$${tenderedVal}`;

  if (state.selectedOrder && tenderedVal >= totalVal) {
    displayChange.innerText = `$${tenderedVal - totalVal}`;
    checkoutBtn.className = "action-btn checkout ready";
    checkoutBtn.disabled = false;
  } else if (!state.selectedOrder) {
    displayChange.innerHTML = "$0";
    checkoutBtn.className = "action-btn checkout";
    checkoutBtn.disabled = true;
  } else {
    displayChange.innerHTML = `<span style="font-size: 0.6em; color: #ef4444;">金額不足</span>`;
    checkoutBtn.className = "action-btn checkout";
    checkoutBtn.disabled = true;
  }
}
// ---------------------------------------- [更新計算機螢幕UI] 結束 ----------------------------------------


// ---------------------------------------- [設定收銀記帳模式] 開始 ----------------------------------------
export function setAppMode(mode) {
  state.appMode = mode;
  const checkoutDisplay = document.getElementById('checkout-mode-display');
  const txDisplay = document.getElementById('tx-mode-display');
  const checkoutBtn = document.getElementById('checkout-btn');
  const txTitle = document.getElementById('tx-title');

  if (mode === 'checkout') {
    if (checkoutDisplay) checkoutDisplay.style.display = 'flex';
    if (txDisplay) txDisplay.style.display = 'none';
    if (checkoutBtn) checkoutBtn.innerText = '結帳';
    updateCalcUI();
  } else {
    if (checkoutDisplay) checkoutDisplay.style.display = 'none';
    if (txDisplay) txDisplay.style.display = 'flex';
    if (txTitle) txTitle.innerText = mode === 'expense' ? '💸 支出記帳' : '💰 收入記帳';
    if (checkoutBtn) {
      checkoutBtn.innerText = mode === 'expense' ? '記支出' : '記收入';
      checkoutBtn.className = 'action-btn checkout ready';
      checkoutBtn.disabled = false;
    }
    updateTxUI();
  }
}
// ---------------------------------------- [設定收銀記帳模式] 結束 ----------------------------------------


// ---------------------------------------- [更新收支金額UI] 開始 ----------------------------------------
export function updateTxUI() {
  const el = document.getElementById('tx-amount');
  if (el) el.innerText = `$${state.tenderedAmount || '0'}`;
}
// ---------------------------------------- [更新收支金額UI] 結束 ----------------------------------------


// ---------------------------------------- [動作按鈕分流] 開始 ----------------------------------------
export function processAction() {
  if (state.appMode === 'checkout') {
    processCheckout();
  } else {
    submitTransaction();
  }
}
// ---------------------------------------- [動作按鈕分流] 結束 ----------------------------------------


// ---------------------------------------- [提交收支紀錄] 開始 ----------------------------------------
export async function submitTransaction() {
  const amt = parseInt(state.tenderedAmount, 10);
  if (!amt || amt <= 0) {
    showToast('⚠️ 請先輸入金額');
    return;
  }
  const noteEl = document.getElementById('tx-note');
  const note = (noteEl ? noteEl.value.trim() : '') || '日常收支';
  try {
    await sendTransaction(state.appMode, amt, note);
    showToast(`✅ 已記錄${state.appMode === 'expense' ? '支出' : '收入'} $${amt}`);
    state.tenderedAmount = '';
    if (noteEl) noteEl.value = '';
    window.switchMainView('checkout');
    window.loadOrders();
  } catch (e) {
    showToast('❌ 記帳失敗');
  }
}
// ---------------------------------------- [提交收支紀錄] 結束 ----------------------------------------


// ---------------------------------------- [結帳處理] 開始 ----------------------------------------
export async function processCheckout() {
  if (!state.selectedOrder) return;
  const totalVal = Math.abs(parseInt(state.selectedOrder.totalAmount, 10));
  const tenderedVal = parseInt(state.tenderedAmount, 10) || totalVal;
  const changeAmt = tenderedVal - totalVal;
  openCashDrawer();

  let btn = document.getElementById("checkout-btn");
  if (btn) {
    btn.innerText = "結帳中...";
    btn.disabled = true;
  }

  try {
    if (state.selectedOrder.isPosDirect) {
      let res = await sendOrder({
        diningType: state.selectedOrder.diningType,
        customerName: "現場客",
        detailsText: state.selectedOrder.detailsText,
        totalAmount: state.selectedOrder.totalAmount,
        orderDate: state.selectedOrder.orderDate,
        status: "👩‍🍳 已接單"
      });

      let newOrderNum = (res && res.orderNumber) ? res.orderNumber : ("OD" + Date.now().toString().slice(-3));
      state.selectedOrder.orderNumber = newOrderNum;
      state.selectedOrder.paymentStatus = "✅ 已結帳";
      state.selectedOrder.status = "👩‍🍳 已接單";

      state.allOrders.unshift(state.selectedOrder);
      
      await sendPayment(newOrderNum, state.selectedOrder.orderDate);
      await sendStatusUpdate(newOrderNum, "👩‍🍳 已接單", state.selectedOrder.orderDate);

      printReceipts(newOrderNum);
      printStickers(newOrderNum);
      state.cart = {};
      window.updateCartUI();
    } else {
      await sendPayment(state.selectedOrder.orderNumber, state.selectedOrder.orderDate);
      state.selectedOrder.paymentStatus = "✅ 已結帳";
    }

    if (btn) {
      btn.innerText = "✅ 已結帳";
      btn.className = "action-btn checkout";
      btn.disabled = true;
    }

    showToast(`✅ 結帳成功！請找零 $${changeAmt >= 0 ? changeAmt : 0}`, 4000);

    window.updateBadges();
    window.renderOrderList();

    if (window.updateOrderDetails) {
      window.updateOrderDetails(state.selectedOrder);
    }
  } catch (err) {
    showToast("❌ 結帳傳送失敗");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "結帳";
    }
  }
}
// ---------------------------------------- [結帳處理] 結束 ----------------------------------------


// ---------------------------------------- [關閉找零成功彈窗] 開始 ----------------------------------------
export function closeSuccessModal() {
  clearInterval(successTimer);
  const m = document.getElementById("success-modal");
  if (m) m.style.display = "none";
}
// ---------------------------------------- [關閉找零成功彈窗] 結束 ----------------------------------------


// ---------------------------------------- [訂單長按取消開始] 開始 ----------------------------------------
export function startLongPress(e, orderNumber) {
  const targetCard = e.currentTarget;
  targetCard.classList.add('long-pressing');
  orderLongPressTimer = setTimeout(async () => {
    targetCard.classList.remove('long-pressing');
    const order = state.allOrders.find(o => o.orderNumber === orderNumber);
    if (!order) return;
    if (confirm(`確定要將訂單 #${orderNumber} 標記為【❌ 訂單取消】嗎？`)) {
      await sendStatusUpdate(orderNumber, "❌ 已取消", order.orderDate);
      order.status = "❌ 已取消";
      order.paymentStatus = "已取消訂單";
      window.renderOrderList();
      showToast(`已取消訂單 #${orderNumber}`);
    }
  }, 1000);
}
// ---------------------------------------- [訂單長按取消開始] 結束 ----------------------------------------


// ---------------------------------------- [取消訂單長按計時] 開始 ----------------------------------------
export function cancelLongPress() {
  clearTimeout(orderLongPressTimer);
  document.querySelectorAll('.order-card').forEach(el => el.classList.remove('long-pressing'));
}
// ---------------------------------------- [取消訂單長按計時] 結束 ----------------------------------------


// ---------------------------------------- [變更訂單狀態] 開始 ----------------------------------------
export async function changeOrderStatus(newStatus) {
  if (!state.selectedOrder) return;
  await sendStatusUpdate(state.selectedOrder.orderNumber, newStatus, state.selectedOrder.orderDate);
  state.selectedOrder.status = newStatus;
  showToast(`訂單 #${state.selectedOrder.orderNumber} 狀態改為：${newStatus}`);
  window.renderOrderList();
}
// ---------------------------------------- [變更訂單狀態] 結束 ----------------------------------------


// ---------------------------------------- [切換常用詞介面] 開始 ----------------------------------------
export function toggleQuickWords() {
  const qwArea = document.getElementById('quick-words-area');
  const normalArea = document.getElementById('normal-keyboard-area');
  if (!qwArea || !normalArea) return;
  if (qwArea.style.display === 'flex') {
    qwArea.style.display = 'none';
    normalArea.style.display = 'flex';
  } else {
    renderQuickWords();
    qwArea.style.display = 'flex';
    normalArea.style.display = 'none';
  }
}
// ---------------------------------------- [切換常用詞介面] 結束 ----------------------------------------


// ---------------------------------------- [渲染常用詞清單] 開始 ----------------------------------------
export function renderQuickWords() {
  const grid = document.getElementById('quick-words-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const list = state.appMode === 'income' ? state.incomeQuickWordsList : state.expenseQuickWordsList;
  (list || []).forEach((w) => {
    const btn = document.createElement('button');
    btn.className = 'qw-btn';
    btn.innerText = w;
    btn.onclick = () => {
      const noteInput = document.getElementById('tx-note');
      if (noteInput) noteInput.value = w;
      toggleQuickWords();
    };
    grid.appendChild(btn);
  });
}
// ---------------------------------------- [渲染常用詞清單] 結束 ----------------------------------------


// ---------------------------------------- [關帳日結盤點邏輯] 開始 ----------------------------------------
let currentSettleSummary = null;

const DENOM_IDS = [
  'denom-1000',
  'denom-500',
  'denom-100',
  'denom-50',
  'denom-10',
  'denom-5',
  'denom-1'
];

// 🌟 1. 取得當前班次備用金
export function getOpeningFloat() {
  const saved = localStorage.getItem('pos_opening_float');
  return saved ? parseInt(saved, 10) : 6000;
}

// 🌟 2. 檢查班次狀態（開班 / 關帳鎖定）
export function checkShiftStatus() {
  const status = localStorage.getItem('pos_shift_status');
  const lockOverlay = document.getElementById("shift-lock-overlay");
  if (!lockOverlay) return;

  if (status === 'closed') {
    lockOverlay.style.display = 'flex';
  } else {
    lockOverlay.style.display = 'none';
  }
}

// 🌟 3. 開啟開班視窗
export function openOpenShiftModal() {
  const modal = document.getElementById("open-shift-modal");
  const input = document.getElementById("open-shift-float-input");
  if (input) input.value = getOpeningFloat();
  if (modal) modal.style.display = "flex";
}

export function closeOpenShiftModal() {
  const modal = document.getElementById("open-shift-modal");
  if (modal) modal.style.display = "none";
}

// 🌟 4. 確認開班：解鎖收銀
export function submitOpenShift() {
  const input = document.getElementById("open-shift-float-input");
  const floatAmt = parseInt(input ? input.value : 6000, 10) || 6000;

  localStorage.setItem('pos_shift_status', 'open');
  localStorage.setItem('pos_opening_float', floatAmt.toString());
  localStorage.setItem('pos_shift_open_time', utils.getFormattedTime());

  closeOpenShiftModal();
  checkShiftStatus();
  showToast(`☀️ 開班成功！本日備用金為 $${floatAmt}`, 4000);
}

// 🌟 5. 開啟關帳日結視窗
export function openDailySettlementModal() {
  const modal = document.getElementById("settlement-modal");
  if (!modal) return;

  const today = utils.getTodayDateString();
  const currentBaseFloat = getOpeningFloat();
  let revenue = 0;
  let expense = 0;
  let income = 0;
  let unpaidCount = 0;
  let orderCount = 0;
  let txItems = [];

  (state.allOrders || []).forEach(o => {
    if (o.orderDate !== today) return;
    const isCancelled = (o.status || '').includes("取消") || (o.paymentStatus || '').includes("取消");
    const isTx = (o.diningType || '').includes("支出") || (o.diningType || '').includes("收入");
    const isPaid = (o.paymentStatus || '').includes("已結帳");

    if (isCancelled) return;

    if (isTx) {
      const amt = parseInt(o.totalAmount || 0, 10);
      const isExp = o.diningType.includes("支出");
      if (isExp) expense += amt;
      else income += amt;

      txItems.push({
        time: o.time || '',
        type: isExp ? '支出' : '收入',
        note: o.customerName || '日常收支',
        amount: amt
      });
    } else {
      if (isPaid) {
        revenue += parseInt(o.totalAmount || 0, 10);
        orderCount++;
      } else {
        unpaidCount++;
      }
    }
  });

  const warningEl = document.getElementById("settle-unpaid-warning");
  if (warningEl) {
    if (unpaidCount > 0) {
      warningEl.style.display = "block";
      warningEl.innerText = `⚠️ 提醒：目前還有 ${unpaidCount} 筆未完成/未結帳訂單！關帳前請確認是否已結算完畢。`;
    } else {
      warningEl.style.display = "none";
    }
  }

  renderSettleTxList(txItems);

  const netTx = income - expense;
  const expectedCash = currentBaseFloat + revenue + netTx;

  currentSettleSummary = {
    date: today,
    baseFloat: currentBaseFloat,
    revenue: revenue,
    expense: expense,
    income: income,
    netTx: netTx,
    expectedCash: expectedCash,
    orderCount: orderCount,
    unpaidCount: unpaidCount,
    countedCash: 0,
    diff: 0,
    takeout: 0
  };

  const baseFloatEl = document.getElementById("settle-base-float");
  const revEl = document.getElementById("settle-revenue");
  const txEl = document.getElementById("settle-tx-diff");
  const expTotalEl = document.getElementById("settle-expected-total");
  const noteFloatEl = document.getElementById("settle-note-float");

  if (baseFloatEl) baseFloatEl.innerText = `$${currentBaseFloat}`;
  if (revEl) revEl.innerText = `$${revenue}`;
  if (txEl) txEl.innerText = `${netTx >= 0 ? '+' : ''}$${netTx}`;
  if (expTotalEl) expTotalEl.innerText = `$${expectedCash}`;
  if (noteFloatEl) noteFloatEl.innerHTML = `※ 明日底金固定留存 <strong>$${currentBaseFloat}</strong> 於錢櫃，其餘金額抽出現金封存。`;

  DENOM_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "0";
  });
  calcDenominations();

  modal.style.display = "flex";
}

export function closeDailySettlementModal() {
  const modal = document.getElementById("settlement-modal");
  if (modal) modal.style.display = "none";
}

export function toggleSettleTxList() {
  const box = document.getElementById("settle-tx-detail-box");
  if (!box) return;
  box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
}

function renderSettleTxList(txItems) {
  const container = document.getElementById("settle-tx-detail-list");
  if (!container) return;

  if (!txItems || txItems.length === 0) {
    container.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:6px 0;">今日尚無任何支出或收入記帳紀錄</div>';
    return;
  }

  let html = '<div style="display:flex; flex-direction:column; gap:6px;">';
  txItems.forEach(t => {
    const isExp = t.type === '支出';
    const tagBg = isExp ? '#fee2e2' : '#dcfce7';
    const tagColor = isExp ? '#dc2626' : '#15803d';
    const amtColor = isExp ? '#ef4444' : '#10b981';

    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:4px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:${tagBg}; color:${tagColor}; padding:2px 6px; border-radius:4px; font-size:0.8em; font-weight:bold;">${isExp ? '💸 支出' : '💰 收入'}</span>
          <span style="color:#334155; font-weight:bold;">${t.note}</span>
          <span style="color:#94a3b8; font-size:0.85em;">(${t.time})</span>
        </div>
        <div style="color:${amtColor}; font-weight:900; font-size:1.05em;">
          ${isExp ? '-' : '+'}$${t.amount}
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

export function calcDenominations() {
  let totalCounted = 0;
  document.querySelectorAll(".settle-denom").forEach(inp => {
    const unit = parseInt(inp.getAttribute("data-val") || 0, 10);
    const count = parseInt(inp.value || 0, 10);
    if (count > 0) totalCounted += (unit * count);
  });

  const countedEl = document.getElementById("settle-counted-total");
  const diffEl = document.getElementById("settle-diff-result");
  const takeoutEl = document.getElementById("settle-takeout-amt");

  if (countedEl) countedEl.innerText = `$${totalCounted}`;

  if (currentSettleSummary) {
    const currentBaseFloat = currentSettleSummary.baseFloat;
    const diff = totalCounted - currentSettleSummary.expectedCash;
    const takeout = Math.max(0, totalCounted - currentBaseFloat);

    currentSettleSummary.countedCash = totalCounted;
    currentSettleSummary.diff = diff;
    currentSettleSummary.takeout = takeout;

    if (diffEl) {
      if (diff === 0) {
        diffEl.style.color = "#10b981";
        diffEl.innerText = "$0 (帳實相符)";
      } else if (diff > 0) {
        diffEl.style.color = "#f59e0b";
        diffEl.innerText = `+$${diff} (溢收)`;
      } else {
        diffEl.style.color = "#ef4444";
        diffEl.innerText = `-$${Math.abs(diff)} (短少)`;
      }
    }

    if (takeoutEl) takeoutEl.innerText = `$${takeout}`;
  }
}

// 🌟 6. 確認關帳：出單、開櫃、鎖定畫面（不再寫入支出污染帳本！）
export async function submitDailySettlement() {
  if (!currentSettleSummary) return;

  calcDenominations();
  openCashDrawer();

  const summary = currentSettleSummary;
  const printContent = `
================================
       日十。大里店 打烊日結單
================================
日期: ${summary.date}
結算時間: ${utils.getFormattedTime()}
--------------------------------
開店備用金:      $${summary.baseFloat}
本日營業額:      $${summary.revenue} (共 ${summary.orderCount} 筆)
本日總支出:     -$${summary.expense}
本日總收入:     +$${summary.income}
--------------------------------
錢櫃應有現金:    $${summary.expectedCash}
實點總現金:      $${summary.countedCash}
盤差結果:        ${summary.diff >= 0 ? '+' : ''}$${summary.diff} (${summary.diff === 0 ? '相符' : (summary.diff > 0 ? '溢收' : '短少')})
--------------------------------
★ 今日抽存營收:  $${summary.takeout}
★ 明日留底備用金: $${summary.baseFloat}
================================
`;
  console.log(printContent);

  // 關閉關帳視窗並將系統標記為「已關帳鎖定」
  closeDailySettlementModal();
  localStorage.setItem('pos_shift_status', 'closed');
  checkShiftStatus();

  showToast(`✅ 日結關帳完成！今日抽存營收: $${summary.takeout}，系統已打烊鎖定`, 5000);
}
// ---------------------------------------- [關帳日結盤點邏輯] 結束 ----------------------------------------