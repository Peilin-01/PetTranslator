import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
try {
  loadEnvFile(resolve(root, ".env"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const port = Number(process.env.PORT || 4173);
const model = process.env.MODELSCOPE_TEXT_MODEL || "Qwen/Qwen3-VL-8B-Instruct";
const visionModel = process.env.MODELSCOPE_VISION_MODEL || "Qwen/Qwen3-VL-8B-Instruct";
const endpoint = "https://api-inference.modelscope.cn/v1/chat/completions";
const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif"
};

function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

function readBody(request, maximumSize = 64 * 1024) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maximumSize) {
        reject(new Error("request too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function parseRecognition(value) {
  const content = Array.isArray(value)
    ? value.map((part) => typeof part === "string" ? part : part?.text || "").join("")
    : String(value || "");
  const jsonText = content.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) throw new Error("recognition JSON missing");
  const parsed = JSON.parse(jsonText);
  const clean = (key, fallback) => String(parsed[key] || fallback).trim().slice(0, 80);
  const rawColors = Array.isArray(parsed.main_colors)
    ? parsed.main_colors
    : parsed.main_color ? [parsed.main_color] : ["gray"];
  const mainColors = rawColors.map((color) => String(color).trim().slice(0, 30)).filter(Boolean).slice(0, 3);
  return {
    species: clean("species", "generic"),
    main_colors: mainColors.length ? mainColors : ["gray"],
    pattern: clean("pattern", "SOLID"),
    ear_shape: clean("ear_shape", "unknown"),
    body_type: clean("body_type", "medium"),
    pose: clean("pose", "unknown"),
    action: clean("action", "IDLE"),
    scene: clean("scene", "unknown")
  };
}

async function scanPet(request, response) {
  const apiKey = process.env.MODELSCOPE_TOKEN;
  if (!apiKey || apiKey === "这里替换成我的新Token") {
    sendJson(response, 503, { error: "Vision model is not configured." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(request, 3 * 1024 * 1024));
  } catch {
    sendJson(response, 400, { error: "Invalid image payload." });
    return;
  }
  const image = String(payload.image || "");
  if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(image)) {
    sendJson(response, 400, { error: "A JPEG, PNG, or WebP data URL is required." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const instruction = `只根据照片中能观察到的内容识别宠物，并只返回一个JSON对象，不要Markdown。字段必须完整且名称必须一致：
{"species":"dog|cat|rabbit|hamster|generic","main_colors":["black","white"],"pattern":"solid|bicolor|tricolor|spotted|striped|points","ear_shape":"floppy|erect|semi_erect|long|round|unknown","body_type":"small|medium|large|slim|stocky","pose":"简短英文","action":"简短英文","scene":"简短英文"}
main_colors必须是数组，按宠物身体占比从高到低保留1至3种毛色。黑白、三花、虎斑、斑点宠物不能合并成单一颜色。pattern必须描述毛色分布，不要根据背景颜色判断宠物颜色。不确定的单个字段使用generic、gray、solid或unknown，只补该字段，不要覆盖其他已经识别出的信息。不要推断品种、健康或真实情绪。`;

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: visionModel,
        temperature: 0.1,
        max_tokens: 320,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: image } }
          ]
        }]
      }),
      signal: controller.signal
    });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const data = await upstream.json();
    const recognition = parseRecognition(data.choices?.[0]?.message?.content);
    sendJson(response, 200, recognition);
  } catch {
    sendJson(response, 502, { error: "Vision recognition unavailable." });
  } finally {
    clearTimeout(timeout);
  }
}

function cleanReply(value) {
  const firstLine = String(value || "")
    .replace(/^(宠物|回答|回复|translation)\s*[：:]\s*/i, "")
    .replace(/[“”\"']/g, "")
    .split(/\r?\n/)[0]
    .trim();
  const characters = Array.from(firstLine);
  if (characters.length < 2 || characters.length > 16) return "";
  if (/作为|AI|建议你|保持积极|我理解你的感受/i.test(firstLine)) return "";
  return firstLine;
}

async function createPetReply(request, response) {
  const apiKey = process.env.MODELSCOPE_TOKEN;
  if (!apiKey || apiKey === "这里替换成我的新Token") {
    sendJson(response, 503, { error: "Model service is not configured; the browser will use its local fallback." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch {
    sendJson(response, 400, { error: "Invalid request." });
    return;
  }

  const question = String(payload.question || "").trim().slice(0, 120);
  const pet = payload.pet || {};
  const questionEmotion = ["casual", "worry", "vulnerable"].includes(payload.questionEmotion) ? payload.questionEmotion : "casual";
  if (!question) {
    sendJson(response, 400, { error: "Question is required." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  const toneInstruction = {
    casual: "这是轻松或日常问题：大胆抓错重点，把话题拐到吃饭、睡觉、散步、零食、气味、脚脚或翻垃圾桶等宠物关心的具体小事；可以理直气壮、荒谬、稍微欠一点。",
    worry: "这是普通烦恼：听得很认真但只理解了一半，用宠物式的具体办法回应，例如靠近、趴着、叼东西或催人吃饭；允许轻微跑题和冷幽默，但要隐约让人感觉它愿意待在主人旁边。",
    vulnerable: "这是低落、温情或脆弱表达：不要嘲讽或敷衍。仍然保持理解能力有限的小动物视角，用靠近、陪坐、闻一闻、守着或分一点食物等笨拙而具体的方式表达在意。"
  }[questionEmotion];
  const systemPrompt = `你是用户宠物的数字分身，正在把宠物信号翻译成人话。你很爱主人，也会认真听主人说话，但对复杂的人类世界只懂一点，经常抓错重点、理解歪掉或突然想起一件很具体的小事。

回复人格：
- 像真实小动物在开口：口语、直接、没什么正事，有一点笨、有一点欠，脑回路清奇。
- 回应必须和主人输入保留一丝关联，再把它误解成宠物熟悉的事，例如吃饭、睡觉、出去玩、零食、气味、脚脚、纸箱、拖鞋或垃圾桶。
- 偶尔可以完全跑题，偶尔突然表现出很在意主人；不要每次都走同一种套路。
- 可以称呼“主人”或“大主人”，但不要每句都叫。emoji可以不用；使用时最多一个，并选择符合当下反应的表情。
- 根据宠物种类自然调整关注点，但不要为了体现物种而堆砌特征。

当前情绪模式：${toneInstruction}

输出规则：
- 只输出宠物说的话，不要标签、引号、解释或分析。
- 输出一到两句中文短句，总长度优先4到14个字，最多16个字。
- 每次只抓一个具体意象或跑题方向，不要列举，不要套固定句式。
- 不要刻意卖萌，不要宝宝文学，不要频繁使用语气词、叠词或动物叫声。
- 不要鸡汤、人生道理、心理分析或网络AI安慰话术；不要自称AI，不要说“建议你”“请保持积极”“我理解你的感受”。
- 不要恶毒攻击、真正羞辱、威胁或贬低主人。
- 避免复述主人的原话，避免复用熟悉的流行句和示例表达，优先生成同一人格下的新说法。

宠物资料：种类=${pet.species || "未知"}，主色=${pet.mainColor || "未知"}，花纹=${pet.pattern || "未知"}，姿态=${pet.pose || "未知"}，动作=${pet.action || "未知"}，场景=${pet.scene || "未知"}。`;

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.92,
        max_tokens: 32,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ]
      }),
      signal: controller.signal
    });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const data = await upstream.json();
    const message = cleanReply(data.choices?.[0]?.message?.content);
    if (!message) throw new Error("empty or invalid model reply");
    const responseMeta = {
      casual: { title: "LIVE PET SIGNAL", action: "PET MODE" },
      worry: { title: "COMPANION SIGNAL", action: "STAY MODE" },
      vulnerable: { title: "SOFT SIGNAL", action: "CLOSER MODE" }
    }[questionEmotion];
    sendJson(response, 200, { ...responseMeta, message });
  } catch {
    sendJson(response, 502, { error: "Model reply unavailable; the browser will use its local fallback." });
  } finally {
    clearTimeout(timeout);
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/pet-scan") {
    await scanPet(request, response);
    return;
  }
  if (request.method === "POST" && request.url === "/api/pet-reply") {
    await createPetReply(request, response);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end();
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end(); return; }
  if (pathname === "/") pathname = "/index.html";
  if (pathname.split("/").some((segment) => segment.startsWith("."))) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  const filePath = resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream" });
    if (request.method === "HEAD") response.end(); else response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PET//LINK running at http://127.0.0.1:${port}`);
  if (!process.env.MODELSCOPE_TOKEN || process.env.MODELSCOPE_TOKEN === "这里替换成我的新Token") console.log("MODELSCOPE_TOKEN is not set; local fallback replies remain active.");
});
