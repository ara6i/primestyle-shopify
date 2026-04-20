/**
 * PrimeStyle tabs — custom element <ps-tabs>
 * Tab buttons in [role=tab], panels in [role=tabpanel], matched by data-tab-index.
 */
(function () {
  if (typeof customElements === 'undefined' || customElements.get('ps-tabs')) return;

  customElements.define('ps-tabs', class extends HTMLElement {
    connectedCallback() {
      this.buttons = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels  = Array.from(this.querySelectorAll('[role="tabpanel"]'));
      if (!this.buttons.length || !this.panels.length) return;

      this.buttons.forEach((btn) => {
        btn.addEventListener('click', () => this.activate(btn.dataset.tabIndex));
        btn.addEventListener('keydown', (e) => this.handleKey(e));
      });
    }

    activate(idx) {
      idx = String(idx);
      this.buttons.forEach((b) => {
        const active = b.dataset.tabIndex === idx;
        b.classList.toggle('ps-tabs__btn--active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      this.panels.forEach((p) => {
        p.classList.toggle('ps-tabs__panel--active', p.dataset.tabIndex === idx);
      });
    }

    handleKey(e) {
      const idx = this.buttons.findIndex((b) => b === e.currentTarget);
      let next = idx;
      if (e.key === 'ArrowRight') next = (idx + 1) % this.buttons.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + this.buttons.length) % this.buttons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = this.buttons.length - 1;
      else return;
      e.preventDefault();
      this.buttons[next].focus();
      this.activate(this.buttons[next].dataset.tabIndex);
    }
  });
})();
