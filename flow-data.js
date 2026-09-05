"use strict";

window.PetFlow = {
  stateKey: "petTranslator.resultState.v1",

  defaults: {
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
    signalTranslation: "看起来心情还不错，顺便在观察你。",
    eggStyle: { base: "#f2deb0", pattern: "#bd825b", id: "BR-CM-DG" },
    petCharacter: { id: "pet-001", sprite: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj4KICA8cGF0aCBmaWxsPSIjMTAyOTQ0IiBkPSJNMTYgMTJoMjB2NmgyNHYtNmgyMHY2aDZ2MzBoLTZ2MThoLTh2MTJoLTh2NkgzMnYtNmgtOFY2NmgtOFY0OGgtNlYxOGg2eiIvPgogIDxwYXRoIGZpbGw9IiNhOGY4ZjMiIGQ9Ik0yMCAxOGgxMnYxOGgzMlYxOGgxMnYxMGg0djIwaC02djE0aC04djEwaC04djZIMzh2LTZIMjhWNjJoLThWNDhoLTRWMjhoNHoiLz4KICA8cGF0aCBmaWxsPSIjNjJjN2U2IiBkPSJNMjAgMjJoOHYxOGgtOHptNDggMGg4djE4aC04ek0xNiA0MGgxMnYxNkgxNnptNTIgMGgxMnYxNkg2OHpNMjYgNjRoMTB2MTZIMjRWNzBoMnptMzQgMGgxMHY2aDJ2MTBINjB6Ii8+CiAgPHBhdGggZmlsbD0iIzE3Mzg1MiIgZD0iTTMyIDQyaDh2MTBoLTh6bTI0IDBoOHYxMGgtOHpNNDIgNTVoMTJ2Nkg0MnoiLz4KICA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMzMgNDJoM3Y0aC0zem0yNCAwaDN2NGgtM3oiLz4KICA8cGF0aCBmaWxsPSIjZmY2N2I5IiBkPSJNMjYgNTNoMTJ2NUgyNnptMzIgMGgxMnY1SDU4eiIvPgogIDxwYXRoIGZpbGw9IiNjOWZmN2EiIGQ9Ik00MiA2MmgxMnY1SDQyeiIvPgo8L3N2Zz4K", expression: "CURIOUS", action: "IDLE" },
    userQuestion: "",
    petReply: "",
    replyTitle: "",
    replyAction: "",
    replySource: "",
    questionEmotion: "casual",
    image: "./assets/pet.jpeg"
  },

  getState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(this.stateKey) || "{}");
      const petCharacter = { ...this.defaults.petCharacter, ...(saved.petCharacter || {}) };
      if (petCharacter.sprite === "./assets/sprites/pixel-pet.svg") petCharacter.sprite = this.defaults.petCharacter.sprite;
      return {
        ...this.defaults,
        ...saved,
        eggStyle: { ...this.defaults.eggStyle, ...(saved.eggStyle || {}) },
        petCharacter
      };
    } catch {
      return structuredClone(this.defaults);
    }
  },

  updateState(patch) {
    const current = this.getState();
    const next = {
      ...current,
      ...patch,
      eggStyle: patch.eggStyle ? { ...current.eggStyle, ...patch.eggStyle } : current.eggStyle,
      petCharacter: patch.petCharacter ? { ...current.petCharacter, ...patch.petCharacter } : current.petCharacter
    };
    try {
      sessionStorage.setItem(this.stateKey, JSON.stringify(next));
    } catch {
      return current;
    }
    return next;
  },

  reset(image = "./assets/pet.jpeg") {
    try { sessionStorage.removeItem(this.stateKey); } catch {}
    return this.updateState({ ...this.defaults, image });
  },

  getImage() { return this.getState().image; },
  setImage(image) { return this.updateState({ image }); },
  classifyEmotion(question) {
    const text = String(question || "");
    if (/低落|脆弱|委屈|难过|伤心|想哭|哭了|崩溃|撑不住|孤独|寂寞|害怕|好怕|失去|离开我|分手|没人爱|没人喜欢|没用|很差|爱我吗|陪着我|一直陪|不想活/i.test(text)) return "vulnerable";
    if (/累|疲惫|工作|上班|加班|学习|作业|考试|焦虑|压力|烦恼|很烦|好烦|担心|纠结|怎么办|不想做|失败|电脑.*坏|故障|死机|不理我|冷落/i.test(text)) return "worry";
    return "casual";
  },
  setQuestion(userQuestion) {
    return this.updateState({
      userQuestion,
      questionEmotion: this.classifyEmotion(userQuestion),
      petReply: "",
      replyTitle: "",
      replyAction: "",
      replySource: ""
    });
  },
  getQuestion() { return this.getState().userQuestion || "你爱我吗？"; },

  fallbackReply(question) {
    const emotion = this.classifyEmotion(question);
    const vulnerableRules = [
      [/难过|伤心|想哭|哭了|崩溃/i, "SOFT SIGNAL", "那你过来。", "CLOSER MODE"],
      [/害怕|好怕|担心失去/i, "GUARD SIGNAL", "我在这儿。", "GUARD MODE"],
      [/孤独|寂寞|一个人/i, "CLOSER SIGNAL", "给你挤挤。", "CLOSER MODE"],
      [/爱我吗|喜欢我吗/i, "LOVE SIGNAL", "现在也爱。", "STAY MODE"],
      [/一直.*陪|永远.*陪|陪着我/i, "STAY SIGNAL", "先陪今天。", "STAY MODE"],
      [/没用|很差|没人爱|没人喜欢/i, "HEART SIGNAL", "别乱说。过来。", "CLOSER MODE"]
    ];
    const worryRules = [
      [/工作.*累|上班|加班|疲惫|累/i, "REST SIGNAL", "歇会儿，我看着。", "STAY MODE"],
      [/不想.*学|不想.*作业|学习|考试/i, "STUDY SIGNAL", "烦吧，我陪着。", "STAY MODE"],
      [/电脑|故障|坏了|死机|computer/i, "ERROR SIGNAL", "先别砸。我看着。", "STAY MODE"],
      [/为什么.*不理|不理我|冷落/i, "WAIT SIGNAL", "刚才在发呆。", "STAY MODE"],
      [/焦虑|压力|烦恼|很烦|好烦|纠结|失败/i, "WORRY SIGNAL", "烦归烦，我在。", "STAY MODE"]
    ];
    const casualRules = [
      [/为什么.*不理|不理我|冷落/i, "NOPE SIGNAL", "因为不想。", "IGNORE MODE"],
      [/饿|吃|饭|food/i, "SNACK SIGNAL", "自己做。……算了。", "SNACK MODE"],
      [/勇敢|试一次|选择|决定/i, "COURAGE SIGNAL", "怂什么。去吧。", "PUSH MODE"],
      [/烦|讨厌/i, "ANNOYED SIGNAL", "有一点。", "HONEST MODE"],
      [/想我|想你/i, "MISS SIGNAL", "也就一点。", "MAYBE MODE"]
    ];
    const rules = emotion === "vulnerable" ? vulnerableRules : emotion === "worry" ? worryRules : casualRules;
    const matched = rules.find(([pattern]) => pattern.test(question));
    if (matched) {
      const [, title, message, action] = matched;
      return { title, message, action, emotion, source: "fallback" };
    }
    const pools = {
      vulnerable: [
        ["SOFT SIGNAL", "过来，靠一下。", "CLOSER MODE"], ["SOFT SIGNAL", "我没走。", "STAY MODE"],
        ["SOFT SIGNAL", "先待在我旁边。", "STAY MODE"]
      ],
      worry: [
        ["WORRY SIGNAL", "慢点，我等你。", "STAY MODE"], ["WORRY SIGNAL", "先趴会儿。", "FLOP MODE"],
        ["WORRY SIGNAL", "行吧，陪你弄。", "STAY MODE"]
      ],
      casual: [
      ["PET SIGNAL", "关我什么事。", "NOPE MODE"], ["PET SIGNAL", "你说得都对。", "WHATEVER MODE"],
      ["PET SIGNAL", "然后呢？", "WAITING MODE"], ["PET SIGNAL", "不想回答。", "IGNORE MODE"],
      ["PET SIGNAL", "给口吃的。", "SNACK MODE"], ["PET SIGNAL", "问点别的。", "BORED MODE"],
      ["PET SIGNAL", "随便吧。", "FLOP MODE"], ["SECRET SIGNAL", "靠近点。", "CLOSER MODE"],
      ["SECRET SIGNAL", "我听着呢。", "LISTENING MODE"], ["SECRET SIGNAL", "陪你一下。", "STAY MODE"]
      ]
    };
    const fallback = pools[emotion];
    const hash = Array.from(question).reduce((total, character) => total + character.codePointAt(0), 0);
    const [title, message, action] = fallback[hash % fallback.length];
    return { title, message, action, emotion, source: "fallback" };
  },

  translate(question) { return this.fallbackReply(question); },

  async generateReply(question) {
    const state = this.getState();
    const questionEmotion = this.classifyEmotion(question);
    if (location.protocol === "file:") return this.fallbackReply(question);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/pet-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, questionEmotion, pet: {
          species: state.species, mainColor: state.mainColor, pattern: state.pattern,
          pose: state.pose, action: state.action, scene: state.scene,
          character: state.petCharacter
        }}),
        signal: controller.signal
      });
      if (!response.ok) throw new Error("reply unavailable");
      const result = await response.json();
      if (!result.message) throw new Error("empty reply");
      return { title: result.title || "PET SIGNAL", message: result.message, action: result.action || "PET MODE", emotion: questionEmotion, source: "model" };
    } catch {
      return this.fallbackReply(question);
    } finally {
      window.clearTimeout(timeout);
    }
  },

  saveReply(question, result) {
    return this.updateState({
      userQuestion: question,
      petReply: result.message,
      replyTitle: result.title,
      replyAction: result.action,
      replySource: result.source,
      questionEmotion: result.emotion || this.classifyEmotion(question),
      petCharacter: { ...this.getState().petCharacter, action: result.action }
    });
  }
};
