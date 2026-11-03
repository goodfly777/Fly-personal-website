# Fly-personal-website

## 项目介绍

一个前后端分离的个人网站，集成个人展示、技术博客、摄影图册、访客留言和内容管理。

- 前台：首页、博客与文章详情、摄影作品、留言、关于我；支持 Markdown 和 Mermaid 图表。
- 后台：管理文章、图册、评论及个人资料，支持发布/隐藏、媒体上传和密码修改。
- 数据存储：PostgreSQL 保存业务数据，上传文件保存在独立目录；使用 Cookie Session 与 CSRF 保护管理操作。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18、TypeScript、Vite 8、React Router 6、Tailwind CSS、Radix UI |
| 交互与可视化 | Three.js、React Three Fiber、Framer Motion、Mermaid |
| 后端 | Java 17、Spring Boot 3.3、Spring Security、Spring Data JPA、Flyway |
| 数据库 | PostgreSQL 16 |
| 部署 | Docker Compose（本地数据库）、Nginx、systemd |

## 本地部署

需要 Node.js 22.12+、JDK 17、Maven 3.9+ 和已启动的 Docker Desktop。

```bash
git clone https://github.com/goodfly777/Fly-personal-website.git
cd Fly-personal-website
cp .env.example .env
npm ci
```

Windows PowerShell 可将 `cp` 换成 `Copy-Item`。编辑根目录 `.env`，设置数据库密码、初始管理员账号，并覆盖本地配置：

```dotenv
DATABASE_URL=jdbc:postgresql://127.0.0.1:5432/personal_website
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=replace-with-your-local-database-password
SITE_ADMIN_EMAIL=admin@example.com
SITE_ADMIN_PASSWORD=replace-with-your-local-admin-password
SITE_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SESSION_COOKIE_SECURE=false
SITE_UPLOADS_DIRECTORY=uploads
```

本地使用 HTTP，需设置 `SESSION_COOKIE_SECURE=false`；生产 HTTPS 环境设置为 `true`。

```bash
npm run dev:all
```

该命令依次启动 PostgreSQL、Spring Boot 和 Vite。前台默认访问 `http://localhost:5173/`，健康检查为 `http://127.0.0.1:18081/api/health`；若端口被占用，以 Vite 终端输出为准。开发服务器将 `/api` 和 `/uploads` 代理到后端。

首次启动时，只有 `admin_users` 表为空才会创建 OWNER 账号。之后修改环境变量不会覆盖已有密码，请通过后台修改。按 `Ctrl+C` 停止前后端；数据库使用 `docker compose stop` 停止，数据卷保留。

当前 Flyway 仅包含面向全新空数据库的 `V1__init.sql`，不会预置博客和摄影内容。旧版 V1–V21 数据库不能直接套用此迁移；请先备份并另行迁移，勿用 baseline 或 repair 跳过结构差异。

## 线上部署

推荐使用 Linux 服务器，采用同域部署：Nginx 提供前端静态资源，并将 `/api/`、`/uploads/` 转发到仅监听本机的 Spring Boot 服务。

### 1. 构建

在项目根目录执行：

```bash
npm ci
npm run build
cd backend
mvn clean verify
cd ..
```

前端产物为 `dist/`，后端产物为 `backend/target/personal-website-backend-0.1.0-SNAPSHOT.jar`。同域部署时保持 `VITE_ADMIN_API_URL`、`VITE_MESSAGES_API_URL` 为空。

### 2. 准备服务器与数据库

服务器需安装 Java 17、Nginx 和 PostgreSQL 16。创建独立系统用户 `goodfly777`，准备以下目录：

```text
/opt/goodfly777/web/                 dist 目录中的文件
/opt/goodfly777/app/                 后端 JAR，重命名为 personal-website-backend.jar
/var/lib/goodfly777/uploads/         持久化上传目录
/etc/goodfly777.env                  生产环境变量
```

创建空数据库 `personal_website` 和应用账号 `website`，授予应用账号建表及迁移权限；在该数据库中预先创建 `pgcrypto` 扩展。数据库仅允许本机或受控内网访问。

将 `deploy/.env.example` 复制为 `/etc/goodfly777.env`，填写实际数据库密码、初始管理员账号、HTTPS 域名，保留：

```dotenv
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=18081
SESSION_COOKIE_SECURE=true
SITE_UPLOADS_DIRECTORY=/var/lib/goodfly777/uploads
```

环境文件权限设为 `600`。确保服务用户能够读取 JAR、写入上传目录；不要将真实环境文件提交到 Git。管理员初始化完成后可删除初始管理员密码配置。

### 3. 启动后端

将仓库中的 `deploy/goodfly777.service` 复制到 `/etc/systemd/system/goodfly777.service`，确认 Java 路径和部署目录正确后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now goodfly777
sudo systemctl status goodfly777
curl --fail http://127.0.0.1:18081/api/health
```

健康接口应返回 `{"ok":true}`。日志使用 `journalctl -u goodfly777` 查看。

### 4. 配置 Nginx 与 HTTPS

将域名解析到服务器，准备有效 TLS 证书，再将 `deploy/nginx.conf` 加入 Nginx 配置。替换模板中的域名和证书路径，确认静态目录为 `/opt/goodfly777/web`。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

通过 `https://你的域名/` 访问网站。检查博客、摄影、后台登录、发布和上传是否正常。前端使用 HashRouter，例如 `https://你的域名/#/blog`。

每次更新前备份数据库和上传目录，并保留上一版构建产物。发布新 JAR 后重启 `goodfly777` 服务；上传目录独立保存，不能随构建产物覆盖。本文提供部署步骤，不代表已在服务器执行部署。
