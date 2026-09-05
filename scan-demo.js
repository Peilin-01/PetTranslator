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

let recognitionPromise = Promise.resolve();
if (scannedPhoto && window.PetFlow) {
  scannedPhoto.src = window.PetFlow.getImage();
  renderRecognition(window.PetFlow.getState());
  recognitionPromise = (async () => {
    await waitForImage(scannedPhoto);
    if (!scannedPhoto.naturalWidth || location.protocol === "file:") return;
    try {
      const response = await fetch("/api/pet-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl(scannedPhoto) })
      });
      if (!response.ok) throw new Error("recognition unavailable");
      const recognition = await response.json();
      const nextState = window.PetFlow.applyRecognition(recognition, "vision");
      renderRecognition(nextState);
    } catch {
      renderRecognition(window.PetFlow.getState());
    }
  })();
}

if (confirmSignal && cameraFeed) {
  confirmSignal.addEventListener("click", async (event) => {
    event.preventDefault();
    if (confirmSignal.classList.contains("is-busy")) return;

    const destination = confirmSignal.href;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    confirmSignal.classList.add("is-busy");
    confirmSignal.setAttribute("aria-disabled", "true");
    await recognitionPromise;
    cameraFeed.classList.add("is-captured");
    document.body.classList.add("signal-captured");

    window.setTimeout(() => {
      window.location.href = destination;
    }, reduceMotion ? 220 : 1080);
  });
}
