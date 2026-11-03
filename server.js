const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`[POS 系統運行中] 服務端口: ${PORT}`);
  console.log(`====================================================`);
});