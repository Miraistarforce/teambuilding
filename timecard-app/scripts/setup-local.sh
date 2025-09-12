#!/bin/bash

# ローカル開発環境セットアップスクリプト

set -e

echo "🚀 ローカル開発環境をセットアップします..."

# 環境変数ファイルのコピー
if [ ! -f .env ]; then
  echo "📝 環境変数ファイルを作成します..."
  cp .env.local .env
  echo "✅ .env ファイルを作成しました"
else
  echo "⚠️  .env ファイルが既に存在します。スキップします。"
fi

# Dockerコンテナの起動
echo "🐳 PostgreSQLコンテナを起動します..."
docker-compose up -d

# データベースの準備を待つ
echo "⏳ データベースの準備を待っています..."
sleep 5

# Prismaのマイグレーション実行
echo "🔄 データベースマイグレーションを実行します..."
npx prisma migrate deploy

# Prismaクライアントの生成
echo "🔨 Prismaクライアントを生成します..."
npx prisma generate

# シードデータの投入
echo "🌱 シードデータを投入します..."
npx prisma db seed

echo "✅ ローカル開発環境のセットアップが完了しました！"
echo ""
echo "📌 開発サーバーを起動するには以下のコマンドを実行してください："
echo ""
echo "  1. API サーバー:  npm run dev:api"
echo "  2. フロントエンド: npm run dev"
echo ""
echo "📍 アクセスURL: http://localhost:4002"
echo "📍 API URL: http://localhost:3000/api"
echo ""
echo "🔐 デフォルトログイン情報:"
echo "  会社名: テスト会社"
echo "  店舗名: テスト店舗"
echo "  オーナーパスワード: owner123"
echo "  マネージャーパスワード: manager123"