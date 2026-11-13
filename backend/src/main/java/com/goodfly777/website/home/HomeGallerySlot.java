package com.goodfly777.website.home;

import com.goodfly777.website.common.AuditedEntity;
import com.goodfly777.website.gallery.GalleryPhoto;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Column;
import jakarta.persistence.Table;

@Entity
@Table(name = "home_gallery_slots")
public class HomeGallerySlot extends AuditedEntity {

  @Column(nullable = false, unique = true)
  private String slotKey;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "gallery_photo_id")
  private GalleryPhoto galleryPhoto;

  private String uploadedImageUrl;

  private String uploadedFileName;

  private String uploadedMimeType;

  private Long uploadedSizeBytes;

  public String getSlotKey() {
    return slotKey;
  }

  public void setSlotKey(String slotKey) {
    this.slotKey = slotKey;
  }

  public GalleryPhoto getGalleryPhoto() {
    return galleryPhoto;
  }

  public void setGalleryPhoto(GalleryPhoto galleryPhoto) {
    this.galleryPhoto = galleryPhoto;
  }

  public String getUploadedImageUrl() {
    return uploadedImageUrl;
  }

  public void setUploadedImageUrl(String uploadedImageUrl) {
    this.uploadedImageUrl = uploadedImageUrl;
  }

  public String getUploadedFileName() {
    return uploadedFileName;
  }

  public void setUploadedFileName(String uploadedFileName) {
    this.uploadedFileName = uploadedFileName;
  }

  public String getUploadedMimeType() {
    return uploadedMimeType;
  }

  public void setUploadedMimeType(String uploadedMimeType) {
    this.uploadedMimeType = uploadedMimeType;
  }

  public Long getUploadedSizeBytes() {
    return uploadedSizeBytes;
  }

  public void setUploadedSizeBytes(Long uploadedSizeBytes) {
    this.uploadedSizeBytes = uploadedSizeBytes;
  }
}
