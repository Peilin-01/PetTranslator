"use strict";

const PET_COLOR_HEX = {
  black: "#263746",
  white: "#edf3ee",
  orange: "#dc8a52",
  brown: "#bd825b",
  gray: "#718a9d"
};

const PET_COLOR_ACCENT = {
  black: "#566a79",
  white: "#bfd8dc",
  orange: "#f5d2a1",
  brown: "#f2deb0",
  gray: "#bac9d5"
};

const EGG_PATTERN_PATHS = {
  solid: "M48 24h32v8H48zM32 48h8v24h-8zM56 152h24v8H56z",
  bicolor: "M40 24h40v24H56v24H32V48h8zm64 8h24v40h-16V56H96V40h8zM24 96h48v32H56v16H24zm72 24h40v32h-16v16H96z",
  tricolor: "M40 24h32v24H56v16H32V40h8zm64 8h24v32h-16V48H96zm-72 64h40v32H56v16H24v-32h8zm72 24h32v32h-16v16H96v-32h8z",
  spotted: "M48 32h16v16H48zm56 8h24v24h-24zM24 96h24v24H24zm56 24h24v24H80zm32 24h16v16h-16z",
  striped: "M48 24h16v48H48zm32 0h16v64H80zm32 24h16v64h-16zM32 96h16v48H32zm32 24h16v48H64z",
  points: "M40 32h24v24H40zm64 0h24v24h-24zM32 128h24v32H32zm72 0h24v32h-24z"
};

function normalizedText(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeSpecies(value) {
  const text = normalizedText(value);
  if (/cat|kitten|feline|猫/.test(text)) return "cat";
  if (/rabbit|bunny|兔/.test(text)) return "rabbit";
  if (/hamster|guinea|仓鼠|豚鼠/.test(text)) return "hamster";
  if (/dog|puppy|canine|犬|狗/.test(text)) return "dog";
  return "generic";
}

function normalizeColor(value) {
  const text = normalizedText(value);
  if (/black|dark|charcoal|ebony|jet|黑|炭/.test(text)) return "black";
  if (/white|cream|ivory|beige|pale|白|奶油|象牙|米色/.test(text)) return "white";
  if (/orange|ginger|tan|golden|yellow|橘|姜黄|黄|金/.test(text)) return "orange";
  if (/brown|chocolate|cocoa|coffee|auburn|棕|褐|咖/.test(text)) return "brown";
  if (/gray|grey|silver|ash|blue|灰|银|蓝灰/.test(text)) return "gray";
  return "";
}

function normalizeColors(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(/[,/|+、，]|\band\b|和/gi);
  const colors = [];
  source.forEach((item) => {
    const color = normalizeColor(item);
    if (color && !colors.includes(color)) colors.push(color);
  });
  return colors.length ? colors.slice(0, 3) : ["gray"];
}

function normalizePattern(value) {
  const text = normalizedText(value);
  if (/calico|tricolor|tri_color|三花|三色/.test(text)) return "tricolor";
  if (/tabby|stripe|striped|条纹|虎斑/.test(text)) return "striped";
  if (/spot|spotted|speckle|斑点|点状/.test(text)) return "spotted";
  if (/bicolor|bi_color|patch|pied|双色|拼色|色块/.test(text)) return "bicolor";
  if (/point|重点色/.test(text)) return "points";
  return "solid";
}

function defaultEarShape(species) {
  return { dog: "floppy", cat: "erect", rabbit: "long", hamster: "round", generic: "round" }[species];
}

function normalizeEarShape(value, species) {
  const text = normalizedText(value);
  if (/semi_erect|semierect|half_erect|半立|半折/.test(text)) return "semi_erect";
  if (/long|长耳/.test(text)) return "long";
  if (/round|圆耳/.test(text)) return "round";
  if (/fold|flop|droop|垂|折/.test(text)) return "floppy";
  if (/point|upright|erect|立耳|尖耳/.test(text)) return "erect";
  return defaultEarShape(species);
}

function normalizeBodyType(value) {
  const text = normalizedText(value);
  if (/slim|lean|thin|修长|纤细|瘦/.test(text)) return "slim";
  if (/stocky|round|chubby|compact|壮|圆|胖/.test(text)) return "stocky";
  if (/small|tiny|mini|小型|娇小/.test(text)) return "small";
  if (/large|big|大型|高大/.test(text)) return "large";
  return "medium";
}

function normalizePetData(raw = {}) {
  const species = normalizeSpecies(raw.species);
  const rawColors = raw.main_colors ?? raw.mainColors ?? raw.normalizedColors ?? raw.main_color ?? raw.mainColor;
  return {
    species,
    normalizedColors: normalizeColors(rawColors),
    pattern: normalizePattern(raw.pattern),
    earShape: normalizeEarShape(raw.ear_shape ?? raw.earShape, species),
    bodyType: normalizeBodyType(raw.body_type ?? raw.bodyType),
    pose: String(raw.pose || "unknown").trim().toLowerCase(),
    action: String(raw.action || "idle").trim().toLowerCase(),
    scene: String(raw.scene || "unknown").trim().toLowerCase(),
    gaze: String(raw.gaze || "unknown").trim().toLowerCase(),
    observedState: String(raw.observed_state || raw.observedState || "unknown").trim().toLowerCase(),
    observed: String(raw.observed || "暂无更多可观察信息"),
    possibleMood: String(raw.possible_mood || raw.possibleMood || "未知"),
    signalTranslation: String(raw.signal_translation || raw.signalTranslation || "它正在观察周围。")
  };
}

function buildCharacterPalette(colors) {
  const [first = "gray", second, third] = colors;
  return {
    primary: PET_COLOR_HEX[first],
    secondary: PET_COLOR_HEX[second] || PET_COLOR_ACCENT[first],
    accent: PET_COLOR_HEX[third] || PET_COLOR_ACCENT[second] || PET_COLOR_ACCENT[first]
  };
}

function createEggStyle(data) {
  const colors = data.normalizedColors.length ? data.normalizedColors : ["gray"];
  const [first, second, third] = colors;
  const visiblePattern = data.pattern === "solid" && colors.length > 1 ? (colors.length > 2 ? "tricolor" : "bicolor") : data.pattern;
  const patternKey = EGG_PATTERN_PATHS[visiblePattern] ? visiblePattern : "solid";
  const short = (value) => value.slice(0, 2).toUpperCase();
  return {
    base: PET_COLOR_HEX[first] || PET_COLOR_HEX.gray,
    pattern: PET_COLOR_HEX[second] || PET_COLOR_ACCENT[first] || PET_COLOR_ACCENT.gray,
    accent: PET_COLOR_HEX[third] || PET_COLOR_ACCENT[second] || PET_COLOR_ACCENT[first] || PET_COLOR_ACCENT.gray,
    colors: [...colors],
    patternType: patternKey,
    patternPath: EGG_PATTERN_PATHS[patternKey],
    id: `${colors.map(short).join("-")}-${short(patternKey)}-${short(data.species)}`
  };
}

function petPatternSvg(pattern, color) {
  if (pattern === "striped") return `<path fill="${color}" d="M39 29h6v13h-6zm12 0h6v13h-6zM33 42h9v6h-9zm21 0h9v6h-9z"/>`;
  if (pattern === "spotted") return `<path fill="${color}" d="M28 35h11v10H28zm29-5h9v9h-9zM36 68h10v8H36z"/>`;
  if (pattern === "points") return `<path fill="${color}" d="M33 44h30v15H33zM25 66h10v10H25zm36 0h10v10H61z"/>`;
  if (pattern === "bicolor" || pattern === "tricolor") return `<path fill="${color}" d="M28 32h17v16H34v10h-9V40h3zm32 24h11v13H60z"/>`;
  return "";
}

function petTemplateSvg(species, earShape, colors, pattern) {
  const outline = "#102944";
  const eye = "#173852";
  const blush = "#ff72b9";
  const { primary, secondary, accent } = colors;
  const patternLayer = petPatternSvg(pattern, secondary);
  const faces = `<path fill="${eye}" d="M34 49h6v9h-6zm22 0h6v9h-6zM44 61h8v6h-8z"/><path fill="#ffffff" d="M35 49h2v3h-2zm22 0h2v3h-2z"/><path fill="${blush}" d="M25 58h12v5H25zm34 0h12v5H59z"/>`;

  if (species === "cat") {
    const catShell = earShape === "floppy"
      ? `<path fill="${outline}" d="M12 18h18v-7h10v10h16V11h10v7h18v18h-6v30h-8v13H60v10H36V79H26V66h-8V36h-6z"/><path fill="${primary}" d="M18 24h16v-7h3v10h22V17h3v7h16v9h-6v29h-8v12H57v9H39v-9H32V62h-8V33h-6z"/>`
      : `<path fill="${outline}" d="M18 13h9v-8h8v8h26V5h8v8h9v14h6v39h-8v13H64v10H32V79H20V66h-8V27h6z"/><path fill="${primary}" d="M23 17h8v-7h4v13h26V10h4v7h8v14h6v31h-8v12H59v9H37v-9H25V62h-7V31h5z"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges">${catShell}${patternLayer}<path fill="${accent}" d="M28 27h40v8H28zM35 68h26v10H35z"/>${faces}<path fill="${outline}" d="M70 70h9v-6h7v17h-7v7H66v-6h8v-5h-4z"/></svg>`;
  }
  if (species === "rabbit") {
    const rabbitEars = earShape === "long"
      ? `<path fill="${outline}" d="M23 4h19v8h4v29H18V12h5zm31 0h19v8h5v29H50V12h4z"/><path fill="${primary}" d="M29 10h8v27H24V16h5zm30 0h8v6h5v21H59z"/><path fill="${secondary}" d="M31 14h4v19h-4zm30 0h4v19h-4z"/>`
      : `<path fill="${outline}" d="M20 16h22v7h12v-7h22v25H20z"/><path fill="${primary}" d="M26 22h12v15H26zm32 0h12v15H58z"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges">${rabbitEars}<path fill="${outline}" d="M18 35h60v6h6v30h-9v10H62v9H34v-9H21V71h-9V41h6z"/><path fill="${primary}" d="M25 40h46v5h6v21h-8v10H57v8H39v-8H27V66h-8V45h6z"/>${patternLayer}<path fill="${accent}" d="M29 40h38v7H29zM38 68h20v11H38z"/>${faces}</svg>`;
  }
  if (species === "hamster") {
    const hamsterEars = earShape === "erect" || earShape === "semi_erect"
      ? `<path fill="${outline}" d="M20 20h8V9h13v13h14V9h13v11h8v14H20z"/><path fill="${primary}" d="M27 20v-6h8v14h26V14h8v6h3v10H24V20z"/>`
      : `<path fill="${outline}" d="M19 19h8v-7h15v7h12v-7h15v7h8v15H19z"/><path fill="${primary}" d="M25 21v-4h12v10h22V17h12v4h2v9H23v-9z"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges">${hamsterEars}<path fill="${outline}" d="M19 28h58v6h7v36h-9v11H62v9H34v-9H21V70h-9V34h7z"/><path fill="${primary}" d="M23 33h50v5h5v27h-8v11H57v8H39v-8H26V65h-8V38h5z"/><path fill="${secondary}" d="M31 35h34v35H31z"/>${patternLayer}<path fill="${accent}" d="M36 68h24v11H36z"/>${faces}</svg>`;
  }
  if (species === "generic") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges"><path fill="${outline}" d="M26 18h12v8h20v-8h12v8h8v12h6v32h-9v11H62v9H34v-9H21V70h-9V38h6V26h8z"/><path fill="${primary}" d="M30 24h5v8h26v-8h5v8h7v10h5v23h-8v11H57v8H39v-8H26V65h-8V42h5V32h7z"/>${patternLayer}<path fill="${accent}" d="M32 34h32v7H32zM37 68h22v11H37z"/>${faces}</svg>`;
  }

  const pointed = earShape === "erect" || earShape === "semi_erect";
  const pointedEars = `<path fill="${outline}" d="M19 10h15v10h28V10h15v34H19z"/><path fill="${primary}" d="M25 16h6v11h34V16h6v24H25z"/>`;
  const floppyEars = `<path fill="${outline}" d="M13 18h20v9h30v-9h20v38H70V43H26v13H13z"/><path fill="${primary}" d="M19 24h10v25H19zm48 0h10v25H67z"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges">${pointed ? pointedEars : floppyEars}<path fill="${outline}" d="M22 27h52v9h8v32h-9v12H62v9H34v-9H23V68h-9V36h8z"/><path fill="${primary}" d="M27 32h42v8h7v23h-8v12H57v8H39v-8H28V63h-8V40h7z"/>${patternLayer}<path fill="${accent}" d="M33 35h30v7H33zM37 67h22v11H37z"/>${faces}</svg>`;
}

function createPetCharacter(data, previous = {}) {
  const normalized = data?.normalizedColors ? data : normalizePetData(data);
  const signature = `${normalized.species}:${normalized.normalizedColors.join("+")}:${normalized.pattern}:${normalized.earShape}`;
  const svg = petTemplateSvg(normalized.species, normalized.earShape, buildCharacterPalette(normalized.normalizedColors), normalized.pattern);
  return {
    id: `pet-${signature.replaceAll(":", "-").replaceAll("+", "-")}`,
    template: normalized.species,
    normalizedColors: [...normalized.normalizedColors],
    pattern: normalized.pattern,
    earShape: normalized.earShape,
    signature,
    sprite: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    expression: previous.expression || "CURIOUS",
    action: previous.action || "IDLE"
  };
}

const EMPTY_NORMALIZED_PET = normalizePetData({});
const EMPTY_EGG_STYLE = createEggStyle(EMPTY_NORMALIZED_PET);
const EMPTY_CHARACTER = createPetCharacter(EMPTY_NORMALIZED_PET);

window.PetFlow = {
  stateKey: "petTranslator.resultState.v1",

  defaults: {
    species: "GENERIC",
    mainColors: ["gray"],
    mainColor: "GRAY",
    pattern: "SOLID",
    earShape: "ROUND",
    bodyType: "MEDIUM",
    pose: "UNKNOWN",
    gaze: "UNKNOWN",
    action: "IDLE",
    scene: "UNKNOWN",
    observedState: "UNKNOWN",
    observed: "暂无更多可观察信息",
    possibleMood: "未知",
    signalTranslation: "它正在观察周围。",
    rawScanResult: null,
    scanResult: null,
    normalizedPetData: EMPTY_NORMALIZED_PET,
    eggStyle: EMPTY_EGG_STYLE,
    petCharacter: EMPTY_CHARACTER,
    recognition: null,
    recognitionSource: "pending",
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
      const source = saved.normalizedPetData || saved.scanResult || saved.rawScanResult || saved.recognition || {
        species: saved.species,
        main_colors: saved.mainColors || saved.mainColor,
        pattern: saved.pattern,
        ear_shape: saved.earShape,
        body_type: saved.bodyType,
        pose: saved.pose,
        action: saved.action,
        scene: saved.scene,
        gaze: saved.gaze,
        observed_state: saved.observedState,
        observed: saved.observed,
        possible_mood: saved.possibleMood,
        signal_translation: saved.signalTranslation
      };
      const normalizedPetData = normalizePetData(source);
      const eggStyle = createEggStyle(normalizedPetData);
      const storedCharacter = saved.petCharacter || {};
      const mappedCharacter = createPetCharacter(normalizedPetData, storedCharacter);
      const petCharacter = storedCharacter.signature === mappedCharacter.signature && storedCharacter.sprite
        ? { ...mappedCharacter, ...storedCharacter }
        : mappedCharacter;
      return {
        ...this.defaults,
        ...saved,
        species: normalizedPetData.species.toUpperCase(),
        mainColors: [...normalizedPetData.normalizedColors],
        mainColor: normalizedPetData.normalizedColors.join(" / ").toUpperCase(),
        pattern: normalizedPetData.pattern.toUpperCase(),
        earShape: normalizedPetData.earShape.toUpperCase(),
        bodyType: normalizedPetData.bodyType.toUpperCase(),
        pose: normalizedPetData.pose.toUpperCase(),
        action: normalizedPetData.action.toUpperCase(),
        scene: normalizedPetData.scene.toUpperCase(),
        gaze: normalizedPetData.gaze.toUpperCase(),
        observedState: normalizedPetData.observedState.toUpperCase(),
        observed: normalizedPetData.observed,
        possibleMood: normalizedPetData.possibleMood,
        signalTranslation: normalizedPetData.signalTranslation,
        normalizedPetData,
        eggStyle,
        petCharacter
      };
    } catch {
      return structuredClone(this.defaults);
    }
  },

  updateState(patch) {
    const current = this.getState();
    const hasIdentityPatch = ["normalizedPetData", "scanResult", "rawScanResult", "recognition", "species", "mainColors", "mainColor", "pattern", "earShape", "bodyType"].some((key) => Object.hasOwn(patch, key));
    let normalizedPetData = current.normalizedPetData;
    if (hasIdentityPatch) {
      const source = patch.normalizedPetData || patch.scanResult || patch.rawScanResult || patch.recognition || {
        ...current.normalizedPetData,
        species: patch.species ?? current.normalizedPetData.species,
        main_colors: patch.mainColors ?? patch.mainColor ?? current.normalizedPetData.normalizedColors,
        pattern: patch.pattern ?? current.normalizedPetData.pattern,
        ear_shape: patch.earShape ?? current.normalizedPetData.earShape,
        body_type: patch.bodyType ?? current.normalizedPetData.bodyType
      };
      normalizedPetData = normalizePetData(source);
    }
    const suppliedCharacter = patch.petCharacter ? { ...current.petCharacter, ...patch.petCharacter } : current.petCharacter;
    const mappedCharacter = createPetCharacter(normalizedPetData, suppliedCharacter);
    const petCharacter = hasIdentityPatch ? mappedCharacter : suppliedCharacter;
    const next = {
      ...current,
      ...patch,
      species: normalizedPetData.species.toUpperCase(),
      mainColors: [...normalizedPetData.normalizedColors],
      mainColor: normalizedPetData.normalizedColors.join(" / ").toUpperCase(),
      pattern: normalizedPetData.pattern.toUpperCase(),
      earShape: normalizedPetData.earShape.toUpperCase(),
      bodyType: normalizedPetData.bodyType.toUpperCase(),
      pose: normalizedPetData.pose.toUpperCase(),
      action: normalizedPetData.action.toUpperCase(),
      scene: normalizedPetData.scene.toUpperCase(),
      gaze: normalizedPetData.gaze.toUpperCase(),
      observedState: normalizedPetData.observedState.toUpperCase(),
      observed: normalizedPetData.observed,
      possibleMood: normalizedPetData.possibleMood,
      signalTranslation: normalizedPetData.signalTranslation,
      normalizedPetData,
      eggStyle: createEggStyle(normalizedPetData),
      petCharacter
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
    const cleanState = structuredClone(this.defaults);
    cleanState.image = image;
    try { sessionStorage.setItem(this.stateKey, JSON.stringify(cleanState)); } catch {}
    return this.getState();
  },

  getImage() { return this.getState().image; },
  setImage(image) { return this.reset(image); },
  normalizeRecognition(data = {}) { return normalizePetData(data); },
  applyRecognition(data = {}, source = "vision") {
    const rawScanResult = structuredClone(data);
    const normalizedPetData = normalizePetData(rawScanResult);
    const eggStyle = createEggStyle(normalizedPetData);
    const petCharacter = createPetCharacter(normalizedPetData);
    const next = this.updateState({
      rawScanResult,
      scanResult: rawScanResult,
      normalizedPetData,
      recognition: rawScanResult,
      recognitionSource: source,
      petCharacter
    });
    console.log("[PET//LINK] rawScanResult", rawScanResult);
    console.log("[PET//LINK] normalizedPetData", normalizedPetData);
    console.log("[PET//LINK] eggStyle", eggStyle);
    console.log("[PET//LINK] petCharacter", petCharacter);
    return next;
  },
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
