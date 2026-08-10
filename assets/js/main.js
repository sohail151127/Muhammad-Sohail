(() => {
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');

  const setHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 14);
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  if (menuToggle && nav) {
    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
    };
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
      document.body.classList.toggle('menu-open', !open);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
  }

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, instance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            instance.unobserve(entry.target);
          }
        });
      }, { threshold: 0.09, rootMargin: '0px 0px -35px' })
    : null;

  const revealItems = [...document.querySelectorAll('.reveal')];
  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (!observer || rect.top < window.innerHeight * 1.05) item.classList.add('is-visible');
    else observer.observe(item);
  });
  // Content must never remain hidden if a browser suspends intersection callbacks.
  window.setTimeout(() => revealItems.forEach((item) => item.classList.add('is-visible')), 1200);

  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });

  document.querySelectorAll('[data-copy-email]').forEach((button) => {
    button.addEventListener('click', async () => {
      const email = button.dataset.copyEmail;
      try {
        await navigator.clipboard.writeText(email);
        const original = button.textContent;
        button.textContent = 'Email copied';
        setTimeout(() => { button.textContent = original; }, 1700);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  });

  document.querySelector('[data-print-cv]')?.addEventListener('click', () => window.print());

  const progress = document.querySelector('[data-reading-progress]');
  if (progress) {
    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${height > 0 ? (window.scrollY / height) * 100 : 0}%`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  const tocLinks = [...document.querySelectorAll('.case-toc a')];
  const sections = tocLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const tocObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      tocLinks.forEach((link) => link.classList.toggle('is-current', link.getAttribute('href') === `#${visible.target.id}`));
    }, { rootMargin: '-20% 0px -68% 0px', threshold: [0, .2, .5] });
    sections.forEach((section) => tocObserver.observe(section));
  }

  const dialog = document.querySelector('[data-lightbox-dialog]');
  const dialogImage = document.querySelector('[data-lightbox-image]');
  document.querySelectorAll('[data-lightbox]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!dialog || !dialogImage) return;
      dialogImage.src = button.dataset.lightbox;
      const sourceImage = button.querySelector('img');
      dialogImage.alt = sourceImage?.alt || 'Expanded research figure';
      dialog.showModal();
    });
  });
  document.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
})();
