# チムビル - デプロイメントガイド

## 🚀 デプロイ方法

### 前提条件
- Docker と Docker Compose がインストールされていること
- Node.js 18+ (ローカルビルドの場合)
- PostgreSQL 15+ (Dockerを使用しない場合)

## 1. Docker Composeを使用したデプロイ（推奨）

### 環境変数の設定
```bash
# .envファイルを作成
cat > .env << EOF
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_secure_jwt_secret
OPENAI_API_KEY=your_openai_api_key
EOF
```

### デプロイ実行
```bash
# 本番環境のビルドと起動
docker-compose -f docker-compose.production.yml up -d

# ログの確認
docker-compose -f docker-compose.production.yml logs -f

# データベースマイグレーション
docker-compose -f docker-compose.production.yml exec backend npx prisma migrate deploy
```

## 2. PM2を使用したデプロイ

### 依存関係のインストール
```bash
cd backend
npm ci --production
```

### ビルド
```bash
npm run build:production
```

### PM2でアプリケーション起動
```bash
# PM2のインストール（グローバル）
npm install -g pm2

# アプリケーション起動
pm2 start ecosystem.config.js --env production

# 起動時自動実行の設定
pm2 startup
pm2 save
```

## 3. システムサービスとしてのデプロイ

### systemdサービスファイルの作成
```bash
sudo nano /etc/systemd/system/teambuilding.service
```

```ini
[Unit]
Description=TeamBuilding Backend Service
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/teambuilding/backend
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### サービスの有効化と起動
```bash
sudo systemctl daemon-reload
sudo systemctl enable teambuilding
sudo systemctl start teambuilding
sudo systemctl status teambuilding
```

## 4. Nginxリバースプロキシ設定

### Nginx設定ファイル
```nginx
# /etc/nginx/sites-available/teambuilding
server {
    listen 80;
    server_name your-domain.com;
    
    # SSL redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL証明書
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # バックエンドAPI
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # タイムカードアプリ
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 管理画面
    location /admin {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL証明書の取得（Let's Encrypt）
```bash
# Certbotのインストール
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# SSL証明書の取得
sudo certbot --nginx -d your-domain.com

# 自動更新の設定
sudo systemctl enable certbot.timer
```

## 5. 環境別の設定

### 開発環境
```bash
npm run dev
```

### ステージング環境
```bash
NODE_ENV=staging npm start
```

### 本番環境
```bash
NODE_ENV=production npm start
```

## 6. ヘルスチェックとモニタリング

### ヘルスチェックエンドポイント
バックエンドには `/health` エンドポイントが実装されています。

```bash
curl http://localhost:3001/health
```

### ログの確認

#### PM2使用時
```bash
pm2 logs teambuilding-backend
pm2 monit
```

#### Dockerを使用時
```bash
docker-compose -f docker-compose.production.yml logs -f backend
```

#### systemd使用時
```bash
sudo journalctl -u teambuilding -f
```

## 7. バックアップとリストア

### データベースバックアップ
```bash
# バックアップスクリプト
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/teambuilding"
mkdir -p $BACKUP_DIR

# PostgreSQLバックアップ
pg_dump -U teambuilding_user -d teambuilding_db > "$BACKUP_DIR/backup_$DATE.sql"

# 古いバックアップの削除（30日以上）
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

### リストア
```bash
psql -U teambuilding_user -d teambuilding_db < backup_20240101_120000.sql
```

## 8. トラブルシューティング

### ポート競合
```bash
# 使用中のポートを確認
sudo lsof -i :3001
sudo lsof -i :4000
sudo lsof -i :4001

# プロセスを終了
kill -9 <PID>
```

### メモリ不足
```bash
# PM2のメモリ制限を調整
pm2 start ecosystem.config.js --max-memory-restart 2G
```

### データベース接続エラー
```bash
# PostgreSQLの状態確認
sudo systemctl status postgresql

# 接続テスト
psql -U teambuilding_user -d teambuilding_db -h localhost
```

## 9. セキュリティチェックリスト

- [ ] 本番用の強力なパスワードを設定
- [ ] JWT_SECRETを安全なランダム文字列に変更
- [ ] SSL証明書を設定
- [ ] ファイアウォールを設定
- [ ] 不要なポートを閉じる
- [ ] 定期的なバックアップを設定
- [ ] ログローテーションを設定
- [ ] セキュリティアップデートを適用

## 10. パフォーマンス最適化

### Node.jsの最適化
```bash
# 本番環境での起動
NODE_ENV=production node --max-old-space-size=4096 dist/index.js
```

### PostgreSQLの最適化
```sql
-- postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

### Nginxの最適化
```nginx
worker_processes auto;
worker_rlimit_nofile 65535;
worker_connections 2048;
```

## サポート

問題が発生した場合は、以下を確認してください：
1. ログファイル（`/app/logs/`）
2. 環境変数の設定
3. データベース接続
4. ネットワーク設定