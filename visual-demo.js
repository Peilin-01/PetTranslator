"use strict";

const petFileInput = document.querySelector("#pet-file");
const sampleButton = document.querySelector(".sample-button");
const uploadStatus = document.querySelector(".upload-status");

function continueToScan(imageSource, message) {
  uploadStatus.textContent = message;
  window.PetFlow.reset(imageSource);
  window.setTimeout(() => {
    window.location.href = "./scan-demo.html";
  }, 260);
}

if (sampleButton) {
  sampleButton.addEventListener("click", () => {
    continueToScan("./assets/pet.jpeg", "SAMPLE PET CONNECTED!");
  });
}

if (petFileInput) {
  petFileInput.addEventListener("change", () => {
    const file = petFileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      uploadStatus.textContent = "ERROR: IMAGE FILES ONLY";
      return;
    }

    uploadStatus.textContent = "READING PET PHOTO...";
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("load", () => {
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        const scale = Math.min(1, 1000 / longest);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        continueToScan(canvas.toDataURL("image/jpeg", .82), "PET PHOTO CONNECTED!");
      });
      image.src = String(reader.result);
    });
    reader.readAsDataURL(file);
  });
}
