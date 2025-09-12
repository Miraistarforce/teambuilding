# ローカル開発環境セットアップ

## 必要な環境

- Docker Desktop (PostgreSQL用)
- Node.js v18以上
- npm または yarn

## セットアップ手順

### 1. 初回セットアップ

```bash
# 依存関係のインストール
npm install

# ローカル環境のセットアップ（DB起動、マイグレーション、シード投入）
npm run setup:local
```

これで以下が自動的に実行されます：
- PostgreSQLコンテナの起動（ポート5433）
- 環境変数ファイル(.env)の作成
- データベースマイグレーション
- テスト用シードデータの投入

### 2. 開発サーバーの起動

**2つのターミナルで実行:**

```bash
# ターミナル1: APIサーバー（Vercel Functions）
npm run dev:api

# ターミナル2: フロントエンド
npm run dev
```

### 3. アクセス

- **フロントエンド**: http://localhost:4002
- **API**: http://localhost:3000/api
- **データベース**: localhost:5433

## ログイン情報

### 出退勤アプリ（http://localhost:4002）

```
会社名: テスト株式会社
店舗名: 渋谷店 または 新宿店

オーナーパスワード: owner123
マネージャーパスワード: manager123
```

### テストスタッフ

- 田中太郎
- 佐藤花子
- 鈴木一郎
- 高橋美咲
- 山田健太

## データベース操作

### シードデータの再投入

```bash
npm run db:seed
```

### データベースのリセット

```bash
# 全データを削除してマイグレーションをやり直す
npx prisma migrate reset
```

### Prisma Studio（DBをGUIで確認）

```bash
npx prisma studio
```

## 環境のリセット

```bash
# Docker環境を完全にリセット
npm run reset:local

# その後、再セットアップ
npm run setup:local
```

## トラブルシューティング

### ポート競合エラー

```bash
# PostgreSQLのポート(5433)が使用中の場合
docker-compose down
lsof -i :5433  # プロセスを確認
kill -9 [PID]  # 必要に応じて終了
```

### 接続エラー

```bash
# Dockerコンテナの状態を確認
docker ps

# ログを確認
docker logs timecard-postgres
```

### マイグレーションエラー

```bash
# DBを再作成
docker-compose down -v
docker-compose up -d
npx prisma migrate deploy
```

## 環境変数

`.env.local`ファイルには以下が設定されています：

- `DATABASE_URL`: ローカルPostgreSQL接続文字列
- `JWT_SECRET`: ローカル開発用JWT秘密鍵
- `VITE_API_URL`: APIエンドポイント（http://localhost:3000/api）

本番環境との切り替えは`.env`ファイルを変更することで行います。