# 採用輕量 Node.js 20 映像檔
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 複製依賴描述檔並安裝套件
COPY package*.json ./
RUN npm install --production

# 複製所有專案代碼
COPY . .

# 暴露預設 8080 端口（Cloud Run 標準）
EXPOSE 8080

# 啟動伺服器
CMD ["node", "server.js"]