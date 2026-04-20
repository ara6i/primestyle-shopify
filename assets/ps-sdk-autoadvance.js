/* ps-sdk-autoadvance.js
   Custom element <ps-autoadvance> — timed step advancement with clickable dots.
   Mirrors useAutoAdvance from prime-products:
   - rAF-based per-step progress (0..1)
   - Advances every data-interval ms (default 5000) while in-view
   - Click a dot to jump AND pause auto-advance permanently
   - Pauses when scrolled out of view
*/
(() => {
  if (customElements.get('ps-autoadvance')) return;

  class PSAutoAdvance extends HTMLElement {
    connectedCallback() {
      this.interval = Number(this.dataset.interval) || 5000;
      this.slides = Array.from(this.querySelectorAll('[data-ad-slide]'));
      this.images = Array.from(this.querySelectorAll('[data-ad-image]'));
      this.dots = Array.from(this.querySelectorAll('[data-ad-dot]'));
      this.bars = Array.from(this.querySelectorAll('[data-ad-bar]'));
      this.count = this.slides.length;
      this.step = 0;
      this.paused = false;
      this.inView = false;
      this._start = null;
      this._raf = null;
      if (this.count <= 1) return;

      this.dots.forEach((dot, i) => {
        dot.addEventListener('click', () => this.jumpTo(i));
      });
      this.bars.forEach((bar, i) => {
        if (bar.tagName === 'BUTTON') {
          bar.addEventListener('click', () => this.jumpTo(i + 1));
        }
      });

      this._obs = new IntersectionObserver((entries) => {
        for (const e of entries) this.inView = e.isIntersecting;
        if (this.inView && !this.paused) this._tickOn();
        else this._tickOff();
      }, { threshold: 0.35 });
      this._obs.observe(this);

      this.setActive(0);
    }

    disconnectedCallback() {
      this._tickOff();
      if (this._obs) this._obs.disconnect();
    }

    _tickOn() {
      if (this._raf || this.paused) return;
      this._start = null;
      const tick = (t) => {
        if (this._start == null) this._start = t;
        const elapsed = t - this._start;
        const ratio = Math.min(elapsed / this.interval, 1);
        this.setProgress(ratio);
        if (ratio >= 1) {
          this._start = t;
          this.setActive((this.step + 1) % this.count);
        }
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    _tickOff() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    jumpTo(i) {
      this.paused = true;
      this._tickOff();
      this.setActive(i);
      this.setProgress(0);
    }

    setActive(i) {
      this.step = i;
      this.slides.forEach((s, idx) => {
        s.classList.toggle('ps-ad-slide--active', idx === i);
        s.setAttribute('aria-hidden', idx === i ? 'false' : 'true');
      });
      this.images.forEach((img, idx) => {
        img.classList.toggle('ps-ad-image--active', idx === i);
      });
      this.dots.forEach((dot, idx) => {
        dot.classList.toggle('ps-ad-dot--active', idx === i);
        dot.classList.toggle('ps-ad-dot--done', idx < i);
        dot.setAttribute('aria-selected', idx === i ? 'true' : 'false');
      });
    }

    setProgress(ratio) {
      this.bars.forEach((bar, idx) => {
        const fill = bar.querySelector('[data-ad-bar-fill]');
        if (!fill) return;
        if (idx < this.step) fill.style.width = '100%';
        else if (idx === this.step) fill.style.width = (ratio * 100).toFixed(2) + '%';
        else fill.style.width = '0%';
      });
    }
  }

  customElements.define('ps-autoadvance', PSAutoAdvance);
})();
