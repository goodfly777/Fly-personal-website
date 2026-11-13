package com.goodfly777.website.home.dto;

import com.goodfly777.website.gallery.GalleryPhoto;
import com.goodfly777.website.home.HomeGallerySlot;
import org.springframework.util.StringUtils;

public record HomeGallerySlotResponse(
  String slotKey,
  HomeGallerySlotPhotoResponse photo
) {
  public static HomeGallerySlotResponse of(String slotKey, HomeGallerySlot slot, GalleryPhoto photo, String title) {
    if (slot != null && StringUtils.hasText(slot.getUploadedImageUrl())) {
      return new HomeGallerySlotResponse(slotKey, HomeGallerySlotPhotoResponse.fromUpload(slot, title));
    }

    return new HomeGallerySlotResponse(slotKey, photo == null ? null : HomeGallerySlotPhotoResponse.fromGallery(photo));
  }
}
