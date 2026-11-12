// ---------------------------------------- [模組引入] 開始 ----------------------------------------
import { state } from './state.js';
import { showToast } from './utils.js';
import { sendClock, sendSettingsUpdate, sendMenuUpdate } from './api.js';
import * as ordering from './ordering.js';
// ---------------------------------------- [模組引入] 結束 ----------------------------------------


// ---------------------------------------- [選項群組類型與標題解析] 開始 ----------------------------------------
function parseGroupType(grp) {
  const rawTitle = (grp.title || grp.name || '').trim();
  const first2 = rawTitle.slice(0, 2);
  if (first2 === '必選' || grp.type === '必選' || grp.required === true) return '必選';
  if (first2 === '複選' || first2 === '多選' || grp.type === '複選' || grp.type === '多選' || grp.multiple === true) return '複選';
  if (first2 === '單選' || grp.type === '單選') return '單選';
  if (rawTitle.includes('加料') || rawTitle.includes('配料') || rawTitle.includes('減料')) return '複選';
  return '單選';
}

function parseCleanTitle(rawTitle) {
  return (rawTitle || '').replace(/^(必選|單選|複選|多選)[:：]?/, '').trim() || rawTitle;
}
// ---------------------------------------- [選項群組類型與標題解析] 結束 ----------------------------------------


// ---------------------------------------- [員工打卡視窗開啟與關閉] 開始 ----------------------------------------
export function openClockModal() {
  const sel = document.getElementById('employee-name');
  if (!sel) return;
  sel.innerHTML = '';

  let list = state.employeeList || [];
  if (typeof list === 'string') {
    list = list.split(',').map(s => s.trim()).filter(Boolean);
  }

  if (list.length === 0) {
    sel.innerHTML = '<option value="" disabled selected>尚未設定員工名單</option>';
  } else {
    list.forEach(emp => {
      sel.innerHTML += `<option value="${emp}">${emp}</option>`;
    });
  }

  updateClockButtons();
  document.getElementById('clock-modal').style.display = 'flex';
}

export function closeClockModal() {
  document.getElementById('clock-modal').style.display = 'none';
}
// ---------------------------------------- [員工打卡視窗開啟與關閉] 結束 ----------------------------------------


// ---------------------------------------- [更新打卡按鈕狀態與送出打卡] 開始 ----------------------------------------
export function updateClockButtons() {
  const name = document.getElementById('employee-name').value;
  const status = state.clockStatusMap[name];
  const btnIn = document.getElementById('btn-clock-in');
  const btnOut = document.getElementById('btn-clock-out');
  if (!btnIn || !btnOut) return;
  if (status === '上班') {
    btnIn.style.opacity = '0.4';
    btnOut.style.opacity = '1';
  } else {
    btnIn.style.opacity = '1';
    btnOut.style.opacity = '0.4';
  }
}

export async function submitClock(type) {
  const name = document.getElementById('employee-name').value;
  await sendClock(name, type);
  state.clockStatusMap[name] = type;
  showToast(`✅ [${name}] 打卡成功：${type}`);
  closeClockModal();
}
// ---------------------------------------- [更新打卡按鈕狀態與送出打卡] 結束 ----------------------------------------


// ---------------------------------------- [開啟系統管理介面與密碼驗證] 開始 ----------------------------------------
export function openSystemUI() {
  const pwd = prompt('請輸入系統管理密碼：');
  const currentPwd = String(state.systemPassword || '1111');
  if (pwd === currentPwd) {
    window.switchMainView('system');
    renderSystemMenu();
    loadSystemSettingsUI();
  } else if (pwd !== null) {
    alert('密碼錯誤！');
  }
}
// ---------------------------------------- [開啟系統管理介面與密碼驗證] 結束 ----------------------------------------


// ---------------------------------------- [渲染系統菜單管理清單] 開始 ----------------------------------------
export function renderSystemMenu() {
  const listDiv = document.getElementById('sys-menu-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';

  (state.menuData || []).forEach((item, idx) => {
    let rawStatus = item.status || '上架';
    let normalizedStatus = '上架';
    let statusColor = '#059669';

    if (rawStatus.includes('售完') || rawStatus.includes('完售')) {
      normalizedStatus = '完售';
      statusColor = '#d97706';
    } else if (rawStatus.includes('停售')) {
      normalizedStatus = '停售';
      statusColor = '#dc2626';
    }

    listDiv.innerHTML += `
      <div class="sys-list-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #e2e8f0;">
        <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:15px;">
          <strong style="font-size:1.15em; color:#0f172a;">${item.name.split('\n')[0]}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:16px; flex-shrink:0;">
          <span style="color:#ea580c; font-weight:900; font-size:1.1em; min-width:55px; text-align:right;">($${item.price})</span>
          <span style="color:#64748b; font-size:0.95em; font-weight:bold; min-width:70px; text-align:center; background:#f1f5f9; padding:4px 8px; border-radius:6px;">[${item.category}]</span>
          <select onchange="changeSysMenuStatus(${idx}, this.value)" style="width:115px; text-align:center; font-weight:800; font-size:0.95em; color:${statusColor}; background:#f8fafc; padding:6px 4px; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer; outline:none;">
            <option value="上架" ${normalizedStatus === '上架' ? 'selected' : ''}>🟢 上架</option>
            <option value="完售" ${normalizedStatus === '完售' ? 'selected' : ''}>🟡 完售</option>
            <option value="停售" ${normalizedStatus === '停售' ? 'selected' : ''}>🔴 停售</option>
          </select>
          <button class="sys-btn-edit" onclick="openItemEditor(${idx})" style="padding:7px 14px; cursor:pointer;">✏️ 編輯</button>
        </div>
      </div>`;
  });
}

window.changeSysMenuStatus = async function(idx, newStatus) {
  const item = state.menuData[idx];
  if (!item) return;
  item.status = newStatus;
  renderSystemMenu();
  ordering.renderPosMenu();
  try {
    await sendMenuUpdate(state.menuData);
    showToast(`✅ 「${item.name.split('\n')[0]}」已修改為【${newStatus}】`);
  } catch (err) {
    showToast('⚠️ 狀態同步試算表失敗');
  }
};
// ---------------------------------------- [渲染系統菜單管理清單] 結束 ----------------------------------------


// ---------------------------------------- [載入系統設定介面UI] 開始 ----------------------------------------
export function loadSystemSettingsUI() {
  const s = state.globalSettings || {};
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };

  setVal('sys-set-ann', state.storeAnnouncement || s['店鋪公告'] || '');
  setVal('sys-set-open', s.openTime || s['營業時間起'] || '06:00');
  setVal('sys-set-close', s.closeTime || s['營業時間迄'] || '13:00');
  setVal('sys-set-restdays', s.closedDaysOfWeek || s['每週公休'] || '3');
  setVal('sys-set-special-rest', s.specialRestDates || s['特定公休日'] || '');
  setVal('sys-set-tablestart', s.tableNumberStart || s['內用桌號起'] || 1);
  setVal('sys-set-tableend', s.tableNumberEnd || s['內用桌號迄'] || 8);
  setVal('sys-set-auto', s.autoAccept || s['自動接單模式'] || '開啟');
  setVal('sys-set-p-disc-code', s.promoDiscountCode || s['打折優惠碼'] || 'vip8888');
  setVal('sys-set-p-disc-rate', s.promoDiscountRate || s['打折折數'] || 0.9);
  setVal('sys-set-p-deduct-code', s.promoDeductCode || s['直扣優惠碼'] || '');
  setVal('sys-set-p-deduct-amt', s.promoDeductAmount || s['直扣金額'] || 0);
  setVal('sys-set-delivery', s.enableDelivery || s['外送服務'] || '關閉');

  const expWords = Array.isArray(state.expenseQuickWordsList) ? state.expenseQuickWordsList.join(', ') : (s['支出常用詞清單'] || '');
  const incWords = Array.isArray(state.incomeQuickWordsList) ? state.incomeQuickWordsList.join(', ') : (s['收入常用詞清單'] || '');
  const empList = Array.isArray(state.employeeList) ? state.employeeList.join(', ') : (s['員工名單'] || '');

  setVal('sys-set-exp-words', expWords);
  setVal('sys-set-inc-words', incWords);
  setVal('sys-set-employees', empList);
  setVal('sys-set-sys-pwd', state.systemPassword || s['進入系統密碼'] || '1111');
}
// ---------------------------------------- [載入系統設定介面UI] 結束 ----------------------------------------


// ---------------------------------------- [儲存所有系統設定] 開始 ----------------------------------------
export async function saveSystemSettings() {
  const getVal = (id) => (document.getElementById(id) ? document.getElementById(id).value.trim() : '');

  const openTime = getVal('sys-set-open');
  const closeTime = getVal('sys-set-close');
  const restDays = getVal('sys-set-restdays');
  const specialRest = getVal('sys-set-special-rest');
  const tableStart = getVal('sys-set-tablestart') || '1';
  const tableEnd = getVal('sys-set-tableend') || '8';
  const autoAccept = getVal('sys-set-auto');
  const pDiscCode = getVal('sys-set-p-disc-code');
  const pDiscRate = getVal('sys-set-p-disc-rate') || '0.9';
  const pDeductCode = getVal('sys-set-p-deduct-code');
  const pDeductAmt = getVal('sys-set-p-deduct-amt') || '0';
  const delivery = getVal('sys-set-delivery');
  const expWords = getVal('sys-set-exp-words');
  const incWords = getVal('sys-set-inc-words');
  const employees = getVal('sys-set-employees');
  const ann = getVal('sys-set-ann');
  // 進入系統密碼已註解掉：const sysPwd = getVal('sys-set-sys-pwd') || '1111';

  // 🌟 完全依照試算表後台 Row 2 ~ Row 18 的設定順序排列
  const settingsArray = [
    { key: "營業時間起", value: openTime },
    { key: "營業時間迄", value: closeTime },
    { key: "每週公休", value: restDays },
    { key: "特定公休日", value: specialRest },
    { key: "內用桌號起", value: tableStart },
    { key: "內用桌號迄", value: tableEnd },
    { key: "自動接單模式", value: autoAccept },
    { key: "打折優惠碼", value: pDiscCode },
    { key: "打折折數", value: pDiscRate },
    { key: "直扣優惠碼", value: pDeductCode },
    { key: "直扣金額", value: pDeductAmt },
    { key: "外送服務", value: delivery },
    { key: "支出常用詞清單", value: expWords },
    { key: "收入常用詞清單", value: incWords },
    { key: "員工名單", value: employees },
    // { key: "進入系統密碼", value: sysPwd }, // 進入系統密碼在程式上註解掉
    { key: "店鋪公告", value: ann }
  ];

  state.storeAnnouncement = ann;
  state.employeeList = employees.split(',').map(s => s.trim()).filter(Boolean);
  state.expenseQuickWordsList = expWords.split(',').map(s => s.trim()).filter(Boolean);
  state.incomeQuickWordsList = incWords.split(',').map(s => s.trim()).filter(Boolean);

  state.globalSettings = {
    ...state.globalSettings,
    openTime, closeTime,
    closedDaysOfWeek: restDays,
    specialRestDates: specialRest,
    tableNumberStart: parseInt(tableStart),
    tableNumberEnd: parseInt(tableEnd),
    autoAccept,
    promoDiscountCode: pDiscCode,
    promoDiscountRate: parseFloat(pDiscRate),
    promoDeductCode: pDeductCode,
    promoDeductAmount: parseInt(pDeductAmt),
    enableDelivery: delivery
  };

  await sendSettingsUpdate(settingsArray);
  ordering.renderTableOptions();
  showToast('✅ 系統設定已完整儲存並同步至試算表！');
}
// ---------------------------------------- [儲存所有系統設定] 結束 ----------------------------------------


// ---------------------------------------- [開啟餐點編輯器視窗] 開始 ----------------------------------------
export function openItemEditor(idx) {
  state.currentEditItem = idx !== null ? JSON.parse(JSON.stringify(state.menuData[idx])) : {
    id: Date.now(), name: '', price: 0, category: '', status: '上架', options: []
  };

  document.getElementById('edit-item-name').value = state.currentEditItem.name;
  document.getElementById('edit-item-price').value = state.currentEditItem.price;
  document.getElementById('edit-item-cat').value = state.currentEditItem.category;

  renderOptGroupsEditor();
  document.getElementById('sys-item-edit-modal').style.display = 'flex';
}
// ---------------------------------------- [開啟餐點編輯器視窗] 結束 ----------------------------------------


// ---------------------------------------- [渲染選項群組編輯區塊] 開始 ----------------------------------------
export function renderOptGroupsEditor() {
  const container = document.getElementById('edit-item-options-container');
  if (!container) return;
  container.innerHTML = '';

  (state.currentEditItem.options || []).forEach((grp) => {
    let itemsStr = (grp.items || []).map(i => `${i.name}:${i.price || 0}`).join(', ');
    const currentType = parseGroupType(grp);
    const cleanName = parseCleanTitle(grp.title);

    container.innerHTML += `
      <div class="sys-opt-group-card" style="background:#f8fafc; padding:14px; border-radius:10px; margin-bottom:12px; border:1px solid #cbd5e1;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px; flex:1;">
            <label style="font-weight:bold; color:#334155; font-size:0.95em; white-space:nowrap;">類型：</label>
            <select class="sys-input opt-group-type-select" style="width:100px; margin:0; padding:6px 8px; font-size:1em; font-weight:bold; cursor:pointer; background:#fff;">
              <option value="必選" ${currentType === '必選' ? 'selected' : ''}>必選</option>
              <option value="單選" ${currentType === '單選' ? 'selected' : ''}>單選</option>
              <option value="複選" ${currentType === '複選' ? 'selected' : ''}>複選</option>
            </select>
            <label style="font-weight:bold; color:#334155; font-size:0.95em; white-space:nowrap; margin-left:6px;">名稱：</label>
            <input type="text" class="sys-input opt-group-title-input" style="flex:1; margin:0; padding:6px 10px;" value="${cleanName}" placeholder="例如: 口感、加料、溫度">
          </div>
          <button type="button" onclick="this.closest('.sys-opt-group-card').remove()" style="color:#ef4444; border:1px solid #fca5a5; background:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer; flex-shrink:0;">🗑️ 刪除</button>
        </div>
        <div>
          <span style="font-size:0.85em; color:#64748b; font-weight:bold;">選項項目 (名稱:加價，逗號分隔)：</span>
          <input type="text" class="sys-input opt-group-items-input" style="width:100%; margin-top:4px; padding:8px 10px;" value="${itemsStr}" placeholder="例如：加起司:10, 加九層塔:15, 加玉米:10">
        </div>
      </div>`;
  });
}
// ---------------------------------------- [渲染選項群組編輯區塊] 結束 ----------------------------------------


// ---------------------------------------- [新增選項群組卡片] 開始 ----------------------------------------
export function addOptGroup() {
  const container = document.getElementById('edit-item-options-container');
  if (!container) return;
  const newCard = document.createElement('div');
  newCard.className = 'sys-opt-group-card';
  newCard.style.cssText = 'background:#f8fafc; padding:14px; border-radius:10px; margin-bottom:12px; border:1px solid #cbd5e1;';
  newCard.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px; flex:1;">
        <label style="font-weight:bold; color:#334155; font-size:0.95em; white-space:nowrap;">類型：</label>
        <select class="sys-input opt-group-type-select" style="width:100px; margin:0; padding:6px 8px; font-size:1em; font-weight:bold; cursor:pointer; background:#fff;">
          <option value="必選">必選</option>
          <option value="單選" selected>單選</option>
          <option value="複選">複選</option>
        </select>
        <label style="font-weight:bold; color:#334155; font-size:0.95em; white-space:nowrap; margin-left:6px;">名稱：</label>
        <input type="text" class="sys-input opt-group-title-input" style="flex:1; margin:0; padding:6px 10px;" value="" placeholder="例如: 口感、加料、溫度">
      </div>
      <button type="button" onclick="this.closest('.sys-opt-group-card').remove()" style="color:#ef4444; border:1px solid #fca5a5; background:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer; flex-shrink:0;">🗑️ 刪除</button>
    </div>
    <div>
      <span style="font-size:0.85em; color:#64748b; font-weight:bold;">選項項目 (名稱:加價，逗號分隔)：</span>
      <input type="text" class="sys-input opt-group-items-input" style="width:100%; margin-top:4px; padding:8px 10px;" value="" placeholder="例如：加起司:10, 加九層塔:15, 加玉米:10">
    </div>
  `;
  container.appendChild(newCard);
}
// ---------------------------------------- [新增選項群組卡片] 結束 ----------------------------------------


// ---------------------------------------- [儲存餐點編輯並同步試算表] 開始 ----------------------------------------
export async function saveItemEditor() {
  if (!state.currentEditItem) return;

  state.currentEditItem.name = document.getElementById('edit-item-name').value.trim();
  state.currentEditItem.price = parseInt(document.getElementById('edit-item-price').value) || 0;
  state.currentEditItem.category = document.getElementById('edit-item-cat').value.trim();
  state.currentEditItem.status = state.currentEditItem.status || '上架';

  const newOptions = [];
  const groupCards = document.querySelectorAll('#edit-item-options-container .sys-opt-group-card');
  groupCards.forEach(card => {
    const type = card.querySelector('.opt-group-type-select').value;
    let title = card.querySelector('.opt-group-title-input').value.trim();
    title = parseCleanTitle(title);
    if (!title) title = '未命名群組';

    const fullTitle = `${type}:${title}`;

    const itemsStr = card.querySelector('.opt-group-items-input').value;
    const items = itemsStr.split(',').map(s => {
      const parts = s.split(':');
      const optName = parts[0].trim();
      const optPrice = parseInt(parts[1] || 0);
      return { name: optName, price: isNaN(optPrice) ? 0 : optPrice };
    }).filter(i => i.name !== '');

    newOptions.push({
      title: fullTitle,
      type: type,
      required: (type === '必選'),
      multiple: (type === '複選'),
      items: items
    });
  });

  state.currentEditItem.options = newOptions;

  const idx = state.menuData.findIndex(i => i.id === state.currentEditItem.id);
  if (idx >= 0) {
    state.menuData[idx] = state.currentEditItem;
  } else {
    state.menuData.push(state.currentEditItem);
  }

  try {
    await sendMenuUpdate(state.menuData);
    showToast('✅ 菜單與客製化已儲存並同步至試算表！');
  } catch (err) {
    showToast('⚠️ 儲存成功，但同步試算表失敗');
  }

  document.getElementById('sys-item-edit-modal').style.display = 'none';
  renderSystemMenu();
  ordering.renderPosMenu();
}
// ---------------------------------------- [儲存餐點編輯並同步試算表] 結束 ----------------------------------------