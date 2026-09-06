import fs from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
try {
  loadEnvFile(resolve(projectRoot, ".env"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const apiKey = process.env.MODELSCOPE_TOKEN;
const useMock = /^(1|true|yes|on)$/i.test(process.env.USE_MOCK || "");
if (useMock) {
  console.log("[PET//LINK] USING MOCK TEST (USE_MOCK=true; ModelScope was not called)");
  process.exit(0);
}
if (!apiKey || apiKey === "这里替换成我的新Token") {
  console.error("Replace MODELSCOPE_TOKEN in .env before running this optional vision test.");
  process.exit(1);
}

const imageBase64 = fs.readFileSync(resolve(projectRoot, "assets/pet.jpeg")).toString("base64");
console.log("[PET//LINK] CALLING MODELSCOPE VISION TEST");
const response = await fetch("https://api-inference.modelscope.cn/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: process.env.MODELSCOPE_VISION_MODEL || "Qwen/Qwen3-VL-8B-Instruct",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "请描述这只宠物的种类、颜色、姿态、动作和所在场景。只描述你看到的，不要猜它的心理。" },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ]
    }]
  })
});

const data = await response.json();
console.log(data.choices?.[0]?.message?.content || `Request failed (${response.status}).`);
