const focusContent = {
  ai: {
    title: "Human-in-the-loop AI systems",
    text:
      "LLM evaluation, prompt engineering, benchmarking, error analysis, experimentation, model feedback, ML pipelines, TensorFlow, NLP, Scikit-learn, Pandas, and NumPy.",
    code: "eval.run(reasoning=true, clarity=true, consistency=true)",
  },
  frontend: {
    title: "Interfaces that feel fast and intentional",
    text:
      "HTML, CSS, JavaScript, React.js, Vue.js, Tailwind, Bootstrap, jQuery, AJAX, responsive layout, accessibility, and interaction polish across screens.",
    code: "ui.render({ responsive: true, motion: 'meaningful' })",
  },
  backend: {
    title: "APIs, auth, realtime, and data logic",
    text:
      "Django, Flask, Node.js, Express.js, REST APIs, OAuth 2.0, Socket.io, MongoDB, PostgreSQL, MySQL, SQLite, Oracle, and scalable service design.",
    code: "api.ship({ auth: 'OAuth2', realtime: 'Socket.io' })",
  },
  mobile: {
    title: "Mobile, immersive, and desktop-capable builds",
    text:
      "Android SDK, iOS SDK, Kotlin, Swift, Java, C#, .NET, Unity3D, ARCore, GPS features, and cross-platform system thinking.",
    code: "surface.deploy(['Android', 'iOS', 'AR', 'Desktop'])",
  },
  cloud: {
    title: "Cloud-ready platforms and data pipelines",
    text:
      "AWS, Google Cloud Platform, Microsoft Azure, Chameleon Cloud, CI/CD pipelines, data validation, dataset organization, and ML workflow delivery.",
    code: "pipeline.scale({ cloud: ['AWS', 'GCP', 'Azure'], data: 'TB' })",
  },
};

const root = document.documentElement;
const canvas = document.getElementById("neuralCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
let nodes = [];
let animationFrame = null;

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.min(86, Math.max(36, Math.floor((window.innerWidth * window.innerHeight) / 18500)));
  nodes = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    size: index % 5 === 0 ? 2.4 : 1.5,
  }));
}

function drawNeuralField() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = "rgba(22, 143, 209, 0.28)";
  ctx.strokeStyle = "rgba(96, 230, 223, 0.16)";
  ctx.lineWidth = 1;

  nodes.forEach((node) => {
    node.x += node.vx;
    node.y += node.vy;

    if (node.x < -20) node.x = window.innerWidth + 20;
    if (node.x > window.innerWidth + 20) node.x = -20;
    if (node.y < -20) node.y = window.innerHeight + 20;
    if (node.y > window.innerHeight + 20) node.y = -20;

    const dx = node.x - pointer.x;
    const dy = node.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (pointer.active && distance < 150) {
      node.x += dx * 0.006;
      node.y += dy * 0.006;
    }

    ctx.fillRect(node.x, node.y, node.size, node.size);
  });

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < 142) {
        ctx.globalAlpha = 1 - distance / 142;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  animationFrame = requestAnimationFrame(drawNeuralField);
}

function updateScrollProgress() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  root.style.setProperty("--scroll-progress", `${progress}%`);
}

function setupReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function setupFocusTabs() {
  const title = document.getElementById("focusTitle");
  const text = document.getElementById("focusText");
  const consoleLine = document.getElementById("consoleLine");
  const tabs = document.querySelectorAll(".focus-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const focus = tab.dataset.focus;
      const content = focusContent[focus];
      tabs.forEach((item) => {
        item.classList.toggle("active", item === tab);
        item.setAttribute("aria-selected", item === tab ? "true" : "false");
      });
      title.textContent = content.title;
      text.textContent = content.text;
      consoleLine.textContent = content.code;
    });
  });
}

function setupTilt() {
  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-2px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function setupMagneticLinks() {
  document.querySelectorAll(".magnetic").forEach((link) => {
    link.addEventListener("pointermove", (event) => {
      const bounds = link.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      link.style.transform = `translate(${x * 0.08}px, ${y * 0.16}px)`;
    });

    link.addEventListener("pointerleave", () => {
      link.style.transform = "";
    });
  });
}

function setupNavigation() {
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = [...document.querySelectorAll(".site-nav a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    document.body.classList.toggle("nav-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
    });
  });

  const activateLink = () => {
    const current = sections.reduce((active, section) => {
      const top = section.getBoundingClientRect().top;
      return top < window.innerHeight * 0.42 ? section.id : active;
    }, "work");

    links.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
    });
  };

  window.addEventListener("scroll", activateLink, { passive: true });
  activateLink();
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", () => {
  resizeCanvas();
  updateScrollProgress();
});
window.addEventListener(
  "pointermove",
  (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  },
  { passive: true }
);
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resizeCanvas();
updateScrollProgress();
setupReveals();
setupFocusTabs();
setupTilt();
setupMagneticLinks();
setupNavigation();

if (!prefersReducedMotion) {
  drawNeuralField();
} else if (animationFrame) {
  cancelAnimationFrame(animationFrame);
}
