# Chaster - 时间锁加密内容保护应用

基于**时间锁加密技术 (Timelock Encryption)** 和 **drand 去中心化随机信标网络**的内容保护应用。

## ✨ 核心特性

- 🔐 **真正的强制时间锁**：基于密码学，无法提前解密
- 🌐 **去中心化信任**：依赖 drand 公共随机信标，无需信任第三方
- 🔄 **多层加密**：支持对已加密内容再次加密，延长锁定时间
- 📱 **响应式设计**：完美适配桌面和移动设备
- 🎨 **现代化 UI**：简洁美观的用户界面

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
打开 http://localhost:3000
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 或直接使用 Docker
docker build -t chaster .
docker run -p 3000:3000 -v $(pwd)/data:/app/data chaster
```

## 📚 技术栈

- **框架**：Next.js 16 + React 19
- **样式**：Tailwind CSS 4
- **数据库**：SQLite (Better-SQLite3)
- **加密**：tlock-js + drand-client
- **语言**：TypeScript 5

## 🏗️ 架构特点

### 单用户模式（当前）
当前版本为单用户本地应用，所有数据存储在本地 SQLite 数据库中。

### 多用户架构预留
项目已预留多用户架构基础，将来可轻松升级：
- 所有数据表包含 `user_id` 字段
- 用户上下文抽象层 (`user-context.ts`)
- API 已支持用户级数据隔离

**升级到多用户预计只需 3-4 天**（相比完全重构节省 60%+ 时间）

详见 [多用户架构预留](docs/PRD.md#🏗️-多用户架构预留)

## 📖 文档

- [产品需求文档 (PRD)](docs/PRD.md) - 完整的产品规格说明
- [数据库迁移指南](docs/MIGRATION_GUIDE.md) - 架构升级与迁移说明

## 🔒 安全性

- **加密强度**：使用 BLS12-381 曲线的 IBE (Identity-Based Encryption)
- **去中心化**：drand 网络由多个独立节点运行，无单点故障
- **本地存储**：数据仅存储在本地，不上传第三方服务器
- **密码学保证**：时间到达前数学上无法解密

## 🛣️ 路线图

### 已完成
- ✅ 文本/图片时间锁加密
- ✅ 双模式时间设定（持续时长 / 绝对时间）
- ✅ 实时倒计时与自动解锁
- ✅ 延长锁定功能（多层加密）
- ✅ 响应式移动端适配
- ✅ 多用户架构预留

### 规划中
- 🔮 深色模式支持
- 🔮 标签/分类系统
- 🔮 导出功能
- 🔮 公开分享功能
- 🔮 通知提醒系统
- 🔮 完整多用户支持

## 📄 许可证

MIT License

---

**更新时间**：2025-12-26  
**版本**：v0.1.0 (Multi-User Ready)
