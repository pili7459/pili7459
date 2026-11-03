const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[POS 系統運行中] 端口: ${PORT}`);
});