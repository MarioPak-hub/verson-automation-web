(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
  function escHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* ---------------- Mouse-reactive gradient ---------------- */
  function initMouseGradient() {
    var hero = $(".hero-gradient");
    if (!hero || !fineHover) return;
    var mx = 30, my = 30, mx2 = 75, my2 = 70;
    window.addEventListener("mousemove", function (e) {
      var x = (e.clientX / window.innerWidth) * 100;
      var y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--mx", x + "%");
      document.documentElement.style.setProperty("--my", y + "%");
      document.documentElement.style.setProperty("--mx2", (100 - x) + "%");
      document.documentElement.style.setProperty("--my2", (100 - y) + "%");
    });
  }

  /* ---------------- Nav: scroll state + mobile toggle ---------------- */
  function initNav() {
    var nav = $(".nav");
    if (nav) {
      var onScroll = function () {
        if (window.scrollY > 12) nav.classList.add("is-scrolled");
        else nav.classList.remove("is-scrolled");
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    var toggle = $(".nav-toggle");
    var menu = $(".mobile-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = toggle.classList.toggle("is-open");
        menu.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.style.overflow = open ? "hidden" : "";
      });
      $$("a", menu).forEach(function (a) {
        a.addEventListener("click", function () {
          toggle.classList.remove("is-open");
          menu.classList.remove("is-open");
          document.body.style.overflow = "";
        });
      });
    }
  }

  /* ---------------- Smooth anchor scroll ---------------- */
  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 80,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ---------------- Scroll reveals ---------------- */
  function initReveals() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      $$("[data-reveal]:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---------------- Count-up stats ---------------- */
  function initCountUp() {
    var els = $$("[data-count-to]");
    if (!els.length) return;
    var animated = new WeakSet();

    function run(el) {
      if (animated.has(el)) return;
      animated.add(el);
      var target = parseFloat(el.getAttribute("data-count-to"));
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = reduced ? 0 : 1400;
      var start = null;

      if (duration === 0) {
        el.textContent = target + suffix;
        return;
      }
      function tick(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(target * eased);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.01 });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      els.forEach(function (el) {
        if (!animated.has(el) && el.getBoundingClientRect().top < window.innerHeight) run(el);
      });
    }, 6000);
  }

  /* ---------------- Service accordion ---------------- */
  function initAccordion() {
    var rows = $$(".service-row");
    rows.forEach(function (row) {
      var head = $(".service-row-head", row);
      if (!head || head.dataset.bound) return;
      head.dataset.bound = "1";
      head.addEventListener("click", function () {
        var wasOpen = row.classList.contains("is-open");
        rows.forEach(function (r) { r.classList.remove("is-open"); });
        if (!wasOpen) row.classList.add("is-open");
      });
    });
    if (rows.length) rows[0].classList.add("is-open");
  }

  /* ---------------- Scroll progress bar ---------------- */
  function initScrollProgress() {
    var bar = $("[data-scroll-progress]");
    if (!bar) return;
    var raf = null;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + pct + ")";
      raf = null;
    }
    window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  }

  /* ---------------- Split-word text reveal ---------------- */
  function splitWords(el) {
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    function wrap(text) {
      return text.split(/(\s+)/).map(function (w) {
        return /^\s+$/.test(w) ? w : '<span class="split-word">' + escHTML(w) + "</span>";
      }).join("");
    }
    var html = Array.prototype.slice.call(el.childNodes).map(function (node) {
      if (node.nodeType === 3) return wrap(node.textContent);
      if (node.nodeName === "BR") return "<br>";
      if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        return "<" + tag + ">" + wrap(node.textContent) + "</" + tag + ">";
      }
      return "";
    }).join("");
    el.innerHTML = html;
  }

  function initSplitText() {
    var els = $$("[data-split]");
    if (!els.length) return;
    els.forEach(function (el) { if (!el.dataset.splitDone) { splitWords(el); el.dataset.splitDone = "1"; } });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var words = $$(".split-word", entry.target);
          words.forEach(function (w, i) { w.style.transitionDelay = (i * 0.035) + "s"; });
          entry.target.classList.add("is-split-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      els.forEach(function (el) {
        if (!el.classList.contains("is-split-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-split-visible");
        }
      });
    }, 6000);
  }

  /* ---------------- Marquee ticker ---------------- */
  function initMarquee() {
    $$("[data-marquee]").forEach(function (track) {
      if (track.dataset.marqueeBound) return;
      track.dataset.marqueeBound = "1";
      var clone = track.cloneNode(true);
      clone.removeAttribute("data-marquee");
      track.parentNode.appendChild(clone);
    });
  }

  /* ---------------- Tilt on cards ---------------- */
  function initTilt() {
    if (!fineHover) return;
    $$(".card").forEach(function (card) {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "1";
      var MAX = 6;
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      card.classList.add("has-tilt");
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAX; ty = px * MAX;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      card.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.15; cy += (ty - cy) * 0.15;
        card.style.setProperty("--rx", cx.toFixed(2) + "deg");
        card.style.setProperty("--ry", cy.toFixed(2) + "deg");
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------------- Magnetic CTA buttons ---------------- */
  function initMagnetic() {
    if (!fineHover) return;
    $$("[data-magnetic]").forEach(function (el) {
      if (el.dataset.magneticBound) return;
      el.dataset.magneticBound = "1";
      var strength = parseFloat(el.dataset.magneticStrength || "0.25");
      var inner = document.createElement("span");
      inner.className = "magnetic-inner";
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      el.classList.add("has-magnetic");
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) - r.width / 2) * strength;
        ty = ((e.clientY - r.top) - r.height / 2) * strength;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        inner.style.transform = "translate3d(" + cx.toFixed(1) + "px, " + cy.toFixed(1) + "px, 0)";
        raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------------- Mount: stats strip ---------------- */
  function mountStats() {
    var target = $("[data-stats]");
    if (!target || target.children.length > 0 || !data.stats) return;
    target.innerHTML = data.stats.map(function (s) {
      return '<div class="stat-card">' +
        '<div class="stat-value count-up" data-count-to="' + s.value + '" data-suffix="' + escHTML(s.suffix) + '">0</div>' +
        '<div class="stat-label">' + escHTML(s.label) + '</div>' +
        '</div>';
    }).join("");
  }

  /* ---------------- Mount: services accordion ---------------- */
  function mountServices() {
    var target = $("[data-services]");
    if (!target || target.children.length > 0 || !data.serviceCategories) return;
    target.innerHTML = data.serviceCategories.map(function (cat) {
      return '<div class="service-row" id="' + escHTML(cat.id) + '">' +
        '<button class="service-row-head" aria-expanded="false">' +
        '<span class="service-row-num">' + escHTML(cat.num) + '</span>' +
        '<span class="service-row-title">' + escHTML(cat.title) + '</span>' +
        '<span class="service-row-summary">' + escHTML(cat.summary) + '</span>' +
        '<span class="service-row-plus">+</span>' +
        '</button>' +
        '<div class="service-row-body"><ul class="service-row-list">' +
        cat.items.map(function (i) { return "<li>" + escHTML(i) + "</li>"; }).join("") +
        '</ul></div></div>';
    }).join("");
  }

  /* ---------------- Mount: projects grid ---------------- */
  function mountProjects() {
    var target = $("[data-projects]");
    if (!target || target.children.length > 0 || !data.projects) return;
    var limit = parseInt(target.getAttribute("data-limit"), 10);
    var items = limit ? data.projects.slice(0, limit) : data.projects;
    target.innerHTML = items.map(function (p) {
      return '<article class="card project-card" data-reveal>' +
        '<img src="' + escHTML(p.img) + '" alt="' + escHTML(p.alt) + '" loading="lazy" decoding="async" />' +
        '<div class="project-card-body">' +
        '<span class="project-card-cat">' + escHTML(p.category) + '</span>' +
        '<h3>' + escHTML(p.title) + '</h3>' +
        '<p>' + escHTML(p.desc) + '</p>' +
        '</div></article>';
    }).join("");
  }

  /* ---------------- Mount: catalog ---------------- */
  function mountCatalog() {
    var target = $("[data-catalog]");
    if (!target || target.children.length > 0 || !data.catalog) return;
    target.innerHTML = data.catalog.map(function (c) {
      return '<div class="card catalog-card" data-reveal>' +
        '<h3>' + escHTML(c.title) + '</h3>' +
        '<ul>' + c.items.map(function (i) { return "<li>" + escHTML(i) + "</li>"; }).join("") + '</ul>' +
        '</div>';
    }).join("");
  }

  /* ---------------- Mount: brands ---------------- */
  function mountBrands() {
    var target = $("[data-brands]");
    if (!target || target.children.length > 0 || !data.brands) return;
    var html = "";
    Object.keys(data.brands).forEach(function (cat) {
      html += '<div class="reveal" data-reveal style="margin-bottom:2rem;">' +
        '<h4 style="font-family:var(--font-mono);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--mute);margin-bottom:0.9rem;">' + escHTML(cat) + '</h4>' +
        '<div class="chip-row">' +
        data.brands[cat].map(function (b) { return '<span class="chip">' + escHTML(b) + '</span>'; }).join("") +
        '</div></div>';
    });
    target.innerHTML = html;
  }

  /* ---------------- Mount: industries ---------------- */
  function mountIndustries() {
    var target = $("[data-industries]");
    if (!target || target.children.length > 0 || !data.industries) return;
    target.innerHTML = data.industries.map(function (ind, i) {
      return '<div class="card industry-card" data-reveal>' +
        '<div class="num">0' + (i + 1) + '</div>' +
        '<h3 style="margin-top:0.6rem;">' + escHTML(ind.title) + '</h3>' +
        '<p style="color:var(--mute);font-size:0.92rem;margin-top:0.6rem;">' + escHTML(ind.desc) + '</p>' +
        '</div>';
    }).join("");
  }

  /* ---------------- Mount: clients ---------------- */
  function mountClients() {
    var target = $("[data-clients]");
    if (!target || target.children.length > 0 || !data.clients) return;
    target.innerHTML = '<div class="chip-row">' +
      data.clients.map(function (c) { return '<span class="chip">' + escHTML(c) + '</span>'; }).join("") +
      '</div>';
  }

  /* ---------------- Mount: values ---------------- */
  function mountValues() {
    var target = $("[data-values]");
    if (!target || target.children.length > 0 || !data.values) return;
    target.innerHTML = data.values.map(function (v, i) {
      return '<div class="card" data-reveal>' +
        '<div style="font-family:var(--font-mono);color:var(--mute);font-size:0.85rem;">0' + (i + 1) + '</div>' +
        '<h3 style="margin-top:0.6rem;">' + escHTML(v.title) + '</h3>' +
        '<p style="color:var(--mute);font-size:0.92rem;margin-top:0.6rem;">' + escHTML(v.desc) + '</p>' +
        '</div>';
    }).join("");
  }

  /* ---------------- Mount: leadership ---------------- */
  function mountLeadership() {
    var target = $("[data-leadership]");
    if (!target || target.children.length > 0 || !data.leadership) return;
    target.innerHTML = data.leadership.map(function (p) {
      return '<div class="card" data-reveal>' +
        '<h3>' + escHTML(p.name) + '</h3>' +
        '<div class="kicker" style="margin-top:0.5rem;">' + escHTML(p.role) + '</div>' +
        '<a href="mailto:' + escHTML(p.email) + '" style="display:block;margin-top:1rem;color:var(--ink-soft);font-size:0.92rem;">' + escHTML(p.email) + '</a>' +
        (p.phone ? '<a href="tel:' + escHTML(p.phone.replace(/\s+/g,"")) + '" style="display:block;color:var(--ink-soft);font-size:0.92rem;">' + escHTML(p.phone) + '</a>' : '') +
        '</div>';
    }).join("");
  }

  /* ---------------- Footer year ---------------- */
  function mountYear() {
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------------- Mount: marquee ticker ---------------- */
  function mountMarqueeTicker() {
    var target = $("[data-marquee]");
    if (!target || target.children.length > 0) return;
    var items = (data.clients || []).concat(
      (data.serviceCategories || []).map(function (c) { return c.title; })
    );
    if (!items.length) return;
    target.innerHTML = items.map(function (i) {
      return '<span>' + escHTML(i) + '<span class="dot">&#9679;</span></span>';
    }).join("");
  }

  function boot() {
    safe(mountStats, "mountStats");
    safe(mountServices, "mountServices");
    safe(mountProjects, "mountProjects");
    safe(mountCatalog, "mountCatalog");
    safe(mountBrands, "mountBrands");
    safe(mountIndustries, "mountIndustries");
    safe(mountClients, "mountClients");
    safe(mountValues, "mountValues");
    safe(mountLeadership, "mountLeadership");
    safe(mountYear, "mountYear");
    safe(mountMarqueeTicker, "mountMarqueeTicker");

    safe(initMouseGradient, "initMouseGradient");
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initAccordion, "initAccordion");
    safe(initScrollProgress, "initScrollProgress");
    safe(initSplitText, "initSplitText");
    safe(initMarquee, "initMarquee");
    safe(initTilt, "initTilt");
    safe(initMagnetic, "initMagnetic");

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
