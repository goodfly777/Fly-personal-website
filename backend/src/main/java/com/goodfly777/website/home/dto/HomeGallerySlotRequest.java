package com.goodfly777.website.home.dto;

import jakarta.validation.Valid;
import java.util.List;

public record HomeGallerySlotRequest(
  List<@Valid HomeGallerySlotItemRequest> slots
) {
}
