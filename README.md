# チムビル - 勤怠管理システム

## 📋 概要

チムビルは、飲食店向けの包括的な勤怠管理システムです。スタッフの出退勤管理、日報システム、面談記録、AI分析機能などを備えています。

### 主な機能

- 🕐 **勤怠管理** - QRコード/NFCによる打刻、休憩時間管理
- 📝 **日報システム** - カスタマイズ可能な日報フォーマット、AI感情分析
- 👥 **スタッフ管理** - MBTI性格分析、コミュニケーションガイド
- 🎙️ **面談記録** - 音声録音、自動文字起こし、AI要約
- 📊 **レポート機能** - 給与計算、勤怠統計、エクスポート機能
- 🤖 **AI機能** - テンション分析、面談要約、MBTI相談

## 🚀 クイックスタート

### 必要要件

- Node.js 18以上
- npm または yarn
- PostgreSQL（本番環境）/ SQLite（開発環境）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-username/teambuilding.git
cd teambuilding

# バックエンドのセットアップ
cd backend
npm install
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定

# データベースのセットアップ
npx prisma generate
npx prisma migrate dev

# バックエンド起動
npm run dev

# 新しいターミナルでフロントエンドのセットアップ
cd ../timecard-app
npm install
cp .env.example .env
npm run dev

# 管理画面のセットアップ（別ターミナル）
cd ../store-admin-app
npm install
cp .env.example .env
npm run dev
```

### アクセスURL

- タイムカードアプリ: http://localhost:4000
- 管理画面: http://localhost:4001
- API: http://localhost:3001

## 🔧 環境変数

### バックエンド（.env）

```env
# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/teambuilding

# JWT設定
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# OpenAI API（AI機能用）
OPENAI_API_KEY=your-openai-api-key

# サーバー設定
PORT=3001
NODE_ENV=production
```

### フロントエンド（.env）

```env
VITE_API_URL=http://localhost:3001/api
```

## 🐳 Docker での起動

```bash
# 本番環境用のDocker Compose
docker-compose -f docker-compose.production.yml up -d

# ログの確認
docker-compose logs -f
```

## 🔒 セキュリティ機能

- JWT認証
- パスワードハッシュ化（bcrypt）
- CSRF保護
- レート制限
- Content Security Policy
- 監査ログ
- APIキー暗号化

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

Made with ❤️ by TeamBuilding Team