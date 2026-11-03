package com.goodfly777.website.home;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.goodfly777.website.gallery.GalleryPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeGallerySlotRepository extends JpaRepository<HomeGallerySlot, UUID> {

  List<HomeGallerySlot> findAllBySlotKeyIn(Collection<String> slotKeys);

  List<HomeGallerySlot> findAllByGalleryPhoto(GalleryPhoto galleryPhoto);

  Optional<HomeGallerySlot> findBySlotKey(String slotKey);
}
