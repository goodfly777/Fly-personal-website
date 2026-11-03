# 服务器部署

适用于当前仓库：React 静态构建 + Spring Boot 可执行 JAR + PostgreSQL。下面是部署模板，尚未在你的服务器执行。

## 1. 构建

构建环境需要 Node.js 22.12+（满足当前 Vite 8）、Java 17、Maven 3.9+。

在根目录执行 `npm ci`、`npm run build`；在 backend 目录执行 `mvn clean verify`。输出分别是根目录 dist 和 backend/target/personal-website-backend-0.1.0-SNAPSHOT.jar。

前端同源部署时保持 VITE_ADMIN_API_URL、VITE_MESSAGES_API_URL 为空。Vite 开发代理不会包含在生产构建中，必须配置 Nginx 的 /api/ 和 /uploads/ 代理。

## 2. 服务器目录

```text
/opt/goodfly777/
├── web/                         dist 的内容
└── app/
    └── personal-website-backend.jar
/var/lib/goodfly777/uploads/      原有 uploads 目录的完整内容
/etc/goodfly777.env               生产环境变量，权限 600
/etc/systemd/system/goodfly777.service
```

使用独立的 goodfly777 系统用户运行服务，使其能读取 app、写入 uploads。生产环境变量参考 deploy/.env.example。不要把本地 .env、node_modules、target 测试资源、开发数据库密码传到公开网站目录。

数据库需要预先创建，并授予应用用户建表和迁移所需权限。新数据库首次迁移使用 pgcrypto 扩展，应事先确认数据库账号具备创建扩展的权限，或由数据库管理员创建。已有数据库直接复用时，不删除 flyway_schema_history，不修改已执行迁移文件，也不要开启 baselineOnMigrate 掩盖版本差异。

## 3. 上传与数据

发布前备份 PostgreSQL（例如使用 pg_dump）及整个上传目录，两者需配套。仅复制代码不会迁移现有文章、照片或二维码。历史简历记录和文件保留在数据中，但简历上传/下载 API 已删除。

SITE_UPLOADS_DIRECTORY 使用绝对路径；复制旧目录的内容到该路径，保留子目录与文件名，避免数据库中的 /uploads/... 链接失效。上传目录不要位于每次替换的 web 或 app 发布目录内。

生产模板默认关闭图库种子扫描。博客只使用数据库记录，不再扫描本地 Markdown 或自动创建历史分组。新库依然执行保留的 Flyway 数据迁移。

## 4. 启动后端

复制 deploy/goodfly777.service 到 systemd 配置目录，按实际 JDK 安装位置调整 ExecStart。填写 /etc/goodfly777.env 后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now goodfly777
sudo systemctl status goodfly777
curl --fail http://127.0.0.1:18081/api/health
```

日志使用 `journalctl -u goodfly777` 查看。Java 主包为 com.goodfly777.website；通过 java -jar 启动，无需手动填写主类。

## 5. Nginx 与 HTTPS

参考 deploy/nginx.conf，将 example.com 和证书路径改为实际值。先配置有效证书，再通过 `nginx -t` 检查，最后重载 Nginx。后端仅监听本机 127.0.0.1:18081；数据库不应向公网开放。

SESSION_COOKIE_SECURE=true 需要 HTTPS。当前登录使用 Cookie Session 和 CSRF，不是 JWT；前端与 API 同源可减少跨域和 Cookie 配置问题。SITE_CORS_ALLOWED_ORIGINS 填写实际 HTTPS 域名。

HashRouter 地址示例为 https://example.com/#/blog。旧 /projects、/project/... 前端路由已删除，不设置兼容跳转。

Nginx 模板允许 12m 请求，后端每个文件和请求的限制目前均为 10MB；图库批量上传按单文件请求发送。不要仅放大 Nginx 限制而忽略后端限制。

## 6. 发布检查与回退

- 检查健康接口、首页、博客详情、照片完整显示及 /uploads 文件访问。
- 登录后台，检查保存、发布/隐藏、上传、微信二维码和 GitHub 地址。
- 用手机检查布局；浏览器控制台不应出现 404 资源或 API 代理错误。
- 保留上一版 JAR、dist 和发布前数据备份。替换 JAR 后需重启服务，前端刷新不会更新后端校验代码。
- 数据库迁移不会因回退 JAR 自动撤销；需要回退数据库时使用配套备份，先评估新写入数据。

保留数据库历史迁移，V18 更新公开身份；V19 按站主确认删除 momozhi、mmcsa 两个历史分组的文章和对应评论，移除分组表，将其他文章改为独立记录。该删除会在新库和升级时执行一次，不会按名称持续删除后来新增的文章。迁移会将旧 GitHub 用户名替换为 goodfly777，但不能证明该账号下存在同名仓库，具体仓库链接应在部署前人工核对。
