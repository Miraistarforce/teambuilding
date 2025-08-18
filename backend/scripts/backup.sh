#!/bin/bash

# ====================================
# チムビル 自動バックアップスクリプト
# ====================================

# 設定
BACKUP_BASE_DIR="/var/backups/teambuilding"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$DATE"
RETENTION_DAYS=30
LOG_FILE="$BACKUP_BASE_DIR/backup.log"

# 環境変数を読み込み
if [ -f /opt/teambuilding/backend/.env ]; then
    export $(cat /opt/teambuilding/backend/.env | grep -v '^#' | xargs)
fi

# バックアップディレクトリの作成
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_BASE_DIR/logs"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# エラーハンドリング
error_exit() {
    log "ERROR: $1"
    exit 1
}

log "========================================="
log "バックアップを開始します: $DATE"
log "========================================="

# 1. データベースのバックアップ
log "データベースのバックアップを開始..."

if [ "$DATABASE_URL" ]; then
    # PostgreSQLの場合
    if [[ "$DATABASE_URL" == postgres* ]]; then
        # DATABASE_URLからパラメータを抽出
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        
        PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/database.sql" || error_exit "データベースバックアップに失敗"
        
        # 圧縮
        gzip "$BACKUP_DIR/database.sql"
        log "データベースバックアップ完了: database.sql.gz"
    fi
else
    # SQLiteの場合（開発環境）
    if [ -f "/opt/teambuilding/backend/prisma/dev.db" ]; then
        cp "/opt/teambuilding/backend/prisma/dev.db" "$BACKUP_DIR/database.sqlite" || error_exit "SQLiteバックアップに失敗"
        gzip "$BACKUP_DIR/database.sqlite"
        log "SQLiteバックアップ完了: database.sqlite.gz"
    fi
fi

# 2. アップロードファイルのバックアップ
log "アップロードファイルのバックアップを開始..."

if [ -d "/opt/teambuilding/backend/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads.tar.gz" -C /opt/teambuilding/backend uploads/ 2>/dev/null || log "WARNING: アップロードファイルが見つかりません"
    log "アップロードファイルバックアップ完了: uploads.tar.gz"
fi

# 3. ログファイルのバックアップ
log "ログファイルのバックアップを開始..."

if [ -d "/opt/teambuilding/backend/logs" ]; then
    tar -czf "$BACKUP_DIR/logs.tar.gz" -C /opt/teambuilding/backend logs/ 2>/dev/null || log "WARNING: ログファイルが見つかりません"
    log "ログファイルバックアップ完了: logs.tar.gz"
fi

# 4. 設定ファイルのバックアップ（機密情報を除く）
log "設定ファイルのバックアップを開始..."

mkdir -p "$BACKUP_DIR/config"
cp /opt/teambuilding/backend/package.json "$BACKUP_DIR/config/" 2>/dev/null
cp /opt/teambuilding/backend/tsconfig.json "$BACKUP_DIR/config/" 2>/dev/null
cp /opt/teambuilding/backend/ecosystem.config.js "$BACKUP_DIR/config/" 2>/dev/null
# .envファイルは機密情報を含むため除外

tar -czf "$BACKUP_DIR/config.tar.gz" -C "$BACKUP_DIR" config/
rm -rf "$BACKUP_DIR/config"
log "設定ファイルバックアップ完了: config.tar.gz"

# 5. バックアップの統合アーカイブ作成
log "統合アーカイブを作成中..."

cd "$BACKUP_BASE_DIR"
tar -czf "backup_$DATE.tar.gz" "$DATE/"
rm -rf "$DATE"
log "統合アーカイブ作成完了: backup_$DATE.tar.gz"

# 6. バックアップのサイズ確認
BACKUP_SIZE=$(du -h "$BACKUP_BASE_DIR/backup_$DATE.tar.gz" | cut -f1)
log "バックアップサイズ: $BACKUP_SIZE"

# 7. 古いバックアップの削除
log "古いバックアップを削除中..."

find "$BACKUP_BASE_DIR" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
DELETED_COUNT=$(find "$BACKUP_BASE_DIR" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS | wc -l)
log "$DELETED_COUNT 個の古いバックアップを削除しました"

# 8. リモートバックアップ（オプション）
if [ "$REMOTE_BACKUP_HOST" ] && [ "$REMOTE_BACKUP_PATH" ]; then
    log "リモートバックアップを開始..."
    
    scp "$BACKUP_BASE_DIR/backup_$DATE.tar.gz" \
        "$REMOTE_BACKUP_USER@$REMOTE_BACKUP_HOST:$REMOTE_BACKUP_PATH/" || log "WARNING: リモートバックアップに失敗"
    
    if [ $? -eq 0 ]; then
        log "リモートバックアップ完了"
    fi
fi

# 9. AWS S3へのバックアップ（オプション）
if [ "$AWS_S3_BUCKET" ]; then
    log "AWS S3へのバックアップを開始..."
    
    aws s3 cp "$BACKUP_BASE_DIR/backup_$DATE.tar.gz" \
        "s3://$AWS_S3_BUCKET/backups/" || log "WARNING: S3バックアップに失敗"
    
    if [ $? -eq 0 ]; then
        log "S3バックアップ完了"
        
        # S3の古いバックアップを削除
        aws s3 ls "s3://$AWS_S3_BUCKET/backups/" | \
        while read -r line; do
            createDate=$(echo $line | awk '{print $1" "$2}')
            createDate=$(date -d "$createDate" +%s)
            olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
            if [[ $createDate -lt $olderThan ]]; then
                fileName=$(echo $line | awk '{print $4}')
                if [[ $fileName == backup_* ]]; then
                    aws s3 rm "s3://$AWS_S3_BUCKET/backups/$fileName"
                    log "S3から削除: $fileName"
                fi
            fi
        done
    fi
fi

# 10. バックアップの検証
log "バックアップの検証中..."

if [ -f "$BACKUP_BASE_DIR/backup_$DATE.tar.gz" ]; then
    tar -tzf "$BACKUP_BASE_DIR/backup_$DATE.tar.gz" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log "バックアップの検証: OK"
    else
        error_exit "バックアップファイルが破損しています"
    fi
else
    error_exit "バックアップファイルが見つかりません"
fi

# 11. 通知（オプション）
if [ "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ チムビル バックアップ完了\\nサイズ: $BACKUP_SIZE\\n日時: $DATE\"}" \
        "$SLACK_WEBHOOK_URL" 2>/dev/null
fi

log "========================================="
log "バックアップが正常に完了しました"
log "ファイル: backup_$DATE.tar.gz"
log "サイズ: $BACKUP_SIZE"
log "========================================="

exit 0