'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5180);
loadDotEnv(path.join(ROOT, '.env'));

function loadDotEnv(file) {
  try {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (_) {}
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 3_000_000) reject(new Error('Слишком большой запрос к ИИ'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(new Error('Неверный JSON')); }
    });
    req.on('error', reject);
  });
}

function safeProject(project) {
  const p = project || {};
  return {
    version: p.version,
    order: p.order,
    totals: p.totals,
    check: String(p.check || '').slice(0, 12000),
    items: Array.isArray(p.items) ? p.items.slice(0, 120).map(x => ({
      index: x.index, id: x.id, name: x.name, qty: x.qty, material: x.material, thickness: x.thickness,
      bends: x.bends, bendLengthMm: x.bendLengthMm, paintLayers: x.paintLayers, ral: x.ral, texture: x.texture,
      weldPriceOne: x.weldPriceOne, serviceText: x.serviceText, productionNote: x.productionNote, geometry: x.geometry,
      factors: x.factors, sale: x.sale, status: x.status, issues: x.issues,
    })) : [],
    orderCosts: Array.isArray(p.orderCosts) ? p.orderCosts.slice(0, 20) : [],
    extraCost: p.extraCost,
    services: Array.isArray(p.services) ? p.services.slice(0, 40) : [],
    materialNames: p.materialNames,
  };
}

function jsonInstructions() {
  return `Ты ИИ-помощник менеджера лазерной резки Парк Металл. Отвечай по-русски коротко.
Тебе дают текущий проект DXF-калькулятора. Ты можешь только ПРЕДЛАГАТЬ действия, сайт применит их после подтверждения пользователя.
Верни СТРОГО JSON без markdown:
{
  "reply": "текст для пользователя",
  "actions": [ ... ]
}
Доступные actions:
1) {"type":"set_items","filter":{"scope":"all"|"selected"},"changes":{"material":"гк ст3|08пс хк|09Г2С|Оцинковка|Нержавейка|Алюминий","thickness":3,"qty":1,"bends":0,"bendLengthMm":0,"paintLayers":0,"ral":"RAL 9005","paintTexture":"муар","weldPriceOne":0,"metalFactor":1.2,"cutFactor":2,"bendFactor":1,"paintFactor":1,"serviceText":"","productionNote":""}}
Допустимые filter: {"scope":"all"}, {"scope":"selected"}, {"ids":[1,2]}, {"nameContains":"текст"}, {"thickness":3}, {"material":"Ст3"}.
2) {"type":"add_service","name":"Доставка","sale":5000,"cost":0}
3) {"type":"add_cost_row","material":"гк ст3","thicknessMm":5,"widthMm":1500,"lengthMm":6000,"sheets":1,"note":""}
4) {"type":"set_order_cost_extra","value":5000}
5) {"type":"set_quote_terms","leadTime":"5-7 рабочих дней","paymentTerms":"70% предоплата","deliveryTerms":"самовывоз","clientComment":""}
6) {"type":"select_items","filter":{"thickness":3}}
7) {"type":"check_order"}
Если команда опасная или непонятная, actions оставь пустым и объясни, что уточнить.`;
}

async function callOpenAI(message, project) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан. Создай .env или переменную окружения.');
  const model = process.env.OPENAI_MODEL || 'gpt-5.5';
  const payload = {
    model,
    instructions: jsonInstructions(),
    input: [
      { role: 'user', content: [
        { type: 'input_text', text: `Команда пользователя: ${message}` },
        { type: 'input_text', text: `Текущий проект JSON:\n${JSON.stringify(safeProject(project), null, 2)}` },
      ] }
    ],
  };
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`OpenAI API: ${r.status} ${text.slice(0, 500)}`);
  const data = JSON.parse(text);
  const out = data.output_text || extractOutputText(data) || '';
  const jsonText = out.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(jsonText);
    return { reply: String(parsed.reply || ''), actions: Array.isArray(parsed.actions) ? parsed.actions : [] };
  } catch (e) {
    return { reply: out || 'ИИ ответил, но не вернул JSON.', actions: [] };
  }
}

function extractOutputText(data) {
  try {
    const parts = [];
    for (const item of data.output || []) {
      for (const c of item.content || []) if (c.text) parts.push(c.text);
    }
    return parts.join('\n');
  } catch (_) { return ''; }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(file).toLowerCase();
    const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' };
    send(res, 200, data, types[ext] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/ai') {
      const { message, project } = await readJson(req);
      const result = await callOpenAI(String(message || ''), project);
      return send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
    }
    serveStatic(req, res);
  } catch (e) {
    send(res, 500, String(e.message || e));
  }
});

server.listen(PORT, () => {
  console.log(`DXF calculator v1.4: http://127.0.0.1:${PORT}`);
  console.log('ИИ: нужен OPENAI_API_KEY в .env или переменной окружения.');
});
