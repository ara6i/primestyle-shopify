/**
 * PS Demo Products — fetches product catalog and renders the collection grid.
 * DAY2DAY-style layout: borderless images, ALL CAPS names, flat Sale badge.
 */
(function () {
  'use strict';

  var API_BASE    = 'http://localhost:4000';
  var DETAIL_BASE = '/pages/demo-product';

  // ── Helpers ──────────────────────────────────────────────

  function cleanName(brand, name) {
    if (!name) return 'Untitled';
    var trimmed = name.trim();
    if (!brand) return trimmed;
    var escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var cleaned = trimmed.replace(new RegExp('^' + escaped + '\\s*', 'i'), '').trim();
    return cleaned || trimmed;
  }

  function formatPrice(val) {
    if (!val && val !== 0) return null;
    var n = parseFloat(val);
    if (isNaN(n)) return null;
    return '$' + n.toFixed(0);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toCard(p) {
    var rawBrand = p.brand || '';
    var price    = p.price || p.base_price || null;
    var origPrice = p.original_price || p.compare_at_price || null;
    var onSale   = origPrice && parseFloat(origPrice) > parseFloat(price || 0);

    return {
      id:        p.product_id || p._id || '',
      name:      cleanName(rawBrand, p.name || 'Untitled'),
      image:     (p.image_urls && p.image_urls[0]) ||
                 (p.gallery    && p.gallery[0])    || '',
      price:     formatPrice(price),
      origPrice: onSale ? formatPrice(origPrice) : null,
      onSale:    onSale,
    };
  }

  // ── Fetch ─────────────────────────────────────────────────

  async function fetchProducts() {
    var res  = await fetch(API_BASE + '/api/catalog/demo/products?limit=100');
    var data = await res.json();
    return (data.items || []).map(toCard);
  }

  // ── Card HTML ─────────────────────────────────────────────

  function cardHTML(p) {
    var href = DETAIL_BASE + '?id=' + encodeURIComponent(p.id);

    var imgTag = p.image
      ? '<img class="ps-coll-card__img" src="' + escHtml(p.image) +
        '" alt="' + escHtml(p.name) + '" loading="lazy">'
      : '<div class="ps-coll-card__img-placeholder"></div>';

    var badge = p.onSale
      ? '<span class="ps-coll-card__badge">Sale</span>'
      : '';

    var priceHtml = '';
    if (p.price) {
      priceHtml = '<div class="ps-coll-card__price-row">';
      if (p.onSale && p.origPrice) {
        priceHtml +=
          '<span class="ps-coll-card__price ps-coll-card__price--sale">' + escHtml(p.price) + '</span>' +
          '<span class="ps-coll-card__price-orig">' + escHtml(p.origPrice) + '</span>';
      } else {
        priceHtml += '<span class="ps-coll-card__price">' + escHtml(p.price) + '</span>';
      }
      priceHtml += '</div>';
    }

    return '<a class="ps-coll-card" href="' + href + '">' +
      '<div class="ps-coll-card__img-wrap">' +
        imgTag +
        badge +
      '</div>' +
      '<div class="ps-coll-card__info">' +
        '<div class="ps-coll-card__name">' + escHtml(p.name) + '</div>' +
        priceHtml +
      '</div>' +
    '</a>';
  }

  // ── Render ────────────────────────────────────────────────

  function renderGrid(products) {
    var grid  = document.getElementById('ps-products-grid');
    var count = document.getElementById('ps-products-count');
    if (!grid) return;

    if (!products || products.length === 0) {
      grid.innerHTML =
        '<div class="ps-coll-empty">' +
          '<p>No demo products found. Make sure the backend is running.</p>' +
        '</div>';
      return;
    }

    if (count) count.textContent = products.length + ' products';
    grid.innerHTML = products.map(cardHTML).join('');
  }

  // ── View toggle ───────────────────────────────────────────

  function initViewToggle() {
    var grid = document.getElementById('ps-products-grid');
    var btns = document.querySelectorAll('.ps-coll-view-btn');
    if (!grid || !btns.length) return;

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cols = btn.getAttribute('data-cols');
        if (!cols) return;

        // Update grid class
        grid.className = 'ps-coll-grid ps-coll-grid--' + cols;

        // Update active button
        btns.forEach(function (b) { b.classList.remove('ps-coll-view-btn--active'); });
        btn.classList.add('ps-coll-view-btn--active');
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────

  function init() {
    if (window.__psDemoProductsDetailUrl) {
      DETAIL_BASE = window.__psDemoProductsDetailUrl;
    }

    initViewToggle();

    fetchProducts()
      .then(renderGrid)
      .catch(function (err) {
        var grid = document.getElementById('ps-products-grid');
        if (grid) {
          grid.innerHTML =
            '<div class="ps-coll-empty">' +
              '<p>Could not load products — ' + escHtml(err.message || 'check backend at ' + API_BASE) + '</p>' +
            '</div>';
        }
        console.error('[ps-demo-products]', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
