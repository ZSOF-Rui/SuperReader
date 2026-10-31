(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    reduceMotion = false;
  }

  /* ---------- navigation ---------- */

  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function closeNav(restoreFocus) {
    if (!nav || !navToggle || !nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.textContent = '菜单';
    if (restoreFocus) navToggle.focus();
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.textContent = open ? '关闭' : '菜单';
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav(false);
    });

    document.addEventListener('click', function (event) {
      if (!(event.target instanceof Element)) return;
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav(true);
    });

    try {
      window.matchMedia('(min-width: 761px)').addEventListener('change', function (event) {
        if (event.matches) closeNav(false);
      });
    } catch (error) {
      /* older browsers keep the menu state */
    }
  }

  /* ---------- header state + scroll meter ---------- */

  var header = document.querySelector('.site-header');
  var meter = document.querySelector('.scroll-meter');
  var queued = 0;

  function updateScroll() {
    queued = 0;
    var y = window.scrollY || window.pageYOffset || 0;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (meter) {
      var max = root.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      meter.style.setProperty('--progress', progress.toFixed(4));
    }
  }

  function requestScrollUpdate() {
    if (queued) return;
    queued = window.requestAnimationFrame(updateScroll);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);
  window.addEventListener('pageshow', requestScrollUpdate);
  updateScroll();

  /* ---------- scroll reveal ---------- */

  var revealSelectors = [
    '.principles-grid > div',
    '.section-head',
    '.feature-row',
    '.step-list > li',
    '.table-wrap',
    '.notice',
    '.download-panel',
    '.verify-box',
    '.update-copy',
    '.update-tool',
    '.platform-row',
    '.roadmap-card',
    '.roadmap-note',
    '.privacy-grid > div',
    '.privacy-list',
    '.faq-list > details',
    '.lab-copy',
    '.support-panel',
    '.scanner-panel',
    '.scan-guide',
    '.compare-card',
    '.lab-steps > li',
    '.lab-cta-box'
  ];

  var revealNodes = [];
  revealSelectors.forEach(function (selector) {
    document.querySelectorAll(selector).forEach(function (element) {
      revealNodes.push(element);
    });
  });

  function groupsFrom(nodes) {
    var groups = new Map();
    nodes.forEach(function (element) {
      var parent = element.parentElement || document.body;
      var list = groups.get(parent) || [];
      list.push(element);
      groups.set(parent, list);
    });
    return groups;
  }

  if (revealNodes.length === 0) return;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealNodes.forEach(function (element) {
      element.classList.add('reveal', 'is-in');
    });
    return;
  }

  groupsFrom(revealNodes).forEach(function (list) {
    list.forEach(function (element, index) {
      element.style.setProperty('--reveal-delay', Math.min(index, 5) * 70 + 'ms');
    });
  });

  revealNodes.forEach(function (element) {
    element.classList.add('reveal');
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });

  // Enable transitions only after the initial hidden state has painted, so
  // adding .reveal never plays a visible fade-out.
  var activated = false;
  function activate() {
    if (activated) return;
    activated = true;
    root.classList.add('reveal-ready');
    var viewportHeight = window.innerHeight || root.clientHeight;
    revealNodes.forEach(function (element) {
      var rect = element.getBoundingClientRect();
      if (rect.top < viewportHeight * 0.92 && rect.bottom > 0) {
        element.style.setProperty('--reveal-delay', '0ms');
        element.classList.add('is-in');
      } else {
        observer.observe(element);
      }
    });
  }
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(activate);
  });
  window.setTimeout(activate, 400);
})();
