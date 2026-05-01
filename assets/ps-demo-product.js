/**
 * PS Demo Product Detail
 * Mirrors DemoProductDetail (desktop) from prime-main.
 * 3-column layout: left sticky info | center images | right purchase panel
 */
(function () {
  'use strict';

  var API_BASE   = window.__psDemoApiBase  || 'https://myaifitting.com';
  var SDK_PROXY  = window.__psSdkProxyUrl  || '';
  var DEMO_BRAND = 'PrimeStyleAI';
  var LIST_URL   = '/pages/demo-products';

  // ── State ──────────────────────────────────────────────────
  var state = {
    product: null,       // mapped product view
    selectedColor: '',
    sizeUnit: 'cm',
    selectedRegion: '',
    sizeGuideOpen: false,
    // for split sizes (jacket + length)
    jacketNum: '',
    jacketLen: '',
    selectedSize: '',
    // pants
    pantsWaist: '',
    pantsLen: '',
  };

  // ── Helpers ────────────────────────────────────────────────

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function cleanName(brand, name) {
    if (!name) return 'Untitled';
    var t = name.trim();
    if (!brand) return t;
    var esc2 = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var c = t.replace(new RegExp('^' + esc2 + '\\s*', 'i'), '').trim();
    return c || t;
  }

  function isAvail(status) {
    if (!status) return true;
    var s = status.toLowerCase();
    return s !== 'outofstock' && s !== 'discontinued' && s !== 'unavailable';
  }

  // ── Data mapping (mirrors demoProductMapper.ts) ────────────

  function buildImages(p) {
    var all = [], seen = {};
    function add(urls) {
      (urls || []).forEach(function (u) { if (u && !seen[u]) { seen[u] = 1; all.push(u); } });
    }
    add(p.gallery);
    add(p.image_urls);
    add(p.variant_image_urls);
    (p.variants || []).forEach(function (v) { add(v.images); });
    return all;
  }

  function buildColorVariants(p) {
    if (!p.variants || !p.variants.length) {
      return (p.color_variants || []).map(function (cv) {
        return { name: cv.name || '', hex: cv.hex || '#666', available: cv.available !== false, images: [], sizes: [] };
      });
    }
    return p.variants.map(function (v) {
      return {
        name: v.name || '',
        hex: v.hex || '#666',
        available: v.available !== false,
        images: v.images || [],
        sizes: (v.sizes || []).map(function (s) { return { name: s.name || '', available: isAvail(s.availability) }; }),
      };
    });
  }

  function buildSizes(p) {
    if (p.variant_sizes && p.variant_sizes.length) {
      return p.variant_sizes.map(function (s) { return { name: s.name || '', available: isAvail(s.availability) }; });
    }
    if (p.sizes && p.sizes.length) {
      return p.sizes.map(function (n) { return { name: n, available: true }; });
    }
    var first = p.variants && p.variants[0];
    if (first && first.sizes && first.sizes.length) {
      return first.sizes.map(function (s) { return { name: s.name || '', available: isAvail(s.availability) }; });
    }
    return [];
  }

  function parseSizeGuide(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.title) return null;
    var common = {
      subtitle: raw.subtitle,
      howToMeasure: raw.howToMeasure,
      fitTerms: raw.fitTerms,
      regions: raw.regions,
      noUnitToggle: raw.noUnitToggle,
      unit: raw.unit || '',
    };
    if (Array.isArray(raw.sections) && raw.sections.length) {
      return Object.assign({ title: raw.title, sections: raw.sections }, common);
    }
    if (!raw.headers || !raw.rows) return null;
    return Object.assign({ title: raw.title, headers: raw.headers, rows: raw.rows }, common);
  }

  function mapProduct(p) {
    var images        = buildImages(p);
    var colorVariants = buildColorVariants(p);
    var sizes         = buildSizes(p);
    var rawBrand      = p.brand || '';
    return {
      id:           p.product_id || p._id || '',
      name:         cleanName(rawBrand, p.name || 'Untitled'),
      brand:        DEMO_BRAND,
      category:     p.category || '',
      description:  p.short_description || p.description || '',
      material:     p.material || '',
      images:       images,
      primaryImage: images[0] || '',
      sizes:        sizes,
      colorVariants: colorVariants,
      selectedColor: (p.selected_color && p.selected_color.name) || p.color || (colorVariants[0] && colorVariants[0].name) || '',
      sizeGuideRaw:  p.size_guide || null,
      sizeGuide:     parseSizeGuide(p.size_guide),
    };
  }

  // ── Fetch ──────────────────────────────────────────────────

  async function fetchProduct(id) {
    var res  = await fetch(API_BASE + '/api/catalog/demo/products/' + encodeURIComponent(id));
    var data = await res.json();
    return mapProduct(data);
  }

  // ── Size logic (mirrors DemoProductDetail) ─────────────────

  function parsedSizes(sizes) {
    return sizes.map(function (s) {
      var spaceIdx = s.name.indexOf(' ');
      return spaceIdx === -1
        ? { number: s.name, length: '', available: s.available, original: s.name }
        : { number: s.name.slice(0, spaceIdx), length: s.name.slice(spaceIdx + 1), available: s.available, original: s.name };
    });
  }

  function hasSplitSizes(sizes) {
    return sizes.some(function (s) { return s.name.indexOf(' ') !== -1; });
  }

  // ── SVG icons ──────────────────────────────────────────────
  var SVG_RULER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-2 8h-2v2h-2v-2h-2v2h-2v-2H9v2H7v-2H5V9h2V7h2v2h2V7h2v2h2V7h2v2h2v4z"/></svg>';

  // ── Render ─────────────────────────────────────────────────

  function getActiveVariant() {
    var p = state.product;
    return p.colorVariants.find(function (v) { return v.name === state.selectedColor; }) || null;
  }

  function getImages() {
    var av = getActiveVariant();
    if (av && av.images && av.images.length) return av.images;
    return state.product.images;
  }

  function getSizes() {
    var av = getActiveVariant();
    if (av && av.sizes && av.sizes.length) return av.sizes;
    return state.product.sizes;
  }

  function renderLeft() {
    var p = state.product;
    var descHTML = p.description
      ? '<div class="ps-detail-desc">' + p.description + '</div>'
      : '';
    var matHTML = p.material
      ? '<div class="ps-detail-material">' +
          '<span>' + esc(p.material.split(' ')[0]) + '</span>' +
          '<span class="ps-detail-material__line"></span>' +
          '<span class="ps-detail-material__val">' + esc(p.material) + '</span>' +
        '</div>'
      : '';

    return '<div class="ps-detail-left" id="ps-detail-left">' +
      '<div class="ps-detail-left__inner">' +
        '<p class="ps-detail-brand">' + esc(p.brand) + '</p>' +
        '<h1 class="ps-detail-name">' + esc(p.name) + '</h1>' +
        descHTML +
        matHTML +
      '</div>' +
    '</div>';
  }

  function renderCenter() {
    var images = getImages();
    var blocks = images.map(function (src, i) {
      return '<div class="ps-detail-img-block" style="animation-delay:' + (i * 0.06) + 's">' +
        '<img src="' + esc(src) + '" alt="' + esc(state.product.name + ' ' + (i + 1)) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">' +
      '</div>';
    }).join('');

    return '<div class="ps-detail-center" id="ps-detail-center">' + blocks + '</div>';
  }

  function renderColorSwatches() {
    var p = state.product;
    if (!p.colorVariants || !p.colorVariants.length) return '';
    var swatches = p.colorVariants.map(function (cv) {
      var active   = cv.name === state.selectedColor ? ' active' : '';
      var unavail  = !cv.available ? ' unavailable' : '';
      return '<button class="ps-detail-swatch' + active + unavail + '"' +
        ' data-color="' + esc(cv.name) + '"' +
        ' style="background-color:' + esc(cv.hex) + '"' +
        ' title="' + esc(cv.name) + '"' +
        (cv.available ? '' : ' disabled') + '>' +
      '</button>';
    }).join('');

    return '<div class="ps-detail-color-section">' +
      '<div class="ps-detail-color-row">' +
        '<span class="ps-detail-section-label">Color</span>' +
        '<span class="ps-detail-color-name" id="ps-color-name">' + esc(state.selectedColor) + '</span>' +
      '</div>' +
      '<div class="ps-detail-swatches" id="ps-swatches">' + swatches + '</div>' +
    '</div>';
  }

  function renderSizeSelector() {
    var sizes = getSizes();
    if (!sizes || !sizes.length) return '';

    if (hasSplitSizes(sizes)) {
      return renderSplitSizeSelector(sizes);
    }

    var options = sizes.map(function (s) {
      return '<option value="' + esc(s.name) + '"' + (!s.available ? ' disabled' : '') + '>' +
        esc(s.name) + (!s.available ? ' — Sold out' : '') +
      '</option>';
    }).join('');

    return '<div class="ps-detail-size-group">' +
      '<span class="ps-detail-section-label">Size</span>' +
      '<select id="ps-size-single" class="ps-detail-select">' +
        '<option value="">Select size</option>' +
        options +
      '</select>' +
    '</div>';
  }

  function renderSplitSizeSelector(sizes) {
    var parsed  = parsedSizes(sizes);
    var nums    = [];
    var numSeen = {};
    parsed.forEach(function (s) {
      if (!numSeen[s.number]) { numSeen[s.number] = 1; nums.push(s.number); }
    });
    var allLengths = [];
    var lenSeen    = {};
    parsed.forEach(function (s) {
      if (s.length && !lenSeen[s.length]) { lenSeen[s.length] = 1; allLengths.push(s.length); }
    });

    var numOpts = nums.map(function (n) {
      var anyAvail = parsed.some(function (s) { return s.number === n && s.available; });
      return '<option value="' + esc(n) + '"' + (!anyAvail ? ' disabled' : '') + '>' + esc(n) + '</option>';
    }).join('');

    var lenOpts = allLengths.map(function (l) {
      return '<option value="' + esc(l) + '">' + esc(l) + '</option>';
    }).join('');

    var lenSel = allLengths.length
      ? '<div class="ps-detail-select-wrap">' +
          '<label>Length</label>' +
          '<select id="ps-size-len" class="ps-detail-select"' +
            (!state.jacketNum ? ' disabled' : '') + '>' +
            '<option value="">Select</option>' +
            lenOpts +
          '</select>' +
        '</div>'
      : '';

    // Pants selectors — check size guide for pants sections
    var pantsHTML = '';
    var sizeGuide = state.product.sizeGuide;
    if (sizeGuide && sizeGuide.sections) {
      var pantsSection      = sizeGuide.sections.find(function (s) { return /pant/i.test(s.name) && !/length/i.test(s.name); });
      var pantsLenSection   = sizeGuide.sections.find(function (s) { return /pant/i.test(s.name) && /length/i.test(s.name); });
      var pantsWaistSizes   = pantsSection    ? pantsSection.rows.map(function (r) { return r['Size']; }).filter(Boolean) : [];
      var pantsLengthSizes  = pantsLenSection ? pantsLenSection.rows.map(function (r) { return r['Length'] || r['Size']; }).filter(Boolean) : [];

      if (pantsWaistSizes.length || pantsLengthSizes.length) {
        var pWaistOpts = pantsWaistSizes.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
        var pLenOpts   = pantsLengthSizes.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
        pantsHTML = '<div class="ps-detail-size-row">' +
          (pantsWaistSizes.length
            ? '<div class="ps-detail-select-wrap"><label>Pants</label>' +
              '<select id="ps-pants-waist" class="ps-detail-select"><option value="">Select</option>' + pWaistOpts + '</select></div>'
            : '') +
          (pantsLengthSizes.length
            ? '<div class="ps-detail-select-wrap"><label>Length</label>' +
              '<select id="ps-pants-len" class="ps-detail-select"><option value="">Select</option>' + pLenOpts + '</select></div>'
            : '') +
        '</div>';
      }
    }

    return '<div class="ps-detail-size-group">' +
      '<span class="ps-detail-section-label">Size</span>' +
      '<div class="ps-detail-size-row">' +
        '<div class="ps-detail-select-wrap">' +
          '<label>Jacket</label>' +
          '<select id="ps-size-num" class="ps-detail-select">' +
            '<option value="">Select</option>' + numOpts +
          '</select>' +
        '</div>' +
        lenSel +
      '</div>' +
      pantsHTML +
    '</div>';
  }

  function renderSdkButton() {
    var images = getImages();
    var img    = (images && images[0]) || state.product.primaryImage || '';

    var btnStylesJson = JSON.stringify({
      backgroundColor:      '#2154EF',
      textColor:            '#ffffff',
      border:               'none',
      borderRadius:         '6px',
      height:               '44px',
      width:                'auto',
      paddingLeft:          '24px',
      paddingRight:         '24px',
      fontSize:             '13px',
      fontWeight:           '700',
      hoverBackgroundColor: '#193EDC',
      hoverTextColor:       '#ffffff',
      boxShadow:            '0 4px 20px rgba(33,84,239,.2)',
    });

    // Prefer the App Proxy URL — Shopify HMAC-signs requests, no key
    // needed. Fall back to direct backend URL only if proxy is missing.
    var sdkUrl = SDK_PROXY || API_BASE;
    return '<div class="ps-detail-sdk-wrap">' +
      '<primestyle-tryon' +
      ' api-url="' + esc(sdkUrl) + '"' +
      ' product-image="' + esc(img) + '"' +
      ' button-text="Find Your Size"' +
      ' locale="en"' +
      ' show-powered-by="false"' +
      ' button-styles=\'' + btnStylesJson.replace(/'/g, '&#39;') + '\'' +
      '>' +
      '</primestyle-tryon>' +
    '</div>';
  }

  function renderLinksRow() {
    var hasSG = !!(state.product.sizeGuide);
    var sgBtn = hasSG
      ? '<button class="ps-detail-link-btn" id="ps-size-guide-btn">' +
          '<span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Size Guide</span>' +
          '<span>→</span>' +
        '</button>'
      : '';
    return '<div class="ps-detail-links">' +
      sgBtn +
      '<button class="ps-detail-link-btn">' +
        '<span>Shipping &amp; Returns</span>' +
        '<span>→</span>' +
      '</button>' +
    '</div>';
  }

  function renderRight() {
    return '<div class="ps-detail-right" id="ps-detail-right">' +
      '<div class="ps-detail-right__inner">' +
        renderColorSwatches() +
        renderSizeSelector() +
        renderSdkButton() +
        renderLinksRow() +
        '<p class="ps-detail-footer">@primestyleai/tryon</p>' +
      '</div>' +
    '</div>';
  }

  function renderLayout() {
    var content = document.getElementById('ps-detail-content');
    if (!content) return;
    content.innerHTML =
      '<div class="ps-detail-cols" id="ps-detail-cols">' +
        renderLeft() +
        renderCenter() +
        renderRight() +
      '</div>';
    bindEvents();
  }

  // ── Partial re-renders ─────────────────────────────────────

  function refreshCenter() {
    var center = document.getElementById('ps-detail-center');
    if (!center) return;
    var images = getImages();
    var blocks = images.map(function (src, i) {
      return '<div class="ps-detail-img-block" style="animation-delay:' + (i * 0.06) + 's">' +
        '<img src="' + esc(src) + '" alt="' + esc(state.product.name + ' ' + (i + 1)) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">' +
      '</div>';
    }).join('');
    center.innerHTML = blocks;
  }

  function refreshRight() {
    var right = document.getElementById('ps-detail-right');
    if (!right) return;
    var inner = right.querySelector('.ps-detail-right__inner');
    if (!inner) return;
    inner.innerHTML =
      renderColorSwatches() +
      renderSizeSelector() +
      renderSdkButton() +
      renderLinksRow() +
      '<p class="ps-detail-footer">@primestyleai/tryon</p>';
    bindRightEvents();
  }

  // ── Event binding ──────────────────────────────────────────

  function bindEvents() {
    bindRightEvents();
  }

  function bindRightEvents() {
    // Color swatches
    var swatchEl = document.getElementById('ps-swatches');
    if (swatchEl) {
      swatchEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.ps-detail-swatch');
        if (!btn || btn.disabled) return;
        var colorName = btn.dataset.color;
        if (colorName === state.selectedColor) return;
        state.selectedColor = colorName;
        state.jacketNum     = '';
        state.jacketLen     = '';
        state.selectedSize  = '';
        state.pantsWaist    = '';
        state.pantsLen      = '';
        refreshCenter();
        refreshRight();
      });
    }

    // Split size — jacket number
    var numSel = document.getElementById('ps-size-num');
    if (numSel) {
      numSel.value = state.jacketNum;
      numSel.addEventListener('change', function () {
        state.jacketNum    = this.value;
        state.jacketLen    = '';
        state.selectedSize = '';
        var lenSel = document.getElementById('ps-size-len');
        if (lenSel) {
          lenSel.disabled = !state.jacketNum;
          lenSel.value = '';
        }
        // Auto-select if only one length
        var parsed = parsedSizes(getSizes());
        var lengths = parsed.filter(function (s) { return s.number === state.jacketNum && s.length; });
        if (lengths.length === 1 && lengths[0].available) {
          state.jacketLen    = lengths[0].length;
          state.selectedSize = lengths[0].original;
          if (lenSel) lenSel.value = lengths[0].length;
        } else if (lengths.length === 0) {
          var match = parsed.find(function (s) { return s.number === state.jacketNum; });
          if (match && match.available) state.selectedSize = match.original;
        }
      });
    }

    // Split size — length
    var lenSel = document.getElementById('ps-size-len');
    if (lenSel) {
      lenSel.value = state.jacketLen;
      lenSel.addEventListener('change', function () {
        state.jacketLen = this.value;
        var parsed = parsedSizes(getSizes());
        var match  = parsed.find(function (s) { return s.number === state.jacketNum && s.length === state.jacketLen; });
        if (match) state.selectedSize = match.original;
      });
    }

    // Simple size
    var singleSel = document.getElementById('ps-size-single');
    if (singleSel) {
      singleSel.value = state.selectedSize;
      singleSel.addEventListener('change', function () { state.selectedSize = this.value; });
    }

    // Pants
    var pantsWaistSel = document.getElementById('ps-pants-waist');
    if (pantsWaistSel) {
      pantsWaistSel.value = state.pantsWaist;
      pantsWaistSel.addEventListener('change', function () { state.pantsWaist = this.value; });
    }
    var pantsLenSel = document.getElementById('ps-pants-len');
    if (pantsLenSel) {
      pantsLenSel.value = state.pantsLen;
      pantsLenSel.addEventListener('change', function () { state.pantsLen = this.value; });
    }

    // Size guide button
    var sgBtn = document.getElementById('ps-size-guide-btn');
    if (sgBtn) {
      sgBtn.addEventListener('click', function () { openSizeGuide(); });
    }
  }

  // ── Size Guide Modal ───────────────────────────────────────

  function openSizeGuide() {
    var guide = state.product && state.product.sizeGuide;
    if (!guide) return;
    var modal    = document.getElementById('ps-sgm');
    var dialog   = document.getElementById('ps-sgm-dialog');
    if (!modal || !dialog) return;

    state.sizeGuideOpen  = true;
    state.selectedRegion = (guide.regions && guide.regions[0] && guide.regions[0].code) || '';

    dialog.innerHTML = buildSizeGuideHTML(guide);
    modal.hidden     = false;
    document.body.style.overflow = 'hidden';

    bindModalEvents(guide);
  }

  function closeSizeGuide() {
    var modal = document.getElementById('ps-sgm');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
    state.sizeGuideOpen = false;
  }

  function buildSizeGuideHTML(guide) {
    var hasRegions   = !!(guide.regions && guide.regions.length);
    var showUnit     = !guide.noUnitToggle;
    var hasSections  = !!(guide.sections && guide.sections.length);
    var hasFlatTable = !!(guide.headers && guide.rows && guide.rows.length);

    // Controls row
    var controlsHTML = '';
    if (hasRegions || showUnit) {
      var regionSel = hasRegions
        ? '<select id="ps-sgm-region" class="ps-sgm-region-sel">' +
          guide.regions.map(function (r) {
            return '<option value="' + esc(r.code) + '"' +
              (r.code === state.selectedRegion ? ' selected' : '') + '>' + esc(r.label) + '</option>';
          }).join('') +
          '</select>'
        : '';
      var unitTabs = showUnit
        ? '<div class="ps-sgm-unit-tabs">' +
          ['cm', 'in'].map(function (u) {
            return '<button class="ps-sgm-unit-btn' + (u === state.sizeUnit ? ' ps-sgm-unit-btn--active' : '') + '" data-unit="' + u + '">' +
              (u === 'cm' ? 'CM' : 'Inches') + '</button>';
          }).join('') +
          '</div>'
        : '';
      controlsHTML = '<div class="ps-sgm-controls">' + regionSel + unitTabs + '</div>';
    }

    // Body
    var bodyHTML = '<div class="ps-sgm-body" id="ps-sgm-body">' +
      buildSizeGuideBodyHTML(guide) +
    '</div>';

    return '<div class="ps-sgm-header">' +
        '<div class="ps-sgm-header__left">' +
          '<div class="ps-sgm-header__icon">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><line x1="7" y1="12" x2="17" y2="12"/></svg>' +
          '</div>' +
          '<div>' +
            '<div class="ps-sgm-title">' + esc(guide.title) + '</div>' +
            (guide.subtitle ? '<div class="ps-sgm-subtitle">' + esc(guide.subtitle) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<button class="ps-sgm-close" id="ps-sgm-close" aria-label="Close">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      controlsHTML +
      bodyHTML;
  }

  function buildSizeGuideBodyHTML(guide) {
    var hasSections  = !!(guide.sections && guide.sections.length);
    var hasFlatTable = !!(guide.headers && guide.rows && guide.rows.length);

    // Collect all region columns for "universal" detection
    var allRegionCols = new Set();
    if (guide.regions) {
      guide.regions.forEach(function (r) {
        (r.columns || []).forEach(function (c) { allRegionCols.add(c); });
      });
    }
    var activeRegion    = guide.regions && guide.regions.find(function (r) { return r.code === state.selectedRegion; });
    var regionCols      = activeRegion ? activeRegion.columns : null;

    var html = '';

    if (hasSections) {
      guide.sections.forEach(function (sec) {
        html += buildSectionHTML(sec, regionCols, allRegionCols);
      });
    } else if (hasFlatTable) {
      html += buildSectionHTML({ name: '', rows: guide.rows, headers: guide.headers }, regionCols, allRegionCols);
    }

    if (guide.unit) {
      html += '<p class="ps-sgm-unit-note">All measurements in ' +
        (state.sizeUnit === 'cm' ? 'centimeters' : 'inches') + '</p>';
    }

    if (guide.fitTerms && guide.fitTerms.length) {
      html += '<div class="ps-sgm-fit-terms"><h4>Fit Terms</h4>' +
        guide.fitTerms.map(function (ft) {
          return '<div class="ps-sgm-fit-row"><strong>' + esc(ft.name) + ':</strong><span>' + esc(ft.description) + '</span></div>';
        }).join('') +
      '</div>';
    }

    if (guide.howToMeasure && guide.howToMeasure.length) {
      html += '<div class="ps-sgm-how-to"><h4>How to Measure</h4>' +
        guide.howToMeasure.map(function (tip, i) {
          return '<div class="ps-sgm-how-item"><span class="ps-sgm-how-num">' + (i + 1) + '</span>' + esc(tip) + '</div>';
        }).join('') +
      '</div>';
    }

    return html || '<p style="color:var(--demo-text-hint);font-size:.88rem">No size data available.</p>';
  }

  function buildSectionHTML(sec, regionCols, allRegionCols) {
    if (!sec.rows || !sec.rows.length) return '';
    var firstRow = sec.rows[0] || {};
    var labelKey = Object.keys(firstRow).find(function (k) {
      var l = k.toLowerCase();
      return l === 'standard' || l === 'size' || l === 'length' || l === 'fit';
    }) || Object.keys(firstRow)[0] || 'Size';

    var allColKeys = Object.keys(firstRow).filter(function (k) {
      var l = k.toLowerCase();
      return l !== 'size' && l !== 'length' && l !== 'fit' && l !== 'standard';
    });

    // Region filter
    var regionFiltered = regionCols
      ? allColKeys.filter(function (k) { return regionCols.indexOf(k) !== -1 || !allRegionCols.has(k); })
      : allColKeys;

    // Unit filter
    var colKeys = regionFiltered.filter(function (k) {
      var lower  = k.toLowerCase();
      var hasIn  = lower.indexOf('(in)') !== -1 || lower.endsWith(' in');
      var hasCm  = lower.indexOf('(cm)') !== -1 || lower.endsWith(' cm');
      if (hasIn) {
        var base    = lower.replace(/\s*\(in\)\s*/g, '').replace(/\s+in$/, '').trim();
        var cmExist = regionFiltered.some(function (o) {
          var ol = o.toLowerCase();
          return ol !== lower && ol.indexOf(base) !== -1 && (ol.indexOf('(cm)') !== -1 || ol.endsWith(' cm'));
        });
        return cmExist ? state.sizeUnit === 'in' : true;
      }
      if (hasCm) {
        var base2   = lower.replace(/\s*\(cm\)\s*/g, '').replace(/\s+cm$/, '').trim();
        var inExist = regionFiltered.some(function (o) {
          var ol = o.toLowerCase();
          return ol !== lower && ol.indexOf(base2) !== -1 && (ol.indexOf('(in)') !== -1 || ol.endsWith(' in'));
        });
        return inExist ? state.sizeUnit === 'cm' : true;
      }
      return true;
    });

    function displayHeader(key) {
      return key.replace(/\s*\((cm|in)\)\s*$/i, '').trim();
    }

    var nameHTML = sec.name
      ? '<div class="ps-sgm-section-name">' + esc(sec.name) + '</div>'
      : '';
    var descHTML = sec.description
      ? '<div class="ps-sgm-section-desc">' + esc(sec.description) + '</div>'
      : '';

    var thead = '<tr>' +
      '<th>' + esc(labelKey) + '</th>' +
      colKeys.map(function (k) { return '<th>' + esc(displayHeader(k)) + '</th>'; }).join('') +
    '</tr>';

    var tbody = sec.rows.map(function (row, i) {
      return '<tr>' +
        '<td>' + esc(row[labelKey] || '') + '</td>' +
        colKeys.map(function (k) { return '<td>' + esc(row[k] || '—') + '</td>'; }).join('') +
      '</tr>';
    }).join('');

    var noteHTML = sec.note
      ? '<p class="ps-sgm-table-note">' + esc(sec.note) + '</p>'
      : '';

    return nameHTML + descHTML +
      '<div class="ps-sgm-table-wrap">' +
        '<table class="ps-sgm-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>' +
      '</div>' +
      noteHTML;
  }

  function rebuildModalBody(guide) {
    var body = document.getElementById('ps-sgm-body');
    if (body) body.innerHTML = buildSizeGuideBodyHTML(guide);
  }

  function bindModalEvents(guide) {
    var modal = document.getElementById('ps-sgm');
    var close = document.getElementById('ps-sgm-close');
    var dialog = document.getElementById('ps-sgm-dialog');

    if (close) {
      close.addEventListener('click', closeSizeGuide);
    }
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (!dialog || !dialog.contains(e.target)) closeSizeGuide();
      });
    }

    // Unit buttons
    var unitBtns = document.querySelectorAll('.ps-sgm-unit-btn');
    unitBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.sizeUnit = this.dataset.unit;
        unitBtns.forEach(function (b) { b.classList.toggle('ps-sgm-unit-btn--active', b.dataset.unit === state.sizeUnit); });
        rebuildModalBody(guide);
      });
    });

    // Region selector
    var regionSel = document.getElementById('ps-sgm-region');
    if (regionSel) {
      regionSel.addEventListener('change', function () {
        state.selectedRegion = this.value;
        rebuildModalBody(guide);
      });
    }

    // Keyboard close
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && state.sizeGuideOpen) {
      closeSizeGuide();
      document.removeEventListener('keydown', handleKeydown);
    }
  }

  // ── Sticky offset ──────────────────────────────────────────

  function applyStickOffset() {
    var root = document.documentElement;
    var header = document.querySelector(
      '.ps-header, header.ps-header, .header-wrapper, ' +
      '.shopify-section-group-header-group, #shopify-section-header, ' +
      'header.site-header, .section-header'
    );
    if (header) {
      var hh = Math.round(header.getBoundingClientRect().height) || 0;
      if (hh > 0) root.style.setProperty('--ps-demo-stick-top', hh + 'px');
    }
    var nav = document.getElementById('ps-detail-nav');
    if (nav) {
      var nh = Math.round(nav.getBoundingClientRect().height) || 52;
      root.style.setProperty('--ps-demo-nav-h', nh + 'px');
    }
  }

  // ── Redirect all scroll/key events to center column ──────────
  function initScrollRedirect() {
    // Wheel: redirect to center regardless of where mouse is
    document.addEventListener('wheel', function (e) {
      var center = document.querySelector('.ps-detail-center');
      if (!center) return;
      e.preventDefault();
      center.scrollTop += e.deltaY;
    }, { passive: false });

    // Keyboard: Page Down/Up, Space, Arrow Down/Up
    document.addEventListener('keydown', function (e) {
      var center = document.querySelector('.ps-detail-center');
      if (!center) return;
      var delta = { 32: 600, 33: -600, 34: 600, 38: -80, 40: 80 };
      if (delta[e.keyCode] !== undefined) {
        e.preventDefault();
        center.scrollTop += delta[e.keyCode];
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────

  async function init() {
    var id = getParam('id');
    if (!id) {
      var content = document.getElementById('ps-detail-content');
      if (content) content.innerHTML =
        '<div class="ps-detail-skeleton" style="flex-direction:column;gap:1rem">' +
          '<p>No product ID provided.</p>' +
          '<a href="' + esc(LIST_URL) + '" style="color:var(--demo-brand);font-size:.9rem">← Back to products</a>' +
        '</div>';
      return;
    }

    applyStickOffset();
    initScrollRedirect();

    try {
      var product = await fetchProduct(id);
      state.product       = product;
      state.selectedColor = product.selectedColor;
      state.selectedRegion = (product.sizeGuide && product.sizeGuide.regions && product.sizeGuide.regions[0] && product.sizeGuide.regions[0].code) || '';
      renderLayout();
      requestAnimationFrame(applyStickOffset);
    } catch (err) {
      var content = document.getElementById('ps-detail-content');
      if (content) content.innerHTML =
        '<div class="ps-detail-skeleton" style="flex-direction:column;gap:.75rem">' +
          '<p style="color:#EF4444">Failed to load product: ' + esc(err.message || 'Unknown error') + '</p>' +
          '<a href="' + esc(LIST_URL) + '" style="color:var(--demo-brand);font-size:.9rem">← Back to products</a>' +
        '</div>';
      console.error('[ps-demo-product]', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
