"use strict";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
let reduceMotion = motionPreference.matches;
let heroScrollRatio = 0;

const animator = (() => {
  const tasks = new Set();
  let frame = 0;
  let lastTime = performance.now();

  const tick = (time) => {
    const delta = Math.min(time - lastTime, 48);
    lastTime = time;

    if (!document.hidden) {
      tasks.forEach((task) => {
        if (task(time, delta) === false) tasks.delete(task);
      });
    }

    frame = window.requestAnimationFrame(tick);
  };

  return {
    add(task) {
      tasks.add(task);
      if (!frame) frame = window.requestAnimationFrame(tick);
      return () => tasks.delete(task);
    }
  };
})();

function setupRevealSystem() {
  const items = $$(".reveal");
  if (!items.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -8%" }
  );

  const groups = new Map();
  items.forEach((item) => {
    const key = Math.round(item.getBoundingClientRect().top / 80);
    const groupIndex = groups.get(key) || 0;
    item.style.setProperty("--reveal-delay", `${Math.min(groupIndex * 75, 300)}ms`);
    groups.set(key, groupIndex + 1);
  });

  document.body.classList.add("motion-ready");
  items.forEach((item) => observer.observe(item));

  window.setTimeout(() => {
    items.forEach((item) => item.classList.add("in-view"));
  }, 2600);
}

function setupOrb() {
  const canvas = $("#heroOrb");
  const stage = $("[data-orb-stage]");
  if (!canvas || !stage || reduceMotion) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let visible = true;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let firstFrame = true;

  const pointCount = window.innerWidth < 640 ? 92 : 156;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const points = Array.from({ length: pointCount }, (_, index) => {
    const y = 1 - (index / (pointCount - 1)) * 2;
    const ringRadius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    return {
      x: Math.cos(angle) * ringRadius,
      y,
      z: Math.sin(angle) * ringRadius,
      energy: (index * 17) % 41 === 0
    };
  });

  const edges = [];
  const threshold = pointCount < 100 ? 0.49 : 0.4;
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      const a = points[first];
      const b = points[second];
      const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (distance < threshold) edges.push([first, second, distance]);
    }
  }

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const rotatePoint = (point, angleX, angleY, angleZ = 0) => {
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosZ = Math.cos(angleZ);
    const sinZ = Math.sin(angleZ);

    const y1 = point.y * cosX - point.z * sinX;
    const z1 = point.y * sinX + point.z * cosX;
    const x2 = point.x * cosY + z1 * sinY;
    const z2 = -point.x * sinY + z1 * cosY;
    const x3 = x2 * cosZ - y1 * sinZ;
    const y3 = x2 * sinZ + y1 * cosZ;
    return { x: x3, y: y3, z: z2 };
  };

  const projectPoint = (point, radius) => {
    const perspective = 2.6 / (3.15 - point.z * 0.55);
    return {
      x: width / 2 + point.x * radius * perspective,
      y: height / 2 + point.y * radius * perspective,
      z: point.z,
      scale: perspective
    };
  };

  const drawRing = (angleX, angleY, angleZ, radius, color) => {
    context.beginPath();
    for (let index = 0; index <= 96; index += 1) {
      const angle = (index / 96) * Math.PI * 2;
      const point = rotatePoint({ x: Math.cos(angle), y: Math.sin(angle), z: 0 }, angleX, angleY, angleZ);
      const projected = projectPoint(point, radius);
      if (index === 0) context.moveTo(projected.x, projected.y);
      else context.lineTo(projected.x, projected.y);
    }
    context.strokeStyle = color;
    context.lineWidth = 0.75;
    context.stroke();
  };

  const draw = (time) => {
    if (!visible || reduceMotion || !width || !height) return;

    pointerX += (pointerTargetX - pointerX) * 0.055;
    pointerY += (pointerTargetY - pointerY) * 0.055;

    const idle = time * 0.00012;
    const angleX = 0.12 + Math.sin(time * 0.00023) * 0.065 - pointerY * 0.34;
    const angleY = idle + pointerX * 0.48;
    const breath = 1 + Math.sin(time * 0.00105) * 0.025;
    const radius = Math.min(width, height) * 0.34 * breath * (1 + heroScrollRatio * 0.1);

    context.clearRect(0, 0, width, height);

    const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, radius * 1.45);
    glow.addColorStop(0, "rgba(200, 255, 72, 0.055)");
    glow.addColorStop(0.54, "rgba(200, 255, 72, 0.018)");
    glow.addColorStop(1, "rgba(200, 255, 72, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    drawRing(angleX + 1.05, angleY * 0.55, idle * 0.4, radius * 1.16, "rgba(200, 255, 72, 0.16)");
    drawRing(angleX - 0.48, angleY * 0.4, -idle * 0.35, radius * 1.08, "rgba(242, 240, 232, 0.1)");
    drawRing(angleX + 0.22, angleY + 1.4, idle * 0.25, radius * 1.22, "rgba(255, 100, 63, 0.1)");

    const projected = points.map((point) => {
      const rotated = rotatePoint(point, angleX, angleY);
      return { ...projectPoint(rotated, radius), energy: point.energy };
    });

    context.globalCompositeOperation = "lighter";
    edges.forEach(([first, second, distance]) => {
      const a = projected[first];
      const b = projected[second];
      const depth = clamp((a.z + b.z + 2) / 4, 0.12, 1);
      const alpha = depth * (0.18 - distance * 0.18);
      if (alpha <= 0.015) return;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.strokeStyle = `rgba(200, 255, 72, ${alpha})`;
      context.lineWidth = 0.45 + depth * 0.45;
      context.stroke();
    });

    [...projected]
      .sort((a, b) => a.z - b.z)
      .forEach((point, index) => {
        const depth = clamp((point.z + 1) / 2, 0.08, 1);
        const pulse = point.energy ? 1 + Math.sin(time * 0.0025 + index) * 0.45 : 1;
        const size = (point.energy ? 2.8 : 1.15) * point.scale * pulse;
        context.beginPath();
        context.arc(point.x, point.y, size, 0, Math.PI * 2);
        context.fillStyle = point.energy
          ? `rgba(255, 100, 63, ${0.38 + depth * 0.55})`
          : `rgba(226, 255, 157, ${0.18 + depth * 0.72})`;
        context.fill();
      });

    context.globalCompositeOperation = "source-over";

    if (firstFrame) {
      firstFrame = false;
      stage.classList.add("canvas-ready");
    }
  };

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    pointerTargetX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    pointerTargetY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
  });

  stage.addEventListener("pointerleave", () => {
    pointerTargetX = 0;
    pointerTargetY = 0;
  });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }, { threshold: 0.01 });

  visibilityObserver.observe(stage);
  new ResizeObserver(resize).observe(stage);
  resize();
  animator.add(draw);
}

function setupCursorAndAmbient() {
  const aura = $(".cursor-aura");
  const glow = $(".ambient-glow");
  if (!aura || !finePointer.matches || reduceMotion) return;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let seenPointer = false;

  document.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    if (!seenPointer) {
      seenPointer = true;
      currentX = targetX;
      currentY = targetY;
      aura.classList.add("is-visible");
    }
  }, { passive: true });

  document.addEventListener("pointerover", (event) => {
    if (event.target.closest("a, button, [tabindex='0']")) aura.classList.add("is-active");
  });

  document.addEventListener("pointerout", (event) => {
    if (event.target.closest("a, button, [tabindex='0']")) aura.classList.remove("is-active");
  });

  document.documentElement.addEventListener("pointerleave", () => aura.classList.remove("is-visible"));
  document.documentElement.addEventListener("pointerenter", () => {
    if (seenPointer) aura.classList.add("is-visible");
  });

  animator.add(() => {
    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    aura.style.left = `${currentX}px`;
    aura.style.top = `${currentY}px`;
    if (glow) {
      glow.style.setProperty("--ambient-x", `${(targetX / window.innerWidth - 0.5) * 28}px`);
      glow.style.setProperty("--ambient-y", `${(targetY / window.innerHeight - 0.5) * 22}px`);
    }
  });
}

function setupScrollState() {
  const progress = $(".scroll-progress");
  const header = $("[data-header]");
  const hero = $("#home");
  const navLinks = $$(".site-nav a[href^='#']");
  const sections = navLinks
    .map((link) => ({ link, section: $(link.getAttribute("href")) }))
    .filter((entry) => entry.section);
  let ticking = false;

  const update = () => {
    const scrollTop = window.scrollY;
    const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    progress?.style.setProperty("--scroll-progress", String(clamp(scrollTop / scrollRange, 0, 1)));
    header?.classList.toggle("is-scrolled", scrollTop > 36);
    heroScrollRatio = hero ? clamp(scrollTop / Math.max(hero.offsetHeight, 1), 0, 1) : 0;

    const marker = scrollTop + window.innerHeight * 0.34;
    let active = null;
    sections.forEach((entry) => {
      if (entry.section.offsetTop <= marker) active = entry;
    });

    sections.forEach((entry) => {
      const isActive = entry === active;
      entry.link.classList.toggle("is-active", isActive);
      if (isActive) entry.link.setAttribute("aria-current", "location");
      else entry.link.removeAttribute("aria-current");
    });

    ticking = false;
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  update();
}

function setupNavigation() {
  const toggle = $(".nav-toggle");
  const nav = $(".site-nav");
  if (!toggle || !nav) return;

  const close = (restoreFocus = false) => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    document.body.classList.remove("nav-open");
    if (restoreFocus) toggle.focus();
  };

  const open = () => {
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation");
    document.body.classList.add("nav-open");
  };

  toggle.addEventListener("click", () => {
    if (nav.classList.contains("is-open")) close();
    else open();
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) close(true);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!nav.classList.contains("is-open")) return;
    if (!nav.contains(event.target) && !toggle.contains(event.target)) close();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 880) close();
  }, { passive: true });

  document.body.classList.add("nav-ready");
}

function setupCommandPalette() {
  const overlay = $("[data-command-overlay]");
  const dialog = $(".command-dialog", overlay || document);
  const triggers = $$("[data-command-trigger]");
  if (!overlay || !dialog || !triggers.length) return;

  let previousFocus = null;
  const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

  const open = () => {
    previousFocus = document.activeElement;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("command-open");
    window.setTimeout(() => $(focusableSelector, dialog)?.focus(), 30);
  };

  const close = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("command-open");
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  };

  triggers.forEach((trigger) => trigger.addEventListener("click", open));
  $$("[data-command-close]", overlay).forEach((control) => control.addEventListener("click", close));
  $$("a", dialog).forEach((link) => link.addEventListener("click", close));

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (overlay.classList.contains("is-open")) close();
      else open();
      return;
    }

    if (!overlay.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Tab") {
      const focusable = $$(focusableSelector, dialog);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const shortcutText = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
  $$("kbd").forEach((key) => { key.textContent = shortcutText; });
  document.body.classList.add("command-ready");
}

const stackContent = {
  ai: {
    label: "AI SYSTEMS",
    heading: "Human judgment inside the loop.",
    description: "Evaluation systems for reasoning, clarity, consistency, error discovery, benchmark design, and expert feedback.",
    command: "eval.run({ reasoning: true, trust: true })",
    tools: ["LLM Evaluation", "Prompt Design", "TensorFlow", "Scikit-learn", "NLP"],
    layer: "layer-intelligence"
  },
  interface: {
    label: "INTERFACE",
    heading: "Complex systems, made obvious.",
    description: "Responsive, accessible product interfaces with clear information architecture, purposeful motion, and detail that earns attention.",
    command: "ui.render({ responsive: true, accessible: true })",
    tools: ["React", "JavaScript", "Vue", "Tailwind", "HTML + CSS"],
    layer: "layer-interface"
  },
  backend: {
    label: "BACKEND",
    heading: "Services designed to hold up.",
    description: "APIs, authentication, realtime behavior, business logic, testing, and database systems built for dependable product operation.",
    command: "api.ship({ secure: true, realtime: true })",
    tools: ["Django", "Node.js", "Flask", ".NET", "REST APIs"],
    layer: "layer-services"
  },
  mobile: {
    label: "MOBILE + SPATIAL",
    heading: "Products that move with people.",
    description: "Native Android and iOS experiences spanning location, transit, weather, creative tools, trip tracking, and augmented reality.",
    command: "mobile.launch({ native: true, spatial: true })",
    tools: ["Android SDK", "iOS SDK", "Swift", "Kotlin", "Unity3D", "ARCore"],
    layer: "layer-interface"
  },
  cloud: {
    label: "CLOUD + DATA",
    heading: "Data that stays useful at scale.",
    description: "Research pipelines, relational and document databases, cloud platforms, CI/CD, analytics, and production-minded ML infrastructure.",
    command: "pipeline.scale({ data: 'TB', delivery: 'continuous' })",
    tools: ["PostgreSQL", "MongoDB", "AWS", "GCP", "Azure", "CI/CD"],
    layer: "layer-data"
  }
};

function setupStackTabs() {
  const tabs = $$("[role='tab'][data-stack]");
  const panel = $("#stack-panel");
  const label = $("#stack-label");
  const heading = $("#stack-heading");
  const description = $("#stack-description");
  const command = $("#stack-command");
  const toolList = $("#stack-tools");
  const layers = $$(".layer");
  if (!tabs.length || !panel || !label || !heading || !description || !command || !toolList) return;

  const activate = (tab, focus = false) => {
    const content = stackContent[tab.dataset.stack];
    if (!content) return;

    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });

    panel.setAttribute("aria-labelledby", tab.id);
    panel.classList.add("is-updating");
    label.textContent = content.label;
    heading.textContent = content.heading;
    description.textContent = content.description;
    command.textContent = content.command;
    toolList.replaceChildren(...content.tools.map((tool) => {
      const item = document.createElement("li");
      item.textContent = tool;
      return item;
    }));
    layers.forEach((layer) => layer.classList.toggle("is-active", layer.classList.contains(content.layer)));
    window.requestAnimationFrame(() => panel.classList.remove("is-updating"));
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (index + 1) % tabs.length;
      if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activate(tabs[nextIndex], true);
    });
  });
}

function setupProjectFilters() {
  const filters = $$("[data-filter]");
  const projects = $$("[data-project]");
  const status = $("#filter-status");
  if (!filters.length || !projects.length) return;

  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const category = filter.dataset.filter;
      let shown = 0;

      filters.forEach((item) => {
        const active = item === filter;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      projects.forEach((project) => {
        const visible = category === "all" || project.dataset.category === category;
        project.classList.toggle("is-filtered", !visible);
        if (visible) shown += 1;
      });

      if (status) status.textContent = `Showing ${shown} ${category === "all" ? "projects" : `${category} projects`}`;
    });
  });
}

function setupPointerEffects() {
  if (!finePointer.matches || reduceMotion) return;

  $$('[data-spotlight]').forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    });
  });

  $$('[data-tilt]').forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      element.style.setProperty("--tilt-x", `${(-y * 2.2).toFixed(2)}deg`);
      element.style.setProperty("--tilt-y", `${(x * 2.2).toFixed(2)}deg`);
    });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
    });
  });

  $$(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.1;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.1;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
    element.addEventListener("pointerleave", () => {
      element.style.transform = "translate3d(0, 0, 0)";
    });
  });
}

function setupCounters() {
  const counters = $$("[data-count]");
  if (!counters.length || reduceMotion || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.count);
      const decimals = Number(element.dataset.decimals || 0);
      const duration = 1250;
      const start = performance.now();

      animator.add((time) => {
        const progress = clamp((time - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const value = target * eased;
        element.textContent = value.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
        return progress < 1;
      });

      observer.unobserve(element);
    });
  }, { threshold: 0.8 });

  counters.forEach((counter) => observer.observe(counter));
}

function setupContactUtilities() {
  const clock = $("#local-time");
  const year = $("#current-year");
  const copyButton = $("[data-copy-email]");
  const copyStatus = $("[data-copy-status]");
  const email = "guptavivek2709@gmail.com";

  if (year) year.textContent = String(new Date().getFullYear());

  const updateClock = () => {
    if (!clock) return;
    try {
      clock.textContent = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(new Date());
    } catch {
      clock.textContent = "CHICAGO";
    }
  };

  updateClock();
  window.setInterval(updateClock, 1000);

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      if (copyStatus) copyStatus.textContent = "Email copied to clipboard.";
      copyButton.textContent = "Copied ✓";
      window.setTimeout(() => {
        copyButton.textContent = "Copy email";
        if (copyStatus) copyStatus.textContent = "";
      }, 2400);
    } catch {
      if (copyStatus) copyStatus.textContent = `Copy unavailable — email is ${email}`;
    }
  });
}

motionPreference.addEventListener?.("change", (event) => {
  reduceMotion = event.matches;
  if (reduceMotion) {
    $$(".reveal").forEach((item) => item.classList.add("in-view"));
    $("[data-orb-stage]")?.classList.remove("canvas-ready");
  }
});

setupNavigation();
setupCommandPalette();
setupScrollState();
setupRevealSystem();
setupOrb();
setupCursorAndAmbient();
setupStackTabs();
setupProjectFilters();
setupPointerEffects();
setupCounters();
setupContactUtilities();
