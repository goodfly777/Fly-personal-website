package com.goodfly777.website.gallery;

import com.goodfly777.website.common.ListResponse;
import com.goodfly777.website.gallery.dto.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class GalleryWorkController {
  private final GalleryWorkService works;
  public GalleryWorkController(GalleryWorkService works) { this.works = works; }
  @GetMapping("/api/gallery-works")
  public ListResponse<GalleryWorkResponse> published() { return new ListResponse<>(works.list(true)); }
  @GetMapping("/api/admin/gallery-works")
  public ListResponse<GalleryWorkResponse> admin() { return new ListResponse<>(works.list(false)); }
  @PostMapping("/api/admin/gallery-works")
  public ResponseEntity<GalleryWorkResponse> create(@Valid @RequestBody GalleryPhotoRequest request) {
    return ResponseEntity.status(201).body(works.create(request));
  }
  @PutMapping("/api/admin/gallery-works/{id}")
  public GalleryWorkResponse update(@PathVariable UUID id, @Valid @RequestBody GalleryPhotoRequest request) { return works.update(id, request); }
  @PostMapping(value = "/api/admin/gallery-works/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<GalleryPhotoResponse> upload(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
    return ResponseEntity.status(201).body(works.upload(id, file));
  }
  @PutMapping("/api/admin/gallery-works/{id}/photos/order")
  public GalleryWorkResponse reorder(@PathVariable UUID id, @RequestBody List<UUID> photoIds) { return works.reorder(id, photoIds); }
  @DeleteMapping("/api/admin/gallery-works/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) { works.delete(id); return ResponseEntity.noContent().build(); }
}
