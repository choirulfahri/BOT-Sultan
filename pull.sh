#!/bin/bash
echo "========================================"
echo "MENARIK UPDATE TERBARU DARI GITHUB..."
echo "========================================"
cd /root/BOT-Sultan || exit
git fetch origin main
git reset --hard origin/main

echo "========================================"
echo "MENGUPDATE LIBRARY & RESTART BOT..."
echo "========================================"
npm install
pm2 restart bot-sultan

echo "========================================"
echo "SERVER BERHASIL DIUPDATE!"
echo "========================================"
