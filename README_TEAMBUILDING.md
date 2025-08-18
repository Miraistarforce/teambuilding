# チムビル（TeamBuild）MVP

飲食/小規模店舗向けのチームマネジメントツール

## 概要

メールアドレス不要で素早く運用開始できる店舗管理システム。出退勤・給与計算・日報・面談記録を一元管理。

## 主要機能

- **認証システム**: 会社→店舗→ロール（スタッフ/店長/オーナー）のPIN式ログイン
- **出退勤管理**: 打刻、休憩管理、二重打刻防止
- **給与計算**: 深夜割増（22:00-5:00は1.25倍）、祝日加算、日別明細、CSV出力
- **日報**: スタッフの気分とテンション分析、コメント・スタンプ機能
- **面談記録**: 音声/テキスト入力、AI要約、プロフィール自動更新
- **スタッフ管理**: 時給、祝日加算、MBTI、趣味・関心事の管理
- **設定**: 営業日設定、祝日同期、テンション低下しきい値

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを編集:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin Secret (for company admin panel)
ADMIN_SECRET=your-admin-secret
```

### 3. データベースのマイグレーション

```bash
npm run db:push
```

### 4. シードデータの投入

```bash
npm run db:seed
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

## デモアカウント

シードデータを投入すると以下のデモアカウントが利用可能:

### 会社ログイン
- 会社名: デモ会社
- パスワード: demo123

### 店舗アクセス
- 渋谷店: パスワード不要
- 新宿店: パスワード: store123

### ロールPIN
- 店長PIN: 1234
- オーナーPIN: 5678
- スタッフ: PIN不要

## アクセスURL

- トップページ: http://localhost:3000
- 会社管理画面: http://localhost:3000/company-admin
- 会社ログイン: http://localhost:3000/company/login
- 店舗アクセス: http://localhost:3000/company/access

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **データベース**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **スタイリング**: Tailwind CSS
- **認証**: カスタム実装（bcrypt + JWT）
- **日時処理**: date-fns, date-fns-tz

## プロジェクト構造

```
teambuilding/
├── app/                    # Next.js App Router
│   ├── api/               # APIルート
│   ├── company-admin/     # 会社管理画面
│   ├── company/          # 会社関連ページ
│   ├── store/            # 店舗関連ページ
│   ├── staff/            # スタッフ画面
│   ├── manager/          # 店長画面
│   └── owner/            # オーナー画面
├── components/            # UIコンポーネント
│   └── ui/               # 共通UIコンポーネント
├── lib/                   # ライブラリ・ユーティリティ
│   ├── ai/               # AI関連（モック）
│   ├── auth/             # 認証関連
│   ├── data/             # 静的データ
│   ├── db/               # データベース設定
│   ├── supabase/         # Supabaseクライアント
│   ├── types/            # TypeScript型定義
│   └── utils/            # ユーティリティ関数
└── scripts/               # スクリプト
    └── seed.ts           # シードデータ

```

## 注意事項

- 本番環境では必ず環境変数を適切に設定してください
- ADMIN_SECRETは強力なランダム文字列に変更してください
- JWT_SECRETも強力なランダム文字列に変更してください
- SSLを有効にして運用してください

## ライセンス

プライベートプロジェクト