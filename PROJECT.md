# 极简进销存项目1.0文档

## 项目简介

这是一个基于 Tauri 和 React 构建的跨平台库存管理系统，支持 Windows、macOS 和 Linux 平台。系统采用前后端分离架构，前端使用 React + Tailwind CSS，后端使用 Express + SQLite。

## 技术栈

### 前端

- **React 19.2.5** - 用于构建用户界面的 JavaScript 库
- **Vite 8.0.10** - 现代化的前端构建工具
- **Tailwind CSS 4.2.4** - 实用优先的 CSS 框架
- **Tauri 2.10.1** - 用于构建跨平台桌面应用的框架
- **Lucide React 1.11.0** - 图标库

### 后端

- **Express 5.2.1** - 轻量级的 Node.js Web 框架
- **better-sqlite3 12.9.0** - 高性能的 SQLite 数据库驱动
- **CORS 2.8.6** - 处理跨域请求的中间件

## 项目结构

```
├── server/              # 后端代码
│   ├── database.js      # 数据库初始化和操作
│   ├── inventory.db     # SQLite 数据库文件
│   ├── package.json     # 后端依赖
│   └── server.js        # 后端服务器
├── src/                 # 前端源代码
│   ├── App.jsx          # 主应用组件
│   ├── main.jsx         # 应用入口
│   └── assets/          # 静态资源
├── src-tauri/           # Tauri 配置和代码
│   ├── src/             # Tauri Rust 代码
│   └── tauri.conf.json  # Tauri 配置文件
├── package.json         # 前端依赖
└── vite.config.js       # Vite 配置
```

## 主要功能

1. **商品管理**
   - 查看商品列表
   - 添加新商品
   - 删除商品
   - 查看商品库存状态
2. **品牌管理**
   - 查看品牌列表
   - 添加新品牌
   - 删除品牌
3. **分类管理**
   - 查看分类列表
   - 添加新分类
   - 删除分类
4. **单位管理**
   - 查看单位列表
   - 添加新单位
   - 删除单位
5. **出入库管理**
   - 记录商品入库
   - 记录商品出库
   - 查看出入库历史记录

## 数据库结构

### 1. 商品表 (products)

- `id` - 商品 ID (主键)
- `name` - 商品名称
- `price` - 商品价格
- `stock` - 商品库存
- `category` - 商品分类
- `updateTime` - 更新时间

### 2. 品牌表 (brands)

- `id` - 品牌 ID (主键)
- `name` - 品牌名称 (唯一)

### 3. 分类表 (categories)

- `id` - 分类 ID (主键)
- `name` - 分类名称 (唯一)

### 4. 单位表 (units)

- `id` - 单位 ID (主键)
- `name` - 单位名称 (唯一)

### 5. 出入库记录表 (inventory\_records)

- `id` - 记录 ID (主键)
- `productId` - 商品 ID (外键)
- `type` - 记录类型 (in/out)
- `quantity` - 数量
- `remark` - 备注
- `createTime` - 创建时间

## 部署步骤

### 1. 环境要求

- Node.js 16.0 或更高版本
- npm 或 yarn
- Rust (用于 Tauri 构建)

### 2. 安装依赖

#### 前端依赖

```bash
npm install
```

#### 后端依赖

```bash
cd server
npm install
cd ..
```

### 3. 启动开发服务器

#### 启动后端服务器

```bash
cd server
npm start
cd ..
```

后端服务器将在 `http://localhost:3001` 运行。

#### 启动前端开发服务器

```bash
npm run dev
```

前端开发服务器将在 `http://localhost:5173` 运行。

### 4. 构建桌面应用

#### 构建前端

```bash
npm run build
```

#### 构建 Tauri 应用

```bash
npm run tauri build
```

构建完成后，可执行文件将位于 `src-tauri/target/release` 目录。

### 5. 部署到生产环境

#### 后端部署

1. 将 `server` 目录上传到服务器
2. 安装依赖：`npm install`
3. 启动服务：`npm start`
   - 建议使用 PM2 等进程管理工具来管理服务

#### 前端部署

1. 构建前端：`npm run build`
2. 将 `dist` 目录上传到 Web 服务器
3. 配置 Web 服务器指向 `dist` 目录

### 6. 环境变量配置

后端服务器默认运行在 `3001` 端口，可以通过修改 `server/server.js` 文件中的 `PORT` 变量来更改端口。

## API 接口

### 商品管理

- `GET /api/products` - 获取商品列表
- `POST /api/products` - 添加新商品
- `DELETE /api/products/:id` - 删除商品

### 品牌管理

- `GET /api/brands` - 获取品牌列表
- `POST /api/brands` - 添加新品牌
- `DELETE /api/brands/:id` - 删除品牌

### 分类管理

- `GET /api/categories` - 获取分类列表
- `POST /api/categories` - 添加新分类
- `DELETE /api/categories/:id` - 删除分类

### 单位管理

- `GET /api/units` - 获取单位列表
- `POST /api/units` - 添加新单位
- `DELETE /api/units/:id` - 删除单位

### 出入库管理

- `GET /api/records?type=in` - 获取入库记录
- `GET /api/records?type=out` - 获取出库记录
- `POST /api/records` - 添加出入库记录

## 开发说明

### 前端开发

1. 启动开发服务器：`npm run dev`
2. 访问 `http://localhost:5173` 查看效果
3. 代码修改后会自动热更新

### 后端开发

1. 启动后端服务器：`cd server && npm start`
2. 后端服务器将在 `http://localhost:3001` 运行
3. 代码修改后需要重启服务器

### Tauri 开发

1. 启动 Tauri 开发模式：`npm run tauri dev`
2. 这将启动前端开发服务器并打开 Tauri 应用窗口
3. 代码修改后会自动热更新

## 注意事项

1. **数据库备份**：定期备份 `server/inventory.db` 文件，以防止数据丢失
2. **端口冲突**：确保后端服务器使用的端口（默认 3001）未被其他服务占用
3. **跨域配置**：后端已配置 CORS 中间件，允许前端跨域请求
4. **安全考虑**：在生产环境中，建议添加身份验证和授权机制

## 故障排除

### 后端服务无法启动

- 检查端口 3001 是否被占用
- 检查 Node.js 版本是否符合要求
- 检查依赖是否正确安装

### 前端无法连接后端

- 检查后端服务是否正在运行
- 检查网络连接是否正常
- 检查 CORS 配置是否正确

### Tauri 构建失败

- 检查 Rust 环境是否正确安装
- 检查 Tauri 依赖是否正确配置
- 检查系统权限是否足够

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。
