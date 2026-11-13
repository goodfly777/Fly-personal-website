package com.goodfly777.website.about.dto;

import jakarta.validation.constraints.NotBlank;

public record AboutProfileDetail(
  @NotBlank String label,
  String value,
  String icon,
  String copyValue,
  Boolean wide
) {
}
