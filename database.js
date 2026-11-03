const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'pos_database.json');

const defaultData = {
  store_info: {
    name: '小森食光坊',
    phone: '04-24920000',
    address: '台中市大里區中湖路6-3號',
    tax_id: '80069119'
  },
  tables: [
    { id: 1, table_code: 'T01', table_name: '桌號 1', capacity: 2, status: 'IDLE', current_order_id: null },
    { id: 2, table_code: 'T02', table_name: '桌號 2', capacity: 4, status: 'IDLE', current_order_id: null },
    { id: 3, table_code: 'T03', table_name: '桌號 3', capacity: 4, status: 'IDLE', current_order_id: null },
    { id: 4, table_code: 'T04', table_name: '桌號 4', capacity: 4, status: 'IDLE', current_order_id: null },
    { id: 5, table_code: 'T05', table_name: '桌號 5', capacity: 6, status: 'IDLE', current_order_id: null },
    { id: 6, table_code: 'T06', table_name: '外帶自取', capacity: 0, status: 'IDLE', current_order_id: null }
  ],
  categories: [
    { id: 1, name: '手作粉漿蛋餅', sort_order: 1 },
    { id: 2, name: '經典漢堡 / 吐司', sort_order: 2 },
    { id: 3, name: '飲品茶飲', sort_order: 3 }
  ],
  products: [
    { id: 1, category_id: 1, name: '原味粉漿蛋餅', price: 35, station: 'KITCHEN', is_active: 1 },
    { id: 2, category_id: 1, name: '起司粉漿蛋餅', price: 45, station: 'KITCHEN', is_active: 1 },
    { id: 3, category_id: 1, name: '蔥花九層塔蛋餅', price: 50, station: 'KITCHEN', is_active: 1 },
    { id: 4, category_id: 2, name: '特製里肌豬排蛋堡', price: 65, station: 'KITCHEN', is_active: 1 },
    { id: 5, category_id: 2, name: '咔啦雞腿蛋吐司', price: 75, station: 'KITCHEN', is_active: 1 },
    { id: 6, category_id: 3, name: '南非國寶茶 (無糖)', price: 30, station: 'BAR', is_active: 1 },
    { id: 7, category_id: 3, name: '小森經典鮮奶茶', price: 45, station: 'BAR', is_active: 1 },
    { id: 8, category_id: 3, name: '特調冷萃咖啡', price: 50, station: 'BAR', is_active: 1 }
  ],
  modifier_groups: [
    { id: 1, product_id: 1, name: '加料客製', is_multiple: 1 },
    { id: 2, product_id: 2, name: '加料客製', is_multiple: 1 },
    { id: 3, product_id: 3, name: '加料客製', is_multiple: 1 },
    { id: 4, product_id: 6, name: '冰量選擇', is_multiple: 0 },
    { id: 5, product_id: 6, name: '甜度選擇', is_multiple: 0 },
    { id: 6, product_id: 7, name: '冰量選擇', is_multiple: 0 },
    { id: 7, product_id: 7, name: '甜度選擇', is_multiple: 0 },
    { id: 8, product_id: 8, name: '冰量選擇', is_multiple: 0 },
    { id: 9, product_id: 8, name: '甜度選擇', is_multiple: 0 }
  ],
  modifier_options: [
    { id: 1, group_id: 1, name: '加起司', extra_price: 15 },
    { id: 2, group_id: 1, name: '加蛋', extra_price: 15 },
    { id: 3, group_id: 1, name: '多醬油膏', extra_price: 0 },
    { id: 4, group_id: 1, name: '特製朝天辣椒醬', extra_price: 0 },
    { id: 5, group_id: 2, name: '加起司', extra_price: 15 },
    { id: 6, group_id: 2, name: '加蛋', extra_price: 15 },
    { id: 7, group_id: 3, name: '加起司', extra_price: 15 },
    { id: 8, group_id: 3, name: '加蛋', extra_price: 15 },
    { id: 9, group_id: 4, name: '正常冰', extra_price: 0 },
    { id: 10, group_id: 4, name: '去冰', extra_price: 0 },
    { id: 11, group_id: 5, name: '無糖', extra_price: 0 },
    { id: 12, group_id: 5, name: '半糖 5分', extra_price: 0 },
    { id: 13, group_id: 6, name: '正常冰', extra_price: 0 },
    { id: 14, group_id: 6, name: '去冰', extra_price: 0 },
    { id: 15, group_id: 7, name: '微糖 3分', extra_price: 0 },
    { id: 16, group_id: 7, name: '半糖 5分', extra_price: 0 },
    { id: 17, group_id: 8, name: '正常冰', extra_price: 0 },
    { id: 18, group_id: 8, name: '去冰', extra_price: 0 },
    { id: 19, group_id: 9, name: '無糖', extra_price: 0 }
  ],
  orders: [],
  order_items: [],
  settlements: [],
  auto_ids: {
    categories: 4,
    products: 9,
    tables: 7,
    orders: 1,
    order_items: 1,
    settlements: 1,
    modifier_groups: 10,
    modifier_options: 20
  }
};

class PureJsonDb {
  constructor() {
    this.load();
  }

  load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.settlements) this.data.settlements = [];
        if (!this.data.modifier_groups) this.data.modifier_groups = defaultData.modifier_groups;
        if (!this.data.modifier_options) this.data.modifier_options = defaultData.modifier_options;
        if (!this.data.auto_ids) this.data.auto_ids = defaultData.auto_ids;
        if (!this.data.auto_ids.modifier_groups) this.data.auto_ids.modifier_groups = 100;
        if (!this.data.auto_ids.modifier_options) this.data.auto_ids.modifier_options = 200;
        return;
      } catch (e) {
        console.error('載入 DB 失敗，重置為預設資料', e);
      }
    }
    this.data = JSON.parse(JSON.stringify(defaultData));
    this.save();
  }

  save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  getTablesWithOrders() {
    return this.data.tables.map(t => {
      let order_number = null;
      let final_amount = null;
      let dining_since = null;
      let order_items_count = 0;
      if (t.current_order_id) {
        const ord = this.data.orders.find(o => o.id === t.current_order_id);
        if (ord && ord.payment_status === 'UNPAID') {
          order_number = ord.order_number;
          final_amount = ord.final_amount;
          dining_since = ord.created_at;
          order_items_count = this.data.order_items.filter(i => i.order_id === ord.id).length;
        } else {
          t.status = 'IDLE';
          t.current_order_id = null;
        }
      }
      return { ...t, order_number, final_amount, dining_since, order_items_count };
    });
  }

  saveTable(table) {
    if (table.id) {
      const idx = this.data.tables.findIndex(t => t.id === Number(table.id));
      if (idx > -1) {
        this.data.tables[idx] = { ...this.data.tables[idx], ...table };
      }
    } else {
      const newId = this.data.auto_ids.tables++;
      this.data.tables.push({
        id: newId,
        table_code: table.table_code || ('T0' + newId),
        table_name: table.table_name || ('桌號 ' + newId),
        capacity: Number(table.capacity) || 4,
        status: 'IDLE',
        current_order_id: null
      });
    }
    this.save();
    return this.data.tables;
  }

  deleteTable(tableId) {
    this.data.tables = this.data.tables.filter(t => t.id !== Number(tableId));
    this.save();
    return this.data.tables;
  }

  getMenu() {
    return this.data.categories.map(cat => {
      const catProducts = this.data.products
        .filter(p => p.category_id === cat.id && p.is_active === 1)
        .map(prod => {
          const groups = this.data.modifier_groups
            .filter(g => g.product_id === prod.id)
            .map(grp => ({
              ...grp,
              options: this.data.modifier_options.filter(o => o.group_id === grp.id)
            }));
          return { ...prod, modifier_groups: groups };
        });
      return { ...cat, products: catProducts };
    });
  }

  getAdminProducts() {
    return {
      categories: this.data.categories,
      products: this.data.products
    };
  }

  saveCategory(cat) {
    if (cat.id) {
      const idx = this.data.categories.findIndex(c => c.id === Number(cat.id));
      if (idx > -1) this.data.categories[idx].name = cat.name;
    } else {
      const newId = this.data.auto_ids.categories++;
      this.data.categories.push({ id: newId, name: cat.name, sort_order: this.data.categories.length + 1 });
    }
    this.save();
    return this.data.categories;
  }

  saveProduct(prod) {
    if (prod.id) {
      const idx = this.data.products.findIndex(p => p.id === Number(prod.id));
      if (idx > -1) {
        this.data.products[idx] = {
          ...this.data.products[idx],
          category_id: Number(prod.category_id),
          name: prod.name,
          price: Number(prod.price),
          station: prod.station || 'KITCHEN',
          is_active: prod.is_active !== undefined ? Number(prod.is_active) : 1
        };
      }
    } else {
      const newId = this.data.auto_ids.products++;
      this.data.products.push({
        id: newId,
        category_id: Number(prod.category_id),
        name: prod.name,
        price: Number(prod.price),
        station: prod.station || 'KITCHEN',
        is_active: 1
      });
    }
    this.save();
    return this.data.products;
  }

  deleteProduct(prodId) {
    const idx = this.data.products.findIndex(p => p.id === Number(prodId));
    if (idx > -1) {
      this.data.products[idx].is_active = 0;
    }
    this.save();
  }

  // ================= 規格群組與選項 (Modifier Management) =================
  getAdminModifiers() {
    return this.data.products.map(prod => {
      const cat = this.data.categories.find(c => c.id === prod.category_id);
      const groups = this.data.modifier_groups
        .filter(g => g.product_id === prod.id)
        .map(grp => ({
          ...grp,
          options: this.data.modifier_options.filter(o => o.group_id === grp.id)
        }));
      return {
        product_id: prod.id,
        product_name: prod.name,
        product_price: prod.price,
        category_name: cat ? cat.name : '未分類',
        is_active: prod.is_active,
        groups: groups
      };
    });
  }

  saveModifierGroup({ id, product_id, name, is_multiple }) {
    if (id) {
      const idx = this.data.modifier_groups.findIndex(g => g.id === Number(id));
      if (idx > -1) {
        this.data.modifier_groups[idx].name = name;
        this.data.modifier_groups[idx].is_multiple = Number(is_multiple);
      }
    } else {
      const newId = this.data.auto_ids.modifier_groups++;
      this.data.modifier_groups.push({
        id: newId,
        product_id: Number(product_id),
        name: name,
        is_multiple: Number(is_multiple) || 0
      });
    }
    this.save();
    return true;
  }

  deleteModifierGroup(groupId) {
    const gId = Number(groupId);
    this.data.modifier_groups = this.data.modifier_groups.filter(g => g.id !== gId);
    this.data.modifier_options = this.data.modifier_options.filter(o => o.group_id !== gId);
    this.save();
    return true;
  }

  saveModifierOption({ id, group_id, name, extra_price }) {
    if (id) {
      const idx = this.data.modifier_options.findIndex(o => o.id === Number(id));
      if (idx > -1) {
        this.data.modifier_options[idx].name = name;
        this.data.modifier_options[idx].extra_price = Number(extra_price) || 0;
      }
    } else {
      const newId = this.data.auto_ids.modifier_options++;
      this.data.modifier_options.push({
        id: newId,
        group_id: Number(group_id),
        name: name,
        extra_price: Number(extra_price) || 0
      });
    }
    this.save();
    return true;
  }

  deleteModifierOption(optionId) {
    this.data.modifier_options = this.data.modifier_options.filter(o => o.id !== Number(optionId));
    this.save();
    return true;
  }

  applyModifierTemplate(productId, templateType) {
    const prodId = Number(productId);
    if (templateType === 'DRINK') {
      // 1. 冰量
      const gIceId = this.data.auto_ids.modifier_groups++;
      this.data.modifier_groups.push({ id: gIceId, product_id: prodId, name: '冰量選擇', is_multiple: 0 });
      [
        { name: '正常冰', extra_price: 0 },
        { name: '少冰', extra_price: 0 },
        { name: '去冰', extra_price: 0 },
        { name: '常溫', extra_price: 0 },
        { name: '溫熱', extra_price: 0 }
      ].forEach(o => {
        this.data.modifier_options.push({ id: this.data.auto_ids.modifier_options++, group_id: gIceId, ...o });
      });

      // 2. 甜度
      const gSugarId = this.data.auto_ids.modifier_groups++;
      this.data.modifier_groups.push({ id: gSugarId, product_id: prodId, name: '甜度選擇', is_multiple: 0 });
      [
        { name: '正常糖 10分', extra_price: 0 },
        { name: '少糖 7分', extra_price: 0 },
        { name: '半糖 5分', extra_price: 0 },
        { name: '微糖 3分', extra_price: 0 },
        { name: '無糖', extra_price: 0 }
      ].forEach(o => {
        this.data.modifier_options.push({ id: this.data.auto_ids.modifier_options++, group_id: gSugarId, ...o });
      });
    } else if (templateType === 'BRUNCH_ADDONS') {
      // 早午餐加料多選
      const gAddonId = this.data.auto_ids.modifier_groups++;
      this.data.modifier_groups.push({ id: gAddonId, product_id: prodId, name: '客製加料', is_multiple: 1 });
      [
        { name: '加起司', extra_price: 15 },
        { name: '加荷包蛋', extra_price: 15 },
        { name: '加培根', extra_price: 20 },
        { name: '加泡菜', extra_price: 20 },
        { name: '多醬油膏', extra_price: 0 },
        { name: '特製朝天辣椒醬', extra_price: 0 }
      ].forEach(o => {
        this.data.modifier_options.push({ id: this.data.auto_ids.modifier_options++, group_id: gAddonId, ...o });
      });
    }
    this.save();
    return true;
  }

  // ================= 訂單建立與結帳 =================
  createOrAppendOrder({ table_id, order_type, items, discount_amount = 0 }) {
    let orderId = null;
    let isAppend = false;
    let targetOrder = null;

    if (table_id) {
      const table = this.data.tables.find(t => t.id === Number(table_id));
      if (table && table.status === 'DINING' && table.current_order_id) {
        targetOrder = this.data.orders.find(o => o.id === table.current_order_id);
        if (targetOrder && targetOrder.payment_status === 'UNPAID') {
          orderId = targetOrder.id;
          isAppend = true;
        }
      }
    }

    if (!isAppend) {
      orderId = this.data.auto_ids.orders++;
      const orderNumber = 'ORD' + Date.now().toString().slice(-6);

      targetOrder = {
        id: orderId,
        order_number: orderNumber,
        table_id: table_id ? Number(table_id) : null,
        order_type: order_type || (table_id ? 'DINE_IN' : 'TAKE_OUT'),
        total_amount: 0,
        discount_amount: Number(discount_amount) || 0,
        final_amount: 0,
        status: 'PENDING',
        payment_method: null,
        payment_status: 'UNPAID',
        invoice_carrier: null,
        created_at: new Date().toISOString(),
        paid_at: null
      };
      this.data.orders.push(targetOrder);

      if (table_id) {
        const table = this.data.tables.find(t => t.id === Number(table_id));
        if (table) {
          table.status = 'DINING';
          table.current_order_id = orderId;
        }
      }
    }

    const newItems = items.map(it => {
      const itemId = this.data.auto_ids.order_items++;
      const subtotal = (it.price + (it.modifiers_price || 0)) * it.quantity;
      return {
        id: itemId,
        order_id: orderId,
        product_id: it.product_id,
        product_name: it.name,
        price: it.price,
        quantity: it.quantity,
        station: it.station || 'KITCHEN',
        modifiers_text: it.modifiers_text || '',
        modifiers_price: it.modifiers_price || 0,
        subtotal: subtotal,
        item_status: 'PREPARING',
        is_addon: isAppend ? 1 : 0,
        added_at: new Date().toISOString()
      };
    });

    this.data.order_items.push(...newItems);

    const allItems = this.data.order_items.filter(i => i.order_id === orderId);
    let total = 0;
    allItems.forEach(i => { total += i.subtotal; });
    targetOrder.total_amount = total;
    targetOrder.final_amount = Math.max(0, total - (targetOrder.discount_amount || 0));

    this.save();
    return { orderId, orderNumber: targetOrder.order_number, finalAmount: targetOrder.final_amount, isAppend, newItems, fullOrder: this.getOrder(orderId) };
  }

  getOrder(orderId) {
    const order = this.data.orders.find(o => o.id === Number(orderId));
    if (!order) return null;
    const table = this.data.tables.find(t => t.id === order.table_id);
    const items = this.data.order_items.filter(i => i.order_id === order.id);
    return {
      ...order,
      table_name: table ? table.table_name : (order.order_type === 'TAKE_OUT' ? '外帶自取' : '櫃檯單'),
      items: items
    };
  }

  cancelOrder(orderId) {
    const order = this.data.orders.find(o => o.id === Number(orderId));
    if (order) {
      order.status = 'CANCELLED';
      if (order.table_id) {
        const table = this.data.tables.find(t => t.id === order.table_id);
        if (table) {
          table.status = 'IDLE';
          table.current_order_id = null;
        }
      }
    }
    this.save();
  }

  payOrder(orderId, paymentMethod, invoiceCarrier) {
    const order = this.data.orders.find(o => o.id === Number(orderId));
    if (!order) return null;

    order.payment_status = 'PAID';
    order.status = 'PAID';
    order.payment_method = paymentMethod || 'CASH';
    order.invoice_carrier = invoiceCarrier || null;
    order.paid_at = new Date().toISOString();

    if (order.table_id) {
      const table = this.data.tables.find(t => t.id === order.table_id);
      if (table) {
        table.status = 'IDLE';
        table.current_order_id = null;
      }
    }

    this.save();
    return this.getOrder(orderId);
  }

  getKdsOrders() {
    const activeOrders = this.data.orders.filter(o => o.status === 'PENDING' || o.status === 'COOKING');
    return activeOrders.map(ord => {
      const table = this.data.tables.find(t => t.id === ord.table_id);
      const items = this.data.order_items.filter(i => i.order_id === ord.id);
      return {
        ...ord,
        table_name: table ? table.table_name : '外帶自取',
        items: items
      };
    });
  }

  updateKdsStatus({ order_id, item_id, status }) {
    if (item_id) {
      const item = this.data.order_items.find(i => i.id === Number(item_id));
      if (item) item.item_status = status;
    } else if (order_id) {
      const order = this.data.orders.find(o => o.id === Number(order_id));
      if (order) {
        order.status = status;
        if (status === 'COMPLETED') {
          this.data.order_items.forEach(i => {
            if (i.order_id === Number(order_id)) i.item_status = 'DONE';
          });
        }
      }
    }
    this.save();
  }

  getReportsByDate(queryDate) {
    const targetDate = queryDate || new Date().toISOString().split('T')[0];
    const paidOrders = this.data.orders.filter(o => o.payment_status === 'PAID' && o.created_at.startsWith(targetDate));

    let totalRevenue = 0;
    let cashTotal = 0;
    let linepayTotal = 0;
    let cardTotal = 0;

    paidOrders.forEach(o => {
      totalRevenue += o.final_amount;
      if (o.payment_method === 'CASH') cashTotal += o.final_amount;
      if (o.payment_method === 'LINE_PAY') linepayTotal += o.final_amount;
      if (o.payment_method === 'CREDIT_CARD') cardTotal += o.final_amount;
    });

    const itemSalesMap = {};
    const paidOrderIds = new Set(paidOrders.map(o => o.id));
    this.data.order_items.forEach(it => {
      if (paidOrderIds.has(it.order_id)) {
        if (!itemSalesMap[it.product_name]) {
          itemSalesMap[it.product_name] = { product_name: it.product_name, total_qty: 0, total_sales: 0 };
        }
        itemSalesMap[it.product_name].total_qty += it.quantity;
        itemSalesMap[it.product_name].total_sales += it.subtotal;
      }
    });

    const topItems = Object.values(itemSalesMap)
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 8);

    return {
      date: targetDate,
      summary: {
        total_orders: paidOrders.length,
        total_revenue: totalRevenue,
        cash_total: cashTotal,
        linepay_total: linepayTotal,
        card_total: cardTotal
      },
      topItems,
      orders: paidOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        table_name: (this.data.tables.find(t => t.id === o.table_id) || {}).table_name || '外帶',
        final_amount: o.final_amount,
        payment_method: o.payment_method,
        paid_at: o.paid_at || o.created_at
      }))
    };
  }

  closeDaySettlement({ date, initial_cash, actual_cash, cashier_name, note }) {
    const report = this.getReportsByDate(date);
    const id = this.data.auto_ids.settlements++;

    const expectedCash = (Number(initial_cash) || 0) + report.summary.cash_total;
    const cashDiff = (Number(actual_cash) || 0) - expectedCash;

    const settlementRecord = {
      id,
      settle_date: date,
      cashier_name: cashier_name || '店長',
      initial_cash: Number(initial_cash) || 0,
      system_cash_sales: report.summary.cash_total,
      expected_cash_total: expectedCash,
      actual_cash_counted: Number(actual_cash) || 0,
      diff_amount: cashDiff,
      linepay_total: report.summary.linepay_total,
      card_total: report.summary.card_total,
      total_revenue: report.summary.total_revenue,
      order_count: report.summary.total_orders,
      note: note || '',
      closed_at: new Date().toISOString()
    };

    this.data.settlements.unshift(settlementRecord);
    this.save();
    return settlementRecord;
  }

  getSettlements() {
    return this.data.settlements || [];
  }
}

module.exports = new PureJsonDb();
