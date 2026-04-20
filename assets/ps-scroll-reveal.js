/**
 * PrimeStyle Scroll Reveal — Enhanced Animation Engine
 *
 * Features:
 *   - Directional reveals via data-ps-reveal="fade-up|fade-down|fade-left|fade-right|scale-in|blur-in"
 *   - Stagger groups via data-ps-stagger on parent
 *   - Custom delay via data-ps-delay="1" through "8" (100ms increments)
 *   - Parallax via data-ps-parallax="slow|medium|fast" (CSS transform on scroll)
 *   - Counter animation via data-ps-counter on elements with numeric text
 *   - Respects prefers-reduced-motion
 *   - Failsafe: reveals everything after 4s if IntersectionObserver hasn't fired
 *   - Re-initializes on shopify:section:load for theme editor compatibility
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var REVEAL_ATTR = 'data-ps-reveal';
  var STAGGER_ATTR = 'data-ps-stagger';
  var PARALLAX_ATTR = 'data-ps-parallax';
  var COUNTER_ATTR = 'data-ps-counter';
  var READY_CLASS = 'ps-reveal-ready';
  var REVEALED_CLASS = 'ps-revealed';
  var STAGGER_STEP_MS = 120;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Reveal ──────────────────────────────────────

  function unlock(el, delay) {
    if (delay > 0) {
      window.setTimeout(function () { el.classList.add(REVEALED_CLASS); }, delay);
    } else {
      el.classList.add(REVEALED_CLASS);
    }
  }

  function initReveals() {
    var all = document.querySelectorAll('[' + REVEAL_ATTR + ']');
    if (!all.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      // Skip animations — show everything immediately
      all.forEach(function (el) { el.style.opacity = '1'; });
      return;
    }

    all.forEach(function (el) { el.classList.add(READY_CLASS); });

    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;

          // Stagger children
          if (el.hasAttribute(STAGGER_ATTR)) {
            var children = el.querySelectorAll('[' + REVEAL_ATTR + ']');
            children.forEach(function (child, idx) {
              unlock(child, idx * STAGGER_STEP_MS);
            });
          }

          unlock(el);
          observer.unobserve(el);

          // Trigger counter animation if present
          if (el.hasAttribute(COUNTER_ATTR)) {
            animateCounter(el);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    all.forEach(function (el) { io.observe(el); });

    // Failsafe — show everything after 4s
    window.setTimeout(function () {
      document
        .querySelectorAll('.' + READY_CLASS + ':not(.' + REVEALED_CLASS + ')')
        .forEach(function (el) { unlock(el); });
    }, 4000);
  }

  // ── Parallax ────────────────────────────────────

  var parallaxElements = [];
  var parallaxSpeeds = { slow: 0.03, medium: 0.06, fast: 0.1 };
  var ticking = false;

  function initParallax() {
    parallaxElements = [];
    document.querySelectorAll('[' + PARALLAX_ATTR + ']').forEach(function (el) {
      var speed = parallaxSpeeds[el.getAttribute(PARALLAX_ATTR)] || parallaxSpeeds.medium;
      parallaxElements.push({ el: el, speed: speed });
    });

    if (parallaxElements.length && !reduceMotion) {
      window.addEventListener('scroll', onParallaxScroll, { passive: true });
    }
  }

  function onParallaxScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  function updateParallax() {
    var scrollY = window.pageYOffset;
    parallaxElements.forEach(function (item) {
      var rect = item.el.getBoundingClientRect();
      var center = rect.top + rect.height / 2;
      var offset = (center - window.innerHeight / 2) * item.speed;
      item.el.style.transform = 'translateY(' + offset + 'px)';
    });
    ticking = false;
  }

  // ── Counter Animation ───────────────────────────

  function animateCounter(el) {
    if (reduceMotion) return;

    var text = el.textContent.trim();
    var match = text.match(/^([<>]?\s*)([\d,.]+)(.*)$/);
    if (!match) return;

    var prefix = match[1] || '';
    var numStr = match[2];
    var suffix = match[3] || '';
    var target = parseFloat(numStr.replace(/,/g, ''));
    var hasDecimal = numStr.includes('.');
    var decimalPlaces = hasDecimal ? (numStr.split('.')[1] || '').length : 0;
    var hasComma = numStr.includes(',');
    var duration = 1800;
    var start = performance.now();

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function formatNum(n) {
      var s = hasDecimal ? n.toFixed(decimalPlaces) : Math.round(n).toString();
      if (hasComma) {
        var parts = s.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        s = parts.join('.');
      }
      return s;
    }

    function tick(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = easeOutExpo(progress);
      var current = target * eased;
      el.textContent = prefix + formatNum(current) + suffix;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = prefix + numStr + suffix;
      }
    }

    el.textContent = prefix + formatNum(0) + suffix;
    requestAnimationFrame(tick);
  }

  // ── Init ────────────────────────────────────────

  function init() {
    initReveals();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Theme editor support
  document.addEventListener('shopify:section:load', init);
})();
