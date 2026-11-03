const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// 資料庫檔案路徑
const DB_FILE = path.join(__dirname, 'data.json');

// 初始預設菜單與桌位資料
const initialData = {
  categories: ['經典粉漿蛋餅', '吐司與漢堡', '研磨咖啡與飲品', '點心拼盤'],
  tables: [
    { id: '1', name: '內用 1 桌', status: 'idle' },
    { id: '2', name: '內用 2 桌', status: 'idle' },
    { id: '3', name: '內用 3 桌', status: 'idle' },
    { id: '5', name: '內用 5 桌', status: 'idle' },
    { id: '外帶', name: '外帶單', status: 'idle' }
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
  orders: []
};

// 讀取資料
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('讀取資料庫失敗，載入預設資料:', err);
    return initialData;
  }
}

// 儲存資料
function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('儲存資料庫失敗:', err);
    return false;
  }
}

// 初始化資料檔
loadDB();

// ==================== 核心 API 路由 ====================

// 取得所有設定 (菜單、桌位、分類)
app.get('/api/data', (req, res) => {
  res.json(loadDB());
});

// 相容個別端點
app.get('/api/menu', (req, res) => {
  res.json(loadDB().menu);
});

app.get('/api/tables', (req, res) => {
  res.json(loadDB().tables);
});

// 更新/新增菜單
app.post('/api/menu', (req, res) => {
  const db = loadDB();
  db.menu = req.body;
  saveDB(db);
  res.json({ success: true, menu: db.menu });
});

// 更新桌位
app.post('/api/tables', (req, res) => {
  const db = loadDB();
  db.tables = req.body;
  saveDB(db);
  res.json({ success: true, tables: db.tables });
});

// 客人或前台送出訂單
app.post('/api/orders', (req, res) => {
  const db = loadDB();
  const newOrder = {
    id: 'OD-' + Date.now().toString().slice(-6),
    createdAt: new Date().toISOString(),
    status: 'pending', // pending, cooking, completed, paid
    ...req.body
  };
  db.orders.unshift(newOrder);
  saveDB(db);
  res.json({ success: true, order: newOrder });
});

app.get('/api/orders', (req, res) => {
  const db = loadDB();
  res.json(db.orders || []);
});

// 重設為預設資料 (供後台或除錯使用)
app.post('/api/reset', (req, res) => {
  saveDB(initialData);
  res.json({ success: true, message: '已重設回預設菜單與桌位' });
});

// 根目錄與健康檢查
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => {
  const file = path.join(publicPath, 'pos.html');
  if (fs.existsSync(file)) res.sendFile(file);
  else res.send('POS 服務運行正常');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[POS 系統已啟動] 服務端口: ${PORT}`);
});