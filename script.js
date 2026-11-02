/* ==========================================================================
   RAI MOTION — script.js
   Vanilla JavaScript (no libraries)
   ========================================================================== */

/* ---------- SETTINGS YOU CAN EDIT ---------- */
const CONFIG = {
  // CONTACT FORM: a front-end-only form cannot send email by itself.
  // Create a free endpoint with a form service (e.g. Formspree, Web3Forms, Netlify Forms)
  // and paste its URL here, for example: "https://formspree.io/f/yourFormId"
  // While this is empty, the form only validates and tells the visitor nothing was sent.
  formEndpoint: "https://api.web3forms.com/submit"
};

(() => {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover)');

  // Cross-browser media query listener (older Safari uses addListener)
  const onMedia = (mq, handler) => {
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  };

  const smoothBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  const scrollToTarget = (el) => {
    if (el) el.scrollIntoView({ behavior: smoothBehavior(), block: 'start' });
  };

  /* Enables the scroll-reveal CSS (content stays visible if JS ever fails) */
  root.classList.add('js');

  /* ---------- 1. Loading animation ---------- */
  function initPreloader() {
    const preloader = $('#preloader');
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.classList.add('is-loaded');
      if (preloader) {
        preloader.classList.add('is-hidden');
        setTimeout(() => preloader.remove(), 1000);
      }
      initReveal(); // start reveal animations once the loader is gone
    };

    const minTime = reduceMotion.matches ? 0 : 900;
    const startedAt = performance.now();
    const go = () => setTimeout(finish, Math.max(0, minTime - (performance.now() - startedAt)));

    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });

    setTimeout(finish, 4000); // safety net
  }

  /* ---------- 2. Scroll reveal (Intersection Observer) ---------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => observer.observe(el));
  }

  /* ---------- 3. Header state, scroll progress, back-to-top ---------- */
  function initScrollUI() {
    const header = $('.site-header');
    const progress = $('#scroll-progress');
    const toTop = $('#to-top');
    let ticking = false;

    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle('is-scrolled', y > 24);
      if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      if (toTop) toTop.classList.toggle('is-visible', y > 700);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (toTop) {
      toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: smoothBehavior() }));
    }
  }

  /* ---------- 4. Mobile navigation ---------- */
  function initNav() {
    const toggle = $('#nav-toggle');
    const nav = $('#primary-nav');
    if (!toggle || !nav) return;

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', (e) => {
      if (isOpen() && !e.target.closest('.nav-bar')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
    });
    onMedia(window.matchMedia('(min-width: 921px)'), (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- 5. Smooth in-page links + accessible focus ---------- */
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      if (hash.length < 2) return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      e.preventDefault();
      scrollToTarget(target);
      try { history.replaceState(null, '', hash); } catch (err) { /* ignore */ }
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* ---------- 6. Highlight the active nav link ---------- */
  function initActiveLinks() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.nav__link');
    const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
    const sections = Array.from(byId.keys()).map((id) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
        const active = byId.get(entry.target.id);
        if (active) { active.classList.add('is-active'); active.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  }

  /* ---------- 7. Glass spotlight that follows the cursor ---------- */
  function initSpotlight() {
    if (!canHover.matches) return;
    $$('.glass').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        el.style.setProperty('--my', `${e.clientY - rect.top}px`);
      }, { passive: true });
    });
  }

  /* ---------- 8. Hero parallax for floating glass elements ---------- */
  function initParallax() {
    const hero = $('.hero');
    const items = $$('[data-parallax]');
    if (!hero || !items.length || reduceMotion.matches || !canHover.matches) return;

    let x = 0, y = 0, frame = null;
    const apply = () => {
      frame = null;
      items.forEach((el) => {
        const depth = parseFloat(el.dataset.parallax) || 10;
        el.style.translate = `${(-x * depth).toFixed(2)}px ${(-y * depth).toFixed(2)}px`;
      });
    };

    hero.addEventListener('pointermove', (e) => {
      const rect = hero.getBoundingClientRect();
      x = (e.clientX - rect.left) / rect.width - 0.5;
      y = (e.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });

    hero.addEventListener('pointerleave', () => { x = 0; y = 0; apply(); });
  }

  /* ---------- 9. Live timecode in the hero panel ---------- */
  function initTimecode() {
    const el = $('#timecode');
    const hero = $('.hero');
    if (!el || reduceMotion.matches) return;

    const FPS = 24;
    const pad = (n) => String(n).padStart(2, '0');
    let visible = true;
    let last = -1;
    const start = performance.now();

    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);
    }

    const tick = (now) => {
      if (visible && !document.hidden) {
        const frames = Math.floor(((now - start) / 1000) * FPS);
        if (frames !== last) {
          last = frames;
          const f = frames % FPS;
          const s = Math.floor(frames / FPS) % 60;
          const m = Math.floor(frames / (FPS * 60)) % 60;
          const h = Math.floor(frames / (FPS * 3600)) % 100;
          el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 10. Portfolio filter + preview lightbox ---------- */
  function initPortfolio() {
    const grid = $('#work-grid');
    if (!grid) return;
    const buttons = $$('.filter-btn');
    const cards = $$('.work-card', grid);
    const status = $('#work-status');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        grid.dataset.filter = filter;

        let shown = 0;
        cards.forEach((card) => {
          const match = filter === 'all' || card.dataset.category === filter;
          card.hidden = !match;
          if (match) {
            shown += 1;
            card.classList.remove('is-filter-in');
            void card.offsetWidth; // restart the animation
            card.classList.add('is-filter-in');
          }
        });
        if (status) status.textContent = `Showing ${shown} project${shown === 1 ? '' : 's'}.`;
      });
    });

    // Lightbox
    const dialog = $('#lightbox');
    if (!dialog) return;
    const dialogImg = $('#lightbox-img');
    const dialogCat = $('#lightbox-cat');
    const dialogTitle = $('#lightbox-title');

    grid.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-lightbox]');
      if (!trigger) return;
      const card = trigger.closest('.work-card');
      const img = $('img', card);
      if (!img) return;

      if (typeof dialog.showModal !== 'function') {
        window.open(img.currentSrc || img.src, '_blank', 'noopener');
        return;
      }
      dialogImg.classList.remove('is-broken');
      dialogImg.src = img.currentSrc || img.src;
      dialogImg.alt = img.alt;
      dialogCat.textContent = $('.work-card__cat', card).textContent;
      dialogTitle.textContent = $('.work-card__title', card).textContent;
      dialog.showModal();
    });

    $('#lightbox-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }

  /* ---------- 11. "Learn More" / "Discuss this service" -> pre-fill contact form ---------- */
  function initEnquiry() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('[data-enquiry]');
      if (!button) return;

      const subject = $('#subject');
      const name = $('#name');
      const contact = $('#contact');
      if (!subject || !contact) return;

      subject.value = button.dataset.enquiry;
      subject.removeAttribute('aria-invalid');
      const err = $('#subject-error');
      if (err) err.textContent = '';

      scrollToTarget(contact);
      setTimeout(() => { if (name) name.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 800);
    });
  }

  /* ---------- 12. Contact form (validation + optional sending) ---------- */
  function initForm() {
    const form = $('#contact-form');
    if (!form) return;
    const status = $('#form-status');
    const submitBtn = $('#submit-btn');
    const fields = $$('input, textarea', form);

    const rules = {
      name: (v) => (!v ? 'Please enter your full name.' : v.length < 2 ? 'That name looks too short.' : ''),
      email: (v) => (!v ? 'Please enter your email address.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Please enter a valid email address.' : ''),
      subject: (v) => (!v ? 'Please add a subject.' : ''),
      message: (v) => (!v ? 'Please write a message.' : v.length < 10 ? 'Please write at least 10 characters.' : '')
    };

    const validate = (field) => {
      const message = rules[field.name] ? rules[field.name](field.value.trim()) : '';
      const errorEl = $(`#${field.id}-error`);
      if (errorEl) errorEl.textContent = message;
      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      return !message;
    };

    const setStatus = (type, text) => {
      status.className = 'form-status';
      status.textContent = text;
      if (type) status.classList.add('is-visible', `is-${type}`);
    };

    fields.forEach((field) => {
      field.addEventListener('blur', () => { if (field.value) validate(field); });
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid')) validate(field); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('', '');

      const invalid = fields.filter((field) => !validate(field));
      if (invalid.length) {
        invalid[0].focus();
        setStatus('error', 'Please fix the highlighted fields and try again.');
        return;
      }

      // No backend connected: be honest instead of pretending to send.
      if (!CONFIG.formEndpoint) {
        setStatus('warning', 'Your details look good, but this form is not connected to a backend or form service yet, so nothing was sent. (Site owner: set FORM_ENDPOINT in script.js.)');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      try {
        const response = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('Request failed');
        setStatus('success', 'Thank you! Your message has been sent.');
        form.reset();
        fields.forEach((f) => { f.removeAttribute('aria-invalid'); const err = $(`#${f.id}-error`); if (err) err.textContent = ''; });
      } catch (error) {
        setStatus('error', 'Something went wrong while sending your message. Please try again later.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    });
  }

  /* ---------- 13. Button ripple effect ---------- */
  function initRipple() {
    document.addEventListener('pointerdown', (e) => {
      const button = e.target.closest('.btn');
      if (!button || button.disabled || reduceMotion.matches) return;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  /* ---------- 14. Graceful fallback for images that fail to load ---------- */
  function initImageFallbacks() {
    $$('img').forEach((img) => {
      const fail = () => img.classList.add('is-broken');
      img.addEventListener('error', fail);
      if (img.getAttribute('src') && img.complete && img.naturalWidth === 0) fail();
    });
  }

  /* ---------- Start everything ---------- */
  function init() {
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    initPreloader();
    initScrollUI();
    initNav();
    initAnchors();
    initActiveLinks();
    initSpotlight();
    initParallax();
    initTimecode();
    initPortfolio();
    initEnquiry();
    initForm();
    initRipple();
    initImageFallbacks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();