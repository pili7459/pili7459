# 使用輕量版 Node.js 環境
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製依賴清單並安裝
COPY package*.json ./
RUN npm install --production

# 複製程式碼與 public 前端檔案
COPY . .

# Cloud Run 會自動注入 PORT 環境變數 (預設 8080)
ENV PORT=8080
EXPOSE 8080

# 啟動伺服器
CMD ["node", "server.js"]