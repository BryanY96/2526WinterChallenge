#!/bin/bash

# 项目依赖安装脚本
# 使用方法: bash install.sh

echo "🚀 开始安装项目依赖..."
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    echo "   访问 https://nodejs.org/ 下载安装"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"
echo ""

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到package.json，请确保在项目根目录运行此脚本"
    exit 1
fi

echo "📦 开始安装依赖..."
echo ""

# 尝试方法1: 标准npm安装
echo "尝试方法1: npm install..."
if npm install 2>&1 | tee npm-install.log; then
    echo ""
    echo "✅ 依赖安装成功！"
    echo ""
    echo "📋 下一步:"
    echo "   运行 'npm run dev' 启动开发服务器"
    exit 0
fi

echo ""
echo "⚠️  方法1失败，尝试方法2..."

# 尝试方法2: 使用legacy-peer-deps
echo "尝试方法2: npm install --legacy-peer-deps..."
if npm install --legacy-peer-deps 2>&1 | tee npm-install.log; then
    echo ""
    echo "✅ 依赖安装成功！"
    echo ""
    echo "📋 下一步:"
    echo "   运行 'npm run dev' 启动开发服务器"
    exit 0
fi

echo ""
echo "❌ npm安装失败，请尝试以下方法："
echo ""
echo "方法A: 使用yarn"
echo "   1. 安装yarn: npm install -g yarn"
echo "   2. 安装依赖: yarn install"
echo ""
echo "方法B: 修复npm权限"
echo "   1. 清理缓存: npm cache clean --force"
echo "   2. 使用sudo: sudo npm install"
echo ""
echo "方法C: 使用nvm重新安装Node.js"
echo "   详细步骤请查看 INSTALL_GUIDE.md"
echo ""
echo "📖 更多帮助请查看: INSTALL_GUIDE.md"


