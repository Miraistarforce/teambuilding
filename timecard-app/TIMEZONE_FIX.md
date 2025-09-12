# 13時データ消失問題の修正手順

## 問題の概要
JST（日本時間）13:00になると出勤データが取得できなくなる問題がありました。
これはタイムゾーン処理の不具合が原因でした。

## 修正内容

### 1. コードの修正（完了）
- `api/lib/dateHelpers.ts`のgetTodayJST()関数を修正
- JST 0:00を正しくUTC前日15:00として処理するように変更

### 2. Vercel環境変数の設定（要対応）

Vercelのダッシュボードで以下の環境変数を追加してください：

```
TZ=Asia/Tokyo
```

設定手順：
1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下を追加：
   - Key: `TZ`
   - Value: `Asia/Tokyo`
   - Environment: Production, Preview, Development すべてにチェック
5. Saveボタンをクリック

### 3. データベースのマイグレーション（要対応）

既存のデータを修正するため、以下のコマンドを実行してください：

```bash
# まずドライランで確認
npx tsx scripts/fix-timezone-data.ts --dry-run

# 問題なければ実際に実行
npx tsx scripts/fix-timezone-data.ts
```

⚠️ **重要**: 本番環境で実行する前に、必ずデータベースのバックアップを取ってください。

### 4. デプロイと確認

1. コードをデプロイ
```bash
git add .
git commit -m "fix: 13時データ消失問題を修正 - タイムゾーン処理を正しく実装"
git push
```

2. Vercelで自動デプロイが完了するまで待つ

3. 動作確認
- 12:59に出勤ボタンを押す
- 13:01に出勤状態が維持されているか確認
- 13:05に退勤ボタンが正常に動作するか確認

## デバッグ方法

Vercelのログで以下のような出力を確認できます：

```
getTodayJST Debug: {
  now: "2025-01-09T04:00:00.000Z",        // UTC時刻
  nowJST: "2025-01-09T13:00:00.000Z",     // JST時刻
  jstDateString: "2025-01-09",            // JST日付
  todayJST: "2025-01-08T15:00:00.000Z",   // DB保存値（正しい）
  explanation: "JST 2025/1/9 0:00 = 2025-01-08T15:00:00.000Z"
}
```

## トラブルシューティング

### 問題が解決しない場合

1. **ブラウザキャッシュをクリア**
   - Chromeの場合：設定 → プライバシーとセキュリティ → 閲覧履歴データの削除
   - Service Workerもクリア：デベロッパーツール → Application → Service Workers → Unregister

2. **Vercelのキャッシュをクリア**
   - Vercelダッシュボード → Settings → Functions → Purge Cache

3. **データベースの日付を確認**
   ```sql
   SELECT id, "staffId", date, "clockIn", "clockOut" 
   FROM "TimeRecord" 
   WHERE date >= NOW() - INTERVAL '2 days'
   ORDER BY date DESC;
   ```

## 技術的詳細

### 問題の原因
- Vercel FunctionsはUTCで動作
- JST 13:00 = UTC 04:00
- 以前の実装では、JST日付をUTC 0:00として保存していた
- これにより、日付の境界がずれていた

### 修正方法
- JST 0:00を正しくUTC前日15:00として計算
- データベースの検索を範囲検索に変更
- React Queryのキャッシュキーに日付を追加

## 連絡先
問題が解決しない場合は、開発チームまでご連絡ください。