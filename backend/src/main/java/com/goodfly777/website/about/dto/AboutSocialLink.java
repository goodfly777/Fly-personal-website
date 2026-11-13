package com.goodfly777.website.about.dto;

import jakarta.validation.constraints.NotBlank;

public record AboutSocialLink(
  @NotBlank String label,
  @NotBlank String url,
  String icon
) {
}
