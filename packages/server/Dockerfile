FROM node:20-slim

WORKDIR /app

# package.json 복사 + 의존성 설치
COPY package.json ./
RUN npm install --omit=dev

# 소스 복사
COPY . .

EXPOSE 3001
ENV NODE_CONFIG_DIR=./config
CMD ["node", "src/index.js"]
