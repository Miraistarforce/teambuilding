# ビルドステージ
FROM node:18-alpine AS builder

WORKDIR /app

# 依存関係のインストール（ビルド用に全部）
COPY package*.json ./
RUN npm ci

# Prismaスキーマとソースコードのコピー
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY tsconfig.production.json ./

# Prismaクライアントの生成
RUN npx prisma generate

# TypeScriptのビルド
RUN npm run build

# 本番ステージ
FROM node:18-alpine

# OpenSSLライブラリをインストール（Prismaの互換性のため）
RUN apk add --no-cache openssl

WORKDIR /app

# 本番依存関係のみコピー（Prisma CLIも必要なので含める）
COPY package*.json ./
RUN npm ci --only=production && npm install prisma && npm cache clean --force

# ビルド成果物のコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prismaスキーマのコピー（マイグレーション用）
COPY prisma ./prisma

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

USER nodejs

# 環境変数
ENV NODE_ENV=production

# ポートの公開
EXPOSE 3001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# マイグレーションを実行してからアプリケーションを起動
# エラーが発生してもアプリケーションを起動（マイグレーションは初回のみ必要）
CMD ["sh", "-c", "npx prisma migrate deploy || echo 'Migration failed or already applied' && npx prisma generate && node dist/index.js"]