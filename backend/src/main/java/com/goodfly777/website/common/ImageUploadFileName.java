package com.goodfly777.website.common;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

public final class ImageUploadFileName {

  private ImageUploadFileName() {
  }

  public static String versioned(String baseName, String extension) {
    var version = UUID.randomUUID().toString();
    var fileName = "%s-%s%s".formatted(baseName, version, extension);
    // Leave room for the gallery derivative suffixes within a 255-byte path component.
    return fileName.getBytes(StandardCharsets.UTF_8).length <= 240 ? fileName : version + extension;
  }
}
