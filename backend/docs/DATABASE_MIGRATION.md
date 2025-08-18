# データベース移行ガイド

## 開発環境から本番環境への移行

### 1. PostgreSQLのセットアップ

#### PostgreSQLのインストール
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
```

#### データベースとユーザーの作成
```sql
-- PostgreSQLにログイン
sudo -u postgres psql

-- データベースの作成
CREATE DATABASE teambuilding_db;

-- ユーザーの作成
CREATE USER teambuilding_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- 権限の付与
GRANT ALL PRIVILEGES ON DATABASE teambuilding_db TO teambuilding_user;

-- 終了
\q
```

### 2. 環境変数の設定

```bash
# .env.productionファイルの作成
cp .env.production.example .env.production

# 環境変数の編集
nano .env.production
```

以下の値を設定：
```env
DATABASE_URL=postgresql://teambuilding_user:your_secure_password@localhost:5432/teambuilding_db?schema=public
NODE_ENV=production
JWT_SECRET=[強力なランダム文字列]
OPENAI_API_KEY=[OpenAI APIキー]
```

### 3. Prismaスキーマの切り替え

```bash
# 本番用スキーマを使用
cp prisma/schema.production.prisma prisma/schema.prisma

# 依存関係のインストール
npm install

# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーションの実行
npx prisma migrate deploy
```

### 4. 既存データの移行（オプション）

#### SQLiteからPostgreSQLへのデータ移行

```bash
# SQLiteデータのエクスポート
sqlite3 dev.db .dump > backup.sql

# PostgreSQL用に変換（手動で調整が必要）
# - AUTOINCREMENT → SERIAL
# - datetime('now') → CURRENT_TIMESTAMP
# - その他の構文の違いを修正

# PostgreSQLへインポート
psql -U teambuilding_user -d teambuilding_db < backup_converted.sql
```

### 5. データベースの最適化

```sql
-- インデックスの確認と最適化
ANALYZE;

-- 定期的なバキューム
VACUUM ANALYZE;

-- 接続プールの設定（postgresql.conf）
max_connections = 100
shared_buffers = 256MB
```

### 6. バックアップ設定

#### 自動バックアップスクリプト
```bash
#!/bin/bash
# /usr/local/bin/backup-teambuilding.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/teambuilding"
DB_NAME="teambuilding_db"
DB_USER="teambuilding_user"

# バックアップディレクトリの作成
mkdir -p $BACKUP_DIR

# データベースのバックアップ
pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/backup_$DATE.sql"

# 古いバックアップの削除（30日以上）
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql"
```

#### Cronジョブの設定
```bash
# crontabの編集
crontab -e

# 毎日午前2時にバックアップ
0 2 * * * /usr/local/bin/backup-teambuilding.sh
```

### 7. 本番環境のセキュリティ設定

#### PostgreSQLのセキュリティ
```bash
# pg_hba.confの設定
# /etc/postgresql/[version]/main/pg_hba.conf

# ローカル接続のみ許可
local   all   teambuilding_user   md5
host    all   teambuilding_user   127.0.0.1/32   md5

# PostgreSQLの再起動
sudo systemctl restart postgresql
```

#### ファイアウォール設定
```bash
# UFWの場合
sudo ufw allow from 127.0.0.1 to any port 5432
sudo ufw deny 5432
```

### 8. 監視とメンテナンス

#### データベース統計の確認
```sql
-- テーブルサイズの確認
SELECT 
  schemaname AS schema,
  tablename AS table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- スロークエリの確認
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 9. トラブルシューティング

#### 接続エラー
```bash
# PostgreSQLの状態確認
sudo systemctl status postgresql

# ログの確認
sudo tail -f /var/log/postgresql/postgresql-*.log

# 接続テスト
psql -U teambuilding_user -d teambuilding_db -h localhost
```

#### パフォーマンス問題
```sql
-- 実行中のクエリ確認
SELECT pid, age(clock_timestamp(), query_start), usename, query 
FROM pg_stat_activity 
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%' 
ORDER BY query_start desc;

-- スロークエリのキャンセル
SELECT pg_cancel_backend(pid);
```

### 10. ロールバック手順

万が一問題が発生した場合：

```bash
# バックアップからの復元
psql -U teambuilding_user -d teambuilding_db < /var/backups/teambuilding/backup_YYYYMMDD_HHMMSS.sql

# または、SQLiteに戻す場合
cp prisma/schema.prisma prisma/schema.production.prisma
git checkout prisma/schema.prisma
npx prisma generate
```

## MySQL/MariaDBを使用する場合

MySQL/MariaDBを使用する場合は、schema.production.prismaのdatasourceを以下のように変更：

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

環境変数：
```env
DATABASE_URL=mysql://user:password@localhost:3306/teambuilding_db
```

注意点：
- `@db.Text`アノテーションはそのまま使用可能
- インデックスの構文は同じ
- CASCADE削除も同様に動作