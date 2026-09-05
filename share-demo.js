"use strict";

const state = window.PetFlow.getState();
const canvas = document.querySelector(".export-canvas");
const context = canvas?.getContext("2d", { willReadFrequently: true });
const shareButton = document.querySelector(".share-button");
const shareStatus = document.querySelector(".share-status");
const downloadButton = document.querySelector(".download-gif");
const saveImageButton = document.querySelector(".save-image");
const homeButton = document.querySelector(".home-key");
const questionNode = document.querySelector(".export-question");
const replyNode = document.querySelector(".export-reply");
const petDataNode = document.querySelector(".export-pet-data");

const question = state.userQuestion || "你爱我吗？";
const reply = state.petReply || window.PetFlow.fallbackReply(question).message;
const palette = [
  [7,16,31], [13,31,54], [24,66,91], [39,111,137],
  [83,220,238], [164,247,241], [216,255,255], [237,251,255],
  [255,99,184], [181,45,125], [190,255,112], [255,238,145],
  [242,222,176], [189,130,91], [104,199,214], [255,255,255]
];

if (questionNode) questionNode.textContent = question;
if (replyNode) {
  replyNode.textContent = reply;
  const replyLength = Array.from(reply).length;
  replyNode.style.fontSize = replyLength <= 10 ? "12px" : replyLength <= 20 ? "10px" : "9px";
}
if (petDataNode) petDataNode.textContent = `${state.species} / ${state.mainColor} / ${state.pattern} / ${state.petCharacter.action}`;

function fitText(text, max) {
  const characters = Array.from(text);
  return characters.length > max ? `${characters.slice(0, max - 1).join("")}…` : text;
}

function drawPixelText(ctx, text, x, y, size, color, align = "left") {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function wrapTextAnywhere(ctx, text, maxWidth) {
  const lines = [];
  let currentLine = "";
  for (const character of Array.from(text)) {
    const candidate = `${currentLine}${character}`;
    if (currentLine && ctx.measureText(candidate).width > maxWidth) {
      lines.push(currentLine);
      currentLine = character;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [""];
}

function getReplyLayout(ctx, text, box) {
  const minimumFontSize = 9;
  const horizontalPadding = 8;
  const verticalPadding = 6;
  for (let fontSize = 19; fontSize >= minimumFontSize; fontSize -= 1) {
    ctx.font = `bold ${fontSize}px monospace`;
    const lines = wrapTextAnywhere(ctx, text, box.width - horizontalPadding * 2);
    const lineHeight = Math.max(fontSize, Math.round(fontSize * 1.05));
    if (lines.length * lineHeight <= box.height - verticalPadding * 2) return { fontSize, lineHeight, lines };
  }
  ctx.font = `bold ${minimumFontSize}px monospace`;
  return {
    fontSize: minimumFontSize,
    lineHeight: minimumFontSize,
    lines: wrapTextAnywhere(ctx, text, box.width - horizontalPadding * 2)
  };
}

function drawReplyText(ctx, text, box) {
  const layout = getReplyLayout(ctx, text, box);
  const totalHeight = layout.lines.length * layout.lineHeight;
  const firstLineY = box.y + (box.height - totalHeight) / 2 + layout.lineHeight / 2;
  ctx.font = `bold ${layout.fontSize}px monospace`;
  ctx.fillStyle = "#18425b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  layout.lines.forEach((line, index) => {
    ctx.fillText(line, box.x + box.width / 2, firstLineY + index * layout.lineHeight);
  });
}

function drawFrame(ctx, petImage, frameIndex) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#07101f";
  ctx.fillRect(0, 0, 320, 240);
  ctx.fillStyle = "#0d1f36";
  ctx.fillRect(8, 8, 304, 224);
  ctx.fillStyle = "#53dcee";
  ctx.fillRect(12, 12, 296, 216);
  ctx.fillStyle = "#a4f7f1";
  ctx.fillRect(16, 30, 288, 194);
  ctx.fillStyle = "#18425b";
  ctx.fillRect(16, 16, 288, 14);
  drawPixelText(ctx, "PET//LINK MEMORY 001", 22, 18, 9, "#edfbff");
  drawPixelText(ctx, state.species, 297, 18, 9, "#beff70", "right");

  ctx.strokeStyle = "#276f89";
  ctx.lineWidth = 2;
  for (let y = 40; y < 220; y += 8) {
    ctx.beginPath();
    ctx.moveTo(17, y);
    ctx.lineTo(303, y);
    ctx.stroke();
  }

  const bob = frameIndex % 3 === 1 ? -5 : frameIndex % 3 === 2 ? -2 : 0;
  ctx.fillStyle = "#68c7d6";
  ctx.fillRect(29, 76, 112, 112);
  ctx.strokeStyle = "#18425b";
  ctx.lineWidth = 4;
  ctx.strokeRect(29, 76, 112, 112);
  if (petImage?.complete && petImage.naturalWidth) ctx.drawImage(petImage, 37, 82 + bob, 96, 96);

  const replyBox = { x: 151, y: 54, width: 141, height: 50 };
  ctx.fillStyle = "#edfbff";
  ctx.fillRect(replyBox.x, replyBox.y, replyBox.width, replyBox.height);
  ctx.strokeStyle = "#ff63b8";
  ctx.lineWidth = 4;
  ctx.strokeRect(replyBox.x, replyBox.y, replyBox.width, replyBox.height);
  drawReplyText(ctx, reply, replyBox);

  ctx.fillStyle = "#0d1f36";
  ctx.fillRect(151, 117, 141, 71);
  drawPixelText(ctx, "YOU ASKED", 160, 125, 9, "#ff63b8");
  drawPixelText(ctx, fitText(question, 15), 160, 143, 12, "#edfbff");
  drawPixelText(ctx, fitText(`${state.petCharacter.expression} / ${state.petCharacter.action}`, 22), 160, 169, 8, "#53dcee");

  ctx.fillStyle = frameIndex % 2 ? "#ff63b8" : "#beff70";
  ctx.fillRect(27, 204, 7, 7);
  drawPixelText(ctx, "TRANSLATION SAVED", 42, 202, 9, "#18425b");
  drawPixelText(ctx, "LOOP", 294, 202, 9, "#18425b", "right");
}

function nearestPaletteIndex(red, green, blue) {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < palette.length; index += 1) {
    const color = palette[index];
    const distance = (red - color[0]) ** 2 + (green - color[1]) ** 2 + (blue - color[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

function quantize(imageData) {
  const indexed = new Uint8Array(imageData.width * imageData.height);
  for (let source = 0, target = 0; source < imageData.data.length; source += 4, target += 1) {
    indexed[target] = nearestPaletteIndex(imageData.data[source], imageData.data[source + 1], imageData.data[source + 2]);
  }
  return indexed;
}

function pushWord(bytes, value) {
  bytes.push(value & 255, (value >> 8) & 255);
}

function pushText(bytes, text) {
  for (const character of text) bytes.push(character.charCodeAt(0));
}

function lzwLiteralStream(indexedPixels) {
  const clearCode = 16;
  const endCode = 17;
  const codes = new Uint8Array(indexedPixels.length * 2 + 1);
  let cursor = 0;
  for (const pixel of indexedPixels) {
    codes[cursor++] = clearCode;
    codes[cursor++] = pixel;
  }
  codes[cursor] = endCode;

  const packed = [];
  let buffer = 0;
  let bitCount = 0;
  for (const code of codes) {
    buffer |= code << bitCount;
    bitCount += 5;
    while (bitCount >= 8) {
      packed.push(buffer & 255);
      buffer >>= 8;
      bitCount -= 8;
    }
  }
  if (bitCount) packed.push(buffer & 255);
  return packed;
}

function encodeGif(frames, width, height, delay = 24) {
  const bytes = [];
  pushText(bytes, "GIF89a");
  pushWord(bytes, width);
  pushWord(bytes, height);
  bytes.push(0xf3, 0, 0);
  for (const color of palette) bytes.push(...color);
  pushText(bytes, "\x21\xff\x0bNETSCAPE2.0\x03\x01\x00\x00\x00");

  for (const frame of frames) {
    bytes.push(0x21, 0xf9, 0x04, 0x04);
    pushWord(bytes, delay);
    bytes.push(0, 0);
    bytes.push(0x2c);
    pushWord(bytes, 0);
    pushWord(bytes, 0);
    pushWord(bytes, width);
    pushWord(bytes, height);
    bytes.push(0, 4);
    const compressed = lzwLiteralStream(frame);
    for (let offset = 0; offset < compressed.length; offset += 255) {
      const block = compressed.slice(offset, offset + 255);
      bytes.push(block.length, ...block);
    }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}

let gifBlob;
let pngBlob;
let previewTimer;
const petImage = new Image();
petImage.src = state.petCharacter.sprite;

async function buildExports() {
  if (!canvas || !context) return;
  try { await petImage.decode(); } catch { /* The frame still exports without the sprite. */ }

  const frames = [];
  for (let index = 0; index < 6; index += 1) {
    drawFrame(context, petImage, index);
    frames.push(quantize(context.getImageData(0, 0, canvas.width, canvas.height)));
  }
  gifBlob = encodeGif(frames, canvas.width, canvas.height);
  drawFrame(context, petImage, 0);
  pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  downloadButton.href = URL.createObjectURL(gifBlob);
  downloadButton.setAttribute("aria-disabled", "false");
  shareStatus.textContent = "CURRENT PET RECORD READY!";

  let frameIndex = 0;
  previewTimer = window.setInterval(() => {
    frameIndex = (frameIndex + 1) % 6;
    drawFrame(context, petImage, frameIndex);
  }, 240);
}

window.addEventListener("pagehide", () => window.clearInterval(previewTimer));

downloadButton?.addEventListener("click", (event) => {
  if (!gifBlob) {
    event.preventDefault();
    shareStatus.textContent = "MEMORY CARD IS STILL WRITING...";
    return;
  }
  shareStatus.textContent = "GIF WRITTEN TO DOWNLOADS!";
});

saveImageButton?.addEventListener("click", () => {
  if (!pngBlob) {
    shareStatus.textContent = "MEMORY CARD IS STILL WRITING...";
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(pngBlob);
  link.download = "pet-signal-001.png";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  shareStatus.textContent = "IMAGE WRITTEN TO DOWNLOADS!";
});

shareButton?.addEventListener("click", async () => {
  const text = `PET//LINK\n${question}\n${reply}`;
  try {
    const file = gifBlob ? new File([gifBlob], "pet-signal-001.gif", { type: "image/gif" }) : null;
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "PET//LINK 宠物信号", text, files: [file] });
      shareStatus.textContent = "SIGNAL SHARED!";
    } else {
      await navigator.clipboard.writeText(text);
      shareStatus.textContent = "CURRENT SIGNAL TEXT COPIED!";
    }
  } catch (error) {
    if (error?.name !== "AbortError") shareStatus.textContent = "SHARE UNAVAILABLE — SAVE THE GIF INSTEAD";
  }
});

homeButton?.addEventListener("click", () => {
  if (homeButton.disabled) return;
  homeButton.disabled = true;
  homeButton.classList.add("is-pressed");
  window.clearInterval(previewTimer);
  window.PetFlow.reset();
  window.setTimeout(() => { window.location.href = "./index.html"; }, 120);
});

buildExports();
