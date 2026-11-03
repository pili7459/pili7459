class PrinterService {
  printReceipt(order, items) {
    const timestamp = new Date(order.paid_at || Date.now()).toLocaleString('zh-TW');
    const content = [
      '================================',
      '         小森食光坊 收據明細     ',
      '================================',
      `單號: ${order.order_number}`,
      `桌號: ${order.table_name || '外帶'} | 時間: ${timestamp}`,
      `付款方式: ${order.payment_method || '現金'} | 狀態: 已結帳`,
      '--------------------------------',
      ...items.map(it => `${it.product_name} x${it.quantity}  $${it.subtotal}${it.modifiers_text ? '\n  *' + it.modifiers_text : ''}`),
      '--------------------------------',
      `合計金額: NT$ ${order.total_amount}`,
      `折扣折讓: -NT$ ${order.discount_amount || 0}`,
      `實收金額: NT$ ${order.final_amount}`,
      '================================',
      '         謝謝惠顧 歡迎再次光臨    ',
      '\n\n'
    ].join('\n');

    console.log('[硬體模擬出單 - 櫃檯收據機]\n' + content);
    return { success: true, preview: content };
  }

  printKitchenTicket(order, kitchenItems, isAppend = false) {
    if (!kitchenItems || kitchenItems.length === 0) return null;
    const content = [
      isAppend ? '***** 廚房【追加加點】聯 *****' : '******** 廚房製作聯 ********',
      `桌號: ${order.table_name || '外帶'}  [${order.order_number}]`,
      `時間: ${new Date().toLocaleTimeString('zh-TW')}`,
      '----------------------------',
      ...kitchenItems.map(it => `[ ] ${it.product_name} x ${it.quantity}\n    備註: ${it.modifiers_text || '正常'}`),
      '----------------------------',
      '\n'
    ].join('\n');

    console.log('[硬體模擬出單 - 廚房切單機]\n' + content);
    return { success: true, preview: content };
  }

  printBarStickers(order, barItems) {
    if (!barItems || barItems.length === 0) return null;
    barItems.forEach((it, idx) => {
      console.log(`[硬體模擬出單 - TSPL 標籤機] 單號:${order.order_number} 桌號:${order.table_name} 品項:${it.product_name} 規格:${it.modifiers_text || '無'} (第${idx+1}/${barItems.length}杯)`);
    });
    return { success: true, count: barItems.length };
  }
}

module.exports = new PrinterService();
