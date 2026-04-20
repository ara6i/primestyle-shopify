/**
 * PrimeStyle product gallery — thumbnail click switching.
 * Lightweight: no dependencies, works with .ps-gallery markup in ps-product.liquid.
 */
(function () {
  if (typeof document === 'undefined') return;

  function init(root) {
    const galleries = (root || document).querySelectorAll('.ps-gallery');
    galleries.forEach((gallery) => {
      if (gallery.dataset.psGalleryInit === '1') return;
      gallery.dataset.psGalleryInit = '1';

      const thumbs = gallery.querySelectorAll('.ps-gallery__thumb');
      const slides = gallery.querySelectorAll('.ps-gallery__slide');
      if (thumbs.length === 0 || slides.length === 0) return;

      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const id = thumb.getAttribute('data-media-id');
          if (!id) return;

          slides.forEach((slide) => {
            if (slide.getAttribute('data-media-id') === id) {
              slide.classList.add('ps-gallery__slide--active');
            } else {
              slide.classList.remove('ps-gallery__slide--active');
            }
          });

          thumbs.forEach((t) => t.classList.toggle('ps-gallery__thumb--active', t === thumb));
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  // Re-init after Shopify section re-render (variant change can swap section HTML)
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  document.addEventListener('product-info:loaded', (e) => init(e.target));
})();
