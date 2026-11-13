package com.goodfly777.website.about.dto;

import jakarta.validation.constraints.NotBlank;

public record AboutContactItem(
  @NotBlank String label,
  String value,
  String icon
) {
}
