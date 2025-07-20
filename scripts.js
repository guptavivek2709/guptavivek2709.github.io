// scripts.js

// Initialize Typed.js
const typed = new Typed("#typedText", {
  strings: [
    "Software Developer",
    "Machine Learning Enthusiast",
    "Full Stack Web Developer",
    "Cloud Computing Explorer",
  ],
  typeSpeed: 70,
  backSpeed: 40,
  backDelay: 1500,
  loop: true,
  smartBackspace: true,
  showCursor: true,
  cursorChar: "|",
});

// Initialize AOS
AOS.init({
  once: true,
  easing: "ease-in-out",
  duration: 1200,
});

