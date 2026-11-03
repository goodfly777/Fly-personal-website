package com.goodfly777.website.gallery;

import com.goodfly777.website.common.AuditedEntity;
import com.goodfly777.website.content.ContentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "gallery_works")
public class GalleryWork extends AuditedEntity {

  @Column(nullable = false)
  private String title;

  @Column(nullable = false, columnDefinition = "text")
  private String description = "";

  @Column(nullable = false)
  private String location = "";

  @Column(nullable = false)
  private String takenAt = "";

  @Column(nullable = false)
  private int sortOrder = 0;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ContentStatus status = ContentStatus.DRAFT;

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getTakenAt() {
    return takenAt;
  }

  public void setTakenAt(String takenAt) {
    this.takenAt = takenAt;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }

  public ContentStatus getStatus() {
    return status;
  }

  public void setStatus(ContentStatus status) {
    this.status = status;
  }

}
