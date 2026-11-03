package com.goodfly777.website.about;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.goodfly777.website.about.dto.AboutContactItem;
import com.goodfly777.website.about.dto.AboutContentRequest;
import com.goodfly777.website.about.dto.AboutContentResponse;
import com.goodfly777.website.about.dto.AboutProfileDetail;
import com.goodfly777.website.about.dto.AboutResumeEntry;
import com.goodfly777.website.about.dto.AboutResumeHighlight;
import com.goodfly777.website.about.dto.AboutSocialLink;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AboutContentService {

  private static final String MAIN_KEY = "main";
  private static final TypeReference<List<AboutProfileDetail>> PROFILE_DETAILS = new TypeReference<>() {
  };
  private static final TypeReference<List<AboutResumeEntry>> RESUME_ENTRIES = new TypeReference<>() {
  };
  private static final TypeReference<List<AboutContactItem>> CONTACT_ITEMS = new TypeReference<>() {
  };
  private static final TypeReference<List<AboutSocialLink>> SOCIAL_LINKS = new TypeReference<>() {
  };

  private final AboutContentRepository aboutContents;
  private final ObjectMapper objectMapper;

  public AboutContentService(AboutContentRepository aboutContents, ObjectMapper objectMapper) {
    this.aboutContents = aboutContents;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public AboutContentResponse get() {
    return getPublic();
  }

  @Transactional
  public AboutContentResponse getPublic() {
    return toResponse(getOrCreateMainContent(), false);
  }

  @Transactional
  public AboutContentResponse getAdmin() {
    return toResponse(getOrCreateMainContent(), true);
  }

  @Transactional
  public AboutContentResponse update(AboutContentRequest request) {
    var content = getOrCreateMainContent();
    apply(content, request);
    return toResponse(content, true);
  }

  private AboutContent getOrCreateMainContent() {
    return aboutContents.findByContentKey(MAIN_KEY)
      .orElseGet(() -> {
        var content = new AboutContent();
        content.setContentKey(MAIN_KEY);
        apply(content, defaultRequest());
        return aboutContents.save(content);
      });
  }

  private void apply(AboutContent content, AboutContentRequest request) {
    content.setPortraitImageUrl(clean(request.portraitImageUrl()));
    content.setWechatQrImageUrl(clean(request.wechatQrImageUrl()));
    content.setProfileDetails(toJson(normalizeProfileDetails(request.profileDetails())));
    content.setResumeEntries(toJson(normalizeResumeEntries(request.resumeEntries())));
    content.setContactHeading(clean(request.contactHeading()));
    content.setContactItems(toJson(normalizeContactItems(request.contactItems())));
    content.setSocialLinks(toJson(normalizeSocialLinks(request.socialLinks())));
  }

  private AboutContentResponse toResponse(AboutContent content, boolean includeHiddenResumeEntries) {
    return new AboutContentResponse(
      content.getId(),
      content.getPortraitImageUrl(),
      content.getWechatQrImageUrl(),
      fromJson(content.getProfileDetails(), PROFILE_DETAILS),
      fromJson(content.getResumeEntries(), RESUME_ENTRIES).stream()
        .filter(entry -> includeHiddenResumeEntries || !Boolean.TRUE.equals(entry.hidden()))
        .sorted(Comparator.comparing(entry -> entry.sortOrder() == null ? 0 : entry.sortOrder()))
        .toList(),
      content.getContactHeading(),
      fromJson(content.getContactItems(), CONTACT_ITEMS),
      fromJson(content.getSocialLinks(), SOCIAL_LINKS),
      content.getCreatedAt(),
      content.getUpdatedAt()
    );
  }

  private AboutContentRequest defaultRequest() {
    return new AboutContentRequest("", "", List.of(
      new AboutProfileDetail("基本信息", "", "user", null, true),
      new AboutProfileDetail("本科", "", "graduation-cap", null, false),
      new AboutProfileDetail("硕士", "", "graduation-cap", null, false),
      new AboutProfileDetail("手机", "", "phone", null, false),
      new AboutProfileDetail("邮箱", "", "mail", null, false)
    ), List.of(), "联系设置", List.of(
      new AboutContactItem("手机", "", "phone"),
      new AboutContactItem("邮箱", "", "mail")
    ), List.of());
  }

  private List<AboutProfileDetail> normalizeProfileDetails(List<AboutProfileDetail> values) {
    return values == null ? List.of() : values.stream()
      .filter(item -> item != null && !clean(item.label()).isBlank())
      .map(item -> new AboutProfileDetail(
        clean(item.label()),
        clean(item.value()),
        clean(item.icon()).isBlank() ? "user" : clean(item.icon()),
        clean(item.copyValue()).isBlank() ? null : clean(item.copyValue()),
        Boolean.TRUE.equals(item.wide())
      ))
      .toList();
  }

  private List<AboutResumeEntry> normalizeResumeEntries(List<AboutResumeEntry> values) {
    return values == null ? List.of() : values.stream()
      .filter(item -> item != null && !clean(item.title()).isBlank())
      .map(item -> new AboutResumeEntry(
        clean(item.category()).isBlank() ? "Project Resume" : clean(item.category()),
        clean(item.title()),
        clean(item.meta()),
        clean(item.period()),
        cleanList(item.techStack()),
        clean(item.descriptionLabel()).isBlank() ? "项目描述" : clean(item.descriptionLabel()),
        clean(item.description()),
        clean(item.highlightsLabel()).isBlank() ? "项目亮点" : clean(item.highlightsLabel()),
        normalizeHighlights(item.highlights()),
        item.sortOrder() == null ? 0 : item.sortOrder(),
        Boolean.TRUE.equals(item.hidden())
      ))
      .toList();
  }

  private List<AboutResumeHighlight> normalizeHighlights(List<AboutResumeHighlight> values) {
    return values == null ? List.of() : values.stream()
      .filter(item -> item != null && !clean(item.title()).isBlank())
      .map(item -> new AboutResumeHighlight(clean(item.title()), clean(item.detail())))
      .toList();
  }

  private List<AboutContactItem> normalizeContactItems(List<AboutContactItem> values) {
    return values == null ? List.of() : values.stream()
      .filter(item -> item != null && !clean(item.label()).isBlank())
      .map(item -> new AboutContactItem(
        clean(item.label()),
        clean(item.value()),
        clean(item.icon()).isBlank() ? "mail" : clean(item.icon())
      ))
      .toList();
  }

  private List<AboutSocialLink> normalizeSocialLinks(List<AboutSocialLink> values) {
    return values == null ? List.of() : values.stream()
      .filter(item -> item != null && !clean(item.label()).isBlank() && !clean(item.url()).isBlank())
      .map(item -> new AboutSocialLink(
        clean(item.label()),
        clean(item.url()),
        clean(item.icon()).isBlank() ? "globe" : clean(item.icon())
      ))
      .toList();
  }

  private List<String> cleanList(List<String> values) {
    return values == null ? List.of() : values.stream()
      .map(this::clean)
      .filter(value -> !value.isBlank())
      .toList();
  }

  private String clean(String value) {
    return value == null ? "" : value.trim();
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException error) {
      throw new IllegalArgumentException("Cannot serialize about content.", error);
    }
  }

  private <T> T fromJson(String json, TypeReference<T> typeReference) {
    try {
      return objectMapper.readValue(json, typeReference);
    } catch (JsonProcessingException error) {
      throw new IllegalArgumentException("Cannot read about content.", error);
    }
  }
}
