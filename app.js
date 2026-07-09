'use strict';

const VERSION = '0.8';
const STORAGE_KEY = 'pm_dxf_calc_current_site_v08_settings';
const PRICE_KEY = 'pm_dxf_calc_current_site_v08_prices';
const PROJECT_KEY = 'pm_dxf_calc_current_site_v08_autosave';

const state = { items: [], services: [], layouts: [], orderCost: { material: 'Ст3', widthMm: 0, lengthMm: 0, thicknessMm: 3, sheets: 1, priceKg: 67, extraCost: 0 }, selectedId: null, nextId: 1, nextServiceId: 1, nextLayoutId: 1 };
let fillDrag = null;

const DEFAULT_PRICES = {
  materials: [
    { name: 'Ст3', density: 7850, prices: { '1': 75, '2': 70, '3': 67, '4': 67, '5': 67, '6': 67, '8': 69, '10': 70, '12': 72, '16': 75, '20': 78 } },
    { name: '09Г2С', density: 7850, prices: { '3': 78, '4': 78, '5': 78, '6': 78, '8': 80, '10': 82, '12': 85, '16': 90, '20': 95 } },
    { name: 'Нержавейка', density: 7900, prices: { '1': 260, '1.5': 250, '2': 245, '3': 240, '4': 250, '5': 260, '6': 270 } },
    { name: 'Оцинковка', density: 7850, prices: { '0.8': 105, '1': 100, '1.5': 95, '2': 90, '3': 90 } },
    { name: 'Алюминий', density: 2700, prices: { '1': 320, '2': 310, '3': 300, '4': 310, '5': 320, '6': 330 } },
  ],
  cut: { '1': 25, '2': 35, '3': 45, '4': 55, '5': 65, '6': 80, '8': 120, '10': 160, '12': 220, '16': 330, '20': 480 },
  bend: { '1': 40, '2': 60, '3': 80, '4': 100, '5': 130, '6': 160, '8': 250, '10': 350 },
  paint: { paintPriceM2: 500, paintCostM2: 0, powderConsumption: 0.15, powderPrice: 500, minPaint: 0 },
};
let prices = structuredClone(DEFAULT_PRICES);

const $ = (id) => document.getElementById(id);
const els = {
  fileInput: $('fileInput'), folderInput: $('folderInput'), projectFileInput: $('projectFileInput'), priceFileInput: $('priceFileInput'),
  dropzone: $('dropzone'), btnSelectFiles: $('btnSelectFiles'), btnSelectFolder: $('btnSelectFolder'),
  btnAddManual: $('btnAddManual'), btnMergeDuplicates: $('btnMergeDuplicates'), btnSaveProject: $('btnSaveProject'),
  btnLoadProject: $('btnLoadProject'), btnExportCsv: $('btnExportCsv'), btnCopyQuote: $('btnCopyQuote'), btnClear: $('btnClear'),
  btnAddService: $('btnAddService'), btnResetPrices: $('btnResetPrices'), btnExportPrices: $('btnExportPrices'), btnImportPrices: $('btnImportPrices'),
  btnAddMaterial: $('btnAddMaterial'), btnAddCutThickness: $('btnAddCutThickness'), btnAddBendThickness: $('btnAddBendThickness'),
  metalPriceEditor: $('metalPriceEditor'), cutPriceEditor: $('cutPriceEditor'), bendPriceEditor: $('bendPriceEditor'),
  itemsBody: $('itemsBody'), servicesBody: $('servicesBody'), previewBox: $('previewBox'), previewTitle: $('previewTitle'),
  editBox: $('editBox'), editTitle: $('editTitle'), logBox: $('logBox'),
  sumFiles: $('sumFiles'), sumQty: $('sumQty'), sumCut: $('sumCut'), sumWeight: $('sumWeight'), sumCost: $('sumCost'), sumTotal: $('sumTotal'), sumMargin: $('sumMargin'),
  orderNo: $('orderNo'), clientName: $('clientName'), defaultMaterial: $('defaultMaterial'), defaultThickness: $('defaultThickness'),
  vatRate: $('vatRate'), pricesIncludeVat: $('pricesIncludeVat'), metalFactor: $('metalFactor'), cutFactor: $('cutFactor'), piercePrice: $('piercePrice'), minCut: $('minCut'),
  bendFactor: $('bendFactor'), paintFactor: $('paintFactor'), paintPriceM2: $('paintPriceM2'), paintCostM2: $('paintCostM2'),
  powderConsumption: $('powderConsumption'), powderPrice: $('powderPrice'), minPaint: $('minPaint'), targetMargin: $('targetMargin'),
  addThicknessToBlank: $('addThicknessToBlank'), ignoreLayers: $('ignoreLayers'),
  quoteBody: $('quoteBody'), quoteTitle: $('quoteTitle'), quoteMeta: $('quoteMeta'), quoteTotalNoVat: $('quoteTotalNoVat'), quoteVat: $('quoteVat'), quoteTotal: $('quoteTotal'),
  productionBody: $('productionBody'), productionTitle: $('productionTitle'), productionMeta: $('productionMeta'),
  btnPrintQuote: $('btnPrintQuote'), btnPrintProduction: $('btnPrintProduction'), layoutFileInput: $('layoutFileInput'), btnAddLayout: $('btnAddLayout'), layoutsBody: $('layoutsBody'), calcDetails: $('calcDetails'),
  bulkField: $('bulkField'), bulkValue: $('bulkValue'), btnBulkApply: $('btnBulkApply'), btnBulkDown: $('btnBulkDown'),
};
const SETTINGS_KEYS = ['orderNo','clientName','defaultMaterial','defaultThickness','vatRate','pricesIncludeVat','metalFactor','cutFactor','piercePrice','minCut','bendFactor','paintFactor','addThicknessToBlank','ignoreLayers','targetMargin'];

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function num(v, fallback = 0) { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : fallback; }
function round(value, digits = 2) { const m = 10 ** digits; return Math.round((value + Number.EPSILON) * m) / m; }
function fmtNumber(value, digits = 2) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value || 0); }
function fmtMoney(value) { return `${fmtNumber(Math.round(value || 0), 0)} ₽`; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c])); }
function dateStamp() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`; }
function fileBaseName(fileName) { return String(fileName || '').replace(/\.[^.]+$/i, ''); }
function thicknessKey(t) { return String(round(num(t,0), 2)).replace(/\.0$/, ''); }
function sortedThicknessKeys(obj) { return Object.keys(obj || {}).sort((a,b)=>num(a)-num(b)); }
function nearestPrice(table, thickness, fallback = 0) {
  const keys = sortedThicknessKeys(table);
  if (!keys.length) return fallback;
  const tk = thicknessKey(thickness);
  if (Object.prototype.hasOwnProperty.call(table, tk)) return num(table[tk], fallback);
  let best = keys[0], bestDelta = Math.abs(num(keys[0]) - thickness);
  for (const k of keys) { const d = Math.abs(num(k) - thickness); if (d < bestDelta) { best = k; bestDelta = d; } }
  return num(table[best], fallback);
}
function materialRecord(name) { return prices.materials.find(m => m.name === name) || null; }
function materialNames() { return prices.materials.map(m => m.name); }
function materialOptionsHtml(selected) {
  const names = materialNames();
  const options = (selected && !names.includes(selected)) ? [selected, ...names] : names;
  return optionHtml(options, selected || options[0]);
}
function exactPrice(table, thickness, fallback = 0) {
  const key = thicknessKey(thickness);
  if (!table || !Object.prototype.hasOwnProperty.call(table, key)) return fallback;
  return num(table[key], fallback);
}
function hasExactPrice(table, thickness) {
  const key = thicknessKey(thickness);
  return Boolean(table && Object.prototype.hasOwnProperty.call(table, key) && table[key] !== '' && table[key] !== null && table[key] !== undefined);
}
function densityFor(item) { return num(materialRecord(item.material)?.density, 7850); }
function metalPriceFor(item) { const rec = materialRecord(item.material); return rec ? exactPrice(rec.prices, num(item.thickness,0), 0) : 0; }
function cutPriceFor(item) { return exactPrice(prices.cut, num(item.thickness,0), 0); }
function bendPriceFor(item) { return exactPrice(prices.bend, num(item.thickness,0), 0); }
function priceIssues(item) {
  const issues = [];
  const t = num(item.thickness, 0);
  const rec = materialRecord(item.material);
  if (!rec) issues.push(`Материал «${item.material || '—'}» отсутствует в базе цен.`);
  else if (item.ops?.metal && !hasExactPrice(rec.prices, t)) issues.push(`Нет цены металла ${rec.name} ${thicknessKey(t)} мм. Добавь толщину в базу цен.`);
  if (item.ops?.cut && !hasExactPrice(prices.cut, t)) issues.push(`Нет цены резки для толщины ${thicknessKey(t)} мм.`);
  if (num(item.bends, 0) > 0 && !hasExactPrice(prices.bend, t)) issues.push(`Нет цены гибки для толщины ${thicknessKey(t)} мм.`);
  return issues;
}

function loadPrices() {
  try {
    const raw = localStorage.getItem(PRICE_KEY);
    if (raw) prices = { ...clone(DEFAULT_PRICES), ...JSON.parse(raw) };
  } catch (_) { prices = clone(DEFAULT_PRICES); }
  if (!prices.materials || !prices.materials.length) prices.materials = clone(DEFAULT_PRICES.materials);
  if (!prices.cut) prices.cut = clone(DEFAULT_PRICES.cut);
  if (!prices.bend) prices.bend = clone(DEFAULT_PRICES.bend);
  if (!prices.paint) prices.paint = clone(DEFAULT_PRICES.paint);
}
function savePrices() { localStorage.setItem(PRICE_KEY, JSON.stringify(prices)); }
function syncPaintInputsFromPrices() {
  els.paintPriceM2.value = prices.paint.paintPriceM2 ?? 500;
  els.paintCostM2.value = prices.paint.paintCostM2 ?? 0;
  els.powderConsumption.value = prices.paint.powderConsumption ?? 0.15;
  els.powderPrice.value = prices.paint.powderPrice ?? 500;
  els.minPaint.value = prices.paint.minPaint ?? 0;
}
function syncPricesFromPaintInputs() {
  prices.paint.paintPriceM2 = num(els.paintPriceM2.value, 500);
  prices.paint.paintCostM2 = num(els.paintCostM2.value, 0);
  prices.paint.powderConsumption = num(els.powderConsumption.value, 0.15);
  prices.paint.powderPrice = num(els.powderPrice.value, 500);
  prices.paint.minPaint = num(els.minPaint.value, 0);
}
function renderMaterialSelects() {
  const names = materialNames();
  const current = els.defaultMaterial.value || names[0];
  els.defaultMaterial.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  els.defaultMaterial.value = names.includes(current) ? current : names[0];
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key of SETTINGS_KEYS) {
      if (saved[key] === undefined || !els[key]) continue;
      let value = saved[key]; if (key === 'vatRate' && num(value, 20) <= 1) value = num(value, 0.2) * 100; if (els[key].type === 'checkbox') els[key].checked = Boolean(value); else els[key].value = value;
    }
  } catch (_) {}
}
function saveSettings() {
  const data = {};
  for (const key of SETTINGS_KEYS) { if (!els[key]) continue; data[key] = els[key].type === 'checkbox' ? els[key].checked : els[key].value; }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function getSettings() {
  syncPricesFromPaintInputs();
  return {
    orderNo: els.orderNo.value.trim(), clientName: els.clientName.value.trim(), defaultMaterial: els.defaultMaterial.value,
    defaultThickness: num(els.defaultThickness.value, 3), vatRate: Math.max(0, num(els.vatRate.value, 20)) / 100,
    pricesIncludeVat: els.pricesIncludeVat.checked, metalFactor: num(els.metalFactor.value, 1), cutFactor: num(els.cutFactor.value, 1),
    piercePrice: num(els.piercePrice.value, 0), minCut: num(els.minCut.value, 0), bendFactor: num(els.bendFactor.value, 1),
    paintFactor: num(els.paintFactor.value, 1), addThicknessToBlank: els.addThicknessToBlank.checked, ignoreLayers: els.ignoreLayers.value,
    paintPriceM2: num(els.paintPriceM2.value, 0), paintCostM2: num(els.paintCostM2.value, 0), powderConsumption: num(els.powderConsumption.value, 0.15),
    powderPrice: num(els.powderPrice.value, 0), minPaint: num(els.minPaint.value, 0), targetMargin: num(els.targetMargin.value, 0),
  };
}
function saleToNoVat(amount, s) { return s.pricesIncludeVat ? amount / (1 + s.vatRate) : amount; }
function saleToWithVat(amount, s) { return s.pricesIncludeVat ? amount : amount * (1 + s.vatRate); }
function autosaveProject() { try { localStorage.setItem(PROJECT_KEY, JSON.stringify(makeProjectData())); } catch (_) {} }

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
  if (thickness == null) {
    const sheetMatch = clean.match(/(?:^|\s)(?:лист|пластина|s|т)\s*(\d+(?:[.,]\d+)?)(?=\s|$)/i);
    if (sheetMatch) thickness = num(sheetMatch[1], null);
  }
  return { name: clean, qty: qty || 1, thickness: thickness || getSettings().defaultThickness };
}

function dxfPairs(text) { const lines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n'); const pairs=[]; for(let i=0;i<lines.length-1;i+=2) pairs.push({code:lines[i].trim(), value:lines[i+1].trim()}); return pairs; }
function parseLayer(chunk) { const p = chunk.find(x => x.code === '8'); return p ? p.value : '0'; }
function chunkGet(chunk, code, fallback = 0) { const p = chunk.find(x => x.code === code); return p ? num(p.value, fallback) : fallback; }
function parseDxf(text) {
  const pairs = dxfPairs(text), warnings = [], entities = [];
  let inEntities = false;
  for (let i=0; i<pairs.length; i++) {
    const p = pairs[i];
    if (p.code === '0' && p.value === 'SECTION') { const n = pairs[i+1]; if (n && n.code === '2' && n.value.toUpperCase() === 'ENTITIES') { inEntities = true; i++; continue; } }
    if (!inEntities) continue;
    if (p.code === '0' && p.value === 'ENDSEC') break;
    if (p.code !== '0') continue;
    const type = p.value.toUpperCase();
    if (type === 'POLYLINE') { const parsed = parseClassicPolyline(pairs, i); if (parsed.entity) entities.push(parsed.entity); warnings.push(...parsed.warnings); i = parsed.nextIndex; continue; }
    if (['LINE','CIRCLE','ARC','LWPOLYLINE','SPLINE','ELLIPSE'].includes(type)) {
      const chunk=[]; let j=i+1; while(j<pairs.length && pairs[j].code !== '0') { chunk.push(pairs[j]); j++; }
      const entity = parseSimpleEntity(type, chunk, warnings); if (entity) entities.push(entity); i = j - 1;
    }
  }
  if (!entities.length) warnings.push('Не найдено поддерживаемых объектов: LINE / ARC / CIRCLE / LWPOLYLINE / POLYLINE.');
  return { entities, warnings };
}
function parseSimpleEntity(type, chunk, warnings) {
  const layer = parseLayer(chunk); const get = (code, fallback=0) => chunkGet(chunk, code, fallback);
  if (type === 'LINE') return { type, layer, p1:{x:get('10'), y:get('20')}, p2:{x:get('11'), y:get('21')} };
  if (type === 'CIRCLE') return { type, layer, c:{x:get('10'), y:get('20')}, r:Math.abs(get('40')) };
  if (type === 'ARC') return { type, layer, c:{x:get('10'), y:get('20')}, r:Math.abs(get('40')), a1:get('50'), a2:get('51') };
  if (type === 'LWPOLYLINE') {
    const flags = Math.trunc(get('70', 0)); const vertices=[]; let current=null;
    for (const p of chunk) { if (p.code === '10') { current={x:num(p.value), y:0, bulge:0}; vertices.push(current); } else if (p.code === '20' && current) current.y = num(p.value); else if (p.code === '42' && current) current.bulge = num(p.value); }
    return { type, layer, vertices, closed:Boolean(flags & 1) };
  }
  if (type === 'SPLINE') { const pts=[]; let current=null; for(const p of chunk){ if(p.code==='10'||p.code==='11'){current={x:num(p.value),y:0}; pts.push(current);} else if((p.code==='20'||p.code==='21')&&current) current.y=num(p.value); } warnings.push('Есть SPLINE: длина считается приближенно. Лучше конвертировать сплайны в дуги/полилинии.'); return { type, layer, points:pts }; }
  if (type === 'ELLIPSE') { warnings.push('Есть ELLIPSE: длина считается приближенно. Для резки лучше конвертировать в полилинию/дуги.'); return { type, layer, c:{x:get('10'),y:get('20')}, major:{x:get('11'),y:get('21')}, ratio:Math.abs(get('40',1)), start:get('41',0), end:get('42',Math.PI*2) }; }
  return null;
}
function parseClassicPolyline(pairs, startIndex) {
  const warnings=[]; const header=[]; let j=startIndex+1; while(j<pairs.length && pairs[j].code !== '0') { header.push(pairs[j]); j++; }
  const layer=parseLayer(header); const closed=Boolean(Math.trunc(chunkGet(header,'70',0)) & 1); const vertices=[];
  while(j<pairs.length) { const p=pairs[j]; if(p.code==='0' && p.value.toUpperCase()==='SEQEND') break; if(p.code==='0' && p.value.toUpperCase()==='VERTEX') { const chunk=[]; j++; while(j<pairs.length && pairs[j].code !== '0') { chunk.push(pairs[j]); j++; } vertices.push({x:chunkGet(chunk,'10'), y:chunkGet(chunk,'20'), bulge:chunkGet(chunk,'42',0)}); continue; } if(p.code==='0') break; j++; }
  if (vertices.length) return { entity:{ type:'POLYLINE', layer, vertices, closed }, warnings, nextIndex:j };
  warnings.push('POLYLINE без вершин не посчитана.'); return { entity:null, warnings, nextIndex:j };
}

function dist(a,b){ return Math.hypot(b.x-a.x, b.y-a.y); }
function degToRad(d){ return d*Math.PI/180; }
function normalizedArcDelta(a1,a2){ let d=a2-a1; while(d<0)d+=360; while(d>360)d-=360; return d; }
function entityLength(entity){ if(entity.type==='LINE') return dist(entity.p1,entity.p2); if(entity.type==='CIRCLE') return 2*Math.PI*entity.r; if(entity.type==='ARC') return entity.r*degToRad(normalizedArcDelta(entity.a1,entity.a2)); if(entity.type==='LWPOLYLINE'||entity.type==='POLYLINE') return polylineLength(entity.vertices,entity.closed); if(entity.type==='SPLINE') return polyPointsLength(entity.points,false); if(entity.type==='ELLIPSE') return polyPointsLength(ellipsePoints(entity),false); return 0; }
function polylineLength(vertices, closed){ if(!vertices||vertices.length<2)return 0; let len=0; const n=vertices.length, max=closed?n:n-1; for(let i=0;i<max;i++) len += bulgeSegmentLength(vertices[i], vertices[(i+1)%n], vertices[i].bulge||0); return len; }
function polyPointsLength(points, closed){ if(!points||points.length<2)return 0; let len=0; for(let i=0;i<points.length-1;i++) len+=dist(points[i],points[i+1]); if(closed) len+=dist(points[points.length-1],points[0]); return len; }
function bulgeSegmentLength(a,b,bulge){ const chord=dist(a,b); if(!bulge||Math.abs(bulge)<1e-9)return chord; const theta=Math.abs(4*Math.atan(bulge)); const s=Math.sin(theta/2); if(Math.abs(s)<1e-9)return chord; return chord/(2*s)*theta; }
function bulgeToPoints(a,b,bulge){ if(!bulge||Math.abs(bulge)<1e-9)return [a,b]; const chord=dist(a,b); if(chord<1e-9)return [a,b]; const theta=4*Math.atan(bulge); const ux=(b.x-a.x)/chord, uy=(b.y-a.y)/chord; const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; const d=chord/(2*Math.tan(theta/2)); const c={x:mid.x-uy*d,y:mid.y+ux*d}; const start=Math.atan2(a.y-c.y,a.x-c.x); const steps=Math.max(8,Math.min(96,Math.ceil(Math.abs(theta)/(Math.PI/18)))); const pts=[]; const r=dist(c,a); for(let i=0;i<=steps;i++){const t=start+theta*(i/steps); pts.push({x:c.x+Math.cos(t)*r,y:c.y+Math.sin(t)*r});} return pts; }
function circlePoints(c,r,count=96){ const pts=[]; for(let i=0;i<=count;i++){const t=Math.PI*2*i/count; pts.push({x:c.x+Math.cos(t)*r,y:c.y+Math.sin(t)*r});} return pts; }
function arcPoints(c,r,a1,a2){ const delta=normalizedArcDelta(a1,a2); const steps=Math.max(8,Math.min(96,Math.ceil(delta/10))); const pts=[]; for(let i=0;i<=steps;i++){ const a=degToRad(a1+delta*i/steps); pts.push({x:c.x+Math.cos(a)*r,y:c.y+Math.sin(a)*r}); } return pts; }
function ellipsePoints(entity){ const {c,major,ratio}=entity; const a=Math.hypot(major.x,major.y), angle=Math.atan2(major.y,major.x), b=a*ratio; let start=entity.start,end=entity.end; if(Math.abs(end-start)<1e-9)end=start+Math.PI*2; if(end<start)end+=Math.PI*2; const pts=[]; for(let i=0;i<=96;i++){ const t=start+(end-start)*i/96, x=Math.cos(t)*a, y=Math.sin(t)*b; pts.push({x:c.x+x*Math.cos(angle)-y*Math.sin(angle), y:c.y+x*Math.sin(angle)+y*Math.cos(angle)}); } return pts; }
function entityPoints(entity){ if(entity.type==='LINE')return [entity.p1,entity.p2]; if(entity.type==='CIRCLE')return circlePoints(entity.c,entity.r); if(entity.type==='ARC')return arcPoints(entity.c,entity.r,entity.a1,entity.a2); if(entity.type==='LWPOLYLINE'||entity.type==='POLYLINE'){ const pts=[]; const n=entity.vertices.length, max=entity.closed?n:n-1; for(let i=0;i<max;i++){ const seg=bulgeToPoints(entity.vertices[i],entity.vertices[(i+1)%n],entity.vertices[i].bulge||0); if(pts.length)seg.shift(); pts.push(...seg); } return pts; } if(entity.type==='SPLINE')return entity.points||[]; if(entity.type==='ELLIPSE')return ellipsePoints(entity); return []; }
function allSegments(entities){ const segments=[]; for(const e of entities){ const pts=entityPoints(e); for(let i=0;i<pts.length-1;i++) if(dist(pts[i],pts[i+1])>1e-7) segments.push([pts[i],pts[i+1],e.type]); } return segments; }
function keyPoint(p,tolerance=0.05){ return `${Math.round(p.x/tolerance)}:${Math.round(p.y/tolerance)}`; }
function segmentKey(a,b,tolerance=0.05){ const ka=keyPoint(a,tolerance), kb=keyPoint(b,tolerance); return ka<kb?`${ka}|${kb}`:`${kb}|${ka}`; }
function duplicateSegmentLength(segments){ const seen=new Map(); let dup=0; for(const [a,b] of segments){ const key=segmentKey(a,b,0.1), l=dist(a,b); if(seen.has(key))dup+=Math.min(l,seen.get(key)); else seen.set(key,l); } return dup; }
function openPolylineCount(entities){
  let c=0;
  const loose=[];
  for(const e of entities){
    if(e.type==='LINE') loose.push([e.p1,e.p2]);
    else if(e.type==='ARC'||e.type==='SPLINE') c++;
    else if((e.type==='LWPOLYLINE'||e.type==='POLYLINE')&&!e.closed) c++;
  }
  if(loose.length){
    const adj=new Map(), edgeCount=new Map();
    const add=(a,b)=>{ if(!adj.has(a))adj.set(a,new Set()); adj.get(a).add(b); edgeCount.set(a,(edgeCount.get(a)||0)+1); };
    for(const [a,b] of loose){ const ka=keyPoint(a), kb=keyPoint(b); add(ka,kb); add(kb,ka); }
    const visited=new Set();
    for(const node of adj.keys()){
      if(visited.has(node)) continue;
      const stack=[node], comp=[]; visited.add(node);
      while(stack.length){ const n=stack.pop(); comp.push(n); for(const nb of adj.get(n)||[]) if(!visited.has(nb)){ visited.add(nb); stack.push(nb); } }
      const closed = comp.length>=3 && comp.every(n => (edgeCount.get(n)||0) === 2);
      if(!closed) c++;
    }
  }
  return c;
}
function closedComponentsFromLooseLines(entities){ const loose=[]; for(const e of entities) if(e.type==='LINE') loose.push([e.p1,e.p2]); if(!loose.length)return 0; const adj=new Map(); const add=(a,b)=>{ if(!adj.has(a))adj.set(a,[]); adj.get(a).push(b); }; for(const [a,b] of loose){ const ka=keyPoint(a), kb=keyPoint(b); add(ka,kb); add(kb,ka); } const visited=new Set(); let loops=0; for(const node of adj.keys()){ if(visited.has(node))continue; const stack=[node], comp=[]; visited.add(node); while(stack.length){ const n=stack.pop(); comp.push(n); for(const nb of adj.get(n)||[]) if(!visited.has(nb)){visited.add(nb); stack.push(nb);} } if(comp.length>=3 && comp.every(n=>(adj.get(n)||[]).length===2)) loops++; } return loops; }
function ignoreLayerKeywords(){ return getSettings().ignoreLayers.split(/[;,]/).map(x=>x.trim().toUpperCase()).filter(Boolean); }
function filterEntitiesByLayer(entities){ const keys=ignoreLayerKeywords(); if(!keys.length)return entities.slice(); return entities.filter(e=>!keys.some(k=>String(e.layer||'').toUpperCase().includes(k))); }
function analyzeGeometry(entities){ const warnings=[]; const cutLength=entities.map(entityLength).reduce((a,b)=>a+b,0); const pts=entities.flatMap(entityPoints); let bbox={minX:0,minY:0,maxX:0,maxY:0,width:0,height:0}; if(pts.length){ const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y); bbox={minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}; } let pierces=0; for(const e of entities){ if(e.type==='CIRCLE')pierces++; else if((e.type==='LWPOLYLINE'||e.type==='POLYLINE')&&e.closed)pierces++; else if(e.type==='ELLIPSE')pierces++; } pierces+=closedComponentsFromLooseLines(entities); const duplicateLength=duplicateSegmentLength(allSegments(entities)); if(duplicateLength>0.5) warnings.push(`Возможны двойные линии: примерно ${round(duplicateLength,1)} мм совпадающего реза.`); const openCount=openPolylineCount(entities); if(openCount) warnings.push(`Есть незамкнутые линии/дуги/полилинии: ${openCount} шт. Проверь, это рез или вспомогательная геометрия.`); const layers=[...new Set(entities.map(e=>e.layer||'0'))].sort(); return { cutLength,bbox,pierces,duplicateLength,warnings,layers,segments:allSegments(entities) }; }
function refreshDxfGeometry(item){ if(!item.rawEntities)return; item.entities=filterEntitiesByLayer(item.rawEntities); const analysis=analyzeGeometry(item.entities); item.analysis=analysis; if(!item.geometryOverridden){ item.geometry={ width:analysis.bbox.width, height:analysis.bbox.height, cutLengthMm:analysis.cutLength, pierces:analysis.pierces }; item.paintAreaM2One=defaultPaintArea(item); } item.warnings=[...(item.rawWarnings||[]),...analysis.warnings]; const ignoredCount=item.rawEntities.length-item.entities.length; if(ignoredCount>0)item.warnings.push(`Игнорировано объектов по слоям: ${ignoredCount} шт.`); }
function refreshAllDxfGeometry(){ for(const item of state.items) refreshDxfGeometry(item); detectDuplicates(); }

function defaultOps(){ return { metal:true, cut:true, bend:false, paint:false, weld:false }; }
function defaultPaintArea(item){ const g=item.geometry||{width:0,height:0}; return round((Math.max(0,g.width)*Math.max(0,g.height)/1_000_000)*2,4); }
function normalizeItem(item) {
  const s = getSettings();
  item.ops = { ...defaultOps(), ...(item.ops || {}) };
  item.qty = num(item.qty, 1);
  item.thickness = num(item.thickness, s.defaultThickness || 3);
  item.material = item.material || s.defaultMaterial || materialNames()[0] || 'Ст3';
  item.bends = num(item.bends, 0);
  item.bendLengthMm = num(item.bendLengthMm, 0);
  if (item.paintLayers === undefined || item.paintLayers === null) item.paintLayers = item.ops.paint ? 1 : 0;
  item.paintLayers = Math.max(0, Math.min(2, Math.trunc(num(item.paintLayers, 0))));
  item.ops.bend = item.bends > 0;
  item.ops.paint = item.paintLayers > 0;
  item.ral = item.ral || '';
  item.paintTexture = item.paintTexture || '';
  item.serviceText = item.serviceText || '';
  item.productionNote = item.productionNote || '';
  item.note = item.note || '';
  if (item.metalFactor === undefined) item.metalFactor = num(s.metalFactor, 1.2);
  if (item.cutFactor === undefined) item.cutFactor = num(s.cutFactor, 2);
  if (item.bendFactor === undefined) item.bendFactor = num(s.bendFactor, 1);
  if (item.paintFactor === undefined) item.paintFactor = num(s.paintFactor, 1);
  if (item.factMetalKg === undefined) item.factMetalKg = 0;
  if (item.metalCostKg === undefined) item.metalCostKg = 0;
  if (item.cutCostTotal === undefined) item.cutCostTotal = 0;
  if (item.bendCostTotal === undefined) item.bendCostTotal = 0;
  if (item.paintCostManual === undefined) item.paintCostManual = 0;
  if (item.weldPriceOne === undefined) item.weldPriceOne = 0;
  if (item.weldCostOne === undefined) item.weldCostOne = 0;
  if (item.customPriceOne === undefined) item.customPriceOne = 0;
  if (item.customCostOne === undefined) item.customCostOne = 0;
  return item;
}
function makeItem({source,fileName='',name='',qty=1,material=null,thickness=null,rawEntities=null,rawWarnings=[]}){
  const s=getSettings();
  const item={ id:state.nextId++, source, fileName, name:name||'Ручная позиция', qty, material:material||s.defaultMaterial, thickness:thickness||s.defaultThickness, rawEntities, rawWarnings, entities:[], analysis:null, warnings:[], geometry:{width:0,height:0,cutLengthMm:0,pierces:0}, geometryOverridden:false, ops:defaultOps(), bends:0, bendLengthMm:0, paintLayers:0, paintAreaM2One:0, ral:'', paintTexture:'', weldPriceOne:0, weldCostOne:0, customPriceOne:0, customCostOne:0, serviceText:'', productionNote:'', note:'' };
  normalizeItem(item);
  if(rawEntities)refreshDxfGeometry(item); else { item.analysis={bbox:{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0},cutLength:0,pierces:0,warnings:[],layers:[],segments:[]}; }
  return item;
}
function getGeometry(item){ return item.geometry||{width:0,height:0,cutLengthMm:0,pierces:0}; }
function calcItem(item){
  normalizeItem(item);
  const s=getSettings();
  const qty=Math.max(0,num(item.qty,0)), t=Math.max(0,num(item.thickness,0)), g=getGeometry(item);
  const blankX=Math.max(0,num(g.width,0))+(s.addThicknessToBlank?t:0), blankY=Math.max(0,num(g.height,0))+(s.addThicknessToBlank?t:0);
  const areaM2One=blankX*blankY/1_000_000;
  const weightOne=areaM2One*(t/1000)*densityFor(item);
  const weightTotal=weightOne*qty;
  const cutMTotal=Math.max(0,num(g.cutLengthMm,0))/1000*qty;
  const piercesTotal=Math.max(0,num(g.pierces,0))*qty;
  const bendMTotal=Math.max(0,num(item.bends,0))*Math.max(0,num(item.bendLengthMm,0))/1000*qty;
  const paintLayers=Math.max(0, Math.min(2, Math.trunc(num(item.paintLayers,0))));
  const paintAreaTotal=paintLayers>0?Math.max(0,num(item.paintAreaM2One,0))*qty*paintLayers:0;
  const metalRate=metalPriceFor(item), cutRate=cutPriceFor(item), bendRate=bendPriceFor(item);
  const metalFactor=num(item.metalFactor, s.metalFactor || 1);
  const cutFactor=num(item.cutFactor, s.cutFactor || 1);
  const bendFactor=num(item.bendFactor, s.bendFactor || 1);
  const paintFactor=num(item.paintFactor, s.paintFactor || 1);
  const metalSale=item.ops.metal?weightTotal*metalRate*metalFactor:0;
  const metalCostKg=num(item.metalCostKg,0) || metalRate;
  const metalCost=item.ops.metal?(num(item.factMetalKg,0)>0?num(item.factMetalKg,0)*metalCostKg:0):0;
  const cutSale=item.ops.cut?cutMTotal*cutRate*cutFactor+piercesTotal*num(s.piercePrice,0):0;
  const cutCost=num(item.cutCostTotal,0);
  const bendSale=item.bends>0?bendMTotal*bendRate*bendFactor:0;
  const bendCost=num(item.bendCostTotal,0);
  const paintSale=paintLayers>0?paintAreaTotal*num(s.paintPriceM2,0)*paintFactor:0;
  const autoPowderCost=paintLayers>0?paintAreaTotal*num(s.powderConsumption,0.15)*num(s.powderPrice,0):0;
  const autoPaintWorkCost=paintLayers>0?paintAreaTotal*num(s.paintCostM2,0):0;
  const paintCost=num(item.paintCostManual,0)>0?num(item.paintCostManual,0):(autoPowderCost+autoPaintWorkCost);
  const weldSale=Math.max(0,num(item.weldPriceOne,0))*qty;
  const weldCost=Math.max(0,num(item.weldCostOne,0))*qty;
  const customSale=Math.max(0,num(item.customPriceOne,0))*qty;
  const customCost=Math.max(0,num(item.customCostOne,0))*qty;
  const sale=metalSale+cutSale+bendSale+paintSale+weldSale+customSale;
  const cost=metalCost+cutCost+bendCost+paintCost+weldCost+customCost;
  return {qty,t,blankX,blankY,areaM2One,weightOne,weightTotal,cutMTotal,piercesTotal,bendMTotal,paintLayers,paintAreaTotal,metalRate,cutRate,bendRate,metalFactor,cutFactor,bendFactor,paintFactor,metalSale,metalCost,metalCostKg,cutSale,cutCost,bendSale,bendCost,paintSale,paintCost,powderCost:autoPowderCost,weldSale,weldCost,customSale,customCost,sale,cost};
}
function calcServices(){ const s=getSettings(); const sale=state.services.reduce((a,x)=>a+Math.max(0,num(x.sale,0)),0); const cost=state.services.reduce((a,x)=>a+Math.max(0,num(x.cost,0)),0); return {sale,cost,saleNoVat:saleToNoVat(sale,s),saleWithVat:saleToWithVat(sale,s)}; }
function calcOrderCost(){
  const oc = state.orderCost || {};
  const material = oc.material || getSettings().defaultMaterial || 'Ст3';
  const rec = materialRecord(material);
  const density = num(rec?.density, 7850);
  const widthMm = Math.max(0, num(oc.widthMm, 0));
  const lengthMm = Math.max(0, num(oc.lengthMm, 0));
  const thicknessMm = Math.max(0, num(oc.thicknessMm, 0));
  const sheets = Math.max(0, num(oc.sheets, 1));
  const basePriceKg = rec && hasExactPrice(rec.prices, thicknessMm) ? exactPrice(rec.prices, thicknessMm, 0) : 0;
  const priceKg = Math.max(0, num(oc.priceKg, 0) || basePriceKg);
  const priceIssue = !rec ? `Материал «${material}» отсутствует в базе цен.` : (!basePriceKg && thicknessMm > 0 ? `Нет цены металла ${material} ${thicknessKey(thicknessMm)} мм в базе цен.` : '');
  const metalKg = widthMm * lengthMm * thicknessMm / 1_000_000_000 * density * sheets;
  const metalCost = metalKg * priceKg;
  const extraCost = Math.max(0, num(oc.extraCost, 0));
  return { material, density, widthMm, lengthMm, thicknessMm, sheets, priceKg, basePriceKg, priceIssue, metalKg, metalCost, extraCost, cost: metalCost + extraCost };
}
function calcTotals(){ const s=getSettings(); const items=state.items.reduce((acc,item)=>{ const c=calcItem(item); acc.qty+=c.qty; acc.cut+=c.cutMTotal; acc.weight+=c.weightTotal; acc.sale+=c.sale; return acc; },{qty:0,cut:0,weight:0,sale:0}); const svc=calcServices(); const oc=calcOrderCost(); const saleRaw=items.sale+svc.sale, cost=oc.cost+svc.cost, saleNoVat=saleToNoVat(saleRaw,s), saleWithVat=saleToWithVat(saleRaw,s), vat=Math.max(0,saleWithVat-saleNoVat), costKnown=cost>0, margin=costKnown?saleNoVat-cost:0, marginPct=(costKnown&&saleNoVat>0)?margin/saleNoVat*100:null; return {...items,serviceSale:svc.sale,serviceCost:svc.cost,orderMetalCost:oc.metalCost,orderExtraCost:oc.extraCost,orderMetalKg:oc.metalKg,saleRaw,saleNoVat,saleWithVat,vat,cost,costKnown,margin,marginPct}; }

async function handleFiles(files){ const list=[...files].filter(f=>f.name.toLowerCase().endsWith('.dxf')); if(!list.length)return; for(const file of list){ try{ const text=await file.text(); const meta=parseFilename(file.name); const parsed=parseDxf(text); const item=makeItem({source:'dxf',fileName:file.webkitRelativePath||file.name,name:meta.name,qty:meta.qty,thickness:meta.thickness,rawEntities:parsed.entities,rawWarnings:parsed.warnings}); item.rawSize=file.size; state.items.push(item); } catch(err){ const item=makeItem({source:'manual',fileName:file.name,name:file.name,qty:1}); item.warnings.push(`Ошибка чтения DXF: ${err.message||err}`); state.items.push(item); } } detectDuplicates(); if(!state.selectedId&&state.items.length)state.selectedId=state.items[0].id; renderAll(); autosaveProject(); }
function detectDuplicates(){ for(const item of state.items)item.duplicateKey=''; const map=new Map(); for(const item of state.items){ const g=getGeometry(item); const key=`${round(g.width,1)}x${round(g.height,1)}|${round(g.cutLengthMm,1)}|${round(g.pierces,0)}|${item.thickness}|${item.material}`; item.duplicateKey=key; if(!map.has(key))map.set(key,[]); map.get(key).push(item); } for(const group of map.values()){ if(group.length>1){ const names=group.map(g=>g.name).join(', '); for(const item of group){ const msg=`Похожа на другие детали: ${names}. Можно объединить количество, если геометрия совпадает.`; if(!item.warnings.includes(msg))item.warnings.push(msg); } } } }
function mergeDuplicates(){ detectDuplicates(); const groups=new Map(); for(const item of state.items){ if(!groups.has(item.duplicateKey))groups.set(item.duplicateKey,[]); groups.get(item.duplicateKey).push(item); } const merged=[]; let mergedCount=0; for(const group of groups.values()){ const first=group[0]; if(group.length>1){ first.qty=group.reduce((a,x)=>a+num(x.qty,0),0); first.name=`${first.name} / объединено ${group.length} поз.`; first.note=`${first.note||''}\nОбъединено: ${group.map(x=>x.fileName||x.name).join('; ')}`.trim(); first.warnings=first.warnings.filter(w=>!w.startsWith('Похожа на другие детали')); mergedCount+=group.length-1; } merged.push(first); } state.items=merged; if(mergedCount)alert(`Объединено дублей: ${mergedCount}`); renderAll(); autosaveProject(); }

function renderAll(){ renderMaterialSelects(); renderPriceEditors(); renderTable(); renderSummary(); renderLog(); renderServices(); renderQuote(); renderProduction(); renderCalcDetails(); renderLayouts(); const has=state.items.length>0; els.btnExportCsv.disabled=!has; els.btnSaveProject.disabled=!has&&!state.services.length&&!state.layouts.length; els.btnClear.disabled=!has&&!state.services.length&&!state.layouts.length; els.btnCopyQuote.disabled=!has&&!state.services.length; els.btnMergeDuplicates.disabled=state.items.length<2; }
function renderSummary(){ const t=calcTotals(); els.sumFiles.textContent=state.items.length; els.sumQty.textContent=fmtNumber(t.qty,0); els.sumCut.textContent=`${fmtNumber(t.cut,2)} м`; els.sumWeight.textContent=`${fmtNumber(t.weight,1)} кг`; els.sumCost.textContent=t.costKnown?fmtMoney(t.cost):'не заполнено'; els.sumTotal.textContent=fmtMoney(t.saleWithVat); els.sumMargin.textContent=t.costKnown?`${fmtMoney(t.margin)} / ${fmtNumber(t.marginPct,1)}%`:'—'; }
function itemStatus(item){ const pi=priceIssues(item); if(pi.length)return ['bad',`${pi.length} цена`]; if(!item.rawEntities&&item.source==='dxf')return ['bad','ошибка']; if(item.warnings&&item.warnings.length)return ['warn',`${item.warnings.length} замеч.`]; return ['ok','OK']; }
function optionHtml(options, selected){ return options.map(v=>`<option value="${escapeHtml(v)}" ${String(v)===String(selected)?'selected':''}>${escapeHtml(v)}</option>`).join(''); }
function inputVal(v){ return (v === undefined || v === null || v === 0 || v === '0') ? '' : String(v); }
function yesNo(v){ return v ? 'Да' : '—'; }
function paintInfo(item){ const txt=[item.ral, item.paintTexture].map(x=>String(x||'').trim()).filter(Boolean).join(' '); return txt || '—'; }
function renderTable(){
  if(!state.items.length){ els.itemsBody.innerHTML='<tr class="empty-row"><td colspan="18">Файлы пока не загружены.</td></tr>'; return; }
  els.itemsBody.innerHTML='';
  const mats=materialNames();
  for(const item of state.items){
    normalizeItem(item);
    const c=calcItem(item), g=getGeometry(item), [st,txt]=itemStatus(item);
    const tr=document.createElement('tr'); tr.dataset.id=item.id; if(item.id===state.selectedId)tr.classList.add('selected'); if(priceIssues(item).length)tr.classList.add('price-error-row');
    tr.innerHTML=`
      <td class="select-cell"><input type="checkbox" data-row-select ${item.bulkSelected?'checked':''}></td>
      <td class="small-preview">${makeSvg(item)}</td>
      <td class="name-cell"><input class="cell-input name-input" data-pos-field="name" value="${escapeHtml(item.name)}"><div class="file-meta">${escapeHtml(item.fileName||item.source)}</div></td>
      <td><input class="cell-input tiny" data-pos-field="qty" type="number" step="1" min="0" value="${item.qty}"></td>
      <td><select class="cell-input material-select" data-pos-field="material">${materialOptionsHtml(item.material)}</select></td>
      <td><input class="cell-input tiny" data-pos-field="thickness" type="number" step="0.1" min="0" value="${item.thickness}"></td>
      <td class="nowrap">${fmtNumber(g.width,1)}×${fmtNumber(g.height,1)}</td>
      <td><input type="checkbox" data-pos-field="cut" ${item.ops.cut?'checked':''}></td>
      <td><input class="cell-input tiny" data-pos-field="bends" type="number" step="1" min="0" value="${num(item.bends,0)}"></td>
      <td><input class="cell-input small-num" data-pos-field="bendLengthMm" type="number" step="1" min="0" value="${num(item.bendLengthMm,0)}"></td>
      <td><input class="cell-input tiny" data-pos-field="paintLayers" type="number" step="1" min="0" max="2" value="${num(item.paintLayers,0)}"></td>
      <td><input class="cell-input ral-input" data-pos-field="ral" placeholder="RAL" value="${escapeHtml(item.ral||'')}"></td>
      <td><input class="cell-input ral-input" data-pos-field="paintTexture" placeholder="муар" value="${escapeHtml(item.paintTexture||'')}"></td>
      <td><input class="cell-input small-num" data-pos-field="weldPriceOne" type="number" step="1" min="0" value="${inputVal(item.weldPriceOne)}"></td>
      <td><input class="cell-input service-input" data-pos-field="serviceText" placeholder="текст" value="${escapeHtml(item.serviceText||'')}"></td>
      <td><input class="cell-input note-input" data-pos-field="productionNote" placeholder="примечание" value="${escapeHtml(item.productionNote||'')}"></td>
      <td><span class="money">${fmtMoney(c.sale)}</span></td>
      <td><span class="status-${st}" title="${escapeHtml([...priceIssues(item), ...(item.warnings||[])].join('\n'))}">${txt}</span></td>`;
    tr.addEventListener('click',(e)=>{ if(e.target.closest('input,select,textarea,button')) return; state.selectedId=item.id; renderAll(); });
    els.itemsBody.appendChild(tr);
  }
  bindPositionTableEvents();
  installFillHandles(els.itemsBody);
}
function bindPositionTableEvents(){
  els.itemsBody.querySelectorAll('tr[data-id]').forEach(tr=>{
    const item=state.items.find(x=>x.id===num(tr.dataset.id)); if(!item)return;
    const sel=tr.querySelector('[data-row-select]'); if(sel) sel.addEventListener('change',()=>{ item.bulkSelected=sel.checked; });
    tr.querySelectorAll('[data-pos-field]').forEach(input=>{
      const handler=()=>{
        const f=input.dataset.posField;
        if(f==='cut') item.ops.cut=input.checked;
        else if(['qty','thickness','bends','bendLengthMm','paintLayers','weldPriceOne'].includes(f)) item[f]=num(input.value,0);
        else item[f]=input.value;
        if(f==='bends') item.ops.bend=num(item.bends,0)>0;
        if(f==='paintLayers') item.ops.paint=num(item.paintLayers,0)>0;
        if(f==='thickness'||f==='material') detectDuplicates();
        state.selectedId=item.id;
        renderAll(); autosaveProject();
      };
      input.addEventListener(input.type==='checkbox'?'change':'change', handler);
    });
  });
}

function installFillHandles(root){
  if (!root) return;
  root.querySelectorAll('[data-pos-field], [data-calc-field]').forEach(ctrl => {
    const td = ctrl.closest('td');
    if (!td || td.querySelector(':scope > .fill-handle')) return;
    td.classList.add('editable-cell');
    const handle = document.createElement('span');
    handle.className = 'fill-handle no-print';
    handle.textContent = '+';
    handle.title = 'Протянуть значение вниз';
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const tr = ctrl.closest('tr[data-id]');
      if (!tr) return;
      fillDrag = { sourceId: num(tr.dataset.id), targetId: num(tr.dataset.id), field: ctrl.dataset.posField || ctrl.dataset.calcField, mode: ctrl.dataset.posField ? 'pos' : 'calc', value: ctrl.type === 'checkbox' ? ctrl.checked : ctrl.value };
      document.body.classList.add('is-fill-dragging');
    });
    td.appendChild(handle);
  });
  root.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('pointerenter', () => {
      if (!fillDrag) return;
      fillDrag.targetId = num(tr.dataset.id);
      root.querySelectorAll('tr.fill-target').forEach(x => x.classList.remove('fill-target'));
      const a = state.items.findIndex(x => x.id === fillDrag.sourceId);
      const b = state.items.findIndex(x => x.id === fillDrag.targetId);
      if (a < 0 || b < 0) return;
      const from = Math.min(a,b), to = Math.max(a,b);
      for (let i=from; i<=to; i++) root.querySelector(`tr[data-id="${state.items[i].id}"]`)?.classList.add('fill-target');
    });
  });
}
function finishFillDrag(){
  if (!fillDrag) return;
  const {sourceId,targetId,field,mode,value} = fillDrag;
  fillDrag = null;
  document.body.classList.remove('is-fill-dragging');
  document.querySelectorAll('tr.fill-target').forEach(x => x.classList.remove('fill-target'));
  const a = state.items.findIndex(x => x.id === sourceId), b = state.items.findIndex(x => x.id === targetId);
  if (a < 0 || b < 0) return;
  const from = Math.min(a,b), to = Math.max(a,b);
  for (let i=from; i<=to; i++) {
    const item = state.items[i];
    if (mode === 'pos') bulkValueToField(item, field, value);
    else applyCalcField(item, field, value);
  }
  detectDuplicates(); renderAll(); autosaveProject();
}
document.addEventListener('pointerup', finishFillDrag);

function bulkValueToField(item, field, value){
  if(!field)return;
  if(field==='cut') item.ops.cut = /^(да|yes|true|1)$/i.test(String(value).trim());
  else if(['qty','thickness','bends','bendLengthMm','paintLayers','weldPriceOne','metalFactor','cutFactor','bendFactor','paintFactor'].includes(field)) item[field]=num(value,0);
  else item[field]=value;
  if(field==='bends') item.ops.bend=num(item.bends,0)>0;
  if(field==='paintLayers') item.ops.paint=num(item.paintLayers,0)>0;
}
function applyBulk(down=false){
  const field=els.bulkField?.value, value=els.bulkValue?.value;
  if(!field)return;
  let targets=[];
  if(down){
    const start=state.items.findIndex(x=>x.id===state.selectedId);
    targets=start>=0?state.items.slice(start):[];
  } else targets=state.items.filter(x=>x.bulkSelected);
  if(!targets.length) return alert(down?'Выбери строку, откуда применять вниз.':'Отметь строки галочками.');
  targets.forEach(item=>bulkValueToField(item, field, value));
  detectDuplicates(); renderAll(); autosaveProject();
}
function selectedItem(){ return state.items.find(x=>x.id===state.selectedId)||null; }
function renderPreview(){ const item=selectedItem(); if(!item){ els.previewTitle.textContent='Нет выбранной детали'; els.previewBox.innerHTML='<div class="preview-empty">Выбери строку в таблице.</div>'; return; } const g=getGeometry(item); els.previewTitle.textContent=`${fmtNumber(g.width,1)} × ${fmtNumber(g.height,1)} мм / ${fmtNumber(g.cutLengthMm/1000,3)} м`; els.previewBox.innerHTML=makeSvg(item); }
function makeSvg(item){ if(item.entities&&item.entities.length&&item.analysis&&item.analysis.bbox.width+item.analysis.bbox.height>0)return makeEntitySvg(item); if(item.previewSvg)return item.previewSvg; return makeManualSvg(item); }
function makeManualSvg(item){ const g=getGeometry(item), w=Math.max(1,num(g.width,100)), h=Math.max(1,num(g.height,100)), pad=Math.max(w,h)*0.08+20; return `<svg viewBox="${-pad} ${-pad} ${w+pad*2} ${h+pad*2}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#0f172a" stroke-width="1.6" vector-effect="non-scaling-stroke"/><text x="${w/2}" y="${h/2}" text-anchor="middle" dominant-baseline="middle" font-size="18" fill="#64748b">ручная позиция</text></svg>`; }
function makeEntitySvg(item){ const bbox=item.analysis.bbox, pad=Math.max(bbox.width,bbox.height)*0.06+20, minX=bbox.minX-pad, minY=bbox.minY-pad, width=Math.max(1,bbox.width+pad*2), height=Math.max(1,bbox.height+pad*2); const paths=[]; for(const e of item.entities){ const pts=entityPoints(e); if(pts.length<2)continue; const d=pts.map((p,i)=>`${i?'L':'M'} ${round(p.x,3)} ${round(p.y,3)}`).join(' '); const close=(e.type==='CIRCLE'||e.type==='ELLIPSE'||((e.type==='LWPOLYLINE'||e.type==='POLYLINE')&&e.closed))?' Z':''; paths.push(`<path d="${d}${close}" vector-effect="non-scaling-stroke" />`); } return `<svg viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="DXF preview"><g transform="scale(1,-1) translate(0,${-(bbox.minY+bbox.maxY)})"><rect x="${bbox.minX}" y="${bbox.minY}" width="${bbox.width}" height="${bbox.height}" fill="none" stroke="#93c5fd" stroke-dasharray="8 6" vector-effect="non-scaling-stroke"/><g fill="none" stroke="#0f172a" stroke-width="1.6">${paths.join('\n')}</g></g></svg>`; }
function renderEditor(){
  const item=selectedItem();
  if(!item){ els.editTitle.textContent='нет выбранной'; els.editBox.classList.add('muted-box'); els.editBox.innerHTML='Выбери позицию в таблице.'; return; }
  item.ops={...defaultOps(), ...(item.ops||{})};
  item.ral=item.ral||''; item.paintTexture=item.paintTexture||''; item.serviceText=item.serviceText||''; item.productionNote=item.productionNote||'';
  els.editBox.classList.remove('muted-box'); els.editTitle.textContent=item.name;
  const g=getGeometry(item), c=calcItem(item);
  els.editBox.innerHTML=`
    <div class="editor-grid">
      <label>Название<input data-edit="name" value="${escapeHtml(item.name)}"></label>
      <label>Количество<input data-edit="qty" type="number" step="1" min="0" value="${item.qty}"></label>
      <label>Материал<select data-edit="material">${materialNames().map(m=>`<option value="${escapeHtml(m)}" ${m===item.material?'selected':''}>${escapeHtml(m)}</option>`).join('')}</select></label>
      <label>Толщина, мм<input data-edit="thickness" type="number" step="0.1" min="0" value="${item.thickness}"></label>
      <label>Габарит X, мм<input data-geom="width" type="number" step="0.1" min="0" value="${round(g.width,2)}"></label>
      <label>Габарит Y, мм<input data-geom="height" type="number" step="0.1" min="0" value="${round(g.height,2)}"></label>
      <label>Длина реза, мм<input data-geom="cutLengthMm" type="number" step="0.1" min="0" value="${round(g.cutLengthMm,2)}"></label>
      <label>Врезки<input data-geom="pierces" type="number" step="1" min="0" value="${round(g.pierces,0)}"></label>
      <label>Кол-во гибов<input data-edit="bends" type="number" step="1" min="0" value="${num(item.bends,0)}"></label>
      <label>Длина гиба, мм<input data-edit="bendLengthMm" type="number" step="0.1" min="0" value="${num(item.bendLengthMm,0)}"></label>
      <label>Площадь покраски 1 шт, м²<input data-edit="paintAreaM2One" type="number" step="0.001" min="0" value="${num(item.paintAreaM2One,0)}"></label>
      <label>RAL<input data-edit="ral" placeholder="RAL 9005" value="${escapeHtml(item.ral||'')}"></label>
      <label>Текстура<input data-edit="paintTexture" placeholder="муар / шагрень / глянец" value="${escapeHtml(item.paintTexture||'')}"></label>
      <label>Сварка, ₽/шт<input data-edit="weldPriceOne" type="number" step="1" min="0" value="${num(item.weldPriceOne,0)}"></label>
      <label>Доп. продажа / шт<input data-edit="customPriceOne" type="number" step="1" min="0" value="${num(item.customPriceOne,0)}"></label>
      <label>Доп. себест. / шт<input data-edit="customCostOne" type="number" step="1" min="0" value="${num(item.customCostOne,0)}"></label>
    </div>
    <div class="op-grid">
      <label class="checkline"><input data-op="metal" type="checkbox" ${item.ops.metal?'checked':''}> металл</label>
      <label class="checkline"><input data-op="cut" type="checkbox" ${item.ops.cut?'checked':''}> резка</label>
      <label class="checkline"><input data-op="bend" type="checkbox" ${item.ops.bend?'checked':''}> гибка</label>
      <label class="checkline"><input data-op="paint" type="checkbox" ${item.ops.paint?'checked':''}> полимерка</label>
      <label class="checkline"><input data-op="weld" type="checkbox" ${item.ops.weld?'checked':''}> сварка</label>
    </div>
    <div class="calc-note"><b>Подставлено из базы:</b> металл ${fmtNumber(c.metalRate,2)} ₽/кг · резка ${fmtNumber(c.cutRate,2)} ₽/м · гибка ${fmtNumber(c.bendRate,2)} ₽/м<br><b>Итого позиция:</b> продажа ${fmtMoney(c.sale)}, себестоимость ${fmtMoney(c.cost)}, вес ${fmtNumber(c.weightTotal,2)} кг</div>
    <label class="wide-label">Доп. услуги в производстве<textarea data-edit="serviceText" rows="2" placeholder="метизы, сборка, упаковка...">${escapeHtml(item.serviceText||'')}</textarea></label>
    <label class="wide-label">Примечание в производство<textarea data-edit="productionNote" rows="2">${escapeHtml(item.productionNote||'')}</textarea></label>
    <label class="wide-label">Внутренняя заметка<textarea data-edit="note" rows="2">${escapeHtml(item.note||'')}</textarea></label>
    <div class="editor-actions"><button class="secondary small" id="btnRecalcDxf" ${item.rawEntities?'':'disabled'}>Вернуть геометрию из DXF</button><button class="danger small" id="btnDeleteItem">Удалить позицию</button></div>`;
  els.editBox.querySelectorAll('[data-edit]').forEach(input=>input.addEventListener('input',()=>{ const k=input.dataset.edit; if(input.type==='number') item[k]=num(input.value,0); else item[k]=input.value; if(k==='material'||k==='thickness') detectDuplicates(); renderTable(); renderSummary(); renderQuote(); renderProduction(); renderCalcDetails(); autosaveProject(); }));
  els.editBox.querySelectorAll('[data-geom]').forEach(input=>input.addEventListener('input',()=>{ item.geometry[input.dataset.geom]=num(input.value,0); item.geometryOverridden=true; if(input.dataset.geom==='width'||input.dataset.geom==='height') item.paintAreaM2One=defaultPaintArea(item); renderAll(); autosaveProject(); }));
  els.editBox.querySelectorAll('[data-op]').forEach(input=>input.addEventListener('change',()=>{ item.ops[input.dataset.op]=input.checked; renderAll(); autosaveProject(); }));
  const recalc=$('btnRecalcDxf'); if(recalc) recalc.addEventListener('click',()=>{ item.geometryOverridden=false; refreshDxfGeometry(item); renderAll(); autosaveProject(); });
  $('btnDeleteItem').addEventListener('click',()=>{ if(!confirm('Удалить позицию?'))return; state.items=state.items.filter(x=>x.id!==item.id); state.selectedId=state.items[0]?.id||null; renderAll(); autosaveProject(); });
}
function renderLog(){ const item=selectedItem(); if(!item){ els.logBox.textContent='Нет данных.'; return; } const warnings=[...priceIssues(item), ...(item.warnings||[])]; if(!warnings.length){ els.logBox.innerHTML='<div class="okline">Ошибок и замечаний нет.</div>'; return; } els.logBox.innerHTML=warnings.map(w=>`<div class="warnline">${escapeHtml(w)}</div>`).join(''); }
function renderServices(){ if(!state.services.length){ els.servicesBody.innerHTML='<tr class="empty-row"><td colspan="4">Нет дополнительных строк.</td></tr>'; return; } els.servicesBody.innerHTML=''; for(const svc of state.services){ const tr=document.createElement('tr'); tr.innerHTML=`<td><input data-svc="name" value="${escapeHtml(svc.name)}"></td><td><input data-svc="cost" type="number" step="1" value="${num(svc.cost,0)}"></td><td><input data-svc="sale" type="number" step="1" value="${num(svc.sale,0)}"></td><td><button class="danger small">×</button></td>`; tr.querySelectorAll('[data-svc]').forEach(input=>input.addEventListener('input',()=>{ const k=input.dataset.svc; svc[k]=input.type==='number'?num(input.value,0):input.value; renderSummary(); autosaveProject(); })); tr.querySelector('button').addEventListener('click',()=>{ state.services=state.services.filter(x=>x.id!==svc.id); renderAll(); autosaveProject(); }); els.servicesBody.appendChild(tr); } }

function renderPriceEditors(){ renderMaterialSelects(); syncPaintInputsFromPrices(); renderMetalPriceEditor(); renderCutPriceEditor(); renderBendPriceEditor(); }
function renderMetalPriceEditor(){ const thicknesses=[...new Set(prices.materials.flatMap(m=>Object.keys(m.prices||{})))].sort((a,b)=>num(a)-num(b)); let html='<table class="price-table"><thead><tr><th>Материал</th><th>Плотность</th>'+thicknesses.map(t=>`<th>${escapeHtml(t)} мм</th>`).join('')+'<th></th></tr></thead><tbody>'; prices.materials.forEach((m,mi)=>{ html+=`<tr><td><input data-price="material-name" data-mi="${mi}" value="${escapeHtml(m.name)}"></td><td><input data-price="density" data-mi="${mi}" type="number" step="1" value="${num(m.density,7850)}"></td>${thicknesses.map(t=>`<td><input data-price="metal" data-mi="${mi}" data-t="${escapeHtml(t)}" type="number" step="0.01" value="${m.prices?.[t]??''}"></td>`).join('')}<td><button class="danger small" data-remove-material="${mi}">×</button></td></tr>`; }); html+='</tbody></table>'; els.metalPriceEditor.innerHTML=html; bindPriceEditorEvents(); }
function renderCutPriceEditor(){ const keys=sortedThicknessKeys(prices.cut); let html='<table class="price-table simple"><thead><tr><th>Толщина, мм</th><th>Резка, ₽/м</th><th></th></tr></thead><tbody>'; keys.forEach(k=>{ html+=`<tr><td><input data-cut-key="${escapeHtml(k)}" value="${escapeHtml(k)}"></td><td><input data-price="cut" data-t="${escapeHtml(k)}" type="number" step="0.01" value="${prices.cut[k]}"></td><td><button class="danger small" data-remove-cut="${escapeHtml(k)}">×</button></td></tr>`; }); html+='</tbody></table>'; els.cutPriceEditor.innerHTML=html; bindPriceEditorEvents(); }
function renderBendPriceEditor(){ const keys=sortedThicknessKeys(prices.bend); let html='<table class="price-table simple"><thead><tr><th>Толщина, мм</th><th>Гибка, ₽/м</th><th></th></tr></thead><tbody>'; keys.forEach(k=>{ html+=`<tr><td><input data-bend-key="${escapeHtml(k)}" value="${escapeHtml(k)}"></td><td><input data-price="bend" data-t="${escapeHtml(k)}" type="number" step="0.01" value="${prices.bend[k]}"></td><td><button class="danger small" data-remove-bend="${escapeHtml(k)}">×</button></td></tr>`; }); html+='</tbody></table>'; els.bendPriceEditor.innerHTML=html; bindPriceEditorEvents(); }
function bindPriceEditorEvents(){ document.querySelectorAll('[data-price]').forEach(input=>input.oninput=()=>{ const type=input.dataset.price; if(type==='material-name'){ const old=prices.materials[input.dataset.mi].name; prices.materials[input.dataset.mi].name=input.value.trim()||old; state.items.forEach(it=>{ if(it.material===old)it.material=prices.materials[input.dataset.mi].name; }); } else if(type==='density') prices.materials[input.dataset.mi].density=num(input.value,7850); else if(type==='metal') prices.materials[input.dataset.mi].prices[input.dataset.t]=num(input.value,0); else if(type==='cut') prices.cut[input.dataset.t]=num(input.value,0); else if(type==='bend') prices.bend[input.dataset.t]=num(input.value,0); savePrices(); renderTable(); renderSummary(); renderEditor(); }); document.querySelectorAll('[data-remove-material]').forEach(btn=>btn.onclick=()=>{ if(prices.materials.length<=1)return alert('Должен остаться хотя бы один материал.'); prices.materials.splice(Number(btn.dataset.removeMaterial),1); savePrices(); renderAll(); }); document.querySelectorAll('[data-remove-cut]').forEach(btn=>btn.onclick=()=>{ delete prices.cut[btn.dataset.removeCut]; savePrices(); renderAll(); }); document.querySelectorAll('[data-remove-bend]').forEach(btn=>btn.onclick=()=>{ delete prices.bend[btn.dataset.removeBend]; savePrices(); renderAll(); }); document.querySelectorAll('[data-cut-key]').forEach(input=>input.onchange=()=>renamePriceKey(prices.cut,input.dataset.cutKey,input.value)); document.querySelectorAll('[data-bend-key]').forEach(input=>input.onchange=()=>renamePriceKey(prices.bend,input.dataset.bendKey,input.value)); }
function renamePriceKey(obj, oldKey, newKey){ newKey=thicknessKey(newKey); if(!newKey)return renderAll(); if(newKey!==oldKey){ obj[newKey]=obj[oldKey]; delete obj[oldKey]; savePrices(); renderAll(); } }
function addMaterial(){ const name=prompt('Название материала', 'Новый материал'); if(!name)return; prices.materials.push({name, density:7850, prices:{'3':0,'6':0}}); savePrices(); renderAll(); }
function addCutThickness(){ const t=prompt('Толщина, мм', '3'); if(!t)return; prices.cut[thicknessKey(t)]=0; savePrices(); renderAll(); }
function addBendThickness(){ const t=prompt('Толщина, мм', '3'); if(!t)return; prices.bend[thicknessKey(t)]=0; savePrices(); renderAll(); }


function quoteLineName(item){ return item.name || 'Позиция'; }
function renderQuote(){
  if(!els.quoteBody)return;
  const s=getSettings(), t=calcTotals();
  els.quoteTitle.textContent=`КП${s.orderNo?' №'+s.orderNo:''}${s.clientName?' — '+s.clientName:''}`;
  els.quoteMeta.textContent=`Дата: ${new Date().toLocaleDateString('ru-RU')} · Позиции: ${state.items.length} · Деталей: ${fmtNumber(t.qty,0)}`;
  if(!state.items.length&&!state.services.length){ els.quoteBody.innerHTML='<tr class="empty-row"><td colspan="8">Нет позиций.</td></tr>'; }
  else{
    let i=1; const rows=[];
    for(const item of state.items){ const c=calcItem(item); const priceOne=c.qty?c.sale/c.qty:0; rows.push(`<tr><td>${i++}</td><td>${escapeHtml(quoteLineName(item))}</td><td>${fmtNumber(c.t,1)} мм</td><td>${escapeHtml(item.material)}</td><td>${fmtNumber(c.qty,0)}</td><td>шт</td><td>${fmtMoney(priceOne)}</td><td>${fmtMoney(c.sale)}</td></tr>`); }
    for(const svc of state.services){ rows.push(`<tr><td>${i++}</td><td>${escapeHtml(svc.name)}</td><td>—</td><td>—</td><td>1</td><td>усл.</td><td>${fmtMoney(num(svc.sale,0))}</td><td>${fmtMoney(num(svc.sale,0))}</td></tr>`); }
    els.quoteBody.innerHTML=rows.join('');
  }
  els.quoteTotalNoVat.textContent=fmtMoney(t.saleNoVat); els.quoteVat.textContent=fmtMoney(t.vat); els.quoteTotal.textContent=fmtMoney(t.saleWithVat);
}
function yes(v){ return v ? 'Да' : '—'; }
function paintInfo(item){ const txt=[item.ral, item.paintTexture].map(x=>String(x||'').trim()).filter(Boolean).join(' '); return txt || '—'; }
function renderProduction(){
  if(!els.productionBody)return;
  const s=getSettings(); const total=calcTotals();
  els.productionTitle.textContent=`Список в производство${s.orderNo?' №'+s.orderNo:''}`;
  els.productionMeta.textContent=`Клиент: ${s.clientName||'—'} · Дата: ${new Date().toLocaleDateString('ru-RU')} · Позиции: ${state.items.length} · Деталей: ${fmtNumber(total.qty,0)}`;
  if(!state.items.length){ els.productionBody.innerHTML='<tr class="empty-row"><td colspan="12">Нет позиций.</td></tr>'; return; }
  els.productionBody.innerHTML=state.items.map(item=>{ normalizeItem(item); const paint=item.paintLayers>0?`${item.paintLayers} сл.`:'—'; return `<tr><td class="prod-preview">${makeSvg(item)}</td><td>${escapeHtml(item.name)}</td><td>${fmtNumber(num(item.qty,0),0)}</td><td>${fmtNumber(num(item.thickness,0),1)}</td><td>${escapeHtml(item.material)}</td><td>${yesNo(item.ops.cut)}</td><td>${num(item.bends,0)>0?fmtNumber(item.bends,0):'—'}</td><td>${paint}</td><td>${escapeHtml(paintInfo(item))}</td><td>${num(item.weldPriceOne,0)>0?'Да':'—'}</td><td>${escapeHtml(item.serviceText||'—')}</td><td>${escapeHtml(item.productionNote||item.note||'')}</td></tr>`; }).join('');
}

function applyCalcField(item, field, value){
  if(!field) return;
  if(['metalFactor','cutFactor','bendFactor','paintFactor'].includes(field)) item[field]=num(value,0);
}
function orderCostInput(name, label, value, type='number'){
  if(type==='select') return `<label>${label}<select class="cost-cell" data-order-cost="${name}">${materialNames().map(m=>`<option value="${escapeHtml(m)}" ${m===value?'selected':''}>${escapeHtml(m)}</option>`).join('')}</select></label>`;
  return `<label>${label}<input class="cost-cell" data-order-cost="${name}" type="number" step="0.01" value="${value || ''}"></label>`;
}

function renderCalcDetails(){
  const t=calcTotals();
  const oc=calcOrderCost();
  const rows=state.items.map((item,i)=>{ const c=calcItem(item); const issues=priceIssues(item); return `<tr data-id="${item.id}" class="${issues.length?'price-error-row':''}">
    <td>${i+1}</td><td class="detail-name">${escapeHtml(item.name)}</td><td>${fmtNumber(c.weightTotal,2)}</td>
    <td><input class="calc-input" data-calc-field="metalFactor" type="number" step="0.01" value="${num(c.metalFactor,1)}"></td><td>${fmtMoney(c.metalSale)}</td>
    <td><input class="calc-input" data-calc-field="cutFactor" type="number" step="0.01" value="${num(c.cutFactor,1)}"></td><td>${fmtMoney(c.cutSale)}</td>
    <td><input class="calc-input" data-calc-field="bendFactor" type="number" step="0.01" value="${num(c.bendFactor,1)}"></td><td>${fmtMoney(c.bendSale)}</td>
    <td><input class="calc-input" data-calc-field="paintFactor" type="number" step="0.01" value="${num(c.paintFactor,1)}"></td><td>${fmtMoney(c.paintSale)}</td>
    <td>${fmtMoney(c.weldSale)}</td><td>${fmtMoney(c.customSale)}</td><td><b>${fmtMoney(c.sale)}</b></td>
  </tr>`; }).join('');
  let totals={weight:0,metalSale:0,cutSale:0,bendSale:0,paintSale:0,weldSale:0,customSale:0,sale:0};
  for(const item of state.items){ const c=calcItem(item); for(const k of Object.keys(totals)) totals[k]+=c[k]||0; }
  els.calcDetails.innerHTML=`
    <div class="table-wrap"><table class="mini-table calc-table"><thead><tr><th>№</th><th>Деталь</th><th>Вес</th><th>Км</th><th>Металл</th><th>Кр</th><th>Резка</th><th>Кгиб</th><th>Гибка</th><th>Кпол</th><th>Полимерка</th><th>Сварка</th><th>Доп.</th><th>Продажа</th></tr></thead><tbody>${rows || '<tr class="empty-row"><td colspan="14">Нет позиций.</td></tr>'}</tbody><tfoot><tr><th colspan="2">ИТОГО</th><th>${fmtNumber(totals.weight,2)}</th><th></th><th>${fmtMoney(totals.metalSale)}</th><th></th><th>${fmtMoney(totals.cutSale)}</th><th></th><th>${fmtMoney(totals.bendSale)}</th><th></th><th>${fmtMoney(totals.paintSale)}</th><th>${fmtMoney(totals.weldSale)}</th><th>${fmtMoney(totals.customSale)}</th><th>${fmtMoney(t.saleWithVat)}</th></tr></tfoot></table></div>
    <div class="cost-summary-grid">
      <section class="order-cost-box">
        <h3>Себестоимость заказа</h3>
        <div class="cost-grid">
          ${orderCostInput('material','Материал',oc.material,'select')}
          ${orderCostInput('widthMm','Ширина листа, мм',oc.widthMm)}
          ${orderCostInput('lengthMm','Длина листа, мм',oc.lengthMm)}
          ${orderCostInput('thicknessMm','Толщина, мм',oc.thicknessMm)}
          ${orderCostInput('sheets','Кол-во листов/заготовок',oc.sheets)}
          ${orderCostInput('priceKg','Цена металла, ₽/кг',oc.priceKg)}
          ${orderCostInput('extraCost','Себ. доп., ₽',oc.extraCost)}
        </div>
        ${oc.priceIssue ? `<div class="warnline">${escapeHtml(oc.priceIssue)}</div>` : ''}
        <div class="cost-result-row"><span>Вес металла</span><b>${fmtNumber(oc.metalKg,2)} кг</b></div>
        <div class="cost-result-row"><span>Себ. металл</span><b>${fmtMoney(oc.metalCost)}</b></div>
        <div class="cost-result-row"><span>Себ. доп.</span><b>${fmtMoney(oc.extraCost)}</b></div>
      </section>
      <section class="totals-box calc-totals-box">
        <div><span>Итого без НДС</span><strong>${fmtMoney(t.saleNoVat)}</strong></div>
        <div><span>НДС</span><strong>${fmtMoney(t.vat)}</strong></div>
        <div><span>Себестоимость</span><strong>${t.costKnown ? fmtMoney(t.cost) : 'не заполнена'}</strong></div>
        <div><span>Маржа</span><strong>${t.costKnown ? `${fmtMoney(t.margin)} / ${fmtNumber(t.marginPct,1)}%` : '— себестоимость не заполнена'}</strong></div>
        <div class="grand"><span>Итого с НДС</span><strong>${fmtMoney(t.saleWithVat)}</strong></div>
      </section>
    </div>`;
  els.calcDetails.querySelectorAll('[data-calc-field]').forEach(input=>input.addEventListener('change',()=>{ const item=state.items.find(x=>x.id===num(input.closest('tr').dataset.id)); if(!item)return; applyCalcField(item,input.dataset.calcField,input.value); renderAll(); autosaveProject(); }));
  els.calcDetails.querySelectorAll('[data-order-cost]').forEach(input=>input.addEventListener('input',()=>{ const k=input.dataset.orderCost; state.orderCost[k]=input.type==='number'?num(input.value,0):input.value; if(k==='material'||k==='thicknessMm'){ const rec=materialRecord(state.orderCost.material); const rate=rec&&hasExactPrice(rec.prices,state.orderCost.thicknessMm)?exactPrice(rec.prices,state.orderCost.thicknessMm,0):0; if(rate>0) state.orderCost.priceKg=rate; } renderAll(); autosaveProject(); }));
  installFillHandles(els.calcDetails);
}
function renderLayouts(){
  if(!els.layoutsBody)return;
  if(!state.layouts.length){ els.layoutsBody.innerHTML='<div class="empty-card">Раскладки пока не добавлены.</div>'; return; }
  els.layoutsBody.innerHTML=state.layouts.map(l=>`<div class="layout-card" data-id="${l.id}"><div class="layout-img-wrap"><img src="${l.imageData}" alt="${escapeHtml(l.fileName)}"></div><div class="layout-fields"><label>Файл<input data-layout="fileName" value="${escapeHtml(l.fileName||'')}"></label><label>Материал<input data-layout="material" value="${escapeHtml(l.material||'')}"></label><label>Толщина<input data-layout="thickness" type="number" step="0.1" value="${num(l.thickness,0)}"></label><label>Лист<input data-layout="sheetSize" value="${escapeHtml(l.sheetSize||'')}"></label><label>Кол-во листов<input data-layout="sheetCount" type="number" step="1" value="${num(l.sheetCount,1)}"></label><label>Расход<input data-layout="usage" value="${escapeHtml(l.usage||'')}"></label><label>Заполнение<input data-layout="fill" value="${escapeHtml(l.fill||'')}"></label><label class="wide-label">Комментарий<textarea data-layout="comment" rows="2">${escapeHtml(l.comment||'')}</textarea></label><button class="danger small" data-layout-delete>Удалить</button></div></div>`).join('');
  els.layoutsBody.querySelectorAll('.layout-card').forEach(card=>{ const l=state.layouts.find(x=>x.id===num(card.dataset.id)); if(!l)return; card.querySelectorAll('[data-layout]').forEach(input=>input.addEventListener('input',()=>{ const k=input.dataset.layout; l[k]=input.type==='number'?num(input.value,0):input.value; autosaveProject(); })); card.querySelector('[data-layout-delete]').addEventListener('click',()=>{ state.layouts=state.layouts.filter(x=>x.id!==l.id); renderAll(); autosaveProject(); }); });
}
function addManualItem(){ const item=makeItem({source:'manual',name:'Ручная позиция',qty:1}); item.geometry={width:100,height:100,cutLengthMm:400,pierces:1}; item.geometryOverridden=true; item.paintAreaM2One=defaultPaintArea(item); state.items.push(item); state.selectedId=item.id; renderAll(); autosaveProject(); }
function addService(){ state.services.push({id:state.nextServiceId++,name:'Доп. услуга',cost:0,sale:0}); renderAll(); autosaveProject(); }
function makeProjectData(){ return { version:VERSION, savedAt:new Date().toISOString(), settings:getSettings(), prices, orderCost: state.orderCost, items:state.items.map(item=>({...item, previewSvg:makeSvg(item), rawEntities:null, entities:null, analysis:null})), services:state.services, layouts:state.layouts }; }
function saveProject(){ downloadText(`project_${dateStamp()}.json`, JSON.stringify(makeProjectData(), null, 2), 'application/json'); }
async function loadProject(file){ const data=JSON.parse(await file.text()); if(data.prices){ prices=data.prices; savePrices(); syncPaintInputsFromPrices(); } if(data.settings){ for(const [k,v] of Object.entries(data.settings)){ if(els[k]){ let value=v; if(k==='vatRate'&&num(value,20)<=1)value=num(value,0.2)*100; if(els[k].type==='checkbox')els[k].checked=Boolean(value); else els[k].value=value; } } if(els.minCut)els.minCut.value=0; saveSettings(); } state.nextId=1; state.nextServiceId=1; state.nextLayoutId=1; state.orderCost = data.orderCost || state.orderCost; state.items=(data.items||[]).map(x=>{ const item={...x, rawEntities:null, entities:[], analysis:{bbox:{minX:0,minY:0,maxX:0,maxY:0,width:x.geometry?.width||0,height:x.geometry?.height||0},cutLength:x.geometry?.cutLengthMm||0,pierces:x.geometry?.pierces||0,warnings:[],layers:[],segments:[]}}; item.id=state.nextId++; item.source=item.source||'manual'; item.ops={...defaultOps(), ...(item.ops||{})}; normalizeItem(item); item.warnings=item.warnings||['Проект загружен без исходной геометрии DXF. Для точной проверки загрузи DXF заново.']; return item; }); state.services=(data.services||[]).map(x=>({...x,id:state.nextServiceId++})); state.layouts=(data.layouts||[]).map(x=>({...x,id:state.nextLayoutId++})); state.selectedId=state.items[0]?.id||null; renderAll(); autosaveProject(); }
function exportCsv(){ const rows=[['Деталь','Кол-во','Материал','Толщина','Габарит X','Габарит Y','Рез м','Врезки','Вес кг','Металл','Резка','Гибка','Покраска','Итого продажа','Себестоимость']]; for(const item of state.items){ const c=calcItem(item), g=getGeometry(item); rows.push([item.name,c.qty,item.material,c.t,round(g.width,2),round(g.height,2),round(c.cutMTotal,3),c.piercesTotal,round(c.weightTotal,3),round(c.metalSale,2),round(c.cutSale,2),round(c.bendSale,2),round(c.paintSale,2),round(c.sale,2),round(c.cost,2)]); } const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n'); downloadText(`dxf_calc_${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8'); }
function copyQuote(){ const t=calcTotals(), s=getSettings(); const lines=[]; lines.push(`КП${s.orderNo?' №'+s.orderNo:''}${s.clientName?' — '+s.clientName:''}`); lines.push(''); state.items.forEach((item,i)=>{ const c=calcItem(item); const priceOne=c.qty?c.sale/c.qty:0; lines.push(`${i+1}. ${item.name} | t=${fmtNumber(c.t,1)} мм | ${item.material} | ${fmtNumber(c.qty,0)} шт | ${fmtMoney(priceOne)} | ${fmtMoney(c.sale)}`); }); if(state.services.length){ lines.push(''); state.services.forEach((svc,i)=>lines.push(`Доп. ${i+1}. ${svc.name} — ${fmtMoney(num(svc.sale,0))}`)); } lines.push(''); lines.push(`Итого без НДС: ${fmtMoney(t.saleNoVat)}`); lines.push(`НДС: ${fmtMoney(t.vat)}`); lines.push(`Итого с НДС: ${fmtMoney(t.saleWithVat)}`); navigator.clipboard?.writeText(lines.join('\n')); alert('КП скопировано в буфер обмена.'); }
function downloadText(filename, content, type){ const blob=new Blob([content],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
async function importPrices(file){ const data=JSON.parse(await file.text()); if(!data.materials||!data.cut||!data.bend) throw new Error('Неверный файл цен'); prices=data; savePrices(); syncPaintInputsFromPrices(); renderAll(); }
function exportPrices(){ syncPricesFromPaintInputs(); savePrices(); downloadText(`prices_${dateStamp()}.json`, JSON.stringify(prices,null,2), 'application/json'); }


function printSection(section){
  const targetView = section === 'production' ? 'production' : 'quote';
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.toggle('active', b.dataset.view===targetView));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${targetView}`));
  document.body.dataset.print = targetView;
  setTimeout(()=>window.print(), 50);
  const cleanup=()=>{ delete document.body.dataset.print; window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 1500);
}
function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error||new Error('Не удалось прочитать файл')); reader.readAsDataURL(file); }); }
async function addLayoutFiles(files){
  const list=[...files].filter(f=>/^image\/(png|jpeg)$/.test(f.type)||/\.(png|jpe?g)$/i.test(f.name));
  if(!list.length) throw new Error('Выбери JPEG или PNG раскладку. LXDS в этой версии добавляется через отдельный просмотрщик/сервер.');
  for(const file of list){
    const imageData=await fileToDataUrl(file);
    state.layouts.push({ id:state.nextLayoutId++, fileName:file.name, imageData, material:getSettings().defaultMaterial, thickness:getSettings().defaultThickness, sheetSize:'', sheetCount:1, usage:'', fill:'', comment:'' });
  }
  renderAll(); autosaveProject();
}

function bindEvents(){ els.btnSelectFiles.addEventListener('click',()=>els.fileInput.click()); els.btnSelectFolder.addEventListener('click',()=>els.folderInput.click()); els.fileInput.addEventListener('change',e=>handleFiles(e.target.files)); els.folderInput.addEventListener('change',e=>handleFiles(e.target.files)); els.dropzone.addEventListener('dragover',e=>{e.preventDefault();els.dropzone.classList.add('dragover');}); els.dropzone.addEventListener('dragleave',()=>els.dropzone.classList.remove('dragover')); els.dropzone.addEventListener('drop',e=>{e.preventDefault();els.dropzone.classList.remove('dragover');handleFiles(e.dataTransfer.files);});
  els.btnAddManual.addEventListener('click',addManualItem); els.btnAddService.addEventListener('click',addService); els.btnMergeDuplicates.addEventListener('click',mergeDuplicates); els.btnSaveProject.addEventListener('click',saveProject); els.btnLoadProject.addEventListener('click',()=>els.projectFileInput.click()); els.projectFileInput.addEventListener('change',e=>{ if(e.target.files[0])loadProject(e.target.files[0]).catch(err=>alert(err.message)); }); els.btnExportCsv.addEventListener('click',exportCsv); els.btnCopyQuote.addEventListener('click',copyQuote); els.btnClear.addEventListener('click',()=>{ if(!confirm('Очистить расчет?'))return; state.items=[]; state.services=[]; state.layouts=[]; state.orderCost={material:'Ст3',widthMm:0,lengthMm:0,thicknessMm:3,sheets:1,priceKg:67,extraCost:0}; state.selectedId=null; renderAll(); autosaveProject(); });
  els.btnResetPrices.addEventListener('click',()=>{ if(!confirm('Сбросить базу цен к значениям по умолчанию?'))return; prices=clone(DEFAULT_PRICES); savePrices(); syncPaintInputsFromPrices(); renderAll(); }); els.btnExportPrices.addEventListener('click',exportPrices); els.btnImportPrices.addEventListener('click',()=>els.priceFileInput.click()); els.priceFileInput.addEventListener('change',e=>{ if(e.target.files[0])importPrices(e.target.files[0]).catch(err=>alert(err.message)); }); els.btnAddMaterial.addEventListener('click',addMaterial); els.btnAddCutThickness.addEventListener('click',addCutThickness); els.btnAddBendThickness.addEventListener('click',addBendThickness);
  document.querySelectorAll('.nav-tab').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active')); document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); btn.classList.add('active'); const view=$(`view-${btn.dataset.view}`); if(view)view.classList.add('active'); }));
  if(els.btnBulkApply)els.btnBulkApply.addEventListener('click',()=>applyBulk(false)); if(els.btnBulkDown)els.btnBulkDown.addEventListener('click',()=>applyBulk(true));
  if(els.btnPrintQuote)els.btnPrintQuote.addEventListener('click',()=>printSection('quote')); if(els.btnPrintProduction)els.btnPrintProduction.addEventListener('click',()=>printSection('production'));
  if(els.btnAddLayout)els.btnAddLayout.addEventListener('click',()=>els.layoutFileInput.click()); if(els.layoutFileInput)els.layoutFileInput.addEventListener('change',e=>{ if(e.target.files.length)addLayoutFiles(e.target.files).catch(err=>alert(err.message)); });
  document.querySelectorAll('.price-tab').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.price-tab').forEach(b=>b.classList.remove('active')); document.querySelectorAll('.price-tab-content').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); $(`tab-${btn.dataset.tab}`).classList.add('active'); }));
  [...SETTINGS_KEYS,'paintPriceM2','paintCostM2','powderConsumption','powderPrice','minPaint'].forEach(key=>{ if(!els[key])return; const ev=els[key].type==='checkbox'?'change':'input'; els[key].addEventListener(ev,()=>{ syncPricesFromPaintInputs(); savePrices(); saveSettings(); if(['ignoreLayers','addThicknessToBlank'].includes(key))refreshAllDxfGeometry(); renderAll(); autosaveProject(); }); });
}
function init(){ loadPrices(); renderMaterialSelects(); syncPaintInputsFromPrices(); loadSettings(); if(els.minCut) els.minCut.value=0; bindEvents(); renderAll(); }
init();
