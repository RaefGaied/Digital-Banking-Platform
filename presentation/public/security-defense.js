document.documentElement.classList.add("js-enabled");

const progressBar = document.querySelector("#progress-bar");
const revealItems = document.querySelectorAll(".reveal");
const flowSteps = [...document.querySelectorAll(".flow-step")];
const flowDescription = document.querySelector("#flow-description");
const replayButton = document.querySelector("#replay-flow");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function updateProgress() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  progressBar.style.width = `${Math.min(Math.max(progress * 100, 0), 100)}%`;
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

let flowTimer;

function updateFlowStep(activeIndex) {
  flowSteps.forEach((step, index) => {
    step.classList.toggle("is-active", index === activeIndex);
    step.classList.toggle("is-complete", index < activeIndex);
  });

  const currentTitle = flowSteps[activeIndex]?.querySelector("h3")?.textContent;
  flowDescription.textContent = currentTitle
    ? `Étape ${String(activeIndex + 1).padStart(2, "0")} / 05 — ${currentTitle}`
    : "Le parcours d’authentification est terminé.";
}

function playFlow() {
  window.clearInterval(flowTimer);

  if (reducedMotion.matches) {
    updateFlowStep(flowSteps.length - 1);
    flowDescription.textContent = "Parcours terminé : requête, limitation, JWT, autorisation, ressource.";
    return;
  }

  updateFlowStep(0);
  let activeIndex = 0;
  flowTimer = window.setInterval(() => {
    activeIndex += 1;

    if (activeIndex >= flowSteps.length) {
      window.clearInterval(flowTimer);
      flowSteps.forEach((step) => {
        step.classList.remove("is-active");
        step.classList.add("is-complete");
      });
      flowDescription.textContent =
        "Parcours terminé : chaque contrôle contribue à décider si la requête peut continuer.";
      return;
    }

    updateFlowStep(activeIndex);
  }, 780);
}

replayButton.addEventListener("click", playFlow);
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();
playFlow();
