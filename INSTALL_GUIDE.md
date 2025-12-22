# 📦 依赖安装指南

## ✅ 当前环境状态

- ✅ Node.js 已安装: v22.2.0
- ✅ npm 已安装: v10.7.0
- ❌ 项目依赖未安装（导致编译错误）

## 🔧 解决方案

### 方案1: 使用 npm（推荐）

如果遇到权限错误，请尝试以下步骤：

#### 步骤1: 清理npm缓存
```bash
npm cache clean --force
```

#### 步骤2: 检查npm配置
```bash
npm config get prefix
npm config get cache
```

#### 步骤3: 安装依赖
```bash
cd "/Users/yushifu24/Documents/Side Projects/Repos/2526WinterChallenge"
npm install
```

如果仍然遇到权限问题，可以尝试：
```bash
# 使用sudo（macOS/Linux）
sudo npm install

# 或者使用--legacy-peer-deps标志
npm install --legacy-peer-deps
```

---

### 方案2: 使用 yarn（推荐替代方案）

Yarn通常比npm更稳定，权限问题更少。

#### 步骤1: 安装yarn（如果未安装）
```bash
# 使用npm安装yarn
npm install -g yarn

# 或者使用Homebrew（macOS）
brew install yarn

# 或者使用corepack（Node.js 16.10+自带）
corepack enable
```

#### 步骤2: 使用yarn安装依赖
```bash
cd "/Users/yushifu24/Documents/Side Projects/Repos/2526WinterChallenge"
yarn install
```

---

### 方案3: 使用 pnpm（轻量级替代）

pnpm是另一个优秀的包管理器。

#### 步骤1: 安装pnpm
```bash
# 使用npm安装
npm install -g pnpm

# 或使用Homebrew（macOS）
brew install pnpm

# 或使用corepack
corepack enable
corepack prepare pnpm@latest --activate
```

#### 步骤2: 使用pnpm安装依赖
```bash
cd "/Users/yushifu24/Documents/Side Projects/Repos/2526WinterChallenge"
pnpm install
```

---

### 方案4: 修复npm权限问题（macOS）

如果npm本身有权限问题，可以修复npm的安装：

#### 方法A: 使用nvm重新安装Node.js（推荐）
```bash
# 1. 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. 重新加载shell配置
source ~/.zshrc  # 或 source ~/.bash_profile

# 3. 使用nvm安装Node.js
nvm install 22
nvm use 22

# 4. 验证安装
node --version
npm --version

# 5. 安装项目依赖
cd "/Users/yushifu24/Documents/Side Projects/Repos/2526WinterChallenge"
npm install
```

#### 方法B: 修复npm全局目录权限
```bash
# 1. 创建全局目录
mkdir ~/.npm-global

# 2. 配置npm使用新目录
npm config set prefix '~/.npm-global'

# 3. 添加到PATH（添加到~/.zshrc或~/.bash_profile）
export PATH=~/.npm-global/bin:$PATH

# 4. 重新加载shell
source ~/.zshrc

# 5. 安装依赖
cd "/Users/yushifu24/Documents/Side Projects/Repos/2526WinterChallenge"
npm install
```

---

## 📋 安装后验证

安装完成后，请验证以下内容：

### 1. 检查node_modules目录
```bash
ls -la node_modules | head -20
```

应该能看到react、react-dom等目录。

### 2. 检查关键依赖
```bash
# 检查react
ls node_modules/react

# 检查typescript
ls node_modules/typescript

# 检查vite
ls node_modules/vite
```

### 3. 运行TypeScript检查
```bash
npx tsc --noEmit
```

如果没有错误，说明依赖安装成功！

### 4. 启动开发服务器
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

---

## 🐛 常见问题排查

### 问题1: "Cannot find module 'react'"

**原因**: 依赖未安装或node_modules缺失

**解决**:
```bash
# 删除node_modules和锁文件
rm -rf node_modules package-lock.json yarn.lock pnpm-lock.yaml

# 重新安装
npm install
# 或
yarn install
# 或
pnpm install
```

### 问题2: npm权限错误（EPERM）

**原因**: npm全局安装目录权限问题

**解决**: 使用方案4修复npm权限，或使用yarn/pnpm

### 问题3: 网络连接问题

**原因**: 无法访问npm registry

**解决**:
```bash
# 使用国内镜像（中国用户）
npm config set registry https://registry.npmmirror.com

# 或使用淘宝镜像
npm config set registry https://registry.npm.taobao.org

# 安装完成后可以恢复
npm config set registry https://registry.npmjs.org
```

### 问题4: 版本冲突

**原因**: 依赖版本不兼容

**解决**:
```bash
# 使用legacy peer deps
npm install --legacy-peer-deps

# 或使用yarn（自动处理）
yarn install
```

---

## 🎯 推荐操作流程

1. **首先尝试yarn**（最稳定）:
   ```bash
   # 安装yarn（如果未安装）
   npm install -g yarn
   
   # 安装依赖
   yarn install
   ```

2. **如果yarn不可用，尝试修复npm**:
   ```bash
   # 清理缓存
   npm cache clean --force
   
   # 使用legacy peer deps
   npm install --legacy-peer-deps
   ```

3. **验证安装**:
   ```bash
   # 检查node_modules
   ls node_modules/react
   
   # 运行开发服务器
   npm run dev
   ```

---

## 📞 需要帮助？

如果以上方法都不行，请提供以下信息：
1. 错误信息的完整输出
2. 使用的包管理器（npm/yarn/pnpm）
3. Node.js和npm版本（`node --version` 和 `npm --version`）


