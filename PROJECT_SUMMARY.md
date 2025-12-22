# 项目总结和模块说明

## 📖 项目概述

**WinterChallenge** 是一个冬季训练挑战追踪应用，用于追踪团队从华盛顿DC到中国漠河的跑步进度。

### 核心目标
- **总目标**: 10,000公里
- **起始日期**: 2025年12月15日
- **目标日期**: 2026年3月3日（元宵节）

## 🧩 模块详细说明

### 1. HeroSection（首页标题区）
**文件**: `components/HeroSection.tsx`

**功能**:
- 显示项目标题"🏃‍♂️ 跑向春天"
- 实时倒计时到目标日期（天、小时、分钟）
- 显示挑战主题和路线信息

**关键特性**:
- 自动更新倒计时（每秒刷新）
- 响应式设计，支持移动端和桌面端

---

### 2. MapSection（地图追踪区）
**文件**: `components/MapSection.tsx`

**功能**:
- 显示从DC到Anchorage到Mohe的完整路线
- 实时显示当前进度位置（基于总完成百分比）
- 标记起点（DC）、补给站（Anchorage）、终点（Mohe）
- 动态显示当前位置标签

**关键特性**:
- 使用Leaflet地图库
- 大圆航线计算（Great Circle）
- 动态图标大小（根据缩放级别）
- 已完成路径（红色）和未完成路径（灰色虚线）
- 自动跟随当前位置

**路线分段**:
- DC → Anchorage: ~5,400km
- Anchorage → Mohe: ~4,700km

---

### 3. StatsSection（统计信息区）
**文件**: `components/StatsSection.tsx`

**功能**:
- 显示总距离和完成百分比
- 显示本周活跃跑者数量
- 显示本周累计距离

**关键特性**:
- 动态进度条（带动画效果）
- 响应式卡片布局

---

### 4. LuckyChallenge（幸运挑战区）
**文件**: `components/LuckyChallenge.tsx`

**功能**:
- 每周从活跃跑者中抽取3名幸运跑者
- 为幸运跑者分配挑战任务
- 提供上传视频的入口

**关键特性**:
- **确定性随机**: 基于周ID（如"W1"）生成固定结果，确保所有人看到相同结果
- **时间锁定**: 仅在周日晚上8点EST到周一凌晨12点EST开放抽奖
- **挑战池**: 从 `public/ChallengesPool.txt` 加载挑战任务
- **动画效果**: 抽奖时的洗牌动画

**挑战类型**:
- 核心训练（平板支撑、仰卧起坐等）
- 有氧运动（波比跳、开合跳等）
- 腿部训练（深蹲、靠墙静蹲等）
- 趣味挑战（熊爬、滑冰跳等）
- 平衡训练（闭眼单腿站立等）

---

### 5. Leaderboard（排行榜）
**文件**: `components/Leaderboard.tsx`

**功能**:
- 显示总排行榜和每周排行榜
- 支持切换不同周期查看
- 显示连击奖励和完美周标记

**关键特性**:
- **总排行榜**: 显示累计距离和连击数
  - 7+连击显示皇冠图标（Elite Achievement）
  - 其他连击显示火焰图标
- **周排行榜**: 显示每周距离和连击奖励
  - 5天以上连击获得1.2倍奖励
  - 显示原始距离+奖励距离
- **排名标记**: 前三名显示金银铜牌图标
- **展开/收起**: 支持查看完整列表

**连击系统**:
- 每周至少5天有跑步记录 = 连击
- 连击奖励: 1.2倍距离加成
- 完美周: 所有周都有连击

---

### 6. GallerySection（图库展示区）
**文件**: `components/GallerySection.tsx`

**功能**:
- 展示跑者上传的训练视频和图片
- 支持视频自动播放（循环、静音）
- 响应式布局（移动端和桌面端不同）

**关键特性**:
- **数据源**: 从Google Sheets的"Media Storage"表读取
- **视频支持**: 自动识别视频格式（mp4, mov, webm等）
- **移动端**: 2行网格，横向滚动
- **桌面端**: 单行大卡片，横向滚动
- **悬停效果**: 显示跑者名称和头像

---

### 7. UploadModal（上传模态框）
**文件**: `components/UploadModal.tsx`

**功能**:
- 允许跑者上传训练视频
- 集成Cloudinary上传服务
- 提交数据到Google Sheets

**关键特性**:
- **视频限制**: 仅支持视频格式，最大500MB
- **自动优化**: Cloudinary自动压缩和优化
- **2倍速处理**: 视频自动加速2倍
- **数据提交**: 通过Google Apps Script提交到Sheet

**上传流程**:
1. 输入跑者姓名
2. 点击上传按钮
3. Cloudinary上传视频
4. 自动提交到Google Sheets
5. 刷新图库显示新内容

---

### 8. BackgroundEffects（背景效果）
**文件**: `components/BackgroundEffects.tsx`

**功能**:
- 根据日期自动切换背景效果
- 春节期间显示烟花效果
- 其他时间显示雪花效果

**关键特性**:
- **雪花效果**: 40个雪花图标随机飘落
- **烟花效果**: Canvas绘制的烟花和鞭炮动画
- **自动切换**: 
  - 2025年春节: 1月15日 - 2月15日
  - 2026年春节: 2月1日 - 3月3日

---

### 9. App.tsx（主应用组件）
**文件**: `App.tsx`

**功能**:
- 整合所有组件
- 从Google Sheets获取数据
- 处理CSV数据解析
- 计算排行榜和统计数据

**关键逻辑**:
- **数据获取**: 循环获取W1, W2, W3...等周数据表
- **CSV解析**: 使用PapaParse解析Google Sheets导出的CSV
- **距离计算**: 
  - 识别"Total"列或计算所有数值列之和
  - 识别每日列（周一-周日或日期格式）
  - 计算连击（5天以上 = 1.2倍奖励）
- **数据处理**: 
  - 计算总排行榜
  - 计算每周排行榜
  - 识别当前周和活跃跑者
  - 处理图库数据

**配置常量**:
- `SPREADSHEET_ID`: Google Sheets ID
- `CLOUD_NAME`: Cloudinary云名称
- `UPLOAD_PRESET`: Cloudinary上传预设
- `GOOGLE_SCRIPT_URL`: Google Apps Script URL
- `GOAL_KM`: 目标距离（10,000km）
- `START_DATE`: 开始日期（2025-12-15）

---

## 🔄 数据流程

1. **数据获取**: 
   - 从Google Sheets获取每周数据（W1, W2...）
   - 从"Media Storage"表获取图库数据

2. **数据处理**:
   - 解析CSV数据
   - 计算距离和连击
   - 应用奖励倍数
   - 排序和分组

3. **状态管理**:
   - React Hooks管理所有状态
   - 自动刷新数据

4. **用户交互**:
   - 上传视频 → Cloudinary → Google Sheets
   - 抽奖 → 本地存储记录已查看状态

---

## 🛠️ 技术实现细节

### 地图计算
- 使用大圆航线算法计算DC到Mohe的最短路径
- 分段计算：DC → Anchorage → Mohe
- 处理经度跨越180度的问题（unwrap逻辑）

### 随机数生成
- 基于字符串哈希生成种子
- 线性同余生成器（LCG）确保确定性
- 同一周ID总是产生相同结果

### 响应式设计
- Tailwind CSS（通过CDN）
- 移动端优先设计
- 断点：sm, md, lg, xl

---

## 📊 数据结构

### RunnerData接口
```typescript
interface RunnerData {
  name: string;
  distance: number;
  rawDistance?: number;
  bonusDistance?: number;
  streakCount?: number;
  hasStreak?: boolean;
  isPerfect?: boolean;
}
```

### Period接口
```typescript
interface Period {
  label: string;
  runners: RunnerData[];
}
```

### GalleryItem接口
```typescript
interface GalleryItem {
  name: string;
  url: string;
  timestamp?: string;
}
```

---

## 🎯 下一步开发建议

1. **错误处理**: 增强网络错误和异常处理
2. **加载状态**: 改进数据加载时的UI反馈
3. **缓存机制**: 添加本地缓存减少API调用
4. **单元测试**: 添加关键逻辑的单元测试
5. **性能优化**: 优化大数据量的渲染性能
6. **国际化**: 支持中英文切换

---

## 📝 注意事项

1. **Google Sheets访问**: 确保Sheet设置为"任何人可查看"
2. **Cloudinary配置**: 需要配置正确的上传预设
3. **Google Apps Script**: 需要部署为Web App并设置权限
4. **CORS问题**: Google Sheets CSV导出可能有CORS限制
5. **时区处理**: 抽奖时间基于EST时区

---

## ✅ 已完成的修复

1. ✅ 添加了缺失的CSS动画（animate-fadeIn）
2. ✅ 更新了README和SETUP文档
3. ✅ 验证了TypeScript配置
4. ✅ 检查了所有组件的类型定义

## 🔧 待解决的问题

1. ⏳ 需要安装依赖（npm install）
2. ⏳ 需要验证项目可以正常编译和运行


