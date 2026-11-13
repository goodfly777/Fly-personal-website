package com.goodfly777.website.gallery.dto;

import com.goodfly777.website.content.ContentStatus;
import com.goodfly777.website.gallery.GalleryWork;
import java.util.List;
import java.util.UUID;

public record GalleryWorkResponse(UUID id, String title, String description, String location,
    String takenAt, int sortOrder, ContentStatus status, List<GalleryPhotoResponse> photos) {
  public static GalleryWorkResponse from(GalleryWork work, List<GalleryPhotoResponse> photos) {
    return new GalleryWorkResponse(work.getId(), work.getTitle(), work.getDescription(), work.getLocation(),
        work.getTakenAt(), work.getSortOrder(), work.getStatus(), photos);
  }
}
