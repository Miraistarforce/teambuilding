#!/bin/bash

echo "🚀 TeamBuild システムを起動しています..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kill existing processes on the ports
echo -e "${YELLOW}既存のプロセスをクリーンアップ中...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3100 | xargs kill -9 2>/dev/null
lsof -ti:3200 | xargs kill -9 2>/dev/null

# Start main application
echo -e "${BLUE}[1/3] メインアプリケーション起動中 (Port 3000)...${NC}"
cd /Users/yohei/teambuilding && npm run dev &
PID1=$!

# Start admin dashboard
echo -e "${BLUE}[2/3] 管理ダッシュボード起動中 (Port 3100)...${NC}"
cd /Users/yohei/teambuilding/admin-dashboard && npm run dev &
PID2=$!

# Start company login
echo -e "${BLUE}[3/3] 会社ログインシステム起動中 (Port 3200)...${NC}"
cd /Users/yohei/teambuilding/company-login && npm run dev &
PID3=$!

# Wait a moment for servers to start
sleep 3

echo ""
echo -e "${GREEN}✅ すべてのシステムが起動しました！${NC}"
echo ""
echo "📍 アクセスURL:"
echo -e "  ${GREEN}メインアプリ:${NC}     http://localhost:3000"
echo -e "  ${GREEN}管理ダッシュボード:${NC} http://localhost:3100 (Secret: admin-secret-2024)"
echo -e "  ${GREEN}会社ログイン:${NC}      http://localhost:3200"
echo ""
echo "📝 デモアカウント:"
echo "  会社名: デモ会社"
echo "  パスワード: demo123"
echo ""
echo -e "${YELLOW}終了するには Ctrl+C を押してください${NC}"

# Function to handle Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}システムを終了しています...${NC}"
    kill $PID1 2>/dev/null
    kill $PID2 2>/dev/null
    kill $PID3 2>/dev/null
    echo -e "${GREEN}✅ 終了しました${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running
wait