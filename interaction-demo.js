"use strict";

const petButton = document.querySelector(".pet-button");
const petImage = document.querySelector(".pet-button .digital-pet");
const petBubble = document.querySelector(".pet-bubble");
const questionInput = document.querySelector("#pet-question");
const askForm = document.querySelector(".ask-panel");
const translateButton = document.querySelector(".translate-button");
const quickQuestions = document.querySelectorAll("[data-question]");
const reactions = ["信号正常。", "别戳译员。", "还戳？", "数据要乱了。", "……靠近点。"];
let pokes = 0;

const currentState = window.PetFlow?.getState();
if (petImage && currentState?.petCharacter?.sprite) petImage.src = currentState.petCharacter.sprite;
if (questionInput && currentState?.userQuestion) questionInput.value = currentState.userQuestion;

const readableSignal = {
  pose: { LYING: "趴着", SITTING: "坐着", STANDING: "站着" },
  gaze: { "LOOKING AT HUMAN": "看向主人", CAMERA: "看向主人", AWAY: "看向别处" },
  action: { "SLIGHT APPROACH": "轻微靠近", "LOOKING UP": "轻微抬头", IDLE: "安静待着" },
  state: { "RELAXED / ATTENTIVE": "放松 / 关注" }
};

function setSignalCopy(name, value) {
  const node = document.querySelector(`[data-signal="${name}"]`);
  if (node && value) node.textContent = value;
}

if (currentState) {
  setSignalCopy("pose", readableSignal.pose[currentState.pose] || currentState.pose);
  setSignalCopy("gaze", readableSignal.gaze[currentState.gaze] || currentState.gaze);
  setSignalCopy("action", readableSignal.action[currentState.action] || currentState.action);
  setSignalCopy("state", readableSignal.state[currentState.observedState] || currentState.observedState);
  setSignalCopy("observed", currentState.observed);
  setSignalCopy("mood", currentState.possibleMood);
  setSignalCopy("translation", currentState.signalTranslation);
}

petButton?.addEventListener("click", () => {
  pokes += 1;
  petBubble.textContent = reactions[Math.min(pokes - 1, reactions.length - 1)];
  petButton.classList.remove("is-poked");
  void petButton.offsetWidth;
  petButton.classList.add("is-poked");
});

quickQuestions.forEach((button) => button.addEventListener("click", () => {
  questionInput.value = button.dataset.question;
  questionInput.focus();
}));

askForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question || translateButton.disabled) {
    questionInput.focus();
    return;
  }

  translateButton.disabled = true;
  translateButton.setAttribute("aria-busy", "true");
  translateButton.textContent = "■ TRANSLATING...";
  petBubble.textContent = "……";
  window.PetFlow.setQuestion(question);

  const result = await window.PetFlow.generateReply(question);
  window.PetFlow.saveReply(question, result);
  petBubble.textContent = result.message;
  window.setTimeout(() => { window.location.href = "./result-demo.html"; }, 320);
});
