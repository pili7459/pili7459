const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const db = require('./database');
const printerService = require('./services/printerService');
const invoiceService = require('./services/invoiceService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function broadcast(eventType, data) {
  const payload = JSON.stringify({ type: eventType, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket 即時連線就緒' }));
});

// ================= 桌況與訂單 API =================
app.get('/api/tables', (req, res) => {
  res.json(db.getTablesWithOrders());
});

app.post('/api/tables', (req, res) => {
  const tables = db.saveTable(req.body);
  broadcast('TABLE_UPDATED', {});
  res.json({ success: true, tables });
});

app.delete('/api/tables/:id', (req, res) => {
  const tables = db.deleteTable(req.params.id);
  broadcast('TABLE_UPDATED', {});
  res.json({ success: true, tables });
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: '找不到該訂單' });
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const { table_id, order_type, items, discount_amount = 0 } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '訂單品項不可為空' });
  }

  const result = db.createOrAppendOrder({
    table_id,
    order_type,
    items,
    discount_amount
  });

  const fullOrder = result.fullOrder;

  const kitchenItems = result.newItems.filter(i => i.station === 'KITCHEN');
  const barItems = result.newItems.filter(i => i.station === 'BAR');
  printerService.printKitchenTicket(fullOrder, kitchenItems, result.isAppend);
  printerService.printBarStickers(fullOrder, barItems);

  broadcast('ORDER_CREATED', { order: fullOrder, newItems: result.newItems, isAppend: result.isAppend });
  broadcast('TABLE_UPDATED', {});

  res.json({
    success: true,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    finalAmount: result.finalAmount,
    isAppend: result.isAppend,
    fullOrder: fullOrder
  });
});

app.post('/api/orders/:id/cancel', (req, res) => {
  db.cancelOrder(req.params.id);
  broadcast('TABLE_UPDATED', {});
  broadcast('KDS_UPDATED', {});
  res.json({ success: true });
});

app.post('/api/orders/:id/pay', async (req, res) => {
  const orderId = req.params.id;
  const { payment_method, invoice_carrier } = req.body;

  const order = db.getOrder(orderId);
  if (!order) return res.status(404).json({ error: '找不到該訂單' });

  const invoiceResult = await invoiceService.issueB2CInvoice({ ...order, invoice_carrier });
  const paidOrder = db.payOrder(orderId, payment_method, invoice_carrier);
  const printPreview = printerService.printReceipt(paidOrder, paidOrder.items);

  broadcast('TABLE_UPDATED', {});
  broadcast('KDS_UPDATED', {});

  res.json({
    success: true,
    message: '結帳完成',
    invoice: invoiceResult,
    order: paidOrder,
    printPreview: printPreview.preview
  });
});

// ================= 菜單 API =================
app.get('/api/menu', (req, res) => {
  res.json(db.getMenu());
});

app.get('/api/admin/menu', (req, res) => {
  res.json(db.getAdminProducts());
});

app.post('/api/admin/category', (req, res) => {
  const categories = db.saveCategory(req.body);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true, categories });
});

app.post('/api/admin/product', (req, res) => {
  const products = db.saveProduct(req.body);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true, products });
});

app.delete('/api/admin/product/:id', (req, res) => {
  db.deleteProduct(req.params.id);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true });
});

// ================= 規格與加料客製 API (Modifiers) =================
app.get('/api/admin/modifiers', (req, res) => {
  res.json(db.getAdminModifiers());
});

app.post('/api/admin/modifiers/group', (req, res) => {
  db.saveModifierGroup(req.body);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true });
});

app.delete('/api/admin/modifiers/group/:id', (req, res) => {
  db.deleteModifierGroup(req.params.id);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true });
});

app.post('/api/admin/modifiers/option', (req, res) => {
  db.saveModifierOption(req.body);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true });
});

app.delete('/api/admin/modifiers/option/:id', (req, res) => {
  db.deleteModifierOption(req.params.id);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true });
});

app.post('/api/admin/modifiers/apply-template', (req, res) => {
  const { product_id, template_type } = req.body;
  db.applyModifierTemplate(product_id, template_type);
  broadcast('MENU_UPDATED', {});
  res.json({ success: true });
});

// ================= KDS 廚房看板 API =================
app.get('/api/kds/orders', (req, res) => {
  res.json(db.getKdsOrders());
});

app.post('/api/kds/update-status', (req, res) => {
  const { order_id, item_id, status } = req.body;
  db.updateKdsStatus({ order_id, item_id, status });
  broadcast('KDS_UPDATED', { order_id, item_id, status });
  res.json({ success: true });
});

// ================= 報表與日結封存 API =================
app.get('/api/admin/reports', (req, res) => {
  const queryDate = req.query.date;
  res.json(db.getReportsByDate(queryDate));
});

app.post('/api/admin/settle', (req, res) => {
  const settlement = db.closeDaySettlement(req.body);
  res.json({ success: true, settlement });
});

app.get('/api/admin/settlements', (req, res) => {
  res.json(db.getSettlements());
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`[POS 系統運行中] 服務端口: ${PORT}`);
  console.log(`====================================================`);
});