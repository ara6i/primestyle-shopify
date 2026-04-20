/**
 * PrimeStyle SDK Demo — GSAP ScrollTrigger step showcase
 * Handles all .ps-sdk-scroll-outer sections on the page.
 * Each section: pins its .ps-sdk-sticky panel, cross-fades
 * text slides + screenshot images as user scrolls.
 */
(function () {
  'use strict';

  function initScroller(scroller) {
    var sticky  = scroller.querySelector('.ps-sdk-sticky');
    var slides  = Array.from(scroller.querySelectorAll('.ps-sdk-slide'));
    var screens = Array.from(scroller.querySelectorAll('.ps-sdk-screen-img'));
    var dots    = Array.from(scroller.querySelectorAll('.ps-sdk-dot'));
    var fills   = Array.from(scroller.querySelectorAll('.ps-sdk-progress__fill'));
    var STEPS   = slides.length;

    if (!sticky || STEPS < 2) return;

    // Size the outer container exactly: 1 screenful per step
    scroller.style.height = (STEPS * 100) + 'vh';

    // Set initial state
    gsap.set(slides,  { opacity: 0, y: 24, position: 'absolute', top: 0, left: 0, width: '100%' });
    gsap.set(screens, { opacity: 0, position: 'absolute', top: '50%', left: 0, yPercent: -50, width: '100%' });
    gsap.set(slides[0],  { opacity: 1, y: 0 });
    gsap.set(screens[0], { opacity: 1 });

    var current = 0;
    var busy    = false;

    function updateProgress(idx) {
      dots.forEach(function (d, i) {
        d.classList.toggle('ps-sdk-dot--active', i === idx);
        d.classList.toggle('ps-sdk-dot--done',   i < idx);
      });
      // Animate each track fill: fill[i] = track between dot i and dot i+1
      fills.forEach(function (fill, i) {
        gsap.to(fill, {
          scaleX: idx > i ? 1 : 0,
          duration: 0.4,
          ease: 'power2.out',
          transformOrigin: 'left center',
        });
      });
    }

    function goToStep(idx) {
      if (idx === current || busy) return;
      busy = true;

      var prev = current;
      current  = idx;
      var dir  = idx > prev ? 1 : -1;

      updateProgress(idx);

      var tl = gsap.timeline({ onComplete: function () { busy = false; } });

      // Out
      tl.to(slides[prev],  { opacity: 0, y: -28 * dir, duration: 0.32, ease: 'power2.in' }, 0);
      tl.to(screens[prev], { opacity: 0, scale: 0.97,  duration: 0.28, ease: 'power2.in' }, 0);

      // In
      tl.fromTo(slides[idx],
        { opacity: 0, y: 28 * dir },
        { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out' }, 0.26);
      tl.fromTo(screens[idx],
        { opacity: 0, scale: 1.025 },
        { opacity: 1, scale: 1, duration: 0.44, ease: 'power2.out' }, 0.22);
    }

    var pinDuration = (STEPS - 1) * window.innerHeight;

    ScrollTrigger.create({
      trigger: scroller,
      pin: sticky,
      start: 'top top',
      end: '+=' + pinDuration,
      anticipatePin: 1,
      onUpdate: function (self) {
        var step = Math.min(STEPS - 1, Math.floor(self.progress * STEPS + 0.02));
        goToStep(step);
      },
    });

    // Dot click → scroll to that step's position
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        var rect   = scroller.getBoundingClientRect();
        var base   = window.scrollY + rect.top;
        var target = base + (i / (STEPS - 1)) * pinDuration;
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
    });

    updateProgress(0);
  }

  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      fallback(); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Init every scroll section on the page
    document.querySelectorAll('.ps-sdk-scroll-outer').forEach(function (scroller) {
      initScroller(scroller);
    });
  }

  function fallback() {
    var slides  = document.querySelectorAll('.ps-sdk-slide');
    var screens = document.querySelectorAll('.ps-sdk-screen-img');
    // Show first slide of each scroll section
    var seenScrollers = [];
    slides.forEach(function (s) {
      var scroller = s.closest('.ps-sdk-scroll-outer');
      var idx = seenScrollers.indexOf(scroller);
      if (idx === -1) { seenScrollers.push(scroller); idx = seenScrollers.length - 1; }
      // count within this scroller
    });
    // Simple fallback: show all first slides/screens
    document.querySelectorAll('.ps-sdk-scroll-outer').forEach(function (scroller) {
      var ss = scroller.querySelectorAll('.ps-sdk-slide');
      var sc = scroller.querySelectorAll('.ps-sdk-screen-img');
      ss.forEach(function (s, i) { s.style.opacity = i === 0 ? '1' : '0'; });
      sc.forEach(function (s, i) { s.style.opacity = i === 0 ? '1' : '0'; });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
