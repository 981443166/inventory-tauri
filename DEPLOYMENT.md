# 库存管理系统部署文档

## 技术栈

### 前端
- **框架**: React 19.2.5
- **构建工具**: Vite 8.0.10
- **样式**: Tailwind CSS 4.2.4
- **图标**: Lucide React 1.11.0
- **桌面应用**: Tauri 2.10.1

### 后端
- **运行环境**: Node.js
- **框架**: Express 5.2.1
- **数据库**: SQLite (better-sqlite3 12.9.0)
- **跨域**: CORS

## 部署步骤

### 1. 环境准备

#### 前端依赖
- Node.js 18.x 或更高版本
- npm 或 yarn
- Tauri 依赖（用于构建桌面应用）
  - Windows: Visual Studio 构建工具
  - macOS: Xcode 命令行工具
  - Linux: 相应的构建依赖

#### 后端依赖
- Node.js 18.x 或更高版本
- npm 或 yarn

### 2. 安装依赖

#### 前端
```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI（如果尚未安装）
npm install -g @tauri-apps/cli
```

#### 后端
```bash
# 进入后端目录
cd server

# 安装后端依赖
npm install
```

### 3. 配置

#### 前端配置
- 无需特殊配置，直接使用默认配置即可
- 前端会自动连接到 `http://localhost:3001` 上的后端服务

#### 后端配置
- 无需特殊配置，数据库文件会自动创建在 `server/inventory.db`

### 4. 开发环境运行

#### 启动后端服务
```bash
# 进入后端目录
cd server

# 启动后端服务
npm start
```

#### 启动前端开发服务器
```bash
# 回到项目根目录
cd ..

# 启动前端开发服务器
npm run dev
```

### 5. 生产环境构建

#### 构建前端静态文件
```bash
# 构建前端
npm run build
```

#### 构建桌面应用
```bash
# 构建 Tauri 桌面应用
npm run tauri build
```

### 6. 部署选项

#### 选项 1: 桌面应用（推荐）
- 构建完成后，桌面应用会生成在 `src-tauri/target/release/` 目录
- 可以直接运行生成的可执行文件

#### 选项 2: Web 应用
1. 构建前端静态文件
2. 将 `dist` 目录部署到任何静态网站托管服务
3. 启动后端服务（可以部署到 Node.js 服务器）

### 7. 数据库管理

- 数据库文件位于 `server/inventory.db`
- 可以使用 SQLite 工具（如 DB Browser for SQLite）查看和管理数据
- 首次运行时会自动创建数据库表结构

### 8. 常见问题

#### 端口冲突
- 如果端口 3001（后端）被占用，可以修改 `server/server.js` 中的端口号
- 如果端口 5173（前端开发）被占用，Vite 会自动尝试其他端口

#### 数据库问题
- 如果数据库文件损坏，可以删除 `server/inventory.db` 文件，重启服务后会自动重建
- 首次运行时可能会有数据迁移操作，这是正常的

#### Tauri 构建问题
- 确保安装了所有 Tauri 依赖
- 参考 [Tauri 官方文档](https://tauri.app/v1/guides/getting-started/prerequisites) 了解详细的依赖要求

## 技术架构

### 前端架构
- 单页面应用 (SPA)
- 组件化设计
- 状态管理：React 内置 useState、useEffect
- 样式：Tailwind CSS 原子化CSS

### 后端架构
- RESTful API 设计
- 数据库：SQLite 轻量级数据库
- 数据模型：products、brands、categories、units、inventory_records

### 数据流
1. 前端通过 API 与后端交互
2. 后端处理数据并与 SQLite 数据库交互
3. 数据变更实时同步到前端

## 功能模块

- 商品管理：添加、编辑、删除商品
- 库存管理：入库、出库、库存查询
- 财务管理：客户对账、收款记录
- 基础设置：品牌、分类、单位管理

## 安全注意事项

- 本项目为本地应用，数据存储在本地 SQLite 数据库
- 如需部署到生产环境，建议添加身份验证和数据备份机制
- 定期备份数据库文件以防止数据丢失

---

部署完成后，您就可以开始使用这个库存管理系统了！