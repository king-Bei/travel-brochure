# 建立階段 (Build Stage)
FROM node:20-alpine AS build

WORKDIR /app

# 複製 package.json 和 package-lock.json (若有)
COPY package*.json ./

# 安裝相依套件
RUN npm ci

# 複製專案原始碼
COPY . .

# 建立 Production 檔案
RUN npm run build

# 執行階段 (Production Stage)
FROM nginx:alpine

# 移除預設的 Nginx 設定並放入我們的設定
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# 由於 Vite 設定 base: '/travel-brochure/'，建立對應資料夾
RUN mkdir -p /usr/share/nginx/html/travel-brochure

# 將編譯好的靜態檔案複製到 Nginx 的服務目錄
COPY --from=build /app/dist /usr/share/nginx/html/travel-brochure

# 開放 port 80
EXPOSE 80

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]
