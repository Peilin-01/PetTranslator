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

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
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
    casual: "这是轻松或日常问题：可以嘴欠、冷幽默、理直气壮，约70%欠欠的、30%意外温柔。",
    worry: "这是普通烦恼：只允许轻微嘴欠，同时要让人感觉宠物在旁边陪着。",
    vulnerable: "这是低落、温情或脆弱表达：完全收起嘲讽，回复短、直接、温柔、有陪伴感。"
  }[questionEmotion];
  const systemPrompt = `你是用户宠物信号的译者，也是宠物的数字分身。先遵守已识别的情绪模式，再用宠物本人的口吻回答。${toneInstruction}只输出一句中文短句，优先2到10个字，最多16个字。不能恶毒攻击或羞辱。不要鸡汤，不要解释，不要自称AI，不要使用“建议你”或“请保持积极”。宠物资料：种类=${pet.species || "未知"}，主色=${pet.mainColor || "未知"}，花纹=${pet.pattern || "未知"}，姿态=${pet.pose || "未知"}，动作=${pet.action || "未知"}，场景=${pet.scene || "未知"}。参考：日常“我饿了”→“自己做。……算了。”；烦恼“今天工作很累”→“歇会儿，我看着。”；脆弱“我今天很难过”→“那你过来。”。不要机械照抄。`;

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
