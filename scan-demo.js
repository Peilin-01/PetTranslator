"use strict";

const confirmSignal = document.querySelector(".confirm-signal");
const cameraFeed = document.querySelector(".camera-feed");

const scannedPhoto = cameraFeed?.querySelector("img");
if (scannedPhoto && window.PetFlow) {
  scannedPhoto.src = window.PetFlow.getImage();
  window.PetFlow.updateState({
    species: "DOG",
    mainColor: "WARM BROWN",
    pattern: "CREAM PATCH",
    pose: "LYING",
    gaze: "LOOKING AT HUMAN",
    action: "SLIGHT APPROACH",
    scene: "INDOOR",
    observedState: "RELAXED / ATTENTIVE",
    observed: "身体放松、视线稳定、靠近人",
    possibleMood: "放松 / 好奇",
    signalTranslation: "看起来心情还不错，顺便在观察你。"
  });
}

if (confirmSignal && cameraFeed) {
  confirmSignal.addEventListener("click", (event) => {
    event.preventDefault();
    if (confirmSignal.classList.contains("is-busy")) return;

    const destination = confirmSignal.href;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    confirmSignal.classList.add("is-busy");
    confirmSignal.setAttribute("aria-disabled", "true");
    cameraFeed.classList.add("is-captured");
    document.body.classList.add("signal-captured");

    window.setTimeout(() => {
      window.location.href = destination;
    }, reduceMotion ? 220 : 1080);
  });
}
