'use strict';

const VERSION = '0.2';
const STORAGE_KEY = 'pm_dxf_calc_current_site_v02_settings';
const PROJECT_KEY = 'pm_dxf_calc_current_site_v02_autosave';

const state = {
  items: [],
  services: [],
  selectedId: null,
  nextId: 1,
  nextServiceId: 1,
};

const $ = (id) => document.getElementById(id);
const els = {
  fileInput: $('fileInput'), folderInput: $('folderInput'), projectFileInput: $('projectFileInput'),
  dropzone: $('dropzone'), btnSelectFiles: $('btnSelectFiles'), btnSelectFolder: $('btnSelectFolder'),
  btnAddManual: $('btnAddManual'), btnMergeDuplicates: $('btnMergeDuplicates'), btnSaveProject: $('btnSaveProject'),
  btnLoadProject: $('btnLoadProject'), btnExportCsv: $('btnExportCsv'), btnCopyQuote: $('btnCopyQuote'), btnClear: $('btnClear'),
  btnAddService: $('btnAddService'), itemsBody: $('itemsBody'), servicesBody: $('servicesBody'),
  previewBox: $('previewBox'), previewTitle: $('previewTitle'), editBox: $('editBox'), editTitle: $('editTitle'), logBox: $('logBox'),
  sumFiles: $('sumFiles'), sumQty: $('sumQty'), sumCut: $('sumCut'), sumWeight: $('sumWeight'),
  sumCost: $('sumCost'), sumTotal: $('sumTotal'), sumMargin: $('sumMargin'),
  orderNo: $('orderNo'), clientName: $('clientName'), defaultMaterial: $('defaultMaterial'), defaultThickness: $('defaultThickness'),
  vatRate: $('vatRate'), pricesIncludeVat: $('pricesIncludeVat'), metalPrice: $('metalPrice'), metalFactor: $('metalFactor'),
  cutPrice: $('cutPrice'), cutFactor: $('cutFactor'), piercePrice: $('piercePrice'), minCut: $('minCut'),
  bendPrice: $('bendPrice'), bendFactor: $('bendFactor'), paintPriceM2: $('paintPriceM2'), paintFactor: $('paintFactor'),
  powderConsumption: $('powderConsumption'), powderPrice: $('powderPrice'), addThicknessToBlank: $('addThicknessToBlank'),
  ignoreLayers: $('ignoreLayers'), cutCostPerM: $('cutCostPerM'), bendCostPerM: $('bendCostPerM'),
  paintCostM2: $('paintCostM2'), targetMargin: $('targetMargin'),
};

const SETTINGS_KEYS = [
  'orderNo','clientName','defaultMaterial','defaultThickness','vatRate','pricesIncludeVat',
  'metalPrice','metalFactor','cutPrice','cutFactor','piercePrice','minCut','bendPrice','bendFactor',
  'paintPriceM2','paintFactor','powderConsumption','powderPrice','addThicknessToBlank','ignoreLayers',
  'cutCostPerM','bendCostPerM','paintCostM2','targetMargin'
];

const MATERIAL_DENSITY = {
  'Ст3': 7850,
  '09Г2С': 7850,
  'Нержавейка': 7900,
  'Оцинковка': 7850,
  'Алюминий': 2700,
};

function num(v, fallback = 0) {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}
function round(value, digits = 2) { const m = 10 ** digits; return Math.round((value + Number.EPSILON) * m) / m; }
function fmtNumber(value, digits = 2) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value || 0); }
function fmtMoney(value) { return `${fmtNumber(Math.round(value || 0), 0)} ₽`; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function dateStamp() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`; }
function fileBaseName(fileName) { return fileName.replace(/\.[^.]+$/i, ''); }

function getSettings() {
  return {
    orderNo: els.orderNo.value.trim(),
    clientName: els.clientName.value.trim(),
    defaultMaterial: els.defaultMaterial.value,
    defaultThickness: num(els.defaultThickness.value, 3),
    vatRate: Math.max(0, num(els.vatRate.value, 20)) / 100,
    pricesIncludeVat: els.pricesIncludeVat.checked,
    metalPrice: num(els.metalPrice.value, 0), metalFactor: num(els.metalFactor.value, 1),
    cutPrice: num(els.cutPrice.value, 0), cutFactor: num(els.cutFactor.value, 1), piercePrice: num(els.piercePrice.value, 0), minCut: num(els.minCut.value, 0),
    bendPrice: num(els.bendPrice.value, 0), bendFactor: num(els.bendFactor.value, 1),
    paintPriceM2: num(els.paintPriceM2.value, 0), paintFactor: num(els.paintFactor.value, 1),
    powderConsumption: num(els.powderConsumption.value, 0.15), powderPrice: num(els.powderPrice.value, 0),
    addThicknessToBlank: els.addThicknessToBlank.checked,
    ignoreLayers: els.ignoreLayers.value,
    cutCostPerM: num(els.cutCostPerM.value, 0), bendCostPerM: num(els.bendCostPerM.value, 0), paintCostM2: num(els.paintCostM2.value, 0),
    targetMargin: num(els.targetMargin.value, 30),
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key of SETTINGS_KEYS) {
      if (saved[key] === undefined || !els[key]) continue;
      if (els[key].type === 'checkbox') els[key].checked = Boolean(saved[key]);
      else els[key].value = saved[key];
    }
  } catch (_) {}
}
function saveSettings() {
  const data = {};
  for (const key of SETTINGS_KEYS) {
    if (!els[key]) continue;
    data[key] = els[key].type === 'checkbox' ? els[key].checked : els[key].value;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function autosaveProject() {
  try { localStorage.setItem(PROJECT_KEY, JSON.stringify(makeProjectData())); } catch (_) {}
}

function parseFilename(fileName) {
  const base = fileBaseName(fileName);
  const clean = base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  let qty = null, thickness = null;
  const qtyMatch = clean.match(/(?:^|\s)(\d{1,5})\s*(?:шт|штук|pcs|pieces|дет)(?:\s|$)/i);
  if (qtyMatch) qty = Number(qtyMatch[1]);
  const dimMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)/i);
  if (dimMatch) thickness = num(dimMatch[3], null);
  if (thickness == null) {
    const tMatch = clean.match(/(?:^|\s|_|-)(?:t|т|s|толщ(?:ина)?\.?)*\s*=?\s*(\d+(?:[.,]\d+)?)\s*(?:мм|mm)(?:\s|$|_|-)/i);
    if (tMatch) thickness = num(tMatch[1], null);
  }
  return { name: clean, qty: qty || 1, thickness: thickness || getSettings().defaultThickness };
}

function dxfPairs(text) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  const pairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) pairs.push({ code: lines[i].trim(), value: lines[i + 1].trim() });
  return pairs;
}
function parseLayer(chunk) { const p = chunk.find(x => x.code === '8'); return p ? p.value : '0'; }
function chunkGet(chunk, code, fallback = 0) { const p = chunk.find(x => x.code === code); return p ? num(p.value, fallback) : fallback; }

function parseDxf(text) {
  const pairs = dxfPairs(text);
  const warnings = [];
  const entities = [];
  let inEntities = false;
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    if (p.code === '0' && p.value === 'SECTION') {
      const next = pairs[i + 1];
      if (next && next.code === '2' && next.value.toUpperCase() === 'ENTITIES') { inEntities = true; i += 1; continue; }
    }
    if (!inEntities) continue;
    if (p.code === '0' && p.value === 'ENDSEC') break;
    if (p.code !== '0') continue;
    const type = p.value.toUpperCase();
    if (type === 'POLYLINE') {
      const parsed = parseClassicPolyline(pairs, i);
      if (parsed.entity) entities.push(parsed.entity);
      warnings.push(...parsed.warnings);
      i = parsed.nextIndex;
      continue;
    }
    if (['LINE','CIRCLE','ARC','LWPOLYLINE','SPLINE','ELLIPSE'].includes(type)) {
      const chunk = [];
      let j = i + 1;
      while (j < pairs.length && pairs[j].code !== '0') { chunk.push(pairs[j]); j++; }
      const entity = parseSimpleEntity(type, chunk, warnings);
      if (entity) entities.push(entity);
      i = j - 1;
    } else if (['TEXT','MTEXT','DIMENSION','HATCH','INSERT','LEADER','MLEADER','SOLID','IMAGE','VIEWPORT'].includes(type)) {
      // оформление и вставки не считаем резкой
    }
  }
  if (!entities.length) warnings.push('Не найдено поддерживаемых объектов: LINE / ARC / CIRCLE / LWPOLYLINE / POLYLINE.');
  return { entities, warnings };
}

function parseSimpleEntity(type, chunk, warnings) {
  const layer = parseLayer(chunk);
  const get = (code, fallback = 0) => chunkGet(chunk, code, fallback);
  if (type === 'LINE') return { type, layer, p1: { x: get('10'), y: get('20') }, p2: { x: get('11'), y: get('21') } };
  if (type === 'CIRCLE') return { type, layer, c: { x: get('10'), y: get('20') }, r: Math.abs(get('40')) };
  if (type === 'ARC') return { type, layer, c: { x: get('10'), y: get('20') }, r: Math.abs(get('40')), a1: get('50'), a2: get('51') };
  if (type === 'LWPOLYLINE') {
    const flags = Math.trunc(get('70', 0));
    const vertices = [];
    let current = null;
    for (const p of chunk) {
      if (p.code === '10') { current = { x: num(p.value), y: 0, bulge: 0 }; vertices.push(current); }
      else if (p.code === '20' && current) current.y = num(p.value);
      else if (p.code === '42' && current) current.bulge = num(p.value);
    }
    return { type, layer, vertices, closed: Boolean(flags & 1) };
  }
  if (type === 'SPLINE') {
    const pts = [];
    let current = null;
    for (const p of chunk) {
      if (p.code === '10' || p.code === '11') { current = { x: num(p.value), y: 0 }; pts.push(current); }
      else if ((p.code === '20' || p.code === '21') && current) current.y = num(p.value);
    }
    warnings.push('Есть SPLINE: длина считается приближенно. Лучше конвертировать сплайны в дуги/полилинии.');
    return { type, layer, points: pts };
  }
  if (type === 'ELLIPSE') {
    warnings.push('Есть ELLIPSE: длина считается приближенно. Для резки лучше конвертировать в полилинию/дуги.');
    return { type, layer, c: { x: get('10'), y: get('20') }, major: { x: get('11'), y: get('21') }, ratio: Math.abs(get('40', 1)), start: get('41', 0), end: get('42', Math.PI * 2) };
  }
  return null;
}

function parseClassicPolyline(pairs, startIndex) {
  const warnings = [];
  const header = [];
  let j = startIndex + 1;
  while (j < pairs.length && pairs[j].code !== '0') { header.push(pairs[j]); j++; }
  const layer = parseLayer(header);
  const flagPair = header.find(p => p.code === '70');
  const closed = Boolean((flagPair ? Math.trunc(num(flagPair.value)) : 0) & 1);
  const vertices = [];
  while (j < pairs.length) {
    const p = pairs[j];
    if (p.code === '0' && p.value.toUpperCase() === 'SEQEND') break;
    if (p.code === '0' && p.value.toUpperCase() === 'VERTEX') {
      const chunk = [];
      j++;
      while (j < pairs.length && pairs[j].code !== '0') { chunk.push(pairs[j]); j++; }
      vertices.push({ x: chunkGet(chunk, '10'), y: chunkGet(chunk, '20'), bulge: chunkGet(chunk, '42', 0) });
      continue;
    }
    if (p.code === '0') break;
    j++;
  }
  if (vertices.length) return { entity: { type: 'POLYLINE', layer, vertices, closed }, warnings, nextIndex: j };
  warnings.push('POLYLINE без вершин пропущена.');
  return { entity: null, warnings, nextIndex: j };
}

function dist(a, b) { return Math.hypot((b.x - a.x), (b.y - a.y)); }
function degToRad(d) { return d * Math.PI / 180; }
function normalizedArcDelta(a1, a2) { let d = a2 - a1; while (d < 0) d += 360; while (d > 360) d -= 360; return d; }
function entityLength(entity) {
  if (entity.type === 'LINE') return dist(entity.p1, entity.p2);
  if (entity.type === 'CIRCLE') return 2 * Math.PI * entity.r;
  if (entity.type === 'ARC') return entity.r * degToRad(normalizedArcDelta(entity.a1, entity.a2));
  if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') return polylineLength(entity.vertices, entity.closed);
  if (entity.type === 'SPLINE') return polyPointsLength(entity.points, false);
  if (entity.type === 'ELLIPSE') return polyPointsLength(ellipsePoints(entity), false);
  return 0;
}
function polylineLength(vertices, closed) {
  if (!vertices || vertices.length < 2) return 0;
  let len = 0;
  const n = vertices.length;
  const max = closed ? n : n - 1;
  for (let i = 0; i < max; i++) len += bulgeSegmentLength(vertices[i], vertices[(i + 1) % n], vertices[i].bulge || 0);
  return len;
}
function polyPointsLength(points, closed) { if (!points || points.length < 2) return 0; let len = 0; for (let i = 0; i < points.length - 1; i++) len += dist(points[i], points[i+1]); if (closed) len += dist(points[points.length-1], points[0]); return len; }
function bulgeSegmentLength(a, b, bulge) { const chord = dist(a,b); if (!bulge || Math.abs(bulge) < 1e-9) return chord; const theta = Math.abs(4 * Math.atan(bulge)); const s = Math.sin(theta/2); if (Math.abs(s) < 1e-9) return chord; return chord / (2 * s) * theta; }
function bulgeToPoints(a, b, bulge) {
  if (!bulge || Math.abs(bulge) < 1e-9) return [a, b];
  const chord = dist(a,b); if (chord < 1e-9) return [a,b];
  const theta = 4 * Math.atan(bulge);
  const ux = (b.x - a.x) / chord, uy = (b.y - a.y) / chord;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const d = chord / (2 * Math.tan(theta / 2));
  const c = { x: mid.x - uy * d, y: mid.y + ux * d };
  const start = Math.atan2(a.y - c.y, a.x - c.x);
  const steps = Math.max(8, Math.min(96, Math.ceil(Math.abs(theta) / (Math.PI / 18))));
  const pts = [];
  const r = dist(c, a);
  for (let i = 0; i <= steps; i++) { const t = start + theta * (i / steps); pts.push({ x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r }); }
  return pts;
}
function circlePoints(c, r, count = 96) { const pts = []; for (let i = 0; i <= count; i++) { const t = Math.PI*2*i/count; pts.push({ x:c.x+Math.cos(t)*r, y:c.y+Math.sin(t)*r }); } return pts; }
function arcPoints(c, r, a1, a2) { const delta = normalizedArcDelta(a1,a2); const steps = Math.max(8, Math.min(96, Math.ceil(delta/10))); const pts=[]; for(let i=0;i<=steps;i++){ const a=degToRad(a1+delta*i/steps); pts.push({x:c.x+Math.cos(a)*r,y:c.y+Math.sin(a)*r}); } return pts; }
function ellipsePoints(entity) {
  const { c, major, ratio } = entity;
  const a = Math.hypot(major.x, major.y);
  const angle = Math.atan2(major.y, major.x);
  const b = a * ratio;
  let start = entity.start, end = entity.end;
  if (Math.abs(end - start) < 1e-9) end = start + Math.PI * 2;
  if (end < start) end += Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const t = start + (end - start) * i / 96;
    const x = Math.cos(t) * a, y = Math.sin(t) * b;
    pts.push({ x: c.x + x * Math.cos(angle) - y * Math.sin(angle), y: c.y + x * Math.sin(angle) + y * Math.cos(angle) });
  }
  return pts;
}
function entityPoints(entity) {
  if (entity.type === 'LINE') return [entity.p1, entity.p2];
  if (entity.type === 'CIRCLE') return circlePoints(entity.c, entity.r);
  if (entity.type === 'ARC') return arcPoints(entity.c, entity.r, entity.a1, entity.a2);
  if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
    const pts = [];
    const n = entity.vertices.length;
    const max = entity.closed ? n : n - 1;
    for (let i = 0; i < max; i++) {
      const seg = bulgeToPoints(entity.vertices[i], entity.vertices[(i + 1) % n], entity.vertices[i].bulge || 0);
      if (pts.length) seg.shift();
      pts.push(...seg);
    }
    return pts;
  }
  if (entity.type === 'SPLINE') return entity.points || [];
  if (entity.type === 'ELLIPSE') return ellipsePoints(entity);
  return [];
}
function allSegments(entities) { const segments=[]; for (const e of entities) { const pts=entityPoints(e); for(let i=0;i<pts.length-1;i++){ if(dist(pts[i],pts[i+1])>1e-7) segments.push([pts[i],pts[i+1],e.type]); } } return segments; }
function keyPoint(p, tolerance=0.05) { return `${Math.round(p.x/tolerance)}:${Math.round(p.y/tolerance)}`; }
function segmentKey(a,b,tolerance=0.05) { const ka=keyPoint(a,tolerance), kb=keyPoint(b,tolerance); return ka<kb ? `${ka}|${kb}` : `${kb}|${ka}`; }
function duplicateSegmentLength(segments) { const seen=new Map(); let dup=0; for(const [a,b] of segments){ const key=segmentKey(a,b,0.1); const l=dist(a,b); if(seen.has(key)) dup += Math.min(l, seen.get(key)); else seen.set(key,l); } return dup; }
function openPolylineCount(entities) { let c=0; for(const e of entities){ if(e.type==='LINE'||e.type==='ARC'||e.type==='SPLINE') c++; if((e.type==='LWPOLYLINE'||e.type==='POLYLINE')&&!e.closed) c++; } return c; }
function closedComponentsFromLooseLines(entities) {
  const loose = [];
  for (const e of entities) if (e.type === 'LINE') loose.push([e.p1,e.p2]);
  if (!loose.length) return 0;
  const adj = new Map();
  const add = (a,b) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); };
  for (const [a,b] of loose) { const ka=keyPoint(a), kb=keyPoint(b); add(ka,kb); add(kb,ka); }
  const visited = new Set(); let loops = 0;
  for (const node of adj.keys()) {
    if (visited.has(node)) continue;
    const stack = [node], comp = []; visited.add(node);
    while (stack.length) { const n = stack.pop(); comp.push(n); for (const nb of adj.get(n)||[]) if (!visited.has(nb)) { visited.add(nb); stack.push(nb); } }
    if (comp.length >= 3 && comp.every(n => (adj.get(n)||[]).length === 2)) loops++;
  }
  return loops;
}
function ignoreLayerKeywords() {
  return getSettings().ignoreLayers.split(/[;,]/).map(x => x.trim().toUpperCase()).filter(Boolean);
}
function filterEntitiesByLayer(entities) {
  const keys = ignoreLayerKeywords();
  if (!keys.length) return entities.slice();
  return entities.filter(e => !keys.some(k => String(e.layer || '').toUpperCase().includes(k)));
}
function analyzeGeometry(entities) {
  const warnings = [];
  const cutLength = entities.map(entityLength).reduce((a,b)=>a+b,0);
  const pts = entities.flatMap(entityPoints);
  let bbox = { minX:0,minY:0,maxX:0,maxY:0,width:0,height:0 };
  if (pts.length) {
    const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
    bbox = { minX:Math.min(...xs), minY:Math.min(...ys), maxX:Math.max(...xs), maxY:Math.max(...ys), width:Math.max(...xs)-Math.min(...xs), height:Math.max(...ys)-Math.min(...ys) };
  }
  let pierces = 0;
  for (const e of entities) {
    if (e.type === 'CIRCLE') pierces++;
    else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.closed) pierces++;
    else if (e.type === 'ELLIPSE') pierces++;
  }
  pierces += closedComponentsFromLooseLines(entities);
  const duplicateLength = duplicateSegmentLength(allSegments(entities));
  if (duplicateLength > 0.5) warnings.push(`Возможны двойные линии: примерно ${round(duplicateLength,1)} мм совпадающего реза.`);
  const openCount = openPolylineCount(entities);
  if (openCount) warnings.push(`Есть незамкнутые линии/дуги/полилинии: ${openCount} шт. Проверь, это рез или вспомогательная геометрия.`);
  const layers = [...new Set(entities.map(e => e.layer || '0'))].sort();
  return { cutLength, bbox, pierces, duplicateLength, warnings, layers, segments: allSegments(entities) };
}
function refreshDxfGeometry(item) {
  if (!item.rawEntities) return;
  item.entities = filterEntitiesByLayer(item.rawEntities);
  const analysis = analyzeGeometry(item.entities);
  item.analysis = analysis;
  if (!item.geometryOverridden) {
    item.geometry = { width: analysis.bbox.width, height: analysis.bbox.height, cutLengthMm: analysis.cutLength, pierces: analysis.pierces };
    item.paintAreaM2One = defaultPaintArea(item);
  }
  item.warnings = [...(item.rawWarnings || []), ...analysis.warnings];
  const ignoredCount = item.rawEntities.length - item.entities.length;
  if (ignoredCount > 0) item.warnings.push(`Игнорировано объектов по слоям: ${ignoredCount} шт.`);
}
function refreshAllDxfGeometry() { for (const item of state.items) refreshDxfGeometry(item); detectDuplicates(); }

function defaultOps() { return { metal: true, cut: true, bend: false, paint: false }; }
function defaultPaintArea(item) {
  const g = item.geometry || { width:0, height:0 };
  return round((Math.max(0,g.width) * Math.max(0,g.height) / 1_000_000) * 2, 4);
}
function makeItem({ source, fileName='', name='', qty=1, material=null, thickness=null, rawEntities=null, rawWarnings=[] }) {
  const s = getSettings();
  const item = {
    id: state.nextId++, source, fileName, name: name || 'Ручная позиция', qty, material: material || s.defaultMaterial, thickness: thickness || s.defaultThickness,
    rawEntities, rawWarnings, entities: [], analysis: null, warnings: [],
    geometry: { width: 0, height: 0, cutLengthMm: 0, pierces: 0 }, geometryOverridden: false,
    ops: defaultOps(), bends: 0, bendLengthMm: 0, paintAreaM2One: 0, customPriceOne: 0, customCostOne: 0, note: '',
  };
  if (rawEntities) refreshDxfGeometry(item);
  else {
    item.analysis = { bbox: { minX:0,minY:0,maxX:0,maxY:0,width:0,height:0 }, cutLength:0, pierces:0, warnings:[], layers:[], segments:[] };
    item.paintAreaM2One = 0;
  }
  return item;
}

function getGeometry(item) { return item.geometry || { width: 0, height: 0, cutLengthMm: 0, pierces: 0 }; }
function densityFor(item) { return MATERIAL_DENSITY[item.material] || 7850; }
function saleToNoVat(amount, s) { return s.pricesIncludeVat ? amount / (1 + s.vatRate) : amount; }
function saleToWithVat(amount, s) { return s.pricesIncludeVat ? amount : amount * (1 + s.vatRate); }
function calcItem(item) {
  const s = getSettings();
  const qty = Math.max(0, num(item.qty, 0));
  const t = Math.max(0, num(item.thickness, 0));
  const g = getGeometry(item);
  const blankX = Math.max(0, num(g.width,0)) + (s.addThicknessToBlank ? t : 0);
  const blankY = Math.max(0, num(g.height,0)) + (s.addThicknessToBlank ? t : 0);
  const areaM2One = blankX * blankY / 1_000_000;
  const weightOne = areaM2One * (t / 1000) * densityFor(item);
  const weightTotal = weightOne * qty;
  const cutMTotal = Math.max(0, num(g.cutLengthMm, 0)) / 1000 * qty;
  const piercesTotal = Math.max(0, num(g.pierces, 0)) * qty;
  const bendMTotal = Math.max(0, num(item.bends,0)) * Math.max(0, num(item.bendLengthMm,0)) / 1000 * qty;
  const paintAreaTotal = item.ops.paint ? Math.max(0, num(item.paintAreaM2One, 0)) * qty : 0;

  const metalSale = item.ops.metal ? weightTotal * s.metalPrice * s.metalFactor : 0;
  const metalCost = item.ops.metal ? weightTotal * s.metalPrice : 0;
  let cutSale = item.ops.cut ? cutMTotal * s.cutPrice * s.cutFactor + piercesTotal * s.piercePrice : 0;
  if (item.ops.cut && cutSale > 0 && s.minCut > 0) cutSale = Math.max(cutSale, s.minCut);
  const cutCost = item.ops.cut ? cutMTotal * s.cutCostPerM : 0;
  const bendSale = item.ops.bend ? bendMTotal * s.bendPrice * s.bendFactor : 0;
  const bendCost = item.ops.bend ? bendMTotal * s.bendCostPerM : 0;
  const paintSale = item.ops.paint ? paintAreaTotal * s.paintPriceM2 * s.paintFactor : 0;
  const powderCost = item.ops.paint ? paintAreaTotal * s.powderConsumption * s.powderPrice : 0;
  const paintCost = item.ops.paint ? paintAreaTotal * s.paintCostM2 + powderCost : 0;
  const customSale = Math.max(0, num(item.customPriceOne,0)) * qty;
  const customCost = Math.max(0, num(item.customCostOne,0)) * qty;
  const sale = metalSale + cutSale + bendSale + paintSale + customSale;
  const cost = metalCost + cutCost + bendCost + paintCost + customCost;
  return { qty, t, blankX, blankY, areaM2One, weightOne, weightTotal, cutMTotal, piercesTotal, bendMTotal, paintAreaTotal, metalSale, metalCost, cutSale, cutCost, bendSale, bendCost, paintSale, paintCost, powderCost, customSale, customCost, sale, cost };
}
function calcServices() {
  const s = getSettings();
  const sale = state.services.reduce((a,x)=>a+Math.max(0,num(x.sale,0)),0);
  const cost = state.services.reduce((a,x)=>a+Math.max(0,num(x.cost,0)),0);
  return { sale, cost, saleNoVat: saleToNoVat(sale,s), saleWithVat: saleToWithVat(sale,s) };
}
function calcTotals() {
  const s = getSettings();
  const items = state.items.reduce((acc,item)=>{
    const c = calcItem(item);
    acc.qty += c.qty; acc.cut += c.cutMTotal; acc.weight += c.weightTotal; acc.sale += c.sale; acc.cost += c.cost;
    return acc;
  }, { qty:0, cut:0, weight:0, sale:0, cost:0 });
  const svc = calcServices();
  const saleRaw = items.sale + svc.sale;
  const cost = items.cost + svc.cost;
  const saleNoVat = saleToNoVat(saleRaw, s);
  const saleWithVat = saleToWithVat(saleRaw, s);
  const vat = Math.max(0, saleWithVat - saleNoVat);
  const margin = saleNoVat - cost;
  const marginPct = saleNoVat > 0 ? margin / saleNoVat * 100 : 0;
  return { ...items, serviceSale: svc.sale, serviceCost: svc.cost, saleRaw, saleNoVat, saleWithVat, vat, cost, margin, marginPct };
}

async function handleFiles(files) {
  const list = [...files].filter(f => f.name.toLowerCase().endsWith('.dxf'));
  if (!list.length) return;
  for (const file of list) {
    try {
      const text = await file.text();
      const meta = parseFilename(file.name);
      const parsed = parseDxf(text);
      const item = makeItem({ source:'dxf', fileName:file.webkitRelativePath || file.name, name:meta.name, qty:meta.qty, thickness:meta.thickness, rawEntities:parsed.entities, rawWarnings:parsed.warnings });
      item.rawSize = file.size;
      state.items.push(item);
    } catch (err) {
      const item = makeItem({ source:'manual', fileName:file.name, name:file.name, qty:1 });
      item.warnings.push(`Ошибка чтения DXF: ${err.message || err}`);
      state.items.push(item);
    }
  }
  detectDuplicates();
  if (!state.selectedId && state.items.length) state.selectedId = state.items[0].id;
  renderAll(); autosaveProject();
}
function detectDuplicates() {
  for (const item of state.items) item.duplicateKey = '';
  const map = new Map();
  for (const item of state.items) {
    const g = getGeometry(item);
    const key = `${round(g.width,1)}x${round(g.height,1)}|${round(g.cutLengthMm,1)}|${round(g.pierces,0)}|${item.thickness}|${item.material}`;
    item.duplicateKey = key;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  for (const group of map.values()) {
    if (group.length > 1) {
      const names = group.map(g => g.name).join(', ');
      for (const item of group) {
        const msg = `Похожа на другие детали: ${names}. Можно объединить количество, если геометрия совпадает.`;
        if (!item.warnings.includes(msg)) item.warnings.push(msg);
      }
    }
  }
}
function mergeDuplicates() {
  detectDuplicates();
  const groups = new Map();
  for (const item of state.items) {
    if (!groups.has(item.duplicateKey)) groups.set(item.duplicateKey, []);
    groups.get(item.duplicateKey).push(item);
  }
  const merged = [];
  let mergedCount = 0;
  for (const group of groups.values()) {
    const first = group[0];
    if (group.length > 1) {
      first.qty = group.reduce((a,x)=>a+num(x.qty,0),0);
      first.name = `${first.name} / объединено ${group.length} поз.`;
      first.note = `${first.note || ''}\nОбъединено: ${group.map(x => x.fileName || x.name).join('; ')}`.trim();
      first.warnings = first.warnings.filter(w => !w.startsWith('Похожа на другие детали'));
      mergedCount += group.length - 1;
    }
    merged.push(first);
  }
  state.items = merged;
  if (mergedCount) alert(`Объединено дублей: ${mergedCount}`);
  renderAll(); autosaveProject();
}

function renderAll() {
  renderTable(); renderSummary(); renderPreview(); renderEditor(); renderLog(); renderServices();
  const has = state.items.length > 0;
  els.btnExportCsv.disabled = !has;
  els.btnSaveProject.disabled = !has && !state.services.length;
  els.btnClear.disabled = !has && !state.services.length;
  els.btnCopyQuote.disabled = !has && !state.services.length;
  els.btnMergeDuplicates.disabled = state.items.length < 2;
}
function renderSummary() {
  const t = calcTotals();
  els.sumFiles.textContent = state.items.length;
  els.sumQty.textContent = fmtNumber(t.qty, 0);
  els.sumCut.textContent = `${fmtNumber(t.cut, 2)} м`;
  els.sumWeight.textContent = `${fmtNumber(t.weight, 1)} кг`;
  els.sumCost.textContent = fmtMoney(t.cost);
  els.sumTotal.textContent = fmtMoney(t.saleWithVat);
  els.sumMargin.textContent = `${fmtMoney(t.margin)} / ${fmtNumber(t.marginPct, 1)}%`;
}
function itemStatus(item) {
  if (!item.rawEntities && item.source === 'dxf') return ['bad','ошибка'];
  if (item.warnings && item.warnings.length) return ['warn',`${item.warnings.length} замеч.`];
  return ['ok','OK'];
}
function renderTable() {
  if (!state.items.length) { els.itemsBody.innerHTML = '<tr class="empty-row"><td colspan="13">Файлы пока не загружены.</td></tr>'; return; }
  els.itemsBody.innerHTML = '';
  for (const item of state.items) {
    const c = calcItem(item); const g = getGeometry(item); const [st, txt] = itemStatus(item);
    const tr = document.createElement('tr'); tr.dataset.id = item.id; if (item.id === state.selectedId) tr.classList.add('selected');
    tr.innerHTML = `
      <td><div class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div><div class="file-meta">${escapeHtml(item.fileName || item.source)} · ${escapeHtml((item.analysis?.layers || []).join(', ') || 'без слоев')}</div></td>
      <td>${fmtNumber(num(item.qty,0),0)}</td>
      <td>${fmtNumber(num(item.thickness,0),1)}</td>
      <td>${fmtNumber(g.width,1)} × ${fmtNumber(g.height,1)}</td>
      <td>${fmtNumber(g.cutLengthMm/1000,3)} м</td>
      <td>${fmtNumber(g.pierces,0)}</td>
      <td>${fmtNumber(c.weightTotal,2)} кг</td>
      <td>${item.ops.metal ? fmtMoney(c.metalSale) : '<span class="badge">выкл</span>'}</td>
      <td>${item.ops.cut ? fmtMoney(c.cutSale) : '<span class="badge">выкл</span>'}</td>
      <td>${item.ops.bend ? fmtMoney(c.bendSale) : '<span class="badge">выкл</span>'}</td>
      <td>${item.ops.paint ? fmtMoney(c.paintSale) : '<span class="badge">выкл</span>'}</td>
      <td><span class="money">${fmtMoney(c.sale)}</span></td>
      <td><span class="status-${st}">${txt}</span></td>`;
    tr.addEventListener('click', () => { state.selectedId = item.id; renderAll(); });
    els.itemsBody.appendChild(tr);
  }
}
function selectedItem() { return state.items.find(x => x.id === state.selectedId) || null; }
function renderPreview() {
  const item = selectedItem();
  if (!item) { els.previewTitle.textContent = 'Нет выбранной детали'; els.previewBox.innerHTML = '<div class="preview-empty">Выбери строку в таблице.</div>'; return; }
  const g = getGeometry(item);
  els.previewTitle.textContent = `${fmtNumber(g.width,1)} × ${fmtNumber(g.height,1)} мм / ${fmtNumber(g.cutLengthMm/1000,3)} м`;
  els.previewBox.innerHTML = makeSvg(item);
}
function makeSvg(item) {
  if (item.entities && item.entities.length && item.analysis && item.analysis.bbox.width + item.analysis.bbox.height > 0) return makeEntitySvg(item);
  return makeManualSvg(item);
}
function makeManualSvg(item) {
  const g = getGeometry(item);
  const w = Math.max(1, num(g.width, 100)), h = Math.max(1, num(g.height, 100));
  const pad = Math.max(w,h)*0.08 + 20;
  return `<svg viewBox="${-pad} ${-pad} ${w+pad*2} ${h+pad*2}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#0f172a" stroke-width="1.6" vector-effect="non-scaling-stroke"/><text x="${w/2}" y="${h/2}" text-anchor="middle" dominant-baseline="middle" font-size="18" fill="#64748b">ручная позиция</text></svg>`;
}
function makeEntitySvg(item) {
  const bbox = item.analysis.bbox;
  const pad = Math.max(bbox.width, bbox.height) * 0.06 + 20;
  const minX = bbox.minX - pad, minY = bbox.minY - pad, width = Math.max(1, bbox.width + pad*2), height = Math.max(1, bbox.height + pad*2);
  const paths = [];
  for (const e of item.entities) {
    const pts = entityPoints(e); if (pts.length < 2) continue;
    const d = pts.map((p,i)=>`${i?'L':'M'} ${round(p.x,3)} ${round(p.y,3)}`).join(' ');
    const close = (e.type==='CIRCLE'||e.type==='ELLIPSE'||((e.type==='LWPOLYLINE'||e.type==='POLYLINE')&&e.closed)) ? ' Z' : '';
    paths.push(`<path d="${d}${close}" vector-effect="non-scaling-stroke" />`);
  }
  return `<svg viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="DXF preview"><g transform="scale(1,-1) translate(0,${-(bbox.minY+bbox.maxY)})"><rect x="${bbox.minX}" y="${bbox.minY}" width="${bbox.width}" height="${bbox.height}" fill="none" stroke="#93c5fd" stroke-dasharray="8 6" vector-effect="non-scaling-stroke"/><g fill="none" stroke="#0f172a" stroke-width="1.6">${paths.join('\n')}</g></g></svg>`;
}
function renderEditor() {
  const item = selectedItem();
  if (!item) { els.editTitle.textContent = 'нет выбранной'; els.editBox.classList.add('muted-box'); els.editBox.innerHTML = 'Выбери позицию в таблице.'; return; }
  els.editBox.classList.remove('muted-box');
  els.editTitle.textContent = item.name;
  const g = getGeometry(item);
  els.editBox.innerHTML = `
    <div class="editor-grid">
      <label>Название<input data-edit="name" value="${escapeHtml(item.name)}"></label>
      <label>Количество<input data-edit="qty" type="number" step="1" min="0" value="${item.qty}"></label>
      <label>Материал<select data-edit="material">${['Ст3','09Г2С','Нержавейка','Оцинковка','Алюминий'].map(m => `<option ${m===item.material?'selected':''}>${m}</option>`).join('')}</select></label>
      <label>Толщина, мм<input data-edit="thickness" type="number" step="0.1" min="0" value="${item.thickness}"></label>
      <label>Габарит X, мм<input data-geom="width" type="number" step="0.1" min="0" value="${round(g.width,2)}"></label>
      <label>Габарит Y, мм<input data-geom="height" type="number" step="0.1" min="0" value="${round(g.height,2)}"></label>
      <label>Длина реза, мм<input data-geom="cutLengthMm" type="number" step="0.1" min="0" value="${round(g.cutLengthMm,2)}"></label>
      <label>Врезки, шт<input data-geom="pierces" type="number" step="1" min="0" value="${round(g.pierces,0)}"></label>
      <label>Площадь покраски, м²/шт<input data-edit="paintAreaM2One" type="number" step="0.001" min="0" value="${round(item.paintAreaM2One || defaultPaintArea(item),4)}"></label>
    </div>
    <div class="ops-grid">
      ${opChip('metal','Металл',item.ops.metal)}${opChip('cut','Резка',item.ops.cut)}${opChip('bend','Гибка',item.ops.bend)}${opChip('paint','Покраска',item.ops.paint)}
    </div>
    <div class="editor-grid two">
      <label>Количество гибов<input data-edit="bends" type="number" step="1" min="0" value="${item.bends}"></label>
      <label>Длина 1 гиба, мм<input data-edit="bendLengthMm" type="number" step="0.1" min="0" value="${item.bendLengthMm}"></label>
      <label>Доп. продажа, ₽/шт<input data-edit="customPriceOne" type="number" step="1" min="0" value="${item.customPriceOne}"></label>
      <label>Доп. себест., ₽/шт<input data-edit="customCostOne" type="number" step="1" min="0" value="${item.customCostOne}"></label>
    </div>
    <label>Заметка<textarea data-edit="note" rows="2">${escapeHtml(item.note || '')}</textarea></label>
    <div class="editor-actions">
      <button id="btnResetGeometry" class="secondary small" ${item.rawEntities ? '' : 'disabled'}>Вернуть геометрию из DXF</button>
      <button id="btnAutoPaint" class="secondary small">Покраска = габарит × 2</button>
      <button id="btnDeleteItem" class="danger small">Удалить позицию</button>
    </div>`;
  bindEditorEvents(item);
}
function opChip(key, label, checked) { return `<label class="op-chip"><input data-op="${key}" type="checkbox" ${checked?'checked':''}>${label}</label>`; }
function bindEditorEvents(item) {
  els.editBox.querySelectorAll('[data-edit]').forEach(input => {
    input.addEventListener('input', () => { item[input.dataset.edit] = input.value; renderAll(); autosaveProject(); });
    input.addEventListener('change', () => { item[input.dataset.edit] = input.value; renderAll(); autosaveProject(); });
  });
  els.editBox.querySelectorAll('[data-geom]').forEach(input => {
    input.addEventListener('input', () => { item.geometry[input.dataset.geom] = num(input.value,0); item.geometryOverridden = true; renderAll(); autosaveProject(); });
    input.addEventListener('change', () => { item.geometry[input.dataset.geom] = num(input.value,0); item.geometryOverridden = true; renderAll(); autosaveProject(); });
  });
  els.editBox.querySelectorAll('[data-op]').forEach(input => {
    input.addEventListener('change', () => { item.ops[input.dataset.op] = input.checked; renderAll(); autosaveProject(); });
  });
  $('btnResetGeometry')?.addEventListener('click', () => { item.geometryOverridden = false; refreshDxfGeometry(item); renderAll(); autosaveProject(); });
  $('btnAutoPaint')?.addEventListener('click', () => { item.paintAreaM2One = defaultPaintArea(item); renderAll(); autosaveProject(); });
  $('btnDeleteItem')?.addEventListener('click', () => { state.items = state.items.filter(x => x.id !== item.id); state.selectedId = state.items[0]?.id || null; renderAll(); autosaveProject(); });
}
function renderLog() {
  const item = selectedItem();
  if (!item) { els.logBox.textContent = 'Нет данных.'; return; }
  const c = calcItem(item), g = getGeometry(item), s = getSettings();
  const saleNoVat = saleToNoVat(c.sale, s), saleWithVat = saleToWithVat(c.sale, s), margin = saleNoVat - c.cost, marginPct = saleNoVat ? margin / saleNoVat * 100 : 0;
  const lines = [];
  lines.push(`Файл: ${item.fileName || 'ручная позиция'}`);
  lines.push(`Материал: ${item.material}, толщина: ${item.thickness} мм, количество: ${item.qty} шт`);
  lines.push(`Габарит: ${round(g.width,1)} × ${round(g.height,1)} мм${getSettings().addThicknessToBlank ? ' (+t к заготовке)' : ''}`);
  lines.push(`Длина реза: ${round(g.cutLengthMm/1000,3)} м/шт; врезки: ${g.pierces} шт/шт`);
  lines.push(`Вес: ${round(c.weightOne,3)} кг/шт; ${round(c.weightTotal,2)} кг всего`);
  lines.push(`Металл: ${fmtMoney(c.metalSale)}; резка: ${fmtMoney(c.cutSale)}; гибка: ${fmtMoney(c.bendSale)}; покраска: ${fmtMoney(c.paintSale)}; доп.: ${fmtMoney(c.customSale)}`);
  lines.push(`Себестоимость: ${fmtMoney(c.cost)}; продажа с НДС: ${fmtMoney(saleWithVat)}; без НДС: ${fmtMoney(saleNoVat)}`);
  lines.push(`Маржа: ${fmtMoney(margin)} / ${round(marginPct,1)}%`);
  if (item.ops.paint) lines.push(`Порошок: ${round(c.paintAreaTotal * s.powderConsumption,2)} кг × ${s.powderPrice} ₽ = ${fmtMoney(c.powderCost)}`);
  lines.push(`Слои: ${(item.analysis?.layers || []).join(', ') || 'нет'}`);
  if (item.note) { lines.push(''); lines.push(`Заметка: ${item.note}`); }
  if (item.warnings.length) { lines.push(''); lines.push('Замечания:'); for (const w of item.warnings) lines.push(`- ${w}`); } else { lines.push(''); lines.push('Замечаний нет.'); }
  els.logBox.textContent = lines.join('\n');
}

function renderServices() {
  if (!state.services.length) { els.servicesBody.innerHTML = '<tr class="empty-row"><td colspan="4">Нет дополнительных строк.</td></tr>'; return; }
  els.servicesBody.innerHTML = '';
  for (const svc of state.services) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input data-service="name" value="${escapeHtml(svc.name)}"></td><td><input data-service="cost" type="number" step="1" value="${svc.cost}"></td><td><input data-service="sale" type="number" step="1" value="${svc.sale}"></td><td><button class="danger small" data-delete-service="${svc.id}">×</button></td>`;
    tr.querySelectorAll('[data-service]').forEach(input => input.addEventListener('input', () => { svc[input.dataset.service] = input.value; renderSummary(); autosaveProject(); }));
    tr.querySelector('[data-delete-service]').addEventListener('click', () => { state.services = state.services.filter(x => x.id !== svc.id); renderAll(); autosaveProject(); });
    els.servicesBody.appendChild(tr);
  }
}
function addService() {
  state.services.push({ id: state.nextServiceId++, name: 'Сварка / подряд / метизы', cost: 0, sale: 0 });
  renderAll(); autosaveProject();
}
function addManualItem() {
  const item = makeItem({ source:'manual', name:'Ручная позиция', qty:1 });
  item.geometry = { width: 100, height: 100, cutLengthMm: 400, pierces: 1 };
  item.geometryOverridden = true;
  item.paintAreaM2One = defaultPaintArea(item);
  state.items.push(item); state.selectedId = item.id; renderAll(); autosaveProject();
}

function exportCsv() {
  const headers = ['Тип','Файл','Название','Кол-во','Материал','Толщина','Габарит X','Габарит Y','Рез 1шт м','Врезки 1шт','Вес всего кг','Металл продажа','Резка продажа','Гибка продажа','Покраска продажа','Доп продажа','Итого продажа','Себестоимость','Маржа без НДС','Замечания'];
  const s = getSettings();
  const rows = state.items.map(item => {
    const c = calcItem(item), g = getGeometry(item); const saleNoVat = saleToNoVat(c.sale,s); const margin = saleNoVat - c.cost;
    return [item.source, item.fileName, item.name, item.qty, item.material, item.thickness, round(g.width,2), round(g.height,2), round(g.cutLengthMm/1000,4), g.pierces, round(c.weightTotal,3), Math.round(c.metalSale), Math.round(c.cutSale), Math.round(c.bendSale), Math.round(c.paintSale), Math.round(c.customSale), Math.round(c.sale), Math.round(c.cost), Math.round(margin), item.warnings.join(' | ')];
  });
  if (state.services.length) {
    rows.push([]);
    rows.push(['Дополнительные строки']);
    for (const svc of state.services) rows.push(['service','',svc.name,'','','','','','','','','','','','','',Math.round(num(svc.sale)),Math.round(num(svc.cost)),'','']);
  }
  const t = calcTotals();
  rows.push([]); rows.push(['ИТОГО','','','','','','','','','','','','','','','',Math.round(t.saleWithVat),Math.round(t.cost),Math.round(t.margin),'']);
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(';')).join('\n');
  downloadBlob(new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8' }), `pm_dxf_calc_${dateStamp()}.csv`);
}
function csvCell(value) { const s = String(value ?? '').replace(/\./g, ','); return /[;"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
function makeProjectData() {
  const settings = {};
  for (const key of SETTINGS_KEYS) settings[key] = els[key]?.type === 'checkbox' ? els[key].checked : els[key]?.value;
  return {
    version: VERSION,
    savedAt: new Date().toISOString(),
    settings,
    services: state.services,
    items: state.items.map(item => ({
      id: item.id, source: item.source, fileName: item.fileName, name: item.name, qty: item.qty, material: item.material, thickness: item.thickness,
      geometry: item.geometry, geometryOverridden: item.geometryOverridden || item.source === 'manual', ops: item.ops, bends: item.bends, bendLengthMm: item.bendLengthMm,
      paintAreaM2One: item.paintAreaM2One, customPriceOne: item.customPriceOne, customCostOne: item.customCostOne, note: item.note,
      rawEntities: item.rawEntities, rawWarnings: item.rawWarnings,
    }))
  };
}
function saveProject() { downloadBlob(new Blob([JSON.stringify(makeProjectData(), null, 2)], { type:'application/json;charset=utf-8' }), `pm_dxf_project_${dateStamp()}.json`); }
async function loadProjectFromFile(file) {
  const data = JSON.parse(await file.text());
  if (data.settings) {
    for (const key of SETTINGS_KEYS) {
      if (data.settings[key] === undefined || !els[key]) continue;
      if (els[key].type === 'checkbox') els[key].checked = Boolean(data.settings[key]); else els[key].value = data.settings[key];
    }
  }
  state.items = []; state.services = data.services || []; state.nextId = 1; state.nextServiceId = 1;
  for (const raw of data.items || []) {
    const item = makeItem({ source: raw.source || 'manual', fileName: raw.fileName, name: raw.name, qty: raw.qty, material: raw.material, thickness: raw.thickness, rawEntities: raw.rawEntities || null, rawWarnings: raw.rawWarnings || [] });
    Object.assign(item, raw);
    if (item.rawEntities) refreshDxfGeometry(item);
    state.nextId = Math.max(state.nextId, item.id + 1);
    state.items.push(item);
  }
  for (const svc of state.services) state.nextServiceId = Math.max(state.nextServiceId, Number(svc.id || 0) + 1);
  state.selectedId = state.items[0]?.id || null;
  renderAll(); saveSettings(); autosaveProject();
}
function downloadBlob(blob, fileName) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
async function copyQuote() {
  const s = getSettings(), t = calcTotals();
  const title = s.orderNo || s.clientName ? `Расчет ${s.orderNo ? '№' + s.orderNo : ''} ${s.clientName}`.trim() : 'Расчет DXF';
  const lines = [];
  lines.push(title);
  lines.push(`Позиций: ${state.items.length}; деталей: ${fmtNumber(t.qty,0)} шт`);
  lines.push(`Длина реза: ${fmtNumber(t.cut,2)} м; вес по габариту: ${fmtNumber(t.weight,1)} кг`);
  lines.push(`Себестоимость: ${fmtMoney(t.cost)}`);
  lines.push(`Сумма без НДС: ${fmtMoney(t.saleNoVat)}`);
  lines.push(`НДС ${fmtNumber(s.vatRate*100,0)}%: ${fmtMoney(t.vat)}`);
  lines.push(`Итого с НДС: ${fmtMoney(t.saleWithVat)}`);
  lines.push(`Маржа: ${fmtMoney(t.margin)} / ${fmtNumber(t.marginPct,1)}%`);
  lines.push('');
  for (const item of state.items) {
    const c = calcItem(item), g = getGeometry(item);
    lines.push(`- ${item.name}: ${fmtNumber(c.qty,0)} шт, t=${item.thickness} мм, ${fmtNumber(g.width,1)}×${fmtNumber(g.height,1)}, рез ${fmtNumber(g.cutLengthMm/1000,3)} м/шт — ${fmtMoney(saleToWithVat(c.sale,s))}`);
  }
  if (state.services.length) {
    lines.push(''); lines.push('Дополнительно:');
    for (const svc of state.services) lines.push(`- ${svc.name}: ${fmtMoney(saleToWithVat(num(svc.sale,0), s))}`);
  }
  const text = lines.join('\n');
  try { await navigator.clipboard.writeText(text); alert('КП скопировано.'); } catch (_) { prompt('Скопируй КП:', text); }
}
function clearAll() { if (!confirm('Очистить расчет?')) return; state.items = []; state.services = []; state.selectedId = null; renderAll(); autosaveProject(); }

function bindEvents() {
  els.btnSelectFiles.addEventListener('click', () => els.fileInput.click());
  els.btnSelectFolder.addEventListener('click', () => els.folderInput.click());
  els.fileInput.addEventListener('change', e => handleFiles(e.target.files));
  els.folderInput.addEventListener('change', e => handleFiles(e.target.files));
  els.btnAddManual.addEventListener('click', addManualItem);
  els.btnMergeDuplicates.addEventListener('click', mergeDuplicates);
  els.btnSaveProject.addEventListener('click', saveProject);
  els.btnLoadProject.addEventListener('click', () => els.projectFileInput.click());
  els.projectFileInput.addEventListener('change', e => e.target.files[0] && loadProjectFromFile(e.target.files[0]).catch(err => alert(`Не удалось загрузить проект: ${err.message || err}`)));
  els.btnExportCsv.addEventListener('click', exportCsv);
  els.btnCopyQuote.addEventListener('click', copyQuote);
  els.btnClear.addEventListener('click', clearAll);
  els.btnAddService.addEventListener('click', addService);
  for (const key of SETTINGS_KEYS) {
    if (!els[key]) continue;
    const handler = () => { saveSettings(); if (key === 'ignoreLayers') refreshAllDxfGeometry(); renderAll(); autosaveProject(); };
    els[key].addEventListener('input', handler);
    els[key].addEventListener('change', handler);
  }
  ['dragenter','dragover'].forEach(ev => els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.remove('drag'); }));
  els.dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
}

loadSettings();
bindEvents();
renderAll();
