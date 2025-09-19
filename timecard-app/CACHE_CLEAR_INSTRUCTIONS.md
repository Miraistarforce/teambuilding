# ブラウザキャッシュクリア手順

## 13時エラー解決のための重要な手順

### 1. Chrome/Edge でのキャッシュクリア

1. **デベロッパーツールを開く**
   - Windows: `F12` または `Ctrl + Shift + I`
   - Mac: `Command + Option + I`

2. **Application タブを選択**

3. **Storage セクションで以下を実行:**
   - 「Clear site data」をクリック
   - または個別に削除:
     - Local Storage → サイトを右クリック → Clear
     - Session Storage → サイトを右クリック → Clear
     - Cache Storage → 全て削除
     - Service Workers → Unregister

4. **ハードリロード**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Command + Shift + R`

### 2. Safari でのキャッシュクリア

1. **開発メニューを有効化**
   - Safari → 環境設定 → 詳細 → 「メニューバーに開発メニューを表示」

2. **キャッシュを空にする**
   - 開発 → キャッシュを空にする

3. **ページをリロード**
   - `Command + R`

### 3. iPad/iPhone でのキャッシュクリア

1. **設定アプリを開く**
2. **Safari を選択**
3. **「履歴とWebサイトデータを消去」をタップ**
4. **確認画面で「消去」をタップ**

### 4. Service Worker の確認

ブラウザのコンソールで以下を実行して確認:

```javascript
// Service Worker のバージョン確認
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    console.log('Service Worker:', registration);
  }
});
```

正常に更新されていれば「Service Worker v3 activated」というログが表示されます。

## 注意事項

- **必ずVercelのデプロイが完了してから**キャッシュクリアを実行してください
- 全てのタブを閉じてから再度開くことを推奨します
- それでも問題が解決しない場合は、ブラウザを完全に終了して再起動してください

## 確認方法

1. デベロッパーツールのConsoleタブを開く
2. 「Service Worker v3 activated」のログを確認
3. 「Deleting old cache」のログを確認
4. Supabase関連のエラーが表示されないことを確認