// ---------------------------------------- [模組引入] 開始 ----------------------------------------
import { state } from './state.js';
import { showToast } from './utils.js';
// ---------------------------------------- [模組引入] 結束 ----------------------------------------


// ---------------------------------------- [取得系統初始化資料] 開始 ----------------------------------------
export async function fetchInitialData() {
  const res = await fetch(`${state.apiUrl}?t=${Date.now()}`);
  return await res.json();
}
// ---------------------------------------- [取得系統初始化資料] 結束 ----------------------------------------


// ---------------------------------------- [取得所有訂單資料] 開始 ----------------------------------------
export async function fetchOrdersData() {
  const res = await fetch(`${state.apiUrl}?action=getOrders&t=${Date.now()}`);
  return await res.json();
}
// ---------------------------------------- [取得所有訂單資料] 結束 ----------------------------------------


// ---------------------------------------- [發送建立新訂單] 開始 ----------------------------------------
export async function sendOrder(orderData) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  return await res.json();
}
// ---------------------------------------- [發送建立新訂單] 結束 ----------------------------------------


// ---------------------------------------- [發送訂單結帳付款] 開始 ----------------------------------------
export async function sendPayment(orderNumber, orderDate) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pay', orderNumber, orderDate })
  });
  return await res.json();
}
// ---------------------------------------- [發送訂單結帳付款] 結束 ----------------------------------------


// ---------------------------------------- [發送變更訂單狀態] 開始 ----------------------------------------
export async function sendStatusUpdate(orderNumber, newStatus, orderDate) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateStatus', orderNumber, newStatus, orderDate })
  });
  return await res.json();
}
// ---------------------------------------- [發送變更訂單狀態] 結束 ----------------------------------------


// ---------------------------------------- [發送收支記帳交易] 開始 ----------------------------------------
export async function sendTransaction(type, amount, note) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addTransaction', type, amount, note })
  });
  return await res.json();
}
// ---------------------------------------- [發送收支記帳交易] 結束 ----------------------------------------


// ---------------------------------------- [發送員工上下班打卡] 開始 ----------------------------------------
export async function sendClock(employeeName, type) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clock', employeeName, type })
  });
  return await res.json();
}
// ---------------------------------------- [發送員工上下班打卡] 結束 ----------------------------------------


// ---------------------------------------- [發送菜單更新同步] 開始 ----------------------------------------
export async function sendMenuUpdate(menu) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateMenu', menu })
  });
  return await res.json();
}
// ---------------------------------------- [發送菜單更新同步] 結束 ----------------------------------------


// ---------------------------------------- [發送系統設定更新] 開始 ----------------------------------------
export async function sendSettingsUpdate(settingsArray) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateSettings', settings: settingsArray })
  });
  return await res.json();
}
// ---------------------------------------- [發送系統設定更新] 結束 ----------------------------------------


// ---------------------------------------- [發送常用詞更新] 開始 ----------------------------------------
export async function sendQuickWordsUpdate(type, words) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateQuickWords', type, words })
  });
  return await res.json();
}
// ---------------------------------------- [發送常用詞更新] 結束 ----------------------------------------


// ---------------------------------------- [觸發試算表手動同步] 開始 ----------------------------------------
export async function triggerSheetsSync() {
  showToast("🔄 正在從 Google 試算表同步...", 3000);
  const res = await fetch('/api/pos/sync-sheets');
  return await res.json();
}
// ---------------------------------------- [觸發試算表手動同步] 結束 ----------------------------------------