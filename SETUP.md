# 项目设置和修复指南

## 项目概述

这是一个冬季训练挑战追踪应用（Run Back Home 2026），用于追踪团队从华盛顿DC到中国漠河的跑步进度（目标10,000公里）。

### 主要功能模块

1. **HeroSection** - 显示倒计时到目标日期（2026年3月3日）
2. **MapSection** - 实时地图追踪，显示从DC到Anchorage到Mohe的路线
3. **StatsSection** - 显示总距离、目标完成百分比、本周活跃跑者数、本周距离
4. **LuckyChallenge** - 每周抽奖功能，从本周活跃跑者中抽取3名幸运跑者，并分配挑战任务
5. **Leaderboard** - 排行榜，显示总排行榜和每周排行榜
6. **GallerySection** - 展示上传的视频/图片
7. **UploadModal** - 上传视频的模态框（使用Cloudinary）
8. **BackgroundEffects** - 背景效果（雪花或烟花，根据日期切换）

## 修复编译错误的步骤

### 1. 安装项目依赖

首先，确保你已经安装了 Node.js（推荐版本 18+ 或 20+）。

```bash
# 在项目根目录执行
npm install
```

如果遇到权限问题，可以尝试：
```bash
# 使用 sudo（macOS/Linux）
sudo npm install

# 或者使用 yarn
yarn install

# 或者使用 pnpm
pnpm install
```

### 2. 验证依赖安装

安装完成后，应该会生成 `node_modules` 文件夹。检查以下关键依赖是否已安装：

- react
- react-dom
- typescript
- vite
- @vitejs/plugin-react
- @types/react
- @types/react-dom
- leaflet
- react-leaflet
- lucide-react
- papaparse

### 3. 运行开发服务器

```bash
npm run dev
```

项目应该会在 `http://localhost:5173` 启动（Vite默认端口）。

### 4. 构建生产版本

```bash
npm run build
```

构建产物会在 `dist` 目录中。

## 已修复的问题

1. ✅ **添加了缺失的CSS动画** - `animate-fadeIn` 动画已添加到 `index.html`
2. ✅ **TypeScript配置** - 配置已正确设置，支持React JSX

## 常见问题排查

### 问题1: "Cannot find module 'react'"

**原因**: 依赖未安装或 node_modules 缺失

**解决方案**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### 问题2: TypeScript类型错误

**原因**: @types 包未正确安装

**解决方案**:
```bash
npm install --save-dev @types/react @types/react-dom @types/leaflet @types/papaparse
```

### 问题3: Vite启动失败

**原因**: 端口被占用或配置问题

**解决方案**:
- 检查 `vite.config.ts` 配置
- 尝试使用其他端口: `npm run dev -- --port 3000`

### 问题4: 地图不显示

**原因**: Leaflet CSS未加载

**解决方案**: 检查 `index.html` 中是否包含 Leaflet CSS 链接（已包含）

## 项目配置说明

### 环境变量

项目使用以下配置（在 `App.tsx` 中）:
- `SPREADSHEET_ID`: Google Sheets ID（用于数据源）
- `CLOUD_NAME`: Cloudinary云名称（用于图片/视频上传）
- `UPLOAD_PRESET`: Cloudinary上传预设
- `GOOGLE_SCRIPT_URL`: Google Apps Script URL（用于提交数据）

### 数据源

项目从Google Sheets读取数据：
- 每周数据表：W1, W2, W3...
- 媒体存储表：Media Storage（用于图库）

### 挑战池

挑战任务列表存储在 `public/ChallengesPool.txt` 文件中。

## 开发建议

1. **代码风格**: 项目使用TypeScript + React，遵循React Hooks最佳实践
2. **样式**: 使用Tailwind CSS（通过CDN），所有样式都是内联类名
3. **类型安全**: 确保所有组件都有正确的TypeScript类型定义
4. **测试**: 在修改代码后，运行 `npm run build` 确保没有编译错误

## 下一步

1. 安装依赖: `npm install`
2. 启动开发服务器: `npm run dev`
3. 在浏览器中打开 `http://localhost:5173`
4. 开始开发和测试！


