package com.goodfly777.website.gallery;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GalleryWorkRepository extends JpaRepository<GalleryWork, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select work from GalleryWork work where work.id = :id")
  java.util.Optional<GalleryWork> findForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}
