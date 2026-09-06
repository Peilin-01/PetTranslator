"use strict";

const confirmSignal = document.querySelector(".confirm-signal");
const cameraFeed = document.querySelector(".camera-feed");

const scannedPhoto = cameraFeed?.querySelector("img");
const readoutValues = document.querySelectorAll(".signal-readout dd");
const scanSummary = document.querySelector(".signal-readout p");

function renderRecognition(state) {
  const values = [state.species, state.mainColor, state.pose, state.gaze, state.scene];
  readoutValues.forEach((node, index) => { node.textContent = values[index] || "UNKNOWN"; });
  if (scanSummary) scanSummary.textContent = `检测到：${state.species} · ${state.pose} · ${state.gaze}`;
}

function waitForImage(image) {
  if (image.complete && image.naturalWidth) return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function imageDataUrl(image) {
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 720 / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", .76);
}

let cachedRecognitionPromise = Promise.resolve();
if (scannedPhoto && window.PetFlow) {
  scannedPhoto.src = window.PetFlow.getImage();
  renderRecognition(window.PetFlow.getState());
  cachedRecognitionPromise = (async () => {
    await waitForImage(scannedPhoto);
    const imageHash = await window.PetFlow.getImageHash();
    const cachedState = window.PetFlow.restoreScanFromCache(imageHash);
    if (cachedState) renderRecognition(cachedState);
  })();
}

if (confirmSignal && cameraFeed) {
  confirmSignal.addEventListener("click", async (event) => {
    event.preventDefault();
    if (confirmSignal.classList.contains("is-busy")) return;

    const destination = confirmSignal.href;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const originalLabel = confirmSignal.textContent;

    confirmSignal.classList.add("is-busy");
    confirmSignal.setAttribute("aria-disabled", "true");
    confirmSignal.textContent = "■ ANALYZING...";
    await cachedRecognitionPromise;
    if (scannedPhoto?.naturalWidth) {
      const nextState = await window.PetFlow.scanImage(imageDataUrl(scannedPhoto));
      renderRecognition(nextState);
    } else {
      confirmSignal.textContent = originalLabel;
    }
    cameraFeed.classList.add("is-captured");
    document.body.classList.add("signal-captured");

    window.setTimeout(() => {
      window.location.href = destination;
    }, reduceMotion ? 220 : 1080);
  });
}
