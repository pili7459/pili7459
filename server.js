// ---------------------------------------- [模組引入與中介軟體設定] 開始 ----------------------------------------
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server: server });

app.use(express.text({ type: ['text/*', 'application/json', '*/*'] }));
app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}
// ---------------------------------------- [模組引入與中介軟體設定] 結束 ----------------------------------------


// ---------------------------------------- [常數定義與初始資料庫配置] 開始 ----------------------------------------
const GAS_URL = "https://script.google.com/macros/s/AKfycbxTGrRGwx5aNc6LDKOkevrQVRN4Q_n8ERZqzUgi59cuALgED4pIjkcNMFDOIdQIrkcm/exec";
const DB_FILE = path.join(__dirname, 'pos_database.json');

const initialDatabase = {
  menu: [],
  orders: [],
  settings: {
    openTime: "06:00",
    closeTime: "13:00",
    closedDaysOfWeek: "3",
    autoAccept: "關閉",
    enableDelivery: "開啟"
  },
  systemPassword: "1234",
  announcement: "",
  employees: ["店長", "早班夥伴"],
  clockStatus: {},
  expenseQuickWords: ["買菜", "買蛋", "瓦斯費", "水電費", "雜支", "叫油"],
  incomeQuickWords: ["外送補貼", "店販零售", "其他收入"],
  messages: []
};
// ---------------------------------------- [常數定義與初始資料庫配置] 結束 ----------------------------------------


// ---------------------------------------- [本機資料庫讀寫與推播工具] 開始 ----------------------------------------
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2));
      return initialDatabase;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return initialDatabase;
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('寫入資料庫失敗：', e);
  }
}

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
// ---------------------------------------- [本機資料庫讀寫與推播工具] 結束 ----------------------------------------


// ---------------------------------------- [時間格式化與單號輔助工具] 開始 ----------------------------------------
function normalizeTime(t) {
  if (!t) return "06:00";
  let parts = t.toString().trim().split(':');
  if (parts.length === 2) {
    let h = parts[0].padStart(2, '0');
    let m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
  }
  return t;
}

function cleanNum(num) {
  if (!num) return '';
  return String(num).replace(/[^0-9]/g, '').padStart(3, '0');
}
// ---------------------------------------- [時間格式化與單號輔助工具] 結束 ----------------------------------------


// ---------------------------------------- [Google試算表同步核心邏輯] 開始 ----------------------------------------
async function sendToGoogle(payload) {
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    const text = await res.text();
    console.log(`✅ [Google 同步成功] 回應:`, text);
  } catch (err) {
    console.error(`⚠️ [Google 同步失敗] 原因:`, err.message);
  }
}

async function syncFromGoogleSheets() {
  try {
    console.log('🔄 正在從 Google 試算表同步資料...');
    const response = await fetch(`${GAS_URL}?t=${Date.now()}`, { redirect: "follow" });
    const data = await response.json();
    const db = loadDB();

    if (data.menu && data.menu.length > 0) db.menu = data.menu;
    if (data.settings) {
      const sObj = data.settings;
      const rawStart = sObj.tableNumberStart ?? sObj["內用桌號起"];
      const rawEnd = sObj.tableNumberEnd ?? sObj["內用桌號迄"];

      db.settings = {
        ...db.settings,
        openTime: normalizeTime(sObj.openTime || sObj["營業時間起"] || db.settings.openTime),
        closeTime: normalizeTime(sObj.closeTime || sObj["營業時間迄"] || db.settings.closeTime),
        closedDaysOfWeek: sObj.closedDaysOfWeek ?? sObj["每週公休"] ?? db.settings.closedDaysOfWeek ?? "3",
        specialRestDates: sObj.closedDates ?? sObj.specialRestDates ?? sObj["特定公休日"] ?? db.settings.specialRestDates ?? "",
        tableNumberStart: (rawStart !== undefined && rawStart !== "") ? parseInt(rawStart, 10) : (db.settings.tableNumberStart || 1),
        tableNumberEnd: (rawEnd !== undefined && rawEnd !== "") ? parseInt(rawEnd, 10) : (db.settings.tableNumberEnd || 6),
        autoAccept: sObj.autoAccept || sObj["自動接單模式"] || db.settings.autoAccept || "關閉",
        enableDelivery: sObj.enableDelivery || sObj["外送服務"] || db.settings.enableDelivery || "開啟",
        promoDiscountCode: sObj.promoDiscountCode ?? sObj["打折優惠碼"] ?? db.settings.promoDiscountCode ?? "vip8888",
        promoDiscountRate: parseFloat(sObj.promoDiscountRate ?? sObj["打折折數"] ?? db.settings.promoDiscountRate) || 0.9,
        promoDeductCode: sObj.promoDeductCode ?? sObj["直扣優惠碼"] ?? db.settings.promoDeductCode ?? "",
        promoDeductAmount: parseInt(sObj.promoDeductAmount ?? sObj["直扣金額"] ?? db.settings.promoDeductAmount, 10) || 0,
        customerDisplayImages: sObj["副螢幕輪播圖"] || sObj.customerDisplayImages || db.settings.customerDisplayImages || ""
      };
    }
    if (data.announcement !== undefined) db.announcement = data.announcement;
    if (data.systemPassword) db.systemPassword = String(data.systemPassword);
    if (data.expenseQuickWords) db.expenseQuickWords = data.expenseQuickWords;
    if (data.incomeQuickWords) db.incomeQuickWords = data.incomeQuickWords;
    if (data.employees) {
      db.employees = typeof data.employees === 'string' ? data.employees.split(',').map(s => s.trim()).filter(Boolean) : data.employees;
    }
    if (data.messages && Array.isArray(data.messages)) db.messages = data.messages;

    saveDB(db);
    broadcast({ type: 'MENU_UPDATE' });
    console.log(`✅ 同步完成！內用桌號：${db.settings.tableNumberStart} ~ ${db.settings.tableNumberEnd}，自動接單：${db.settings.autoAccept}`);
    return true;
  } catch (error) {
    console.error('⚠️ 從 Google 試算表同步失敗：', error.message);
    return false;
  }
}
// ---------------------------------------- [Google試算表同步核心邏輯] 結束 ----------------------------------------


// ---------------------------------------- [API路由：手動觸發試算表同步] 開始 ----------------------------------------
app.get('/api/pos/sync-sheets', async (req, res) => {
  const success = await syncFromGoogleSheets();
  res.json({ result: success ? 'success' : 'fail' });
});
// ---------------------------------------- [API路由：手動觸發試算表同步] 結束 ----------------------------------------


// ---------------------------------------- [API路由：GET讀取POS系統資料] 開始 ----------------------------------------
app.get('/api/pos', (req, res) => {
  const db = loadDB();
  const action = req.query.action;

  if (req.query.orderNumber) {
    const targetNum = cleanNum(req.query.orderNumber);
    const order = (db.orders || []).find(o => cleanNum(o.orderNumber) === targetNum || String(o.orderNumber) === String(req.query.orderNumber));
    if (order) {
      return res.json({
        result: 'success',
        status: order.status,
        paymentStatus: order.paymentStatus,
        pickupStatus: order.pickupStatus || '尚未取餐'
      });
    } else {
      return res.json({ result: 'not_found', status: '找不到訂單', paymentStatus: '尚未結帳' });
    }
  }

  if (action === 'getCustomerMsgs' && req.query.phone) {
    const phone = String(req.query.phone).replace(/\D/g, '');
    const myMsgs = (db.messages || []).filter(m => String(m.customerPhone || m.phone || '').includes(phone));
    return res.json({ result: 'success', messages: myMsgs });
  }

  if (action === 'getOrders') {
    return res.json({
      result: 'success',
      orders: db.orders || [],
      employees: db.employees || [],
      expenseQuickWords: db.expenseQuickWords || [],
      incomeQuickWords: db.incomeQuickWords || [],
      systemPassword: db.systemPassword || "1234",
      announcement: db.announcement || "",
      settings: db.settings || {},
      clockStatus: db.clockStatus || {},
      messages: db.messages || []
    });
  }

  res.json({
    menu: db.menu || [],
    settings: db.settings || {},
    systemPassword: db.systemPassword || "1234",
    announcement: db.announcement || "",
    expenseQuickWords: db.expenseQuickWords || [],
    incomeQuickWords: db.incomeQuickWords || [],
    employees: db.employees || [],
    clockStatus: db.clockStatus || {},
    messages: db.messages || []
  });
});
// ---------------------------------------- [API路由：GET讀取POS系統資料] 結束 ----------------------------------------


// ---------------------------------------- [API路由：POST處理POS核心業務] 開始 ----------------------------------------
app.post('/api/pos', (req, res) => {
  const db = loadDB();
  const body = req.body;
  const action = body.action;

  // 1. 新餐點訂單接收（嚴格排除收支，流水單號絕不跳號）
  if (!action && body.diningType) {
    const now = new Date();
    const targetDate = body.orderDate || now.toISOString().split('T')[0];
    const todayOrders = (db.orders || []).filter(o => 
      (o.orderDate === targetDate) && 
      !o.diningType.includes('支出') && 
      !o.diningType.includes('收入')
    );
    const nextNum = todayOrders.length + 1;
    const newOrderNumber = String(nextNum).padStart(3, '0');
    
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const ii = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${mm}/${dd} ${hh}:${ii}`;

    const newOrder = {
      id: Date.now(),
      orderNumber: newOrderNumber,
      orderDate: targetDate,
      time: timeStr,
      diningType: body.diningType,
      tableNumber: body.tableNumber || "",
      customerName: body.customerName || "現場客",
      customerPhone: body.customerPhone || "",
      detailsText: body.detailsText || "",
      totalAmount: body.totalAmount || 0,
      status: body.status || "⏳ 新訂單",
      paymentStatus: "尚未結帳",
      pickupStatus: "尚未取餐"
    };

    db.orders.unshift(newOrder);
    saveDB(db);
    broadcast({ type: 'NEW_ORDER', order: newOrder });
    sendToGoogle(body);

    const isAutoAccept = db.settings && (db.settings.autoAccept === '開啟' || db.settings['自動接單模式'] === '開啟');
    if (isAutoAccept && newOrder.status.includes('新訂單')) {
      setTimeout(() => {
        const curDb = loadDB();
        const target = (curDb.orders || []).find(o => cleanNum(o.orderNumber) === newOrderNumber && o.orderDate === targetDate);
        if (target && target.status && target.status.includes('新訂單')) {
          target.status = '👩‍🍳 已接單';
          saveDB(curDb);
          broadcast({ type: 'STATUS_UPDATE', orderNumber: newOrderNumber, status: target.status });
          sendToGoogle({ action: "updateStatus", orderNumber: newOrderNumber, newStatus: target.status, orderDate: targetDate });
          console.log(`🔔 訂單 #${newOrderNumber} 已自動接單【👩‍🍳 已接單】`);
        }
      }, 5000);
    }

    return res.json({ result: 'success', orderNumber: newOrderNumber });
  }

  // 2. 訂單狀態更新
  if (action === 'updateStatus') {
    const targetNum = cleanNum(body.orderNumber);
    const target = db.orders.find(o => cleanNum(o.orderNumber) === targetNum || String(o.orderNumber) === String(body.orderNumber));
    if (target) {
      if (body.newStatus) target.status = body.newStatus;
      if (body.pickupStatus) target.pickupStatus = body.pickupStatus;
      if (body.paymentStatus) target.paymentStatus = body.paymentStatus;
      if (body.newStatus === "❌ 已取消") target.paymentStatus = "已取消訂單";

      saveDB(db);
      broadcast({ type: 'STATUS_UPDATE', orderNumber: target.orderNumber, status: target.status, pickupStatus: target.pickupStatus, paymentStatus: target.paymentStatus });
      sendToGoogle({ action: "updateStatus", orderNumber: target.orderNumber, newStatus: target.status, orderDate: body.orderDate || target.orderDate });
    }
    return res.json({ result: 'success' });
  }

  // 3. 結帳付款
  if (action === 'pay') {
    const targetNum = cleanNum(body.orderNumber);
    const target = db.orders.find(o => cleanNum(o.orderNumber) === targetNum || String(o.orderNumber) === String(body.orderNumber));
    if (target) {
      target.paymentStatus = "✅ 已結帳";
      saveDB(db);
      broadcast({ type: 'PAYMENT_UPDATE', orderNumber: target.orderNumber });
      sendToGoogle({ action: "pay", orderNumber: target.orderNumber, orderDate: body.orderDate || target.orderDate });
    }
    return res.json({ result: 'success' });
  }

  // 4. 系統設定更新
  if (action === 'updateSettings') {
    if (Array.isArray(body.settings)) {
      body.settings.forEach(item => {
        const k = item.key;
        const v = item.value;
        if (k === "店鋪公告") db.announcement = v;
        if (k === "營業時間起") db.settings.openTime = normalizeTime(v);
        if (k === "營業時間迄") db.settings.closeTime = normalizeTime(v);
        if (k === "每週公休") db.settings.closedDaysOfWeek = v;
        if (k === "特定公休日") db.settings.specialRestDates = v;
        if (k === "內用桌號起") db.settings.tableNumberStart = parseInt(v) || 1;
        if (k === "內用桌號迄") db.settings.tableNumberEnd = parseInt(v) || 6;
        if (k === "自動接單模式") db.settings.autoAccept = v;
        if (k === "打折優惠碼") db.settings.promoDiscountCode = v;
        if (k === "打折折數") db.settings.promoDiscountRate = parseFloat(v) || 0.9;
        if (k === "直扣優惠碼") db.settings.promoDeductCode = v;
        if (k === "直扣金額") db.settings.promoDeductAmount = parseInt(v) || 0;
        if (k === "外送服務") db.settings.enableDelivery = v;
        if (k === "支出常用詞清單") {
          db.expenseQuickWords = typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v;
        }
        if (k === "收入常用詞清單") {
          db.incomeQuickWords = typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v;
        }
        if (k === "員工名單") {
          db.employees = typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v;
        }
        if (k === "進入系統密碼") db.systemPassword = String(v);
      });
    }
    saveDB(db);
    sendToGoogle({ action: "updateSettings", settings: body.settings });
    return res.json({ result: 'success' });
  }

  // 5. 菜單更新
  if (action === 'updateMenu') {
    db.menu = body.menu;
    saveDB(db);
    broadcast({ type: 'MENU_UPDATE' });
    sendToGoogle({ action: "updateMenu", menu: body.menu });
    return res.json({ result: 'success' });
  }

  // 6. 打卡紀錄
  if (action === 'clock') {
    if (!db.clockStatus) db.clockStatus = {};
    db.clockStatus[body.employeeName] = body.type;
    saveDB(db);
    sendToGoogle({ action: "clock", employeeName: body.employeeName, type: body.type });
    return res.json({ result: 'success' });
  }

  // 7. 收支記帳（🌟 關鍵修改：不生成餐點流水單號，不佔用任何單號空間）
  if (action === 'addTransaction') {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const ii = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${mm}/${dd} ${hh}:${ii}`;

    const txOrder = {
      id: Date.now(),
      orderNumber: "", // 收支不設單號，避免餐點單號被污染
      orderDate: now.toISOString().split('T')[0],
      time: timeStr,
      diningType: body.type === 'expense' ? '💸 支出' : '💰 收入',
      customerName: body.note || '日常收支',
      detailsText: `${body.type === 'expense' ? '支出' : '收入'}項目：${body.note}\n金額：$${body.amount}`,
      totalAmount: body.amount,
      status: '✅ 已完成',
      paymentStatus: '✅ 已結帳'
    };
    db.orders.unshift(txOrder);
    saveDB(db);
    sendToGoogle({ action: "addTransaction", type: body.type, amount: body.amount, note: body.note });
    return res.json({ result: 'success' });
  }

  // 8. 客服訊息
  if (action === 'sendCustomerMessage' || action === 'sendMsg') {
    const now = new Date();
    const msgObj = {
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      sender: body.sender || 'owner',
      text: body.content || body.text,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    };
    if (!db.messages) db.messages = [];
    db.messages.push(msgObj);
    saveDB(db);
    sendToGoogle({
      action: "sendCustomerMessage",
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      sender: msgObj.sender,
      content: msgObj.text
    });
    return res.json({ result: 'success' });
  }

  res.json({ result: 'success' });
});
// ---------------------------------------- [API路由：POST處理POS核心業務] 結束 ----------------------------------------


// ---------------------------------------- [健康檢查與靜態首頁路由] 開始 ----------------------------------------
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});
// ---------------------------------------- [健康檢查與靜態首頁路由] 結束 ----------------------------------------


// ---------------------------------------- [伺服器監聽啟動與初次同步] 開始 ----------------------------------------
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`[POS 系統運行中] 服務端口: ${PORT}`);
  console.log(`開啟點餐網址: http://localhost:${PORT}/index.html`);
  console.log(`開啟收銀網址: http://localhost:${PORT}/pos.html`);
  await syncFromGoogleSheets();
});
// ---------------------------------------- [伺服器監聽啟動與初次同步] 結束 ----------------------------------------