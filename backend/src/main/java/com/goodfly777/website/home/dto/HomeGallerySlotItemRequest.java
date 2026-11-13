package com.goodfly777.website.home.dto;

import java.util.UUID;

public record HomeGallerySlotItemRequest(
  String slotKey,
  UUID galleryPhotoId
) {
}
