"use strict";

const eggButton = document.querySelector(".egg-button");
const transformStage = document.querySelector(".transform-stage");
const shellStatus = document.querySelector("#shell-status");
const shellFill = document.querySelector(".shell-fill");
const sourcePhoto = document.querySelector(".source-photo img");
const eggDataValues = document.querySelectorAll(".egg-data span");
const enterWorld = document.querySelector(".enter-world");
const eggPattern = document.querySelector(".egg-pattern");
const formId = document.querySelector(".transform-lcd .lcd-footer span:last-child");

enterWorld?.setAttribute("tabindex", "-1");

function applyEggStyle() {
  const state = window.PetFlow?.getState();
  if (!state) return;
  const style = state.eggStyle;
  transformStage.style.setProperty("--egg-base", style.base);
  transformStage.style.setProperty("--egg-pattern", style.pattern);
  if (eggPattern && style.patternPath) eggPattern.setAttribute("d", style.patternPath);
  if (eggDataValues[0]) eggDataValues[0].innerHTML = `<b>MAIN COLOR</b> ${state.mainColors.join(" / ").toUpperCase()}`;
  if (eggDataValues[1]) eggDataValues[1].innerHTML = `<b>PATTERN</b> ${state.pattern}`;
  if (eggDataValues[2]) eggDataValues[2].innerHTML = `<b>SPECIES</b> ${state.species}`;
  if (formId) formId.textContent = `FORM ID: ${style.id}`;
}

if (sourcePhoto && window.PetFlow) {
  sourcePhoto.addEventListener("load", applyEggStyle, { once: true });
  sourcePhoto.src = window.PetFlow.getImage();
  applyEggStyle();
}

if (eggButton && transformStage && shellStatus && shellFill) {
  const shellValues = [100, 88, 75, 63, 50, 38, 25, 13, 0];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hitCount = 0;

  eggButton.disabled = true;
  window.setTimeout(() => {
    eggButton.disabled = false;
  }, reduceMotion ? 0 : 1540);

  eggButton.addEventListener("click", () => {
    if (hitCount >= 8) return;

    hitCount += 1;
    const shell = shellValues[hitCount];
    const stage = hitCount <= 2 ? "small" : hitCount <= 4 ? "medium" : hitCount <= 6 ? "large" : hitCount === 7 ? "critical" : "hatched";

    transformStage.dataset.stage = stage;
    transformStage.style.setProperty("--shell", `${shell}%`);
    shellStatus.textContent = shell === 0 ? "SHELL 0% / BROKEN!" : `SHELL ${shell}%`;
    shellFill.setAttribute("aria-hidden", "true");

    eggButton.classList.remove("is-hit");
    void eggButton.offsetWidth;
    eggButton.classList.add("is-hit");

    if (stage === "hatched") {
      const currentCharacter = window.PetFlow?.getState().petCharacter;
      window.PetFlow?.updateState({ petCharacter: { ...currentCharacter, expression: "HAPPY", action: "HATCHED" } });
      eggButton.setAttribute("aria-label", "宠物蛋已经破壳");
      window.setTimeout(() => {
        eggButton.disabled = true;
      }, reduceMotion ? 0 : 650);
      window.setTimeout(() => {
        enterWorld?.classList.add("is-ready");
        enterWorld?.removeAttribute("tabindex");
      }, reduceMotion ? 0 : 680);
    }
  });
}
