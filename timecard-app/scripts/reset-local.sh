#!/bin/bash

# ローカル開発環境リセットスクリプト

set -e

echo "⚠️  ローカル開発環境をリセットします..."
echo "   これによりローカルのデータベースが削除されます。"
read -p "   続行しますか？ (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ キャンセルしました"
    exit 1
fi

# Dockerコンテナとボリュームの削除
echo "🐳 Dockerコンテナとボリュームを削除します..."
docker-compose down -v

# 環境変数ファイルの削除
echo "📝 環境変数ファイルを削除します..."
rm -f .env

echo "✅ ローカル開発環境をリセットしました！"
echo ""
echo "📌 再セットアップするには以下のコマンドを実行してください："
echo "   npm run setup:local"