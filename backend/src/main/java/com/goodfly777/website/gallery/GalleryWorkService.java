package com.goodfly777.website.gallery;

import com.goodfly777.website.common.BadRequestException;
import com.goodfly777.website.common.NotFoundException;
import com.goodfly777.website.content.ContentStatus;
import com.goodfly777.website.gallery.dto.GalleryPhotoRequest;
import com.goodfly777.website.gallery.dto.GalleryPhotoResponse;
import com.goodfly777.website.gallery.dto.GalleryWorkResponse;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class GalleryWorkService {
  private static final Sort WORK_ORDER = Sort.by("sortOrder", "id");
  private static final Sort PHOTO_ORDER = Sort.by("sortOrder", "id");
  private final GalleryWorkRepository works;
  private final GalleryPhotoRepository photos;
  private final GalleryPhotoService photoService;

  public GalleryWorkService(GalleryWorkRepository works, GalleryPhotoRepository photos, GalleryPhotoService photoService) {
    this.works = works; this.photos = photos; this.photoService = photoService;
  }

  @Transactional(readOnly = true)
  public List<GalleryWorkResponse> list(boolean publishedOnly) {
    var byWork = photos.findAll(PHOTO_ORDER).stream()
        .filter(photo -> !publishedOnly || photo.getStatus() == ContentStatus.PUBLISHED)
        .collect(java.util.stream.Collectors.groupingBy(GalleryPhoto::getWorkId));
    return works.findAll(WORK_ORDER).stream()
        .filter(work -> !publishedOnly || work.getStatus() == ContentStatus.PUBLISHED)
        .map(work -> GalleryWorkResponse.from(work, byWork.getOrDefault(work.getId(), List.of()).stream().map(GalleryPhotoResponse::from).toList()))
        .filter(work -> !publishedOnly || !work.photos().isEmpty()).toList();
  }

  @Transactional
  public GalleryWorkResponse create(GalleryPhotoRequest request) {
    var work = new GalleryWork();
    applyMetadata(work, request);
    if (request.sortOrder() == null || request.sortOrder() <= 0) {
      work.setSortOrder(works.findAll().stream().mapToInt(GalleryWork::getSortOrder).max().orElse(0) + 1);
    }
    works.save(work);
    return response(work);
  }

  @Transactional
  public GalleryWorkResponse update(UUID id, GalleryPhotoRequest request) {
    var work = require(id);
    applyMetadata(work, request);
    photos.findAllByWorkId(id, PHOTO_ORDER).forEach(photo -> {
      photo.setTitle(work.getTitle()); photo.setDescription(work.getDescription());
      photo.setLocation(work.getLocation()); photo.setTakenAt(work.getTakenAt()); photo.setStatus(work.getStatus());
    });
    return response(work);
  }

  @Transactional
  public GalleryPhotoResponse upload(UUID id, MultipartFile file) {
    var work = require(id);
    int order = photos.findAllByWorkId(id, PHOTO_ORDER).stream().mapToInt(GalleryPhoto::getSortOrder).max().orElse(0) + 1;
    return photoService.uploadToWork(id, file, new GalleryPhotoRequest(work.getTitle(), work.getDescription(), work.getLocation(), work.getTakenAt(), order, work.getStatus()));
  }

  @Transactional
  public GalleryWorkResponse reorder(UUID id, List<UUID> ids) {
    var work = require(id);
    var members = photos.findAllByWorkId(id, PHOTO_ORDER);
    var actual = members.stream().map(GalleryPhoto::getId).collect(java.util.stream.Collectors.toSet());
    if (ids == null || ids.size() != actual.size() || new HashSet<>(ids).size() != ids.size() || !actual.equals(new HashSet<>(ids))) {
      throw new BadRequestException("Provide each photo in this work exactly once.");
    }
    var order = new java.util.HashMap<UUID, Integer>();
    for (int i = 0; i < ids.size(); i++) order.put(ids.get(i), i + 1);
    members.forEach(photo -> photo.setSortOrder(order.get(photo.getId())));
    return response(work);
  }

  @Transactional
  public void delete(UUID id) {
    var work = require(id);
    photos.findAllByWorkId(id, PHOTO_ORDER).forEach(photo -> photoService.delete(photo.getId()));
    works.delete(work);
  }

  private GalleryWork require(UUID id) {
    return works.findForUpdate(id).orElseThrow(() -> new NotFoundException("Gallery work not found."));
  }
  private GalleryWorkResponse response(GalleryWork work) {
    return GalleryWorkResponse.from(work, photos.findAllByWorkId(work.getId(), PHOTO_ORDER).stream().map(GalleryPhotoResponse::from).toList());
  }
  static void applyMetadata(GalleryWork work, GalleryPhotoRequest request) {
    if (request.title() == null || request.title().isBlank()) throw new BadRequestException("Gallery work title is required.");
    work.setTitle(request.title().trim()); work.setDescription(clean(request.description()));
    work.setLocation(clean(request.location())); work.setTakenAt(clean(request.takenAt()));
    if (request.sortOrder() != null && request.sortOrder() > 0) work.setSortOrder(request.sortOrder());
    work.setStatus(request.status() == null ? ContentStatus.DRAFT : request.status());
  }
  private static String clean(String value) { return value == null ? "" : value.trim(); }
}
