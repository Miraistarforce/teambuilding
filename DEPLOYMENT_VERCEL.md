# Vercelデプロイガイド

## 🎯 推奨構成

フロントエンドとバックエンドを分離してデプロイする方法を推奨します。

### 構成
- **フロントエンド**: Vercel（無料）
- **バックエンド**: Render.com または Railway（無料枠あり）
- **データベース**: Supabase PostgreSQL（無料枠500MB）

## 📋 手順

### 1. データベースの準備（Supabase）

1. [Supabase](https://supabase.com)でアカウント作成
2. 新しいプロジェクトを作成
3. Settings → Database でConnection Stringをコピー

### 2. バックエンドのデプロイ（Render.com）

1. [Render.com](https://render.com)でアカウント作成
2. New → Web Service
3. GitHubリポジトリを接続
4. 設定:
   ```
   Build Command: cd backend && npm install && npx prisma generate && npx prisma migrate deploy
   Start Command: cd backend && npm start
   ```
5. 環境変数を設定:
   ```
   DATABASE_URL=（SupabaseのURL）
   JWT_SECRET=（ランダムな文字列）
   OPENAI_API_KEY=（OpenAIのAPIキー）
   NODE_ENV=production
   ```

### 3. フロントエンドのデプロイ（Vercel）

#### A. Vercel CLIでデプロイ

```bash
# Vercel CLIインストール
npm i -g vercel

# タイムカードアプリのデプロイ
cd timecard-app
vercel

# 管理画面のデプロイ
cd ../store-admin-app
vercel
```

#### B. Vercel Webサイトでデプロイ

1. [Vercel](https://vercel.com)でアカウント作成
2. New Project → Import Git Repository
3. 環境変数を設定:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```
4. Build設定:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `timecard-app`（または`store-admin-app`）

## 🔄 CI/CD設定

GitHubにプッシュすると自動デプロイされます！

## 💡 ポイント

### メリット
- **完全無料**で始められる
- **自動デプロイ**でプッシュするだけ
- **プレビューURL**で変更を確認
- **高速**なCDN配信

### 注意点
- データベースは別途必要（Supabase推奨）
- バックエンドAPIは別サービスで動かす
- 無料枠の制限:
  - Vercel: 100GB帯域幅/月
  - Render: 750時間/月
  - Supabase: 500MB DB

## 🚀 今すぐ始める

1. まずフロントエンドだけVercelでテスト
2. バックエンドはローカルで動かす
3. 動作確認後、バックエンドもデプロイ

```bash
# ローカルでバックエンド起動
cd backend
npm run dev

# Vercelでフロントエンドデプロイ
cd ../timecard-app
vercel --prod
```

## 🔗 関連リンク

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Supabase Docs](https://supabase.com/docs)