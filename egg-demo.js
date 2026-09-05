"use strict";

const eggButton = document.querySelector(".egg-button");
const transformStage = document.querySelector(".transform-stage");
const shellStatus = document.querySelector("#shell-status");
const shellFill = document.querySelector(".shell-fill");
const sourcePhoto = document.querySelector(".source-photo img");
const eggDataValues = document.querySelectorAll(".egg-data span");
const enterWorld = document.querySelector(".enter-world");

enterWorld?.setAttribute("tabindex", "-1");

function applyEggPalette(image) {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, 24, 24);
  const pixels = context.getImageData(0, 0, 24, 24).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let samples = 0;
  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 100) continue;
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    samples += 1;
  }
  red /= samples;
  green /= samples;
  blue /= samples;
  const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
  let palette = { base: "#f2deb0", pattern: "#bd825b", color: "WARM BROWN", patternName: "CREAM PATCH" };
  if ((red + green + blue) / 3 < 72) palette = { base: "#e9edf0", pattern: "#263746", color: "BLACK / WHITE", patternName: "DARK SPOTS" };
  else if (spread < 24) palette = { base: "#bac9d5", pattern: "#718a9d", color: "GRAY BLUE", patternName: "SOFT CLOUD" };
  else if (red > green * 1.18 && green > blue * 1.17) palette = { base: "#f5d2a1", pattern: "#dc8a52", color: "MILK ORANGE", patternName: "ORANGE PATCH" };
  transformStage.style.setProperty("--egg-base", palette.base);
  transformStage.style.setProperty("--egg-pattern", palette.pattern);
  if (eggDataValues[0]) eggDataValues[0].innerHTML = `<b>MAIN COLOR</b> ${palette.color}`;
  if (eggDataValues[1]) eggDataValues[1].innerHTML = `<b>PATTERN</b> ${palette.patternName}`;
  window.PetFlow?.updateState({
    mainColor: palette.color,
    pattern: palette.patternName,
    eggStyle: { base: palette.base, pattern: palette.pattern, id: `${palette.color.slice(0, 2)}-${palette.patternName.slice(0, 2)}-DG` }
  });
}

if (sourcePhoto && window.PetFlow) {
  sourcePhoto.addEventListener("load", () => {
    try { applyEggPalette(sourcePhoto); } catch { /* Keep the brown demo palette. */ }
  });
  sourcePhoto.src = window.PetFlow.getImage();
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
