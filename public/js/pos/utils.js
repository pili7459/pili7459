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