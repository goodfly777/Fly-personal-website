package com.goodfly777.website.about.dto;

import jakarta.validation.constraints.NotBlank;

public record AboutResumeHighlight(
  @NotBlank String title,
  String detail
) {
}
