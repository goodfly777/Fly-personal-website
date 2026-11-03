package com.goodfly777.website;

import static com.goodfly777.website.TestImages.createJpegWithExifOrientation;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.containsString;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.util.UriUtils;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContentApiIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @org.springframework.transaction.annotation.Transactional
  void blankProfileAndContactValuesSurviveSaving() throws Exception {
    mockMvc.perform(put("/api/admin/about")
        .session(login()).with(csrf()).contentType("application/json")
        .content("""
          {"profileDetails":[{"label":"本科","value":"","icon":"graduation-cap"}],
           "resumeEntries":[],"contactHeading":"联系设置",
           "contactItems":[{"label":"邮箱","value":"","icon":"mail"}],"socialLinks":[]}
          """))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.profileDetails[0].label").value("本科"))
      .andExpect(jsonPath("$.profileDetails[0].value").value(""))
      .andExpect(jsonPath("$.contactItems[0].label").value("邮箱"))
      .andExpect(jsonPath("$.contactItems[0].value").value(""));
  }

  @Test
  void ownerCanManagePublishedProjectAndMarkdownBlogPost() throws Exception {
    var session = login();

    var projectId = java.util.UUID.randomUUID().toString();

    mockMvc.perform(post("/api/admin/blog-posts")
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "projectId": "%s",
            "title": "RAG 检索链路拆解",
            "slug": "rag-retrieval",
            "category": "检索链路",
            "summary": "拆开看检索链路每一步。",
            "contentMarkdown": "## 检索链路\\n\\n这里是正文。",
            "blogOrder": 3,
            "coverImageUrl": "/uploads/rag.png",
            "status": "published"
          }
          """.formatted(projectId)))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.contentMarkdown").value("## 检索链路\n\n这里是正文。"));

    mockMvc.perform(get("/api/blog-posts/rag-retrieval"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.projectSlug").value(""))
      .andExpect(jsonPath("$.contentMarkdown").value("## 检索链路\n\n这里是正文。"));
  }

  @Test
  void publicBlogPostsExcludeHiddenPostsWithoutDependingOnProjects() throws Exception {
    var session = login();
    var visibleProjectSlug = "visible-blog-project-" + System.nanoTime();
    var hiddenProjectSlug = "hidden-blog-project-" + System.nanoTime();
    var visiblePostSlug = "visible-post-" + System.nanoTime();
    var hiddenPostSlug = "hidden-post-" + System.nanoTime();
    var visibleProjectId = createProject(session, visibleProjectSlug, "published");
    var hiddenProjectId = createProject(session, hiddenProjectSlug, "hidden");

    createBlogPost(session, visibleProjectId, visiblePostSlug, "Visible post", "published", false, 1);
    createBlogPost(session, hiddenProjectId, hiddenPostSlug, "Hidden post", "hidden", true, -100);

    var publicPosts = mockMvc.perform(get("/api/blog-posts"))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();

    assertThat(publicPosts).contains(visiblePostSlug).doesNotContain(hiddenPostSlug);

    var homeFeaturedPosts = mockMvc.perform(get("/api/blog-posts/home-featured"))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();

    assertThat(homeFeaturedPosts).doesNotContain(hiddenPostSlug);

    mockMvc.perform(get("/api/blog-posts/%s".formatted(hiddenPostSlug)))
      .andExpect(status().isNotFound());

    mockMvc.perform(get("/api/projects/%s/blog-posts/%s".formatted(hiddenProjectSlug, hiddenPostSlug)))
      .andExpect(status().isNotFound());
  }

  @Test
  void ownerCanUploadAndListMediaAssets() throws Exception {
    var session = login();
    var projectId = createPublishedProject(session, "media-project-" + System.nanoTime());
    var firstBlogPostId = createPublishedBlogPost(session, projectId, "media-one", "Media one");
    var secondBlogPostId = createPublishedBlogPost(session, projectId, "media-two", "Media two");
    var fileName = "Pasted image %d.png".formatted(System.nanoTime());
    var image = new MockMultipartFile("file", fileName, "image/png", new byte[] { 1, 2, 3 });

    mockMvc.perform(multipart("/api/admin/media-assets")
        .file(image)
        .param("blogPostId", firstBlogPostId)
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.fileName").value(fileName))
      .andExpect(jsonPath("$.blogPostId").value(firstBlogPostId))
      .andExpect(jsonPath("$.url").value("/uploads/" + fileName.replace(" ", "%20")));

    mockMvc.perform(get("/api/admin/media-assets").param("blogPostId", firstBlogPostId).session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].fileName").value(fileName));

    mockMvc.perform(get("/api/admin/media-assets").param("blogPostId", secondBlogPostId).session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(0)));

    var assetId = JsonField.extract(
      mockMvc.perform(get("/api/admin/media-assets").param("blogPostId", firstBlogPostId).session(session))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString(),
      "id"
    );

    mockMvc.perform(delete("/api/admin/media-assets/%s".formatted(assetId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/admin/media-assets").param("blogPostId", firstBlogPostId).session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(0)));
  }

  @Test
  void mediaAssetUploadOptimizesLargeBlogImages() throws Exception {
    var session = login();
    var projectId = createPublishedProject(session, "optimized-media-project-" + System.nanoTime());
    var blogPostId = createPublishedBlogPost(session, projectId, "optimized-media", "Optimized media");
    var fileName = "large blog image %d.png".formatted(System.nanoTime());
    var baseName = fileName.substring(0, fileName.lastIndexOf('.'));
    var originalBytes = createPngBytes(1800, 1200);
    var image = new MockMultipartFile("file", fileName, "image/png", originalBytes);

    var response = mockMvc.perform(multipart("/api/admin/media-assets")
        .file(image)
        .param("blogPostId", blogPostId)
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.fileName").value(baseName + ".jpg"))
      .andExpect(jsonPath("$.mimeType").value("image/jpeg"))
      .andExpect(jsonPath("$.url").value("/uploads/" + baseName.replace(" ", "%20") + ".jpg"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var optimizedPath = Path.of("target/test-uploads").resolve(JsonField.extract(response, "fileName"));
    assertImageLongestSideAtMost(optimizedPath, 1600);
    assertThat(Files.size(optimizedPath)).isLessThan((long) originalBytes.length);
  }

  @Test
  void mediaAssetUploadAppliesExifOrientationEvenWhenImageDoesNotNeedResizing() throws Exception {
    var session = login();
    var projectId = createPublishedProject(session, "oriented-media-project-" + System.nanoTime());
    var blogPostId = createPublishedBlogPost(session, projectId, "oriented-media", "Oriented media");
    var fileName = "oriented blog image %d.jpg".formatted(System.nanoTime());
    var image = new MockMultipartFile(
      "file",
      fileName,
      "image/jpeg",
      createJpegWithExifOrientation(1200, 800, 6)
    );

    var response = mockMvc.perform(multipart("/api/admin/media-assets")
        .file(image)
        .param("blogPostId", blogPostId)
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.fileName").value(fileName))
      .andExpect(jsonPath("$.mimeType").value("image/jpeg"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var optimizedPath = Path.of("target/test-uploads").resolve(JsonField.extract(response, "fileName"));
    assertImageLongestSideAtMost(optimizedPath, 1600);
    assertImageIsPortrait(optimizedPath);
  }

  @Test
  void ownerCanManageGalleryPhotosAndPublicOnlySeesPublishedPhotos() throws Exception {
    var session = login();
    var fileName = "gallery photo %d.png".formatted(System.nanoTime());
    var image = new MockMultipartFile("file", fileName, "image/png", new byte[] { 1, 2, 3 });

    var createResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(image)
        .param("title", "屋檐小太阳")
        .param("description", "仰头遇见一只小太阳。")
        .param("location", "生活图册")
        .param("takenAt", "2020")
        .param("sortOrder", "2")
        .param("status", "published")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.title").value("屋檐小太阳"))
      .andExpect(jsonPath("$.status").value("published"))
      .andExpect(jsonPath("$.url").value("/uploads/gallery/" + fileName.replace(" ", "%20")))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var photoId = JsonField.extract(createResponse, "id");

    mockMvc.perform(get("/api/gallery-photos"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].title").value("屋檐小太阳"));

    mockMvc.perform(put("/api/admin/gallery-photos/%s".formatted(photoId))
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "title": "屋檐小太阳（隐藏）",
            "description": "这张先不展示。",
            "location": "生活图册",
            "takenAt": "2020",
            "sortOrder": 1,
            "status": "hidden"
          }
          """))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("屋檐小太阳（隐藏）"))
      .andExpect(jsonPath("$.status").value("hidden"));

    mockMvc.perform(get("/api/gallery-photos"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(0)));

    mockMvc.perform(get("/api/admin/gallery-photos").session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].status").value("hidden"));

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(photoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/admin/gallery-photos").session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(0)));
  }

  @Test
  void ownerCanReplaceGalleryPhotoImageWithoutChangingText() throws Exception {
    var session = login();
    var originalFileName = "gallery-original-%d.png".formatted(System.nanoTime());
    var replacementFileName = "gallery-replacement-%d.png".formatted(System.nanoTime());

    var createResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(new MockMultipartFile("file", originalFileName, "image/png", createPngBytes(32, 24)))
        .param("title", "Keep title")
        .param("description", "Keep description")
        .param("location", "Keep location")
        .param("takenAt", "2024")
        .param("sortOrder", "12")
        .param("status", "published")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    var photoId = JsonField.extract(createResponse, "id");
    var originalPath = resolveUploadPath(JsonField.extract(createResponse, "url"));
    assertThat(Files.exists(originalPath)).isTrue();

    var replaceResponse = mockMvc.perform(multipart("/api/admin/gallery-photos/%s/image".formatted(photoId))
        .file(new MockMultipartFile("file", replacementFileName, "image/png", createPngBytes(48, 36)))
        .with(csrf())
        .session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.fileName").value(replacementFileName))
      .andExpect(jsonPath("$.url").value("/uploads/gallery/" + replacementFileName))
      .andExpect(jsonPath("$.title").value("Keep title"))
      .andExpect(jsonPath("$.description").value("Keep description"))
      .andExpect(jsonPath("$.location").value("Keep location"))
      .andExpect(jsonPath("$.takenAt").value("2024"))
      .andExpect(jsonPath("$.sortOrder").value(12))
      .andExpect(jsonPath("$.status").value("published"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    assertThat(Files.exists(originalPath)).isFalse();
    assertThat(Files.exists(resolveUploadPath(JsonField.extract(replaceResponse, "url")))).isTrue();

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(photoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());
  }

  @Test
  void galleryUploadsAssignIncrementingSortOrderWhenSortOrderIsOmitted() throws Exception {
    var session = login();
    var firstFileName = "auto sort first %d.png".formatted(System.nanoTime());
    var secondFileName = "auto sort second %d.png".formatted(System.nanoTime());

    var firstResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(new MockMultipartFile("file", firstFileName, "image/png", new byte[] { 1, 2, 3 }))
        .param("title", "Auto sort first")
        .param("description", "First uploaded photo")
        .param("status", "published")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    var firstPhotoId = JsonField.extract(firstResponse, "id");
    var firstSortOrder = JsonField.extractInt(firstResponse, "sortOrder");
    assertThat(firstSortOrder).isGreaterThan(0);

    var secondResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(new MockMultipartFile("file", secondFileName, "image/png", new byte[] { 4, 5, 6 }))
        .param("title", "Auto sort second")
        .param("description", "Second uploaded photo")
        .param("status", "published")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    var secondPhotoId = JsonField.extract(secondResponse, "id");
    var secondSortOrder = JsonField.extractInt(secondResponse, "sortOrder");
    assertThat(secondSortOrder).isEqualTo(firstSortOrder + 1);

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(firstPhotoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(secondPhotoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());
  }

  @Test
  void galleryUploadCreatesDerivativeImagesForListAndPreview() throws Exception {
    var session = login();
    var fileName = "large-gallery-%d.jpg".formatted(System.nanoTime());
    var baseName = fileName.substring(0, fileName.lastIndexOf('.'));
    var image = new MockMultipartFile("file", fileName, "image/jpeg", createJpegBytes(2200, 1400));

    var createResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(image)
        .param("title", "Large gallery photo")
        .param("description", "Should create responsive derivatives")
        .param("status", "published")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.url").value("/uploads/gallery/" + fileName))
      .andExpect(jsonPath("$.thumbnailUrl").value("/uploads/gallery/" + baseName + "-thumbnail.jpg"))
      .andExpect(jsonPath("$.mediumUrl").value("/uploads/gallery/" + baseName + "-medium.jpg"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var photoId = JsonField.extract(createResponse, "id");
    var originalPath = resolveUploadPath(JsonField.extract(createResponse, "url"));
    var thumbnailPath = resolveUploadPath(JsonField.extract(createResponse, "thumbnailUrl"));
    var mediumPath = resolveUploadPath(JsonField.extract(createResponse, "mediumUrl"));

    assertThat(Files.readAllBytes(originalPath)).isEqualTo(image.getBytes());
    assertThat(ImageIO.read(originalPath.toFile()).getWidth()).isEqualTo(2200);
    assertImageLongestSideAtMost(thumbnailPath, 640);
    assertImageLongestSideAtMost(mediumPath, 1600);
    assertThat(Files.size(thumbnailPath)).isLessThan(Files.size(originalPath));
    assertThat(Files.size(mediumPath)).isLessThan(Files.size(originalPath));

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(photoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());
  }

  @Test
  void galleryUploadPreservesOriginalAndAppliesExifOrientationToPreviews() throws Exception {
    var session = login();
    var fileName = "oriented-gallery-%d.jpg".formatted(System.nanoTime());
    var image = new MockMultipartFile(
      "file",
      fileName,
      "image/jpeg",
      createJpegWithExifOrientation(1200, 800, 6)
    );

    var createResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(image)
        .param("title", "Oriented gallery photo")
        .param("description", "Stored original should not appear sideways")
        .param("status", "published")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.fileName").value(fileName))
      .andExpect(jsonPath("$.mimeType").value("image/jpeg"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var photoId = JsonField.extract(createResponse, "id");
    var originalPath = resolveUploadPath(JsonField.extract(createResponse, "url"));
    assertThat(Files.readAllBytes(originalPath)).isEqualTo(image.getBytes());
    assertImageIsPortrait(resolveUploadPath(JsonField.extract(createResponse, "mediumUrl")));

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(photoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());
  }

  @Test
  void ownerCanChooseGalleryPhotosForHomeImageSlots() throws Exception {
    var session = login();
    var publishedFileName = "home hero %d.png".formatted(System.nanoTime());
    var hiddenFileName = "home hidden %d.png".formatted(System.nanoTime());

    var publishedPhotoResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(new MockMultipartFile("file", publishedFileName, "image/png", new byte[] { 1, 2, 3 }))
        .param("title", "Home hero")
        .param("description", "Hero floating card")
        .param("status", "published")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    var hiddenPhotoResponse = mockMvc.perform(multipart("/api/admin/gallery-photos")
        .file(new MockMultipartFile("file", hiddenFileName, "image/png", new byte[] { 4, 5, 6 }))
        .param("title", "Hidden home photo")
        .param("description", "Should stay private")
        .param("status", "hidden")
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    var publishedPhotoId = JsonField.extract(publishedPhotoResponse, "id");
    var hiddenPhotoId = JsonField.extract(hiddenPhotoResponse, "id");

    mockMvc.perform(put("/api/admin/home-gallery-slots")
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "slots": [
              {
                "slotKey": "hero-polaroid",
                "galleryPhotoId": "%s"
              },
              {
                "slotKey": "life-card",
                "galleryPhotoId": "%s"
              }
            ]
          }
          """.formatted(publishedPhotoId, hiddenPhotoId)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(4)))
      .andExpect(jsonPath("$.items[0].slotKey").value("hero-polaroid"))
      .andExpect(jsonPath("$.items[0].photo.title").value("Home hero"))
      .andExpect(jsonPath("$.items[2].slotKey").value("life-card"))
      .andExpect(jsonPath("$.items[2].photo.title").value("Hidden home photo"));

    mockMvc.perform(get("/api/home-gallery-slots"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(4)))
      .andExpect(jsonPath("$.items[0].slotKey").value("hero-polaroid"))
      .andExpect(jsonPath("$.items[0].photo.title").value("Home hero"))
      .andExpect(jsonPath("$.items[2].slotKey").value("life-card"))
      .andExpect(jsonPath("$.items[2].photo", nullValue()));

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(publishedPhotoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());

    mockMvc.perform(delete("/api/admin/gallery-photos/%s".formatted(hiddenPhotoId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());
  }

  @Test
  void ownerCanUploadLocalImageForHomeImageSlot() throws Exception {
    var session = login();
    var fileName = "home-local-upload-%d.png".formatted(System.nanoTime());

    mockMvc.perform(multipart("/api/admin/home-gallery-slots/hero-polaroid/image")
        .file(new MockMultipartFile("file", fileName, "image/png", new byte[] { 1, 2, 3 }))
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.slotKey").value("hero-polaroid"))
      .andExpect(jsonPath("$.photo.title").value("个人介绍 · 主视觉图"))
      .andExpect(jsonPath("$.photo.status").value("published"))
      .andExpect(jsonPath("$.photo.url").value("/uploads/home/" + fileName));

    mockMvc.perform(get("/api/home-gallery-slots"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(4)))
      .andExpect(jsonPath("$.items[0].slotKey").value("hero-polaroid"))
      .andExpect(jsonPath("$.items[0].photo.url").value("/uploads/home/" + fileName));
  }

  @Test
  void ownerCanManageAboutContentAndExposeItPublicly() throws Exception {
    var session = login();

    mockMvc.perform(get("/api/about"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.profileDetails", hasSize(5)))
      .andExpect(jsonPath("$.resumeEntries", hasSize(0)))
      .andExpect(jsonPath("$.socialLinks", hasSize(0)))
      .andExpect(jsonPath("$.portraitImageUrl").value(""));

    mockMvc.perform(put("/api/admin/about")
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "portraitImageUrl": "/assets/profile.jpg",
            "wechatQrImageUrl": "/assets/wechat.png",
            "profileDetails": [
              {
                "label": "基本信息",
                "value": "陈杰 · 女 · 山东青岛",
                "icon": "user",
                "wide": true
              },
              {
                "label": "邮箱",
                "value": "you@example.com",
                "icon": "mail",
                "copyValue": "you@example.com",
                "wide": false
              }
            ],
            "resumeEntries": [
              {
                "category": "Project Resume",
                "title": "可编辑项目简历",
                "meta": "独立开发",
                "period": "2026.XX – 至今",
                "techStack": ["React", "Spring Boot"],
                "descriptionLabel": "项目描述",
                "description": "这段内容来自后台。",
                "highlightsLabel": "项目亮点",
                "highlights": [
                  {
                    "title": "后台可维护",
                    "detail": "支持新增、编辑、删除项目简历条目。"
                  },
                  {
                    "title": "直接填写普通文本，无需指定格式",
                    "detail": ""
                  }
                ],
                "sortOrder": 1,
                "hidden": false
              },
              {
                "category": "Project Resume",
                "title": "Hidden resume entry",
                "meta": "Private draft",
                "period": "2026",
                "techStack": ["Draft"],
                "descriptionLabel": "Project description",
                "description": "This entry should stay hidden publicly.",
                "highlightsLabel": "Highlights",
                "highlights": [],
                "sortOrder": 2,
                "hidden": true
              }
            ],
            "contactHeading": "连接我的世界",
            "contactItems": [
              {
                "label": "Email Me",
                "value": "you@example.com",
                "icon": "mail"
              }
            ],
            "socialLinks": [
              {
                "label": "Github",
                "url": "https://github.com/test-edited?tab=repositories",
                "icon": "globe"
              }
            ]
          }
          """))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.profileDetails", hasSize(2)))
      .andExpect(jsonPath("$.resumeEntries", hasSize(2)))
      .andExpect(jsonPath("$.resumeEntries[0].title").value("可编辑项目简历"))
      .andExpect(jsonPath("$.resumeEntries[0].hidden").value(false))
      .andExpect(jsonPath("$.resumeEntries[1].title").value("Hidden resume entry"))
      .andExpect(jsonPath("$.resumeEntries[1].hidden").value(true));

    mockMvc.perform(get("/api/about"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.portraitImageUrl").value("/assets/profile.jpg"))
      .andExpect(jsonPath("$.profileDetails[1].copyValue").value("you@example.com"))
      .andExpect(jsonPath("$.resumeEntries", hasSize(1)))
      .andExpect(jsonPath("$.resumeEntries[0].description").value("这段内容来自后台。"))
      .andExpect(jsonPath("$.resumeEntries[0].highlights", hasSize(2)))
      .andExpect(jsonPath("$.resumeEntries[0].highlights[0].detail").value("支持新增、编辑、删除项目简历条目。"))
      .andExpect(jsonPath("$.resumeEntries[0].highlights[1].title").value("直接填写普通文本，无需指定格式"))
      .andExpect(jsonPath("$.resumeEntries[0].highlights[1].detail").value(""))
      .andExpect(jsonPath("$.contactItems", hasSize(1)))
      .andExpect(jsonPath("$.socialLinks[0].url").value("https://github.com/test-edited?tab=repositories"))
      .andExpect(jsonPath("$.wechatQrImageUrl").value("/assets/wechat.png"));
  }

  @Test
  void ownerCanUploadAboutImagesForProfileResources() throws Exception {
    var session = login();
    var fileName = "profile photo %d.png".formatted(System.nanoTime());
    var image = new MockMultipartFile("file", fileName, "image/png", new byte[] { 1, 2, 3 });

    mockMvc.perform(multipart("/api/admin/about/assets")
        .file(image)
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.fileName").value(fileName))
      .andExpect(jsonPath("$.mimeType").value("image/png"))
      .andExpect(jsonPath("$.sizeBytes").value(3))
      .andExpect(jsonPath("$.url").value("/uploads/about/" + fileName.replace(" ", "%20")));
  }

  @Test
  void aboutAssetUploadOptimizesLargeImages() throws Exception {
    var session = login();
    var fileName = "large about image %d.png".formatted(System.nanoTime());
    var baseName = fileName.substring(0, fileName.lastIndexOf('.'));
    var originalBytes = createPngBytes(1800, 1200);
    var image = new MockMultipartFile("file", fileName, "image/png", originalBytes);

    var response = mockMvc.perform(multipart("/api/admin/about/assets")
        .file(image)
        .with(csrf())
        .session(session))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.fileName").value(baseName + ".jpg"))
      .andExpect(jsonPath("$.mimeType").value("image/jpeg"))
      .andExpect(jsonPath("$.url").value("/uploads/about/" + baseName.replace(" ", "%20") + ".jpg"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var optimizedPath = Path.of("target/test-uploads/about").resolve(JsonField.extract(response, "fileName"));
    assertImageLongestSideAtMost(optimizedPath, 1600);
    assertThat(Files.size(optimizedPath)).isLessThan((long) originalBytes.length);
  }

  @Test
  void homeFeaturedBlogPostsAreManagedFromAdminFields() throws Exception {
    var session = login();
    var projectId = createPublishedProject(session, "home-featured-project-" + System.nanoTime());

    createBlogPost(session, projectId, "home-featured-second", "Second card", "published", true, 2);
    createBlogPost(session, projectId, "home-featured-first", "First card", "published", true, 1);
    createBlogPost(session, projectId, "home-featured-third", "Third card", "published", true, 3);
    createBlogPost(session, projectId, "home-featured-fourth", "Fourth card", "published", true, 4);
    createBlogPost(session, projectId, "home-featured-hidden", "Hidden card", "hidden", true, 0);
    createBlogPost(session, projectId, "home-featured-off", "Off card", "published", false, 0);

    mockMvc.perform(get("/api/blog-posts/home-featured"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(3)))
      .andExpect(jsonPath("$.items[0].title").value("First card"))
      .andExpect(jsonPath("$.items[0].featuredOnHome").value(true))
      .andExpect(jsonPath("$.items[0].homeOrder").value(1))
      .andExpect(jsonPath("$.items[1].title").value("Second card"))
      .andExpect(jsonPath("$.items[2].title").value("Third card"));
  }

  @Test
  void blogPostsAreStandaloneAndRejectDuplicateSlugs() throws Exception {
    var session = login();
    var payload = """
      {"title":"Independent article","slug":"independent-article","category":"Tech","summary":"Summary","contentMarkdown":"## Body","status":"published"}
      """;
    mockMvc.perform(post("/api/admin/blog-posts").session(session).with(csrf()).contentType("application/json").content(payload))
      .andExpect(status().isCreated()).andExpect(jsonPath("$.projectSlug").value(""));
    mockMvc.perform(post("/api/admin/blog-posts").session(session).with(csrf()).contentType("application/json").content(payload))
      .andExpect(status().isBadRequest());
    mockMvc.perform(get("/api/blog-posts/independent-article")).andExpect(status().isOk());
  }

  @Test
  void publicCommentsStayPendingUntilOwnerApprovesThem() throws Exception {
    var session = login();
    var projectId = createPublishedProject(session);
    var blogPostId = createPublishedBlogPost(session, projectId);

    var commentResponse = mockMvc.perform(post("/api/comments")
        .contentType("application/json")
        .content("""
          {
            "targetType": "blog",
            "targetId": "%s",
            "authorName": "读者",
            "content": "这篇讲得很清楚。"
          }
          """.formatted(blogPostId)))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.status").value("pending"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var commentId = JsonField.extract(commentResponse, "id");

    mockMvc.perform(get("/api/blog-posts/blog-one/comments"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(0)));

    mockMvc.perform(put("/api/admin/comments/%s/approve".formatted(commentId)).with(csrf()).session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("approved"));

    mockMvc.perform(get("/api/blog-posts/blog-one/comments"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].content").value("这篇讲得很清楚。"));

    mockMvc.perform(delete("/api/admin/comments/%s".formatted(commentId)).with(csrf()).session(session))
      .andExpect(status().isNoContent());
  }

  @Test
  void ownerBlogCommentsAreApprovedImmediately() throws Exception {
    var session = login();
    var projectId = createPublishedProject(session, "owner-comment-project-" + System.nanoTime());
    var blogPostId = createPublishedBlogPost(session, projectId, "owner-comment-post", "Owner comment post");

    mockMvc.perform(post("/api/comments")
        .session(session)
        .contentType("application/json")
        .content("""
          {
            "targetType": "blog",
            "targetId": "%s",
            "authorName": "陈杰",
            "content": "Owner note"
          }
          """.formatted(blogPostId)))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.status").value("approved"));

    mockMvc.perform(get("/api/blog-posts/owner-comment-post/comments"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].content").value("Owner note"));
  }

  @Test
  void publicGuestbookCommentsStayPendingUntilOwnerApprovesThem() throws Exception {
    var session = login();

    var commentResponse = mockMvc.perform(post("/api/comments")
        .contentType("application/json")
        .content("""
          {
            "targetType": "guestbook",
            "authorName": "Visitor",
            "content": "Hello guestbook"
          }
          """))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.status").value("pending"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var commentId = JsonField.extract(commentResponse, "id");

    mockMvc.perform(get("/api/comments/guestbook"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(0)));

    mockMvc.perform(put("/api/admin/comments/%s/approve".formatted(commentId)).with(csrf()).session(session))
      .andExpect(status().isOk());

    var replyResponse = mockMvc.perform(post("/api/comments")
        .contentType("application/json")
        .content("""
          {
            "targetType": "guestbook",
            "parentId": "%s",
            "authorName": "陈杰",
            "content": "Thanks for visiting"
          }
          """.formatted(commentId)))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.status").value("pending"))
      .andReturn()
      .getResponse()
      .getContentAsString();

    var replyId = JsonField.extract(replyResponse, "id");

    mockMvc.perform(put("/api/admin/comments/%s/approve".formatted(replyId)).with(csrf()).session(session))
      .andExpect(status().isOk());

    mockMvc.perform(get("/api/comments/guestbook"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].content").value("Hello guestbook"))
      .andExpect(jsonPath("$.items[0].replies", hasSize(1)))
      .andExpect(jsonPath("$.items[0].replies[0].content").value("Thanks for visiting"));
  }

  private MockHttpSession login() throws Exception {
    var session = new MockHttpSession();
    mockMvc.perform(post("/api/auth/login")
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "email": "owner@example.com",
            "password": "correct-password"
          }
          """))
      .andExpect(status().isOk());
    return session;
  }

  private String createPublishedProject(MockHttpSession session) { return java.util.UUID.randomUUID().toString(); }
  private String createPublishedProject(MockHttpSession session, String slug) { return createPublishedProject(session); }
  private String createProject(MockHttpSession session, String slug, String status) { return createPublishedProject(session); }

  private String createPublishedBlogPost(MockHttpSession session, String projectId) throws Exception {
    var response = mockMvc.perform(post("/api/admin/blog-posts")
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "projectId": "%s",
            "title": "博客一",
            "slug": "blog-one",
            "category": "架构",
            "summary": "摘要",
            "contentMarkdown": "正文",
            "blogOrder": 1,
            "status": "published"
          }
          """.formatted(projectId)))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    return JsonField.extract(response, "id");
  }

  private String createPublishedBlogPost(
    MockHttpSession session,
    String projectId,
    String slug,
    String title
  ) throws Exception {
    var response = mockMvc.perform(post("/api/admin/blog-posts")
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "projectId": "%s",
            "title": "%s",
            "slug": "%s",
            "category": "Architecture",
            "summary": "Summary",
            "contentMarkdown": "Body",
            "blogOrder": 1,
            "status": "published"
          }
          """.formatted(projectId, title, slug)))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    return JsonField.extract(response, "id");
  }

  private String createBlogPost(
    MockHttpSession session,
    String projectId,
    String slug,
    String title,
    String status,
    boolean featuredOnHome,
    int homeOrder
  ) throws Exception {
    var response = mockMvc.perform(post("/api/admin/blog-posts")
        .session(session)
        .with(csrf())
        .contentType("application/json")
        .content("""
          {
            "projectId": "%s",
            "title": "%s",
            "slug": "%s",
            "category": "Home",
            "summary": "Summary",
            "contentMarkdown": "Body",
            "blogOrder": 1,
            "featuredOnHome": %s,
            "homeOrder": %d,
            "status": "%s"
          }
          """.formatted(projectId, title, slug, featuredOnHome, homeOrder, status)))
      .andExpect(status().isCreated())
      .andReturn()
      .getResponse()
      .getContentAsString();

    return JsonField.extract(response, "id");
  }

  private byte[] createJpegBytes(int width, int height) throws Exception {
    var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        var red = (x * 17 + y * 3) % 256;
        var green = (x * 5 + y * 13) % 256;
        var blue = (x * 11 + y * 7) % 256;
        image.setRGB(x, y, (red << 16) | (green << 8) | blue);
      }
    }

    var output = new ByteArrayOutputStream();
    ImageIO.write(image, "jpg", output);
    return output.toByteArray();
  }

  private byte[] createPngBytes(int width, int height) throws Exception {
    var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        var red = (x * 17 + y * 3) % 256;
        var green = (x * 5 + y * 13) % 256;
        var blue = (x * 11 + y * 7) % 256;
        image.setRGB(x, y, (red << 16) | (green << 8) | blue);
      }
    }

    var output = new ByteArrayOutputStream();
    ImageIO.write(image, "png", output);
    return output.toByteArray();
  }

  private Path resolveUploadPath(String url) {
    assertThat(url).startsWith("/uploads/");
    return Path.of("target/test-uploads").resolve(url.substring("/uploads/".length()));
  }

  private void assertImageLongestSideAtMost(Path path, int maxSide) throws Exception {
    assertThat(Files.exists(path)).isTrue();
    var image = ImageIO.read(path.toFile());
    assertThat(image).isNotNull();
    assertThat(Math.max(image.getWidth(), image.getHeight())).isLessThanOrEqualTo(maxSide);
  }

  private void assertImageIsPortrait(Path path) throws Exception {
    assertThat(Files.exists(path)).isTrue();
    var image = ImageIO.read(path.toFile());
    assertThat(image).isNotNull();
    assertThat(image.getHeight()).isGreaterThan(image.getWidth());
  }

  @Test
  void groupedGalleryKeepsIndependentIdsOrderingVisibilityAndSinglePhotoOperations() throws Exception {
    var session = login();
    String endpoint = "/api/admin/gallery-works";
    String payload = """
      {"title":"同名作品","description":"共同描述","location":"测试地点","takenAt":"2026","sortOrder":1,"status":"published"}
      """;
    var first = mockMvc.perform(post(endpoint).session(session).with(csrf()).contentType("application/json").content(payload))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    var second = mockMvc.perform(post(endpoint).session(session).with(csrf()).contentType("application/json")
        .content(payload.replace("\"sortOrder\":1", "\"sortOrder\":2").replace("published", "hidden")))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    var firstId = JsonField.extract(first, "id");
    var secondId = JsonField.extract(second, "id");
    assertThat(firstId).isNotEqualTo(secondId);
    var p1 = uploadWorkPhoto(session, firstId, "first");
    var p2 = uploadWorkPhoto(session, firstId, "second");
    var p3 = uploadWorkPhoto(session, secondId, "hidden");
    var p1Id = JsonField.extract(p1, "id");
    var p2Id = JsonField.extract(p2, "id");
    var p3Id = JsonField.extract(p3, "id");

    mockMvc.perform(put(endpoint + "/" + firstId + "/photos/order").session(session).with(csrf()).contentType("application/json")
        .content("[\"" + p1Id + "\",\"" + p3Id + "\"]")).andExpect(status().isBadRequest());
    mockMvc.perform(put(endpoint + "/" + firstId + "/photos/order").session(session).with(csrf()).contentType("application/json")
        .content("[\"" + p1Id + "\",\"" + p1Id + "\"]")).andExpect(status().isBadRequest());
    mockMvc.perform(put(endpoint + "/" + firstId + "/photos/order").session(session).with(csrf()).contentType("application/json")
        .content("[\"" + p2Id + "\",\"" + p1Id + "\"]")).andExpect(status().isOk())
        .andExpect(jsonPath("$.photos[0].id").value(p2Id)).andExpect(jsonPath("$.photos[1].id").value(p1Id));

    String publicResponse = mockMvc.perform(get("/api/gallery-works")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    assertThat(publicResponse).contains(firstId).doesNotContain(secondId).doesNotContain(p3Id);
    // Group metadata and publication changes propagate without changing photo ordering.
    mockMvc.perform(put(endpoint + "/" + firstId).session(session).with(csrf()).contentType("application/json")
        .content(payload.replace("同名作品", "修改后的作品").replace("published", "hidden")))
        .andExpect(status().isOk()).andExpect(jsonPath("$.photos[0].id").value(p2Id));
    assertThat(mockMvc.perform(get("/api/gallery-works")).andReturn().getResponse().getContentAsString()).doesNotContain(firstId);
    assertThat(mockMvc.perform(get("/api/gallery-photos")).andReturn().getResponse().getContentAsString()).doesNotContain(p1Id).doesNotContain(p2Id);

    mockMvc.perform(multipart("/api/admin/gallery-photos/" + p2Id + "/image")
        .file(new MockMultipartFile("file", "replacement-" + System.nanoTime() + ".png", "image/png", new byte[]{4,5,6})).session(session).with(csrf()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("修改后的作品"))
        .andExpect(jsonPath("$.workId").value(firstId)).andExpect(jsonPath("$.sortOrder").value(1));
    mockMvc.perform(delete("/api/admin/gallery-photos/" + p1Id).session(session).with(csrf())).andExpect(status().isNoContent());
    var adminResponse = mockMvc.perform(get(endpoint).session(session)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    var tree = new com.fasterxml.jackson.databind.ObjectMapper().readTree(adminResponse).get("items");
    var workNode = java.util.stream.StreamSupport.stream(tree.spliterator(), false).filter(node -> node.get("id").asText().equals(firstId)).findFirst().orElseThrow();
    assertThat(workNode.get("photos").size()).isEqualTo(1);
    assertThat(workNode.get("description").asText()).isEqualTo("共同描述");
    assertThat(Files.readAllBytes(resolveUploadPath(JsonField.extract(p3, "url")))).containsExactly(1,2,3);

    mockMvc.perform(delete(endpoint + "/" + firstId).session(session).with(csrf())).andExpect(status().isNoContent());
    assertThat(mockMvc.perform(get(endpoint).session(session)).andReturn().getResponse().getContentAsString())
        .doesNotContain(firstId).contains(secondId).contains(p3Id);
    mockMvc.perform(delete(endpoint + "/" + secondId).session(session).with(csrf())).andExpect(status().isNoContent());
    assertThat(Files.exists(resolveUploadPath(JsonField.extract(p3, "url")))).isFalse();
  }

  private String uploadWorkPhoto(MockHttpSession session, String id, String name) throws Exception {
    return mockMvc.perform(multipart("/api/admin/gallery-works/" + id + "/photos")
        .file(new MockMultipartFile("file", name + "-" + System.nanoTime() + ".png", "image/png", new byte[]{1,2,3})).session(session).with(csrf()))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.workId").value(id))
        .andReturn().getResponse().getContentAsString();
  }

  private static final class JsonField {
    private static String extract(String json, String fieldName) {
      var marker = "\"%s\":\"".formatted(fieldName);
      var start = json.indexOf(marker);
      if (start < 0) {
        throw new IllegalArgumentException("Missing JSON field: " + fieldName);
      }
      var valueStart = start + marker.length();
      var valueEnd = json.indexOf('"', valueStart);
      return json.substring(valueStart, valueEnd);
    }

    private static int extractInt(String json, String fieldName) {
      var marker = "\"%s\":".formatted(fieldName);
      var start = json.indexOf(marker);
      if (start < 0) {
        throw new IllegalArgumentException("Missing JSON field: " + fieldName);
      }

      var valueStart = start + marker.length();
      var valueEnd = valueStart;
      while (valueEnd < json.length() && Character.isDigit(json.charAt(valueEnd))) {
        valueEnd += 1;
      }

      return Integer.parseInt(json.substring(valueStart, valueEnd));
    }
  }
}
