"use strict";

const state = window.PetFlow.getState();
const question = state.userQuestion || window.PetFlow.getQuestion();
let result;

if (state.petReply) {
  result = {
    title: state.replyTitle || "PET SIGNAL",
    message: state.petReply,
    action: state.replyAction || "PET MODE"
  };
} else {
  result = window.PetFlow.fallbackReply(question);
  window.PetFlow.saveReply(question, result);
}

const title = document.querySelector(".translation-card h2");
const readback = document.querySelector(".question-readback span");
const message = document.querySelector(".translation-card blockquote");
const action = document.querySelector(".action-badge");
const petImage = document.querySelector(".result-pet .digital-pet");
const detected = document.querySelector(".translation-card small");
const emotionLabels = { casual: "LIGHT / DAILY", worry: "EVERYDAY WORRY", vulnerable: "SOFT / VULNERABLE" };

if (title) title.textContent = result.title;
if (readback) readback.textContent = question;
if (message) message.textContent = `“${result.message}”`;
if (action) action.textContent = result.action;
if (petImage) petImage.src = state.petCharacter.sprite;
if (detected) detected.innerHTML = `PET SIGNAL: ${state.pose} / ${state.gaze} / ${state.action}<br>QUESTION TONE: ${emotionLabels[state.questionEmotion] || "LIGHT / DAILY"}<br>TRANSLATION CONFIDENCE: PET SAID SO`;
