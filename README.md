<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🏃‍♂️ 跑向春天 - Winter Challenge 2026

一个冬季训练挑战追踪应用，用于追踪团队从华盛顿DC到中国漠河的跑步进度（目标10,000公里）。

## 📋 项目功能

- **实时地图追踪**: 显示从DC到Anchorage到Mohe的路线进度
- **排行榜系统**: 总排行榜和每周排行榜，支持连击奖励
- **幸运挑战**: 每周抽取3名幸运跑者并分配挑战任务
- **图库展示**: 展示跑者上传的训练视频和图片
- **数据统计**: 总距离、完成百分比、活跃跑者数等

## 🚀 快速开始

### 前置要求

- Node.js 18+ 或 20+
- npm, yarn, 或 pnpm

### 安装步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **在浏览器中打开**
   ```
   http://localhost:5173
   ```

### 构建生产版本

```bash
npm run build
```

## 🔧 修复编译错误

如果遇到编译错误，请参考 [SETUP.md](./SETUP.md) 获取详细的修复指南。

常见问题：
- **依赖未安装**: 运行 `npm install`
- **TypeScript错误**: 确保所有 `@types` 包已安装
- **模块找不到**: 检查 `node_modules` 是否存在

## 📁 项目结构

```
├── App.tsx                 # 主应用组件
├── components/             # React组件
│   ├── HeroSection.tsx     # 首页标题和倒计时
│   ├── MapSection.tsx      # 地图追踪组件
│   ├── StatsSection.tsx    # 统计信息
│   ├── LuckyChallenge.tsx  # 幸运挑战抽奖
│   ├── Leaderboard.tsx     # 排行榜
│   ├── GallerySection.tsx  # 图库展示
│   ├── UploadModal.tsx     # 上传模态框
│   └── BackgroundEffects.tsx # 背景动画效果
├── public/                 # 静态资源
│   ├── ChallengesPool.txt  # 挑战任务池
│   └── horse_runner.png    # 地图标记图标
└── index.html             # HTML入口文件
```

## 🛠️ 技术栈

- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Leaflet** - 地图库
- **Tailwind CSS** - 样式框架（CDN）
- **Lucide React** - 图标库
- **PapaParse** - CSV解析
- **Cloudinary** - 媒体上传和存储

## 📝 配置说明

主要配置在 `App.tsx` 中：
- `SPREADSHEET_ID`: Google Sheets数据源ID
- `CLOUD_NAME`: Cloudinary云名称
- `UPLOAD_PRESET`: Cloudinary上传预设
- `GOOGLE_SCRIPT_URL`: Google Apps Script URL

## 📚 更多信息

详细的项目设置和故障排除指南，请查看 [SETUP.md](./SETUP.md)

## 📄 许可证

本项目为私有项目。
