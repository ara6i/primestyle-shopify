/**
 * PrimeStyle header — sticky shadow on scroll, mobile menu toggle.
 */
(function () {
  if (typeof document === 'undefined') return;

  function init() {
    const header = document.querySelector('[data-ps-header]');
    if (!header || header.dataset.psHeaderInit === '1') return;
    header.dataset.psHeaderInit = '1';

    // Sticky shadow
    const onScroll = () => {
      header.classList.toggle('ps-header--scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile menu
    const toggle = header.querySelector('[data-ps-menu-toggle]');
    const menu = header.querySelector('[data-ps-mobile-menu]');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const isOpen = menu.hasAttribute('hidden');
        if (isOpen) {
          menu.removeAttribute('hidden');
          toggle.classList.add('ps-header__menu-toggle--open');
          document.body.style.overflow = 'hidden';
        } else {
          menu.setAttribute('hidden', '');
          toggle.classList.remove('ps-header__menu-toggle--open');
          document.body.style.overflow = '';
        }
      });

      menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          menu.setAttribute('hidden', '');
          toggle.classList.remove('ps-header__menu-toggle--open');
          document.body.style.overflow = '';
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('shopify:section:load', init);
})();
