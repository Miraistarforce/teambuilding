# Supabase Storage セットアップ手順

## 1. Supabase Storageバケットの作成

1. Supabaseダッシュボード（https://app.supabase.com）にログイン
2. 左メニューから「Storage」を選択
3. 「New Bucket」をクリック
4. 以下の設定でバケットを作成：
   - **Name**: `daily-reports`
   - **Public bucket**: ✅ チェックを入れる（画像を公開アクセス可能にする）
   - クリック「Create bucket」

## 2. Edge Functionsのデプロイ

### Supabase CLIのインストール
```bash
npm install -g supabase
```

### ログインとプロジェクトリンク
```bash
# Supabaseにログイン
supabase login

# プロジェクトディレクトリで実行
cd /Users/yohei/teambuilding/backend

# プロジェクトをリンク
supabase link --project-ref fephswmqxcopecztsxvq
```

### Edge Functionsのデプロイ
```bash
# 画像圧縮関数をデプロイ（14日経過後）
supabase functions deploy compress-images

# 古い画像削除関数をデプロイ（30日経過後）
supabase functions deploy delete-old-images
```

## 3. 定期実行の設定（Cron Jobs）

Supabaseダッシュボードで設定：

1. 「Database」→「Extensions」で`pg_cron`を有効化
2. SQL Editorで以下を実行：

```sql
-- 毎日午前3時に画像圧縮を実行
SELECT
  cron.schedule(
    'compress-images-daily',
    '0 3 * * *', -- 毎日午前3時
    $$
    SELECT
      net.http_post(
        url := 'https://fephswmqxcopecztsxvq.supabase.co/functions/v1/compress-images',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || 'YOUR_ANON_KEY'
        )
      ) AS request_id;
    $$
  );

-- 毎日午前4時に古い画像削除を実行
SELECT
  cron.schedule(
    'delete-old-images-daily',
    '0 4 * * *', -- 毎日午前4時
    $$
    SELECT
      net.http_post(
        url := 'https://fephswmqxcopecztsxvq.supabase.co/functions/v1/delete-old-images',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || 'YOUR_ANON_KEY'
        )
      ) AS request_id;
    $$
  );
```

注意：`YOUR_ANON_KEY`を実際のAnon Keyに置き換えてください。

## 4. 環境変数の設定（Render）

Renderダッシュボードで以下の環境変数を追加：

- `SUPABASE_URL`: https://fephswmqxcopecztsxvq.supabase.co
- `SUPABASE_ANON_KEY`: (提供されたAnon Key)
- `SUPABASE_SERVICE_ROLE_KEY`: (提供されたService Role Key)

## 5. 動作確認

### Edge Functionsのテスト実行
```bash
# 画像圧縮機能のテスト
curl -X POST https://fephswmqxcopecztsxvq.supabase.co/functions/v1/compress-images \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 古い画像削除機能のテスト
curl -X POST https://fephswmqxcopecztsxvq.supabase.co/functions/v1/delete-old-images \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 注意事項

- 画像圧縮は14日経過後に自動実行されます
- 画像削除は30日経過後に自動実行されます
- 削除された画像は復元できないため、必要に応じてバックアップを検討してください
- 無料プランでは1GBまでのストレージが利用可能です