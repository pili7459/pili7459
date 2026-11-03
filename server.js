const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// 資料庫檔案
const DB_FILE = path.join(__dirname, 'data.json');

// 初始預設菜單、桌位、規格加料庫
const initialData = {
  categories: ['經典粉漿蛋餅', '吐司與漢堡', '研磨咖啡與飲品', '點心拼盤'],
  tables: [
    { id: '1', name: '1 號桌', status: 'idle', current_order_id: null },
    { id: '2', name: '2 號桌', status: 'idle', current_order_id: null },
    { id: '3', name: '3 號桌', status: 'idle', current_order_id: null },
    { id: '5', name: '5 號桌', status: 'idle', current_order_id: null },
    { id: '6', name: '6 號桌', status: 'idle', current_order_id: null },
    { id: '外帶', name: '外帶候餐', status: 'idle', current_order_id: null }
  ],
  menu: [
    { id: 'm1', name: '招牌原味粉漿蛋餅', price: 35, category: '經典粉漿蛋餅', spec: ['原味'] },
    { id: 'm2', name: '玉米起司粉漿蛋餅', price: 50, category: '經典粉漿蛋餅', spec: ['加辣', '不辣'] },
    { id: 'm3', name: '特製鮪魚粉漿蛋餅', price: 55, category: '經典粉漿蛋餅', spec: ['加辣', '不辣'] },
    { id: 'm4', name: '里肌豬排蛋吐司', price: 60, category: '吐司與漢堡', spec: ['去邊', '正常'] },
    { id: 'm5', name: '咔啦雞腿經典漢堡', price: 75, category: '吐司與漢堡', spec: ['原味', '辣味'] },
    { id: 'm6', name: '古早味特調紅茶', price: 25, category: '研磨咖啡與飲品', spec: ['冰', '溫', '熱'] },
    { id: 'm7', name: '特調鮮奶茶', price: 40, category: '研磨咖啡與飲品', spec: ['冰', '溫', '熱'] },
    { id: 'm8', name: '黃金脆薯', price: 40, category: '點心拼盤', spec: ['番茄醬', '胡椒'] }
  ],
  modifiers: [
    { id: 'g1', name: '辣度選擇', type: 'radio', options: [{ id: 'o1', name: '不辣', price: 0 }, { id: 'o2', name: '小辣', price: 0 }] },
    { id: 'g2', name: '加料專區', type: 'checkbox', options: [{ id: 'o3', name: '加蛋', price: 15 }, { id: 'o4', name: '加起司', price: 15 }] }
  ],
  orders: {}
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    return initialData;
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('儲存失敗:', err);
  }
}

loadDB();

// 廣播給所有連線的前台、廚房與後台
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'INIT_CONNECTED', time: new Date() }));
});

// ==================== 前台與客端 API ====================

// 1. 取得桌位
app.get('/api/tables', (req, res) => {
  res.json(loadDB().tables);
});

// 2. 取得菜單
app.get('/api/menu', (req, res) => {
  res.json(loadDB().menu);
});

// 3. 取得加料規格
app.get('/api/admin/modifiers', (req, res) => {
  res.json(loadDB().modifiers || []);
});

// 4. 送單 / 開單
app.post('/api/orders', (req, res) => {
  const db = loadDB();
  const orderId = 'OD-' + Date.now().toString().slice(-6);
  const newOrder = {
    id: orderId,
    createdAt: new Date().toISOString(),
    status: 'cooking',
    ...req.body
  };
  db.orders[orderId] = newOrder;

  // 更新桌位狀態為用餐中
  if (req.body.tableId) {
    const table = db.tables.find(t => t.id === req.body.tableId);
    if (table) {
      table.status = 'occupied';
      table.current_order_id = orderId;
    }
  }

  saveDB(db);
  broadcast({ type: 'ORDER_CREATED', order: newOrder, tables: db.tables });
  res.json({ success: true, orderId, order: newOrder });
});

// 5. 取得特定訂單詳情
app.get('/api/orders/:id', (req, res) => {
  const db = loadDB();
  const order = db.orders[req.params.id];
  if (order) res.json(order);
  else res.status(404).json({ error: '找不到訂單' });
});

// 6. 結帳
app.post('/api/orders/:id/pay', (req, res) => {
  const db = loadDB();
  const order = db.orders[req.params.id];
  if (order) {
    order.status = 'paid';
    order.paidAt = new Date().toISOString();
    // 釋放桌位
    const table = db.tables.find(t => t.current_order_id === order.id);
    if (table) {
      table.status = 'idle';
      table.current_order_id = null;
    }
    saveDB(db);
    broadcast({ type: 'ORDER_PAID', orderId: order.id, tables: db.tables });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '訂單不存在' });
  }
});

// 7. 作廢/取消訂單
app.post('/api/orders/:id/cancel', (req, res) => {
  const db = loadDB();
  const order = db.orders[req.params.id];
  if (order) {
    order.status = 'cancelled';
    const table = db.tables.find(t => t.current_order_id === order.id);
    if (table) {
      table.status = 'idle';
      table.current_order_id = null;
    }
    saveDB(db);
    broadcast({ type: 'ORDER_CANCELLED', orderId: order.id, tables: db.tables });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '訂單不存在' });
  }
});

// ==================== 後台管理 API ====================

app.get('/api/admin/menu', (req, res) => res.json(loadDB().menu));

app.post('/api/admin/product', (req, res) => {
  const db = loadDB();
  const newProduct = { id: 'm' + Date.now().toString().slice(-4), ...req.body };
  db.menu.push(newProduct);
  saveDB(db);
  broadcast({ type: 'MENU_UPDATED', menu: db.menu });
  res.json({ success: true, product: newProduct });
});

app.delete('/api/admin/product/:id', (req, res) => {
  const db = loadDB();
  db.menu = db.menu.filter(p => p.id !== req.params.id);
  saveDB(db);
  broadcast({ type: 'MENU_UPDATED', menu: db.menu });
  res.json({ success: true });
});

// 重設資料
app.post('/api/reset', (req, res) => {
  saveDB(initialData);
  broadcast({ type: 'SYSTEM_RESET', tables: initialData.tables, menu: initialData.menu });
  res.json({ success: true });
});

// 靜態導向與健康檢查
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => {
  const file = path.join(publicPath, 'pos.html');
  if (fs.existsSync(file)) res.sendFile(file);
  else res.send('POS 服務已連線');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`[POS 系統運行中] 服務端口: ${PORT}`);
  console.log(`====================================================`);
});