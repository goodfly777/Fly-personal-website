package com.goodfly777.website.about.dto;

public record AboutAssetResponse(
  String url,
  String fileName,
  String mimeType,
  long sizeBytes
) {
}
