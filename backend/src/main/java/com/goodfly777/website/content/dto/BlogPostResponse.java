package com.goodfly777.website.content.dto;

import com.goodfly777.website.content.BlogPost;
import com.goodfly777.website.content.ContentStatus;
import java.time.Instant;
import java.util.UUID;

public record BlogPostResponse(
  UUID id,
  UUID projectId,
  String projectSlug,
  String projectTitle,
  String title,
  String slug,
  String category,
  String summary,
  String contentMarkdown,
  int blogOrder,
  boolean featuredOnHome,
  int homeOrder,
  String coverImageUrl,
  ContentStatus status,
  Instant publishedAt,
  Instant createdAt,
  Instant updatedAt
) {

  public static BlogPostResponse from(BlogPost post) {
    return new BlogPostResponse(
      post.getId(),
      null,
      "",
      "",
      post.getTitle(),
      post.getSlug(),
      post.getCategory(),
      post.getSummary(),
      post.getContentMarkdown(),
      post.getBlogOrder(),
      post.isFeaturedOnHome(),
      post.getHomeOrder(),
      post.getCoverImageUrl(),
      post.getStatus(),
      post.getPublishedAt(),
      post.getCreatedAt(),
      post.getUpdatedAt()
    );
  }
}
