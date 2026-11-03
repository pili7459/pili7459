class InvoiceService {
  async issueB2CInvoice(order) {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = 'AB-' + Math.floor(10000000 + Math.random() * 90000000);

    const invoicePayload = {
      orderId: order.id,
      orderNumber: order.order_number,
      invoiceNumber: invoiceNumber,
      randomNumber: randomCode.toString(),
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceTime: new Date().toTimeString().split(' ')[0],
      salesAmount: Math.round(order.final_amount / 1.05),
      taxAmount: order.final_amount - Math.round(order.final_amount / 1.05),
      totalAmount: order.final_amount,
      carrierType: order.invoice_carrier ? 'MOBILE_BARCODE' : 'PRINT',
      carrierNo: order.invoice_carrier || ''
    };

    console.log(`[電子發票擴充槽] 已開立發票: ${invoicePayload.invoiceNumber} (隨機碼: ${invoicePayload.randomNumber}) 載具: ${invoicePayload.carrierNo || '紙本列印'}`);
    return invoicePayload;
  }
}

module.exports = new InvoiceService();
