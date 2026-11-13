# 当前架构与完整源码目录

前端 React 18 + TypeScript + Vite，使用 HashRouter；后端 Java 17 + Spring Boot 3.3.7，按业务域组织，采用 Controller → Service → JPA Repository → PostgreSQL。管理员使用 Cookie Session 和 CSRF。上传文件保存到文件系统，经 /uploads 提供访问。

## 当前功能

- 首页、独立技术博客、摄影、留言、个人页和站主后台。
- 博客不再关联项目，不再存在分组选择、分组筛选或项目接口；前台文章地址为 /#/blog?post=文章slug。
- 个人页中的项目/论文记录属于 about 内容，与已删除的博客分组无关。
- 图库后台的作品组用于管理多张照片，与博客分组无关；前台展示平铺照片墙。
- 历史项目展示、兼容跳转、简历模块和博客 Markdown 种子初始化已移除。
- 数据库升级使用 Flyway。V19 删除明确退役的两个分组及其文章、对应评论，其他文章保留并解除分组关联；分组表和关联列被移除。现有文章如有重复 slug，将保留一条原地址，其他条目自动追加 ID，避免内容覆盖。

## 目录职责

| 目录 | 职责 |
|---|---|
| src/pages | 首页、博客、摄影、关于、留言和后台 |
| src/components | 公共布局、业务组件、基础 UI、星空 |
| src/lib | API、Markdown、表单、图片排序、状态辅助 |
| src/styles、src/framework | 页面样式与主题 |
| backend/src/main/java/com/goodfly777/website/auth、security、admin | 登录、权限、管理员 |
| backend/src/main/java/com/goodfly777/website/content | 独立博客与评论 |
| backend/src/main/java/com/goodfly777/website/gallery | 摄影作品与照片 |
| backend/src/main/java/com/goodfly777/website/about、home | 个人资料、联系信息、首页图片配置 |
| backend/src/main/java/com/goodfly777/website/media、common、health | 媒体、异常及图片处理、健康检查 |
| backend/src/main/resources/db/migration、backend/src/main/java/db/migration | 必需的数据库升级脚本 |
| scripts | 开发启动、验证用数据服务及星空检查 |
| deploy | Nginx、systemd、生产变量模板 |

## 完整源码目录

不展开依赖、构建产物、运行期上传文件及图片素材。历史 SQL 保持原样，旧数据匹配规则可能包含退役身份，这不代表当前展示名。

```text
src/
├── .idea/
│   ├── inspectionProfiles/
│   │   └── Project_Default.xml
│   ├── .gitignore
│   ├── misc.xml
│   ├── modules.xml
│   ├── src.iml
│   ├── vcs.xml
│   └── workspace.xml
├── assets/
│   └── night-placeholder.svg
├── components/
│   ├── admin/
│   │   ├── BlogEditorActions.tsx
│   │   ├── GalleryWorkEditor.tsx
│   │   └── ProfileDetailEditor.tsx
│   ├── background/
│   │   ├── Starfield.tsx
│   │   ├── starfieldConfig.ts
│   │   ├── starfieldMotion.ts
│   │   ├── StarfieldScene.tsx
│   │   └── useStarfieldEnvironment.ts
│   ├── home/
│   │   └── ScrollChapter.tsx
│   ├── photography/
│   │   └── GalleryWorkGrid.tsx
│   ├── ui/
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── operation-notice.tsx
│   ├── BackToTopButton.tsx
│   ├── Comments.tsx
│   ├── GuestbookBoard.tsx
│   ├── Layout.resumeDownload.test.mjs
│   ├── Layout.tsx
│   ├── MermaidDiagram.tsx
│   ├── SiteAdminControls.tsx
│   └── WechatContact.tsx
├── content/
│   └── blog/
├── framework/
│   └── theme.css
├── hooks/
│   └── useTransientNotice.ts
├── lib/
│   ├── aboutApi.ts
│   ├── aboutEntryForm.test.mjs
│   ├── aboutEntryForm.ts
│   ├── adminApi.ts
│   ├── adminNavigation.test.mjs
│   ├── adminNavigation.ts
│   ├── blogEditorState.ts
│   ├── commentsApi.ts
│   ├── gallery.ts
│   ├── galleryUpload.ts
│   ├── markdown.tsx
│   ├── siteAdmin.ts
│   ├── siteApi.ts
│   ├── siteContact.test.mjs
│   ├── siteContact.ts
│   └── utils.ts
├── pages/
│   ├── About.resumeEntries.test.mjs
│   ├── About.tsx
│   ├── AboutWechatDialog.test.mjs
│   ├── Admin.aboutResumeEntryHide.test.mjs
│   ├── Admin.aboutResumeHighlightDraft.test.mjs
│   ├── Admin.blogCoverFromMediaOnly.test.mjs
│   ├── Admin.blogHideAction.test.mjs
│   ├── Admin.galleryEditor.test.mjs
│   ├── Admin.headerIdentity.test.mjs
│   ├── Admin.homeGalleryCollapse.test.mjs
│   ├── Admin.markdownEditorHeight.test.mjs
│   ├── Admin.mediaAssetFixedHeight.test.mjs
│   ├── Admin.mediaAssetMarkdown.test.mjs
│   ├── Admin.passwordChange.test.mjs
│   ├── Admin.projectBlogFilter.test.mjs
│   ├── Admin.projectHideAction.test.mjs
│   ├── Admin.tsx
│   ├── Blog.initialContent.test.mjs
│   ├── Blog.reading.test.mjs
│   ├── Blog.tsx
│   ├── Conversation.tsx
│   ├── Home.tsx
│   ├── Photography.masonry.test.mjs
│   ├── Photography.tsx
│   └── Projects.static.test.mjs
├── styles/
│   ├── admin-about.css
│   ├── admin-blog.css
│   ├── background.css
│   ├── blog-theme.css
│   ├── blog.css
│   ├── content-cards.css
│   ├── footer.css
│   ├── gallery.css
│   ├── home.css
│   ├── navigation.css
│   ├── operation-notice.css
│   └── wechat-contact.css
├── App.tsx
├── index.css
└── main.tsx
```

```text
backend/src/
├── main/
│   ├── java/
│   │   ├── com/
│   │   │   └── goodfly777/
│   │   │       └── website/
│   │   │           ├── about/
│   │   │           │   ├── dto/
│   │   │           │   │   ├── AboutAssetResponse.java
│   │   │           │   │   ├── AboutContactItem.java
│   │   │           │   │   ├── AboutContentRequest.java
│   │   │           │   │   ├── AboutContentResponse.java
│   │   │           │   │   ├── AboutProfileDetail.java
│   │   │           │   │   ├── AboutResumeEntry.java
│   │   │           │   │   ├── AboutResumeHighlight.java
│   │   │           │   │   └── AboutSocialLink.java
│   │   │           │   ├── AboutAssetService.java
│   │   │           │   ├── AboutContent.java
│   │   │           │   ├── AboutContentController.java
│   │   │           │   ├── AboutContentRepository.java
│   │   │           │   └── AboutContentService.java
│   │   │           ├── admin/
│   │   │           │   ├── AdminRole.java
│   │   │           │   ├── AdminUser.java
│   │   │           │   ├── AdminUserRepository.java
│   │   │           │   └── AdminUserSeeder.java
│   │   │           ├── auth/
│   │   │           │   └── AuthController.java
│   │   │           ├── common/
│   │   │           │   ├── ApiExceptionHandler.java
│   │   │           │   ├── AuditedEntity.java
│   │   │           │   ├── BadRequestException.java
│   │   │           │   ├── ImageOrientation.java
│   │   │           │   ├── ImageUploadOptimizationService.java
│   │   │           │   ├── ListResponse.java
│   │   │           │   └── NotFoundException.java
│   │   │           ├── content/
│   │   │           │   ├── dto/
│   │   │           │   │   ├── BlogPostRequest.java
│   │   │           │   │   ├── BlogPostResponse.java
│   │   │           │   │   ├── CommentRequest.java
│   │   │           │   │   └── CommentResponse.java
│   │   │           │   ├── BlogPost.java
│   │   │           │   ├── BlogPostController.java
│   │   │           │   ├── BlogPostRepository.java
│   │   │           │   ├── BlogPostService.java
│   │   │           │   ├── Comment.java
│   │   │           │   ├── CommentController.java
│   │   │           │   ├── CommentRepository.java
│   │   │           │   ├── CommentService.java
│   │   │           │   ├── CommentStatus.java
│   │   │           │   ├── CommentTargetType.java
│   │   │           │   ├── ContentStatus.java
│   │   │           │   └── JsonListMapper.java
│   │   │           ├── gallery/
│   │   │           │   ├── dto/
│   │   │           │   │   ├── GalleryPhotoRequest.java
│   │   │           │   │   ├── GalleryPhotoResponse.java
│   │   │           │   │   └── GalleryWorkResponse.java
│   │   │           │   ├── GalleryImageDerivativeService.java
│   │   │           │   ├── GalleryPhoto.java
│   │   │           │   ├── GalleryPhotoController.java
│   │   │           │   ├── GalleryPhotoRepository.java
│   │   │           │   ├── GalleryPhotoSeedService.java
│   │   │           │   ├── GalleryPhotoService.java
│   │   │           │   ├── GalleryWork.java
│   │   │           │   ├── GalleryWorkController.java
│   │   │           │   ├── GalleryWorkRepository.java
│   │   │           │   └── GalleryWorkService.java
│   │   │           ├── health/
│   │   │           │   └── HealthController.java
│   │   │           ├── home/
│   │   │           │   ├── dto/
│   │   │           │   │   ├── HomeGallerySlotItemRequest.java
│   │   │           │   │   ├── HomeGallerySlotPhotoResponse.java
│   │   │           │   │   ├── HomeGallerySlotRequest.java
│   │   │           │   │   └── HomeGallerySlotResponse.java
│   │   │           │   ├── HomeGallerySlot.java
│   │   │           │   ├── HomeGallerySlotController.java
│   │   │           │   ├── HomeGallerySlotRepository.java
│   │   │           │   └── HomeGallerySlotService.java
│   │   │           ├── media/
│   │   │           │   ├── dto/
│   │   │           │   │   └── MediaAssetResponse.java
│   │   │           │   ├── MediaAsset.java
│   │   │           │   ├── MediaAssetController.java
│   │   │           │   ├── MediaAssetRepository.java
│   │   │           │   ├── MediaAssetService.java
│   │   │           │   └── UploadResourceConfig.java
│   │   │           ├── security/
│   │   │           │   ├── AdminUserDetailsService.java
│   │   │           │   └── SecurityConfig.java
│   │   │           └── PersonalWebsiteBackendApplication.java
│   │   └── db/
│   │       └── migration/
│   │           ├── V17__configure_footer_github.java
│   │           ├── V18__rename_public_identity.java
│   │           └── V19__detach_blog_posts_from_projects.java
│   └── resources/
│       ├── db/
│       │   └── migration/
│       │       ├── V10__create_about_content.sql
│       │       ├── V11__create_home_gallery_slots.sql
│       │       ├── V12__add_home_gallery_slot_uploads.sql
│       │       ├── V13__add_gallery_photo_derivatives.sql
│       │       ├── V14__rename_site_owner.sql
│       │       ├── V15__group_gallery_photos_into_works.sql
│       │       ├── V16__merge_case_studies_into_blog.sql
│       │       ├── V1__create_admin_content_tables.sql
│       │       ├── V2__seed_existing_projects.sql
│       │       ├── V3__seed_existing_blog_posts.sql
│       │       ├── V4__scope_media_assets_to_blog_posts.sql
│       │       ├── V5__add_home_featured_blog_posts.sql
│       │       ├── V6__scope_blog_post_slugs_to_projects.sql
│       │       ├── V7__add_project_icon.sql
│       │       ├── V8__create_resume_versions.sql
│       │       └── V9__create_gallery_photos.sql
│       └── application.yml
└── test/
    ├── java/
    │   └── com/
    │       └── goodfly777/
    │           └── website/
    │               ├── common/
    │               │   └── ImageUploadOptimizationServiceTest.java
    │               ├── content/
    │               ├── gallery/
    │               │   └── GalleryImageDerivativeServiceTest.java
    │               ├── home/
    │               │   └── HomeGallerySlotServiceTest.java
    │               ├── AuthFlowIntegrationTest.java
    │               ├── ContentApiIntegrationTest.java
    │               ├── FooterContactMigrationTest.java
    │               ├── GalleryPhotoSeedIntegrationTest.java
    │               ├── GalleryWorkMigrationTest.java
    │               ├── LegacyCaseMigrationTest.java
    │               ├── PublicIdentityMigrationTest.java
    │               ├── StandaloneBlogMigrationTest.java
    │               └── TestImages.java
    └── resources/
        ├── blog-seed-source/
        │   └── mmcsa/
        │       └── 2026-06-09-seed-check.md
        ├── gallery-seed-source/
        │   ├── seed-one.jpg
        │   └── seed-two.png
        └── application-test.yml
```

```text
scripts/
├── admin-about-fixture.mjs
├── blog-editor-fixture.mjs
├── blog-merge-fixture.mjs
├── blog-reading-fixture.mjs
├── check-starfield.mjs
├── dev-all.mjs
├── dev-all.test.mjs
├── gallery-work-fixture.mjs
├── starfield-browser-check.html
└── starfield-browser-check.tsx
```

```text
deploy/
├── .env.example
├── goodfly777.service
└── nginx.conf
```

## 启动与构建

根目录：npm ci、npm run dev、npm run build。backend 目录：mvn spring-boot:run、mvn clean verify。开发环境 Vite 默认将 /api、/uploads 代理至 127.0.0.1:18081；生产环境由 Nginx 代理。数据库与上传目录通过环境变量配置。

服务器部署参见 [DEPLOYMENT.md](DEPLOYMENT.md)。修改后端代码需要重启后端；刷新前端不会更新已运行的 Java 代码。不要并行启动两个监听同一端口的后端进程。
