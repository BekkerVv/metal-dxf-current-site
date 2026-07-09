'use strict';

const VERSION = '1.2';
const STORAGE_KEY = 'pm_dxf_calc_current_site_v12_settings';
const PRICE_KEY = 'pm_dxf_calc_current_site_v12_prices';
const PROJECT_KEY = 'pm_dxf_calc_current_site_v12_autosave';

const state = { items: [], services: [], layouts: [], orderCost: { material: 'гк ст3', widthMm: 1250, lengthMm: 2500, thicknessMm: 3, sheets: 0, priceKg: 63.2, extraCost: 0 }, selectedId: null, nextId: 1, nextServiceId: 1, nextLayoutId: 1 };
let fillDrag = null;
let positionSort = { field: '', dir: 'asc' };
let positionFilters = {};
let lastFocusedCell = null;

const DEFAULT_PRICES = {
  materials: [
    { name: 'гк ст3', aliases: ['Ст3', 'ст3', 'гк', 'черный металл', 'чёрный металл'], density: 7850,
      prices: { '3': 63.2, '4': 63.5, '5': 63.5, '6': 63.5, '8': 63.5, '10': 63.5, '12': 63.5, '14': 63, '16': 63, '20': 63.5, '25': 63.5 },
      sheetPrices: { '3': [ { size:'1250х2500', width:1250, length:2500, priceKg:63.2 }, { size:'1500х6000', width:1500, length:6000, priceKg:66 } ], '4': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ], '5': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ], '6': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ], '8': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ], '10': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ], '12': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ], '14': [ { size:'1500х6000', width:1500, length:6000, priceKg:63 } ], '16': [ { size:'1500х6000', width:1500, length:6000, priceKg:63 } ], '20': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ], '25': [ { size:'1500х6000', width:1500, length:6000, priceKg:63.5 } ] } },
    { name: '09Г2С', aliases: ['09г2с', '09Г2С'], density: 7850,
      prices: { '3': 70.6, '4': 67.8, '5': 67.8, '6': 69, '8': 69, '10': 69, '12': 69, '14': 69, '16': 69, '20': 69 },
      sheetPrices: { '3': [ { size:'1500х6000', width:1500, length:6000, priceKg:70.6 } ], '4': [ { size:'1500х6000', width:1500, length:6000, priceKg:67.8 } ], '5': [ { size:'1500х6000', width:1500, length:6000, priceKg:67.8 } ], '6': [ { size:'1500х6000', width:1500, length:6000, priceKg:69 } ], '8': [ { size:'1500х6000', width:1500, length:6000, priceKg:69 } ], '10': [ { size:'1500х6000', width:1500, length:6000, priceKg:69 } ], '12': [ { size:'1500х6000', width:1500, length:6000, priceKg:69 } ], '14': [ { size:'1500х6000', width:1500, length:6000, priceKg:69 } ], '16': [ { size:'1500х6000', width:1500, length:6000, priceKg:69 } ], '20': [ { size:'1500х6000', width:1500, length:6000, priceKg:69 } ] } },
    { name: '08пс хк', aliases: ['08пс', 'хк', '08пс хк'], density: 7850,
      prices: { '0.5':75.6, '0.7':74.5, '0.8':73.2, '1':73, '1.2':73, '1.5':73, '2':73, '2.5':73.8, '3':73.8 },
      sheetPrices: { '0.5':[ { size:'1250х2500', width:1250, length:2500, priceKg:75.6 } ], '0.7':[ { size:'1250х2500', width:1250, length:2500, priceKg:74.5 } ], '0.8':[ { size:'1250х2500', width:1250, length:2500, priceKg:73.2 } ], '1':[ { size:'1250х2500', width:1250, length:2500, priceKg:73 } ], '1.2':[ { size:'1250х2500', width:1250, length:2500, priceKg:73 } ], '1.5':[ { size:'1250х2500', width:1250, length:2500, priceKg:73 } ], '2':[ { size:'1250х2500', width:1250, length:2500, priceKg:73 } ], '2.5':[ { size:'1250х2500', width:1250, length:2500, priceKg:73.8 } ], '3':[ { size:'1250х2500', width:1250, length:2500, priceKg:73.8 } ] } },
    { name: 'Оцинковка', aliases: ['оц', 'оцинк', 'оцинковка'], density: 7850,
      prices: { '0.5':92.7, '0.7':86, '0.8':84, '1':82, '1.2':81, '1.5':82.5, '2':81.9, '2.5':100.8 },
      sheetPrices: { '0.5':[ { size:'1250х2500', width:1250, length:2500, priceKg:92.7 } ], '0.7':[ { size:'1250х2500', width:1250, length:2500, priceKg:86 } ], '0.8':[ { size:'1250х2500', width:1250, length:2500, priceKg:84 } ], '1':[ { size:'1250х2500', width:1250, length:2500, priceKg:82 } ], '1.2':[ { size:'1250х2500', width:1250, length:2500, priceKg:81 } ], '1.5':[ { size:'1250х2500', width:1250, length:2500, priceKg:82.5 } ], '2':[ { size:'1250х2500', width:1250, length:2500, priceKg:81.9 } ], '2.5':[ { size:'1250х2500', width:1250, length:2500, priceKg:100.8 } ] } },
    { name: 'Нержавейка', aliases: ['нерж', 'нержавейка', 'aisi304', 'aisi 304', 'aisi321', 'aisi 321'], density: 7900, prices: { '1':260, '1.5':250, '2':245, '3':240, '4':250, '5':260, '6':270 } },
    { name: 'Алюминий', aliases: ['алюминий', 'алюм', 'амг', 'ад31'], density: 2700, prices: { '1':320, '2':310, '3':300, '4':310, '5':320, '6':330 } },
  ],
  cutGroups: [
    { key:'black', label:'Черный металл', materials:['гк ст3','Ст3','ст3','09Г2С','09г2с','08пс хк','08пс','хк'],
      rates:{ '0.5':7, '0.7':7, '0.8':7, '1':8.5, '1.2':9, '1.5':9, '2':11, '2.5':13, '3':14.5, '4':20, '5':26, '6':30, '8':40, '10':52, '12':76, '14':90, '16':133, '20':167 },
      pierces:{ '0.5':0.7, '0.7':0.7, '0.8':0.7, '1':0.7, '1.2':0.7, '1.5':0.7, '2':1, '2.5':1, '3':1.5, '4':2, '5':2.5, '6':3, '8':6, '10':6, '12':10, '14':12, '16':12, '20':18 } },
    { key:'galv', label:'Оцинковка', materials:['Оцинковка','оц','оцинк','оцинковка'],
      rates:{ '0.5':11, '0.7':11, '0.8':11, '1':20, '1.2':22, '1.5':24, '2':27, '3':34 },
      pierces:{ '0.5':1, '0.7':1, '0.8':1, '1':2, '1.2':2, '1.5':2, '2':2, '3':3, '4':6, '5':3.5, '6':6 } },
    { key:'inoxAl', label:'Нерж/алюминий', materials:['Нержавейка','нерж','нержавейка','Алюминий','алюминий','алюм'],
      rates:{ '0.5':16, '0.7':16, '0.8':16, '1':30, '1.5':35, '2':40, '3':50, '4':90 },
      pierces:{ '0.5':1, '0.7':1, '0.8':1, '1':2, '1.5':2, '2':2, '3':3, '4':6, '5':3.5, '6':6 } },
  ],
  cut: { '0.5':7, '0.7':7, '0.8':7, '1':8.5, '1.2':9, '1.5':9, '2':11, '2.5':13, '3':14.5, '4':20, '5':26, '6':30, '8':40, '10':52, '12':76, '14':90, '16':133, '20':167 },
  bend: { '0.5':{'500':8,'1500':10,'3000':17}, '0.7':{'500':8,'1500':10,'3000':17}, '0.8':{'500':8,'1500':10,'3000':17}, '1':{'500':8,'1500':10,'3000':17}, '1.2':{'500':10,'1500':13,'3000':20}, '1.5':{'500':10,'1500':13,'3000':20}, '2':{'500':10,'1500':13,'3000':20}, '2.5':{'500':13,'1500':17,'3000':20}, '3':{'500':13,'1500':17,'3000':27}, '4':{'500':17,'1500':20,'3000':38}, '5':{'500':20,'1500':27,'3000':48}, '6':{'500':27,'1500':38,'3000':''} },
  paint: { paintPriceM2: 500, paintCostM2: 0, powderConsumption: 0.15, powderPrice: 500, minPaint: 0 },
};
let prices = structuredClone(DEFAULT_PRICES);

const $ = (id) => document.getElementById(id);
const els = {
  fileInput: $('fileInput'), folderInput: $('folderInput'), projectFileInput: $('projectFileInput'), priceFileInput: $('priceFileInput'),
  dropzone: $('dropzone'), btnSelectFiles: $('btnSelectFiles'), btnSelectFolder: $('btnSelectFolder'),
  btnAddManual: $('btnAddManual'), btnAddManualPositions: $('btnAddManualPositions'), btnMergeDuplicates: $('btnMergeDuplicates'), btnSaveProject: $('btnSaveProject'),
  btnLoadProject: $('btnLoadProject'), btnExportCsv: $('btnExportCsv'), btnCopyQuote: $('btnCopyQuote'), btnClear: $('btnClear'),
  btnAddService: $('btnAddService'), btnResetPrices: $('btnResetPrices'), btnExportPrices: $('btnExportPrices'), btnImportPrices: $('btnImportPrices'),
  btnAddMaterial: $('btnAddMaterial'), btnAddSheetPrice: $('btnAddSheetPrice'), btnAddCutThickness: $('btnAddCutThickness'), btnAddBendThickness: $('btnAddBendThickness'),
  metalPriceEditor: $('metalPriceEditor'), sheetPriceEditor: $('sheetPriceEditor'), cutPriceEditor: $('cutPriceEditor'), bendPriceEditor: $('bendPriceEditor'),
  itemsTable: $('itemsTable'), itemsBody: $('itemsBody'), geometryEditor: $('geometryEditor'), servicesBody: $('servicesBody'), previewBox: $('previewBox'), previewTitle: $('previewTitle'),
  editBox: $('editBox'), editTitle: $('editTitle'), logBox: $('logBox'),
  sumFiles: $('sumFiles'), sumQty: $('sumQty'), sumCut: $('sumCut'), sumWeight: $('sumWeight'), sumCost: $('sumCost'), sumTotal: $('sumTotal'), sumMargin: $('sumMargin'),
  orderNo: $('orderNo'), clientName: $('clientName'), defaultMaterial: $('defaultMaterial'), defaultThickness: $('defaultThickness'),
  vatRate: $('vatRate'), pricesIncludeVat: $('pricesIncludeVat'), metalFactor: $('metalFactor'), cutFactor: $('cutFactor'), piercePrice: $('piercePrice'), minCut: $('minCut'),
  bendFactor: $('bendFactor'), paintFactor: $('paintFactor'), paintPriceM2: $('paintPriceM2'), paintCostM2: $('paintCostM2'),
  powderConsumption: $('powderConsumption'), powderPrice: $('powderPrice'), minPaint: $('minPaint'), targetMargin: $('targetMargin'),
  addThicknessToBlank: $('addThicknessToBlank'), ignoreLayers: $('ignoreLayers'),
  quoteBody: $('quoteBody'), quoteTitle: $('quoteTitle'), quoteMeta: $('quoteMeta'), quoteTotalNoVat: $('quoteTotalNoVat'), quoteVat: $('quoteVat'), quoteTotal: $('quoteTotal'), quoteTermsText: $('quoteTermsText'), leadTime: $('leadTime'), paymentTerms: $('paymentTerms'), deliveryTerms: $('deliveryTerms'), clientComment: $('clientComment'),
  productionBody: $('productionBody'), productionTitle: $('productionTitle'), productionMeta: $('productionMeta'),
  btnPrintQuote: $('btnPrintQuote'), btnPrintProduction: $('btnPrintProduction'), layoutFileInput: $('layoutFileInput'), btnAddLayout: $('btnAddLayout'), layoutsBody: $('layoutsBody'), calcDetails: $('calcDetails'),
  bulkField: $('bulkField'), bulkValue: $('bulkValue'), btnBulkApply: $('btnBulkApply'), btnBulkDown: $('btnBulkDown'), btnClearFilters: $('btnClearFilters'),
};
const SETTINGS_KEYS = ['orderNo','clientName','defaultMaterial','defaultThickness','vatRate','pricesIncludeVat','metalFactor','cutFactor','piercePrice','minCut','bendFactor','paintFactor','addThicknessToBlank','ignoreLayers','leadTime','paymentTerms','deliveryTerms','clientComment'];

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
function normText(v) { return String(v ?? '').trim().toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' '); }
function materialRecord(name) {
  const q = normText(name);
  return prices.materials.find(m => normText(m.name) === q || (m.aliases || []).some(a => normText(a) === q)) || null;
}
function materialNames() { return prices.materials.map(m => m.name); }
function materialOptionsHtml(selected) {
  const names = materialNames();
  const options = (selected && !names.includes(selected)) ? [selected, ...names] : names;
  return optionHtml(options, selected || options[0]);
}
function exactPrice(table, thickness, fallback = 0) {
  const key = thicknessKey(thickness);
  if (!table || !Object.prototype.hasOwnProperty.call(table, key)) return fallback;
  const v = table[key];
  if (v && typeof v === 'object') return fallback;
  return num(v, fallback);
}
function hasExactPrice(table, thickness) {
  const key = thicknessKey(thickness);
  return Boolean(table && Object.prototype.hasOwnProperty.call(table, key) && table[key] !== '' && table[key] !== null && table[key] !== undefined);
}
function sheetPriceEntries(rec, thickness) { return rec?.sheetPrices?.[thicknessKey(thickness)] || []; }
function sameSheetSize(entry, widthMm, lengthMm) {
  const w = Math.round(num(widthMm,0)), l = Math.round(num(lengthMm,0));
  const ew = Math.round(num(entry.width,0)), el = Math.round(num(entry.length,0));
  return (w === ew && l === el) || (w === el && l === ew);
}
function exactMaterialPrice(rec, thickness, widthMm = 0, lengthMm = 0, fallback = 0) {
  if (!rec) return fallback;
  const entries = sheetPriceEntries(rec, thickness);
  if (widthMm > 0 && lengthMm > 0 && entries.length) {
    const hit = entries.find(e => sameSheetSize(e, widthMm, lengthMm));
    return hit ? num(hit.priceKg, fallback) : 0;
  }
  return exactPrice(rec.prices, thickness, fallback);
}
function materialPriceExists(rec, thickness, widthMm = 0, lengthMm = 0) {
  if (!rec) return false;
  const entries = sheetPriceEntries(rec, thickness);
  if (widthMm > 0 && lengthMm > 0 && entries.length) return entries.some(e => sameSheetSize(e, widthMm, lengthMm));
  return hasExactPrice(rec.prices, thickness);
}
function densityFor(item) { return num(materialRecord(item.material)?.density, 7850); }
function metalPriceFor(item) { const rec = materialRecord(item.material); return exactMaterialPrice(rec, num(item.thickness,0), 0, 0, 0); }
function cutGroupForMaterial(material) {
  const q = normText(material);
  return (prices.cutGroups || []).find(g => (g.materials || []).some(m => normText(m) === q)) || null;
}
function cutPriceFor(item) { const g = cutGroupForMaterial(item.material); return g ? exactPrice(g.rates, num(item.thickness,0), 0) : exactPrice(prices.cut, num(item.thickness,0), 0); }
function piercePriceFor(item) { const g = cutGroupForMaterial(item.material); return g && hasExactPrice(g.pierces, num(item.thickness,0)) ? exactPrice(g.pierces, num(item.thickness,0), 0) : num(getSettings().piercePrice,0); }
function bendTierForLength(lengthMm) { const l = num(lengthMm,0); if (l <= 500) return '500'; if (l <= 1500) return '1500'; return '3000'; }
function bendPriceFor(item) {
  const key = thicknessKey(item.thickness);
  const row = prices.bend?.[key];
  if (row && typeof row === 'object') return num(row[bendTierForLength(item.bendLengthMm)], 0);
  return exactPrice(prices.bend, num(item.thickness,0), 0);
}
function hasBendPriceFor(item) {
  const key = thicknessKey(item.thickness);
  const row = prices.bend?.[key];
  if (row && typeof row === 'object') { const v = row[bendTierForLength(item.bendLengthMm)]; return v !== '' && v !== null && v !== undefined; }
  return hasExactPrice(prices.bend, item.thickness);
}
function priceIssues(item) {
  const issues = [];
  const t = num(item.thickness, 0);
  const rec = materialRecord(item.material);
  if (!rec) issues.push(`Материал «${item.material || '—'}» отсутствует в базе цен.`);
  else if (item.ops?.metal && !materialPriceExists(rec, t)) issues.push(`Нет цены металла ${rec.name} ${thicknessKey(t)} мм. Добавь толщину в базу цен.`);
  if (item.ops?.cut) {
    const g = cutGroupForMaterial(item.material);
    if (!g) issues.push(`Нет группы резки для материала «${item.material || '—'}».`);
    else if (!hasExactPrice(g.rates, t)) issues.push(`Нет цены резки: ${g.label}, ${thicknessKey(t)} мм.`);
  }
  if (num(item.bends, 0) > 0 && !hasBendPriceFor(item)) issues.push(`Нет цены гибки для ${thicknessKey(t)} мм, длина гиба ${fmtNumber(num(item.bendLengthMm,0),0)} мм.`);
  return issues;
}

function loadPrices() {
  try {
    const raw = localStorage.getItem(PRICE_KEY);
    if (raw) prices = { ...clone(DEFAULT_PRICES), ...JSON.parse(raw) };
  } catch (_) { prices = clone(DEFAULT_PRICES); }
  if (!prices.materials || !prices.materials.length) prices.materials = clone(DEFAULT_PRICES.materials);
  if (!prices.cutGroups) prices.cutGroups = clone(DEFAULT_PRICES.cutGroups);
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
  if (els.minPaint) els.minPaint.value = prices.paint.minPaint ?? 0;
}
function syncPricesFromPaintInputs() {
  prices.paint.paintPriceM2 = num(els.paintPriceM2.value, 500);
  prices.paint.paintCostM2 = num(els.paintCostM2.value, 0);
  prices.paint.powderConsumption = num(els.powderConsumption.value, 0.15);
  prices.paint.powderPrice = num(els.powderPrice.value, 500);
  prices.paint.minPaint = els.minPaint ? num(els.minPaint.value, 0) : 0;
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
    powderPrice: num(els.powderPrice.value, 0), minPaint: els.minPaint ? num(els.minPaint.value, 0) : 0,
    leadTime: els.leadTime?.value?.trim() || '', paymentTerms: els.paymentTerms?.value?.trim() || '', deliveryTerms: els.deliveryTerms?.value?.trim() || '', clientComment: els.clientComment?.value?.trim() || '',
  };
}
function saleToNoVat(amount, s) { return s.pricesIncludeVat ? amount / (1 + s.vatRate) : amount; }
function saleToWithVat(amount, s) { return s.pricesIncludeVat ? amount : amount * (1 + s.vatRate); }
function autosaveProject() { try { localStorage.setItem(PROJECT_KEY, JSON.stringify(makeProjectData(false))); } catch (_) {} }

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
  item.material = item.material || s.defaultMaterial || materialNames()[0] || 'гк ст3';
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
  const metalRate=metalPriceFor(item), cutRate=cutPriceFor(item), bendRate=bendPriceFor(item), pierceRate=piercePriceFor(item);
  const metalFactor=num(item.metalFactor, s.metalFactor || 1);
  const cutFactor=num(item.cutFactor, s.cutFactor || 1);
  const bendFactor=num(item.bendFactor, s.bendFactor || 1);
  const paintFactor=num(item.paintFactor, s.paintFactor || 1);
  const metalSale=item.ops.metal?weightTotal*metalRate*metalFactor:0;
  const metalCostKg=num(item.metalCostKg,0) || metalRate;
  const metalCost=item.ops.metal?(num(item.factMetalKg,0)>0?num(item.factMetalKg,0)*metalCostKg:0):0;
  const cutSale=item.ops.cut?cutMTotal*cutRate*cutFactor+piercesTotal*pierceRate:0;
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
  return {qty,t,blankX,blankY,areaM2One,weightOne,weightTotal,cutMTotal,piercesTotal,bendMTotal,paintLayers,paintAreaTotal,metalRate,cutRate,bendRate,pierceRate,metalFactor,cutFactor,bendFactor,paintFactor,metalSale,metalCost,metalCostKg,cutSale,cutCost,bendSale,bendCost,paintSale,paintCost,powderCost:autoPowderCost,weldSale,weldCost,customSale,customCost,sale,cost};
}
function calcServices(){ const s=getSettings(); const sale=state.services.reduce((a,x)=>a+Math.max(0,num(x.sale,0)),0); const cost=state.services.reduce((a,x)=>a+Math.max(0,num(x.cost,0)),0); return {sale,cost,saleNoVat:saleToNoVat(sale,s),saleWithVat:saleToWithVat(sale,s)}; }
function calcOrderCost(){
  const oc = state.orderCost || {};
  const material = oc.material || getSettings().defaultMaterial || 'гк ст3';
  const rec = materialRecord(material);
  const density = num(rec?.density, 7850);
  const widthMm = Math.max(0, num(oc.widthMm, 0));
  const lengthMm = Math.max(0, num(oc.lengthMm, 0));
  const thicknessMm = Math.max(0, num(oc.thicknessMm, 0));
  const sheets = Math.max(0, num(oc.sheets, 0));
  const basePriceKg = exactMaterialPrice(rec, thicknessMm, widthMm, lengthMm, 0);
  const priceKg = basePriceKg;
  let priceIssue = '';
  if (!rec) priceIssue = `Материал «${material}» отсутствует в базе цен.`;
  else if (thicknessMm > 0 && widthMm > 0 && lengthMm > 0 && !materialPriceExists(rec, thicknessMm, widthMm, lengthMm)) {
    const entries = sheetPriceEntries(rec, thicknessMm).map(e => e.size || `${e.width}х${e.length}`).filter(Boolean).join(', ');
    priceIssue = entries ? `Нет цены металла ${rec.name} ${thicknessKey(thicknessMm)} мм для раскроя ${fmtNumber(widthMm,0)}х${fmtNumber(lengthMm,0)}. В прайсе есть: ${entries}.` : `Нет цены металла ${rec.name} ${thicknessKey(thicknessMm)} мм в базе цен.`;
  }
  const metalCostKnown = sheets > 0 && widthMm > 0 && lengthMm > 0 && thicknessMm > 0 && priceKg > 0 && !priceIssue;
  const metalKg = metalCostKnown ? widthMm * lengthMm * thicknessMm / 1_000_000_000 * density * sheets : 0;
  const metalCost = metalCostKnown ? metalKg * priceKg : 0;
  const extraCost = Math.max(0, num(oc.extraCost, 0));
  const costKnown = metalCostKnown || extraCost > 0;
  return { material, density, widthMm, lengthMm, thicknessMm, sheets, priceKg, basePriceKg, priceIssue, metalKg, metalCost, extraCost, metalCostKnown, costKnown, cost: metalCost + extraCost };
}
function calcTotals(){ const s=getSettings(); const items=state.items.reduce((acc,item)=>{ const c=calcItem(item); acc.qty+=c.qty; acc.cut+=c.cutMTotal; acc.weight+=c.weightTotal; acc.sale+=c.sale; return acc; },{qty:0,cut:0,weight:0,sale:0}); const svc=calcServices(); const oc=calcOrderCost(); const saleRaw=items.sale+svc.sale, cost=oc.cost+svc.cost, saleNoVat=saleToNoVat(saleRaw,s), saleWithVat=saleToWithVat(saleRaw,s), vat=Math.max(0,saleWithVat-saleNoVat), costKnown=oc.costKnown||svc.cost>0, margin=costKnown?saleNoVat-cost:0, marginPct=(costKnown&&saleNoVat>0)?margin/saleNoVat*100:null; return {...items,serviceSale:svc.sale,serviceCost:svc.cost,orderMetalCost:oc.metalCost,orderExtraCost:oc.extraCost,orderMetalKg:oc.metalKg,saleRaw,saleNoVat,saleWithVat,vat,cost,costKnown,margin,marginPct}; }

async function handleFiles(files){ const list=[...files].filter(f=>f.name.toLowerCase().endsWith('.dxf')); if(!list.length)return; for(const file of list){ try{ const text=await file.text(); const meta=parseFilename(file.name); const parsed=parseDxf(text); const item=makeItem({source:'dxf',fileName:file.webkitRelativePath||file.name,name:meta.name,qty:meta.qty,thickness:meta.thickness,rawEntities:parsed.entities,rawWarnings:parsed.warnings}); item.rawSize=file.size; state.items.push(item); } catch(err){ const item=makeItem({source:'manual',fileName:file.name,name:file.name,qty:1}); item.warnings.push(`Ошибка чтения DXF: ${err.message||err}`); state.items.push(item); } } detectDuplicates(); if(!state.selectedId&&state.items.length)state.selectedId=state.items[0].id; renderAll(); autosaveProject(); }
function detectDuplicates(){ for(const item of state.items)item.duplicateKey=''; const map=new Map(); for(const item of state.items){ const g=getGeometry(item); const key=`${round(g.width,1)}x${round(g.height,1)}|${round(g.cutLengthMm,1)}|${round(g.pierces,0)}|${item.thickness}|${item.material}`; item.duplicateKey=key; if(!map.has(key))map.set(key,[]); map.get(key).push(item); } for(const group of map.values()){ if(group.length>1){ const names=group.map(g=>g.name).join(', '); for(const item of group){ const msg=`Похожа на другие детали: ${names}. Можно объединить количество, если геометрия совпадает.`; if(!item.warnings.includes(msg))item.warnings.push(msg); } } } }
function mergeDuplicates(){ detectDuplicates(); const groups=new Map(); for(const item of state.items){ if(!groups.has(item.duplicateKey))groups.set(item.duplicateKey,[]); groups.get(item.duplicateKey).push(item); } const merged=[]; let mergedCount=0; for(const group of groups.values()){ const first=group[0]; if(group.length>1){ first.qty=group.reduce((a,x)=>a+num(x.qty,0),0); first.name=`${first.name} / объединено ${group.length} поз.`; first.note=`${first.note||''}\nОбъединено: ${group.map(x=>x.fileName||x.name).join('; ')}`.trim(); first.warnings=first.warnings.filter(w=>!w.startsWith('Похожа на другие детали')); mergedCount+=group.length-1; } merged.push(first); } state.items=merged; if(mergedCount)alert(`Объединено дублей: ${mergedCount}`); renderAll(); autosaveProject(); }

function renderAll(){ renderMaterialSelects(); renderPriceEditors(); renderTable(); renderGeometryEditor(); renderSummary(); renderLog(); renderServices(); renderQuote(); renderProduction(); renderCalcDetails(); renderLayouts(); const has=state.items.length>0; els.btnExportCsv.disabled=!has; els.btnSaveProject.disabled=!has&&!state.services.length&&!state.layouts.length; els.btnClear.disabled=!has&&!state.services.length&&!state.layouts.length; els.btnCopyQuote.disabled=!has&&!state.services.length; els.btnMergeDuplicates.disabled=state.items.length<2; }
function renderSummary(){ const t=calcTotals(); els.sumFiles.textContent=state.items.length; els.sumQty.textContent=fmtNumber(t.qty,0); els.sumCut.textContent=`${fmtNumber(t.cut,2)} м`; els.sumWeight.textContent=`${fmtNumber(t.weight,1)} кг`; els.sumCost.textContent=t.costKnown?fmtMoney(t.cost):'не заполнено'; els.sumTotal.textContent=fmtMoney(t.saleWithVat); els.sumMargin.textContent=t.costKnown?`${fmtMoney(t.margin)} / ${fmtNumber(t.marginPct,1)}%`:'—'; }
function validationIssues(item){
  const issues=[];
  if(num(item.bends,0)>0 && num(item.bendLengthMm,0)<=0) issues.push('Гибка указана, но длина гиба = 0. Заполни длину гиба.');
  return issues;
}
function itemStatus(item){ const pi=priceIssues(item); const vi=validationIssues(item); if(pi.length)return ['bad',`${pi.length} цена`]; if(vi.length)return ['warn',`${vi.length} замеч.`]; if(!item.rawEntities&&item.source==='dxf')return ['warn','без DXF']; if(item.warnings&&item.warnings.length)return ['warn',`${item.warnings.length} замеч.`]; return ['ok','OK']; }
function optionHtml(options, selected){ return options.map(v=>`<option value="${escapeHtml(v)}" ${String(v)===String(selected)?'selected':''}>${escapeHtml(v)}</option>`).join(''); }
function inputVal(v){ return (v === undefined || v === null || v === 0 || v === '0') ? '' : String(v); }

const POS_COLUMNS = [
  { key:'select', label:'✓', sortable:false, filter:false },
  { key:'preview', label:'Превью', sortable:false, filter:false },
  { key:'name', label:'Деталь', field:'name', sortable:true, filter:true, filterType:'text' },
  { key:'qty', label:'Кол-во', field:'qty', sortable:true, filter:true, filterType:'text' },
  { key:'material', label:'Мат.', field:'material', sortable:true, filter:true, filterType:'select' },
  { key:'thickness', label:'t', field:'thickness', sortable:true, filter:true, filterType:'text' },
  { key:'size', label:'Габарит', sortable:true, filter:true, filterType:'text' },
  { key:'cut', label:'Рез', field:'cut', sortable:true, filter:true, filterType:'bool' },
  { key:'bends', label:'Гибы', field:'bends', sortable:true, filter:true, filterType:'text' },
  { key:'bendLengthMm', label:'Дл. гиба', field:'bendLengthMm', sortable:true, filter:true, filterType:'text' },
  { key:'paintLayers', label:'Полим.', field:'paintLayers', sortable:true, filter:true, filterType:'text' },
  { key:'ral', label:'RAL', field:'ral', sortable:true, filter:true, filterType:'text' },
  { key:'paintTexture', label:'Текстура', field:'paintTexture', sortable:true, filter:true, filterType:'text' },
  { key:'weldPriceOne', label:'Сварка ₽/шт', field:'weldPriceOne', sortable:true, filter:true, filterType:'text' },
  { key:'serviceText', label:'Доп. прим.', field:'serviceText', sortable:true, filter:true, filterType:'text' },
  { key:'productionNote', label:'Прим.', field:'productionNote', sortable:true, filter:true, filterType:'text' },
  { key:'total', label:'Итого', sortable:true, filter:true, filterType:'text' },
  { key:'status', label:'Статус', sortable:true, filter:true, filterType:'text' },
];
const POS_PASTE_FIELDS = ['name','qty','material','thickness','cut','bends','bendLengthMm','paintLayers','ral','paintTexture','weldPriceOne','serviceText','productionNote'];
const CALC_PASTE_FIELDS = ['metalFactor','cutFactor','bendFactor','paintFactor'];
function sortArrow(field){ return positionSort.field===field ? (positionSort.dir==='asc' ? ' ↑' : ' ↓') : ''; }
function renderPositionTableHeader(){
  if(!els.itemsTable) return;
  const thead = els.itemsTable.querySelector('thead');
  if(!thead) return;
  const header = POS_COLUMNS.map(col=>{
    if(!col.sortable) return `<th>${escapeHtml(col.label)}</th>`;
    return `<th><button class="sort-head" type="button" data-sort-field="${escapeHtml(col.key)}">${escapeHtml(col.label)}${sortArrow(col.key)}</button></th>`;
  }).join('');
  const filters = POS_COLUMNS.map(col=>{
    if(!col.filter) return '<th></th>';
    const val = positionFilters[col.key] ?? '';
    if(col.filterType==='select'){
      return `<th><select class="filter-cell" data-filter-field="${escapeHtml(col.key)}"><option value="">Все</option>${materialNames().map(m=>`<option value="${escapeHtml(m)}" ${String(val)===m?'selected':''}>${escapeHtml(m)}</option>`).join('')}</select></th>`;
    }
    if(col.filterType==='bool'){
      return `<th><select class="filter-cell" data-filter-field="${escapeHtml(col.key)}"><option value="">Все</option><option value="да" ${val==='да'?'selected':''}>Да</option><option value="нет" ${val==='нет'?'selected':''}>Нет</option></select></th>`;
    }
    return `<th><input class="filter-cell" data-filter-field="${escapeHtml(col.key)}" value="${escapeHtml(val)}" placeholder="фильтр"></th>`;
  }).join('');
  thead.innerHTML = `<tr>${header}</tr><tr class="filter-row no-print">${filters}</tr>`;
  bindPositionHeaderEvents();
}
function bindPositionHeaderEvents(){
  if(!els.itemsTable) return;
  els.itemsTable.querySelectorAll('[data-sort-field]').forEach(btn=>btn.addEventListener('click',()=>{
    const field = btn.dataset.sortField;
    if(positionSort.field !== field) positionSort = { field, dir:'asc' };
    else if(positionSort.dir === 'asc') positionSort.dir = 'desc';
    else positionSort = { field:'', dir:'asc' };
    renderTable();
  }));
  els.itemsTable.querySelectorAll('[data-filter-field]').forEach(input=>{
    const ev = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(ev,()=>{
      const value = String(input.value || '').trim();
      if(value) positionFilters[input.dataset.filterField] = value;
      else delete positionFilters[input.dataset.filterField];
      renderTable();
    });
  });
}
function numericCompareMatch(numValue, filter){
  const f = String(filter || '').trim().replace(',', '.');
  const m = f.match(/^(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/);
  if(!m) return null;
  const value = num(numValue, NaN), target = Number(m[2]);
  if(!Number.isFinite(value) || !Number.isFinite(target)) return false;
  if(m[1]==='>') return value > target;
  if(m[1]==='<') return value < target;
  if(m[1]==='>=') return value >= target;
  if(m[1]==='<=') return value <= target;
  return Math.abs(value-target) < 1e-9;
}
function matchesFilter(value, filter){
  const f = String(filter || '').trim().toLowerCase();
  if(!f) return true;
  const cmp = numericCompareMatch(value, f);
  if(cmp !== null) return cmp;
  return String(value ?? '').toLowerCase().includes(f);
}
function posValue(item, key){
  const c=calcItem(item), g=getGeometry(item), st=itemStatus(item);
  switch(key){
    case 'name': return `${item.name || ''} ${item.fileName || ''}`;
    case 'qty': return c.qty;
    case 'material': return item.material || '';
    case 'thickness': return c.t;
    case 'size': return `${fmtNumber(g.width,1)}×${fmtNumber(g.height,1)}`;
    case 'cut': return item.ops?.cut ? 'да' : 'нет';
    case 'bends': return num(item.bends,0);
    case 'bendLengthMm': return num(item.bendLengthMm,0);
    case 'paintLayers': return num(item.paintLayers,0);
    case 'ral': return item.ral || '';
    case 'paintTexture': return item.paintTexture || '';
    case 'weldPriceOne': return num(item.weldPriceOne,0);
    case 'serviceText': return item.serviceText || '';
    case 'productionNote': return item.productionNote || '';
    case 'total': return c.sale;
    case 'status': return st[1];
    default: return '';
  }
}
function getVisibleItems(){
  let arr = state.items.map((item, idx)=>({item, idx}));
  arr = arr.filter(({item})=>Object.entries(positionFilters).every(([k,v])=>matchesFilter(posValue(item,k),v)));
  if(positionSort.field){
    const dir = positionSort.dir === 'desc' ? -1 : 1;
    arr.sort((a,b)=>{
      const av=posValue(a.item, positionSort.field), bv=posValue(b.item, positionSort.field);
      const an=Number(String(av).replace(',', '.')), bn=Number(String(bv).replace(',', '.'));
      let res;
      if(Number.isFinite(an) && Number.isFinite(bn)) res = an - bn;
      else res = String(av ?? '').localeCompare(String(bv ?? ''), 'ru', {numeric:true, sensitivity:'base'});
      return res === 0 ? a.idx - b.idx : res * dir;
    });
  }
  return arr.map(x=>x.item);
}
function clearPositionFilters(){ positionFilters = {}; positionSort = { field:'', dir:'asc' }; renderTable(); }
function parseClipboardGrid(text){
  let clean = String(text ?? '').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  if(clean.endsWith('\n')) clean = clean.slice(0,-1);
  return clean.split('\n').map(row=>row.split('\t'));
}
function setLastFocusedCell(ctrl){
  const tr = ctrl.closest('tr[data-id]');
  if(!tr) return;
  lastFocusedCell = { itemId:num(tr.dataset.id), field:ctrl.dataset.posField || ctrl.dataset.calcField, mode:ctrl.dataset.posField ? 'pos' : 'calc' };
}
function handleGridPaste(e, cell=null){
  const text = e.clipboardData?.getData('text/plain') ?? '';
  if(!text || !/[\t\r\n]/.test(text)) return false;
  const active = cell || lastFocusedCell;
  if(!active || !active.field) return false;
  const fields = active.mode === 'calc' ? CALC_PASTE_FIELDS : POS_PASTE_FIELDS;
  const startCol = fields.indexOf(active.field);
  if(startCol < 0) return false;
  const ordered = active.mode === 'calc' ? state.items : getVisibleItems();
  const startRow = ordered.findIndex(x=>x.id===active.itemId);
  if(startRow < 0) return false;
  e.preventDefault();
  const grid = parseClipboardGrid(text);
  for(let r=0; r<grid.length; r++){
    const item = ordered[startRow + r];
    if(!item) continue;
    for(let c=0; c<grid[r].length; c++){
      const field = fields[startCol + c];
      if(!field) continue;
      const value = grid[r][c];
      if(active.mode === 'calc') applyCalcField(item, field, value);
      else bulkValueToField(item, field, value);
    }
  }
  detectDuplicates(); renderAll(); autosaveProject();
  return true;
}

function yesNo(v){ return v ? 'Да' : '—'; }
function paintInfo(item){ const txt=[item.ral, item.paintTexture].map(x=>String(x||'').trim()).filter(Boolean).join(' '); return txt || '—'; }
function renderTable(){
  renderPositionTableHeader();
  const visibleItems = getVisibleItems();
  if(!state.items.length){ els.itemsBody.innerHTML='<tr class="empty-row"><td colspan="18">Файлы пока не загружены.</td></tr>'; return; }
  if(!visibleItems.length){ els.itemsBody.innerHTML='<tr class="empty-row"><td colspan="18">Нет строк по текущим фильтрам.</td></tr>'; return; }
  els.itemsBody.innerHTML='';
  for(const item of visibleItems){
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
      <td><span class="status-${st}" title="${escapeHtml([...priceIssues(item), ...validationIssues(item), ...(item.warnings||[])].join('\n'))}">${txt}</span></td>`;
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
      input.addEventListener('focus',()=>setLastFocusedCell(input));
      input.addEventListener('pointerdown',()=>setLastFocusedCell(input));
      input.addEventListener(input.type==='checkbox'?'change':'change', handler);
    });
  });
}

function renderGeometryEditor(){
  if(!els.geometryEditor) return;
  const item = selectedItem();
  if(!item){
    els.geometryEditor.innerHTML = '<div class="muted-line">Выбери позицию, чтобы поправить геометрию вручную.</div>';
    return;
  }
  const g = getGeometry(item);
  const isDxf = item.source === 'dxf' && item.rawEntities;
  els.geometryEditor.innerHTML = `
    <div class="compact-title"><b>Геометрия выбранной позиции</b><span>${escapeHtml(item.name)}${isDxf ? ' · DXF' : ' · ручная/сохраненная'}</span></div>
    <div class="geometry-grid">
      <label>Габарит X, мм<input data-geom-quick="width" type="number" step="0.1" min="0" value="${round(g.width,2)}"></label>
      <label>Габарит Y, мм<input data-geom-quick="height" type="number" step="0.1" min="0" value="${round(g.height,2)}"></label>
      <label>Длина реза, мм<input data-geom-quick="cutLengthMm" type="number" step="0.1" min="0" value="${round(g.cutLengthMm,2)}"></label>
      <label>Врезки<input data-geom-quick="pierces" type="number" step="1" min="0" value="${round(g.pierces,0)}"></label>
      <label>Площадь покраски 1 шт, м²<input data-edit-quick="paintAreaM2One" type="number" step="0.001" min="0" value="${num(item.paintAreaM2One,0)}"></label>
      ${isDxf ? '<button class="secondary small" type="button" data-recalc-dxf>Вернуть из DXF</button>' : '<span class="muted-line">Для ручной позиции эти поля используются в расчете.</span>'}
    </div>`;
  els.geometryEditor.querySelectorAll('[data-geom-quick]').forEach(input=>input.addEventListener('change',()=>{
    const k=input.dataset.geomQuick;
    item.geometry=item.geometry||{width:0,height:0,cutLengthMm:0,pierces:0};
    item.geometry[k]=num(input.value,0);
    item.geometryOverridden=true;
    if(k==='width'||k==='height') item.paintAreaM2One=defaultPaintArea(item);
    renderAll(); autosaveProject();
  }));
  els.geometryEditor.querySelectorAll('[data-edit-quick]').forEach(input=>input.addEventListener('change',()=>{
    item[input.dataset.editQuick]=num(input.value,0);
    renderAll(); autosaveProject();
  }));
  const recalc = els.geometryEditor.querySelector('[data-recalc-dxf]');
  if(recalc) recalc.addEventListener('click',()=>{ item.geometryOverridden=false; refreshDxfGeometry(item); renderAll(); autosaveProject(); });
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
      const ordered = fillDrag.mode === 'pos' ? getVisibleItems() : state.items;
      const a = ordered.findIndex(x => x.id === fillDrag.sourceId);
      const b = ordered.findIndex(x => x.id === fillDrag.targetId);
      if (a < 0 || b < 0) return;
      const from = Math.min(a,b), to = Math.max(a,b);
      for (let i=from; i<=to; i++) root.querySelector(`tr[data-id="${ordered[i].id}"]`)?.classList.add('fill-target');
    });
  });
}
function finishFillDrag(){
  if (!fillDrag) return;
  const {sourceId,targetId,field,mode,value} = fillDrag;
  fillDrag = null;
  document.body.classList.remove('is-fill-dragging');
  document.querySelectorAll('tr.fill-target').forEach(x => x.classList.remove('fill-target'));
  const ordered = mode === 'pos' ? getVisibleItems() : state.items;
  const a = ordered.findIndex(x => x.id === sourceId), b = ordered.findIndex(x => x.id === targetId);
  if (a < 0 || b < 0) return;
  const from = Math.min(a,b), to = Math.max(a,b);
  for (let i=from; i<=to; i++) {
    const item = ordered[i];
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
    const visibleItems=getVisibleItems();
    const start=visibleItems.findIndex(x=>x.id===state.selectedId);
    targets=start>=0?visibleItems.slice(start):[];
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
function renderLog(){ const item=selectedItem(); if(!item){ els.logBox.textContent='Нет данных.'; return; } const warnings=[...priceIssues(item), ...validationIssues(item), ...(item.warnings||[])]; if(!warnings.length){ els.logBox.innerHTML='<div class="okline">Ошибок и замечаний нет.</div>'; return; } els.logBox.innerHTML=warnings.map(w=>`<div class="warnline">${escapeHtml(w)}</div>`).join(''); }
function renderServices(){ if(!state.services.length){ els.servicesBody.innerHTML='<tr class="empty-row"><td colspan="4">Нет дополнительных строк.</td></tr>'; return; } els.servicesBody.innerHTML=''; for(const svc of state.services){ const tr=document.createElement('tr'); tr.innerHTML=`<td><input data-svc="name" value="${escapeHtml(svc.name)}"></td><td><input data-svc="cost" type="number" step="1" value="${num(svc.cost,0)}"></td><td><input data-svc="sale" type="number" step="1" value="${num(svc.sale,0)}"></td><td><button class="danger small">×</button></td>`; tr.querySelectorAll('[data-svc]').forEach(input=>input.addEventListener('input',()=>{ const k=input.dataset.svc; svc[k]=input.type==='number'?num(input.value,0):input.value; renderSummary(); autosaveProject(); })); tr.querySelector('button').addEventListener('click',()=>{ state.services=state.services.filter(x=>x.id!==svc.id); renderAll(); autosaveProject(); }); els.servicesBody.appendChild(tr); } }

function renderPriceEditors(){ renderMaterialSelects(); syncPaintInputsFromPrices(); renderMetalPriceEditor(); renderSheetPriceEditor(); renderCutPriceEditor(); renderBendPriceEditor(); }
function renderMetalPriceEditor(){ const thicknesses=[...new Set(prices.materials.flatMap(m=>Object.keys(m.prices||{})))].sort((a,b)=>num(a)-num(b)); let html='<table class="price-table"><thead><tr><th>Материал</th><th>Плотность</th>'+thicknesses.map(t=>`<th>${escapeHtml(t)} мм</th>`).join('')+'<th></th></tr></thead><tbody>'; prices.materials.forEach((m,mi)=>{ html+=`<tr><td><input data-price="material-name" data-mi="${mi}" value="${escapeHtml(m.name)}"></td><td><input data-price="density" data-mi="${mi}" type="number" step="1" value="${num(m.density,7850)}"></td>${thicknesses.map(t=>`<td><input data-price="metal" data-mi="${mi}" data-t="${escapeHtml(t)}" type="number" step="0.01" value="${m.prices?.[t]??''}"></td>`).join('')}<td><button class="danger small" data-remove-material="${mi}">×</button></td></tr>`; }); html+='</tbody></table>'; els.metalPriceEditor.innerHTML=html; bindPriceEditorEvents(); }
function renderSheetPriceEditor(){
  if(!els.sheetPriceEditor) return;
  let rows='';
  prices.materials.forEach((m, mi)=>{
    const sheetPrices = m.sheetPrices || {};
    const thicknesses = Object.keys(sheetPrices).sort((a,b)=>num(a)-num(b));
    thicknesses.forEach(t=>{
      const list = Array.isArray(sheetPrices[t]) ? sheetPrices[t] : [];
      list.forEach((e, ei)=>{
        rows += `<tr><td><select data-sheet="material" data-mi="${mi}" data-t="${escapeHtml(t)}" data-ei="${ei}">${prices.materials.map((mat,idx)=>`<option value="${idx}" ${idx===mi?'selected':''}>${escapeHtml(mat.name)}</option>`).join('')}</select></td><td><input data-sheet="thickness" data-mi="${mi}" data-t="${escapeHtml(t)}" data-ei="${ei}" type="number" step="0.1" value="${escapeHtml(t)}"></td><td><input data-sheet="width" data-mi="${mi}" data-t="${escapeHtml(t)}" data-ei="${ei}" type="number" step="1" value="${num(e.width,0)}"></td><td><input data-sheet="length" data-mi="${mi}" data-t="${escapeHtml(t)}" data-ei="${ei}" type="number" step="1" value="${num(e.length,0)}"></td><td><input data-sheet="priceKg" data-mi="${mi}" data-t="${escapeHtml(t)}" data-ei="${ei}" type="number" step="0.01" value="${num(e.priceKg,0)}"></td><td><button class="danger small" data-remove-sheet data-mi="${mi}" data-t="${escapeHtml(t)}" data-ei="${ei}">×</button></td></tr>`;
      });
    });
  });
  els.sheetPriceEditor.innerHTML = `<table class="price-table simple sheet-price-table"><thead><tr><th>Материал</th><th>Толщина</th><th>Ширина</th><th>Длина</th><th>Цена ₽/кг</th><th></th></tr></thead><tbody>${rows || '<tr class="empty-row"><td colspan="6">Раскрои листа не добавлены.</td></tr>'}</tbody></table>`;
  bindSheetPriceEvents();
}
function removeSheetPrice(mi, t, ei){
  const m=prices.materials[mi]; if(!m || !m.sheetPrices || !Array.isArray(m.sheetPrices[t])) return;
  m.sheetPrices[t].splice(ei,1);
  if(!m.sheetPrices[t].length) delete m.sheetPrices[t];
  savePrices(); renderAll(); autosaveProject();
}
function moveSheetPrice(oldMi, oldT, oldEi, newMi, newT){
  const oldM=prices.materials[oldMi], newM=prices.materials[newMi];
  if(!oldM || !newM || !oldM.sheetPrices || !Array.isArray(oldM.sheetPrices[oldT])) return null;
  const entry=oldM.sheetPrices[oldT][oldEi]; if(!entry) return null;
  oldM.sheetPrices[oldT].splice(oldEi,1);
  if(!oldM.sheetPrices[oldT].length) delete oldM.sheetPrices[oldT];
  if(!newM.sheetPrices) newM.sheetPrices={};
  if(!newM.sheetPrices[newT]) newM.sheetPrices[newT]=[];
  newM.sheetPrices[newT].push(entry);
  return entry;
}
function bindSheetPriceEvents(){
  if(!els.sheetPriceEditor) return;
  els.sheetPriceEditor.querySelectorAll('[data-sheet]').forEach(input=>input.addEventListener('change',()=>{
    const oldMi=Number(input.dataset.mi), oldT=input.dataset.t, oldEi=Number(input.dataset.ei);
    const currentM=prices.materials[oldMi];
    let entry=currentM?.sheetPrices?.[oldT]?.[oldEi];
    if(!entry) return;
    let targetMi=oldMi, targetT=oldT;
    if(input.dataset.sheet==='material') targetMi=Number(input.value);
    if(input.dataset.sheet==='thickness') targetT=thicknessKey(input.value);
    if(targetMi!==oldMi || targetT!==oldT) entry=moveSheetPrice(oldMi, oldT, oldEi, targetMi, targetT) || entry;
    if(input.dataset.sheet==='width') entry.width=Math.max(0,num(input.value,0));
    if(input.dataset.sheet==='length') entry.length=Math.max(0,num(input.value,0));
    if(input.dataset.sheet==='priceKg') entry.priceKg=Math.max(0,num(input.value,0));
    entry.size = `${num(entry.width,0)}х${num(entry.length,0)}`;
    const mat=prices.materials[targetMi];
    if(mat){ if(!mat.prices) mat.prices={}; mat.prices[targetT]=num(entry.priceKg,0); }
    savePrices(); renderAll(); autosaveProject();
  }));
  els.sheetPriceEditor.querySelectorAll('[data-remove-sheet]').forEach(btn=>btn.addEventListener('click',()=>removeSheetPrice(Number(btn.dataset.mi), btn.dataset.t, Number(btn.dataset.ei))));
}
function addSheetPrice(){
  const mat = materialNames()[0] || 'гк ст3';
  const rec = materialRecord(mat);
  const m = rec || prices.materials[0];
  if(!m) return;
  const t = '3';
  if(!m.sheetPrices) m.sheetPrices = {};
  if(!m.sheetPrices[t]) m.sheetPrices[t] = [];
  m.sheetPrices[t].push({ size:'1250х2500', width:1250, length:2500, priceKg: num(m.prices?.[t],0) || 0 });
  savePrices(); renderAll(); autosaveProject();
}

function renderCutPriceEditor(){
  const groups = prices.cutGroups || [];
  let html = '<table class="price-table simple"><thead><tr><th>Группа</th><th>Толщина, мм</th><th>Резка, ₽/м</th><th>Прожиг, ₽/шт</th></tr></thead><tbody>';
  groups.forEach((g,gi)=>{
    const keys=[...new Set([...Object.keys(g.rates||{}),...Object.keys(g.pierces||{})])].sort((a,b)=>num(a)-num(b));
    html += `<tr class="group-row"><th colspan="4">${escapeHtml(g.label)} <span class="muted-line">${escapeHtml((g.materials||[]).join(', '))}</span></th></tr>`;
    keys.forEach(k=>{ html+=`<tr><td></td><td>${escapeHtml(k)}</td><td><input data-price="cut-rate" data-gi="${gi}" data-t="${escapeHtml(k)}" type="number" step="0.01" value="${g.rates?.[k]??''}"></td><td><input data-price="cut-pierce" data-gi="${gi}" data-t="${escapeHtml(k)}" type="number" step="0.01" value="${g.pierces?.[k]??''}"></td></tr>`; });
  });
  html += '</tbody></table>';
  els.cutPriceEditor.innerHTML=html;
  bindPriceEditorEvents();
}
function renderBendPriceEditor(){
  const keys=sortedThicknessKeys(prices.bend);
  let html='<table class="price-table simple"><thead><tr><th>Толщина, мм</th><th>до 500</th><th>до 1500</th><th>до 3000</th><th></th></tr></thead><tbody>';
  keys.forEach(k=>{ const row=prices.bend[k] && typeof prices.bend[k]==='object' ? prices.bend[k] : {'500':prices.bend[k]||'', '1500':prices.bend[k]||'', '3000':prices.bend[k]||''}; html+=`<tr><td><input data-bend-key="${escapeHtml(k)}" value="${escapeHtml(k)}"></td><td><input data-price="bend-tier" data-tier="500" data-t="${escapeHtml(k)}" type="number" step="0.01" value="${row['500']??''}"></td><td><input data-price="bend-tier" data-tier="1500" data-t="${escapeHtml(k)}" type="number" step="0.01" value="${row['1500']??''}"></td><td><input data-price="bend-tier" data-tier="3000" data-t="${escapeHtml(k)}" type="number" step="0.01" value="${row['3000']??''}"></td><td><button class="danger small" data-remove-bend="${escapeHtml(k)}">×</button></td></tr>`; });
  html+='</tbody></table>';
  els.bendPriceEditor.innerHTML=html;
  bindPriceEditorEvents();
}
function bindPriceEditorEvents(){
  document.querySelectorAll('[data-price]').forEach(input=>input.oninput=()=>{
    const type=input.dataset.price;
    if(type==='material-name'){
      const old=prices.materials[input.dataset.mi].name;
      prices.materials[input.dataset.mi].name=input.value.trim()||old;
      state.items.forEach(it=>{ if(it.material===old)it.material=prices.materials[input.dataset.mi].name; });
    } else if(type==='density') prices.materials[input.dataset.mi].density=num(input.value,7850);
    else if(type==='metal') prices.materials[input.dataset.mi].prices[input.dataset.t]=num(input.value,0);
    else if(type==='cut-rate') prices.cutGroups[input.dataset.gi].rates[input.dataset.t]=input.value === '' ? '' : num(input.value,0);
    else if(type==='cut-pierce') prices.cutGroups[input.dataset.gi].pierces[input.dataset.t]=input.value === '' ? '' : num(input.value,0);
    else if(type==='bend-tier') { const t=input.dataset.t; if(!prices.bend[t] || typeof prices.bend[t] !== 'object') prices.bend[t]={'500':'','1500':'','3000':''}; prices.bend[t][input.dataset.tier]=input.value === '' ? '' : num(input.value,0); }
    else if(type==='cut') prices.cut[input.dataset.t]=num(input.value,0);
    else if(type==='bend') prices.bend[input.dataset.t]=num(input.value,0);
    savePrices(); renderTable(); renderSummary(); renderEditor();
  });
  document.querySelectorAll('[data-remove-material]').forEach(btn=>btn.onclick=()=>{ if(prices.materials.length<=1)return alert('Должен остаться хотя бы один материал.'); prices.materials.splice(Number(btn.dataset.removeMaterial),1); savePrices(); renderAll(); });
  document.querySelectorAll('[data-remove-cut]').forEach(btn=>btn.onclick=()=>{ delete prices.cut[btn.dataset.removeCut]; savePrices(); renderAll(); });
  document.querySelectorAll('[data-remove-bend]').forEach(btn=>btn.onclick=()=>{ delete prices.bend[btn.dataset.removeBend]; savePrices(); renderAll(); });
  document.querySelectorAll('[data-cut-key]').forEach(input=>input.onchange=()=>renamePriceKey(prices.cut,input.dataset.cutKey,input.value));
  document.querySelectorAll('[data-bend-key]').forEach(input=>input.onchange=()=>renamePriceKey(prices.bend,input.dataset.bendKey,input.value));
}
function renamePriceKey(obj, oldKey, newKey){ newKey=thicknessKey(newKey); if(!newKey)return renderAll(); if(newKey!==oldKey){ obj[newKey]=obj[oldKey]; delete obj[oldKey]; savePrices(); renderAll(); } }
function addMaterial(){ const name=prompt('Название материала', 'Новый материал'); if(!name)return; prices.materials.push({name, aliases:[], density:7850, prices:{'3':0,'6':0}}); savePrices(); renderAll(); }
function addCutThickness(){ const t=thicknessKey(prompt('Толщина, мм', '3')); if(!t)return; (prices.cutGroups||[]).forEach(g=>{ if(!g.rates)g.rates={}; if(!g.pierces)g.pierces={}; if(g.rates[t]===undefined)g.rates[t]=0; if(g.pierces[t]===undefined)g.pierces[t]=0; }); prices.cut[t]=0; savePrices(); renderAll(); }
function addBendThickness(){ const t=thicknessKey(prompt('Толщина, мм', '3')); if(!t)return; prices.bend[t]={'500':0,'1500':0,'3000':0}; savePrices(); renderAll(); }


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
  if(els.quoteTermsText){
    const terms=[];
    if(s.leadTime) terms.push(`<div><b>Срок изготовления:</b> ${escapeHtml(s.leadTime)}</div>`);
    if(s.paymentTerms) terms.push(`<div><b>Оплата:</b> ${escapeHtml(s.paymentTerms)}</div>`);
    if(s.deliveryTerms) terms.push(`<div><b>Доставка:</b> ${escapeHtml(s.deliveryTerms)}</div>`);
    if(s.clientComment) terms.push(`<div><b>Комментарий:</b> ${escapeHtml(s.clientComment).replace(/\n/g,'<br>')}</div>`);
    els.quoteTermsText.innerHTML = terms.length ? terms.join('') : '<div class="muted-line">Срок, оплата и доставка не заполнены.</div>';
  }
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
  if(type==='readonly') return `<label>${label}<input class="cost-cell" data-order-cost-view="${name}" type="number" step="0.01" value="${value || ''}" readonly></label>`;
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
    <td>${fmtMoney(c.weldSale)}</td><td><b>${fmtMoney(c.sale)}</b></td>
  </tr>`; }).join('');
  let totals={weight:0,metalSale:0,cutSale:0,bendSale:0,paintSale:0,weldSale:0,sale:0};
  for(const item of state.items){ const c=calcItem(item); for(const k of Object.keys(totals)) totals[k]+=c[k]||0; }
  els.calcDetails.innerHTML=`
    <div class="table-wrap"><table class="mini-table calc-table"><thead><tr><th>№</th><th>Деталь</th><th>Вес</th><th>Км</th><th>Металл</th><th>Кр</th><th>Резка</th><th>Кгиб</th><th>Гибка</th><th>Кпол</th><th>Полимерка</th><th>Сварка</th><th>Продажа</th></tr></thead><tbody>${rows || '<tr class="empty-row"><td colspan="13">Нет позиций.</td></tr>'}</tbody><tfoot><tr><th colspan="2">ИТОГО</th><th>${fmtNumber(totals.weight,2)}</th><th></th><th>${fmtMoney(totals.metalSale)}</th><th></th><th>${fmtMoney(totals.cutSale)}</th><th></th><th>${fmtMoney(totals.bendSale)}</th><th></th><th>${fmtMoney(totals.paintSale)}</th><th>${fmtMoney(totals.weldSale)}</th><th>${fmtMoney(t.saleWithVat)}</th></tr></tfoot></table></div>
    <div class="cost-summary-grid">
      <section class="order-cost-box">
        <h3>Себестоимость заказа</h3>
        <div class="cost-grid">
          ${orderCostInput('material','Материал',oc.material,'select')}
          ${orderCostInput('widthMm','Ширина листа, мм',oc.widthMm)}
          ${orderCostInput('lengthMm','Длина листа, мм',oc.lengthMm)}
          ${orderCostInput('thicknessMm','Толщина, мм',oc.thicknessMm)}
          ${orderCostInput('sheets','Кол-во листов/заготовок',oc.sheets)}
          ${orderCostInput('priceKg','Цена из прайса, ₽/кг',oc.priceKg,'readonly')}
          ${orderCostInput('extraCost','Себ. доп., ₽',oc.extraCost)}
        </div>
        ${oc.priceIssue ? `<div class="warnline">${escapeHtml(oc.priceIssue)}</div>` : ''}
        <div class="cost-result-row"><span>Вес металла</span><b>${oc.metalCostKnown ? `${fmtNumber(oc.metalKg,2)} кг` : 'не заполнено'}</b></div>
        <div class="cost-result-row"><span>Себ. металл</span><b>${oc.metalCostKnown ? fmtMoney(oc.metalCost) : 'не заполнено'}</b></div>
        <div class="cost-result-row"><span>Себ. доп.</span><b>${oc.extraCost>0 ? fmtMoney(oc.extraCost) : '—'}</b></div>
      </section>
      <section class="totals-box calc-totals-box">
        <div><span>Итого без НДС</span><strong>${fmtMoney(t.saleNoVat)}</strong></div>
        <div><span>НДС</span><strong>${fmtMoney(t.vat)}</strong></div>
        <div><span>Себестоимость</span><strong>${t.costKnown ? fmtMoney(t.cost) : 'не заполнена'}</strong></div>
        <div><span>Маржа</span><strong>${t.costKnown ? `${fmtMoney(t.margin)} / ${fmtNumber(t.marginPct,1)}%` : '— себестоимость не заполнена'}</strong></div>
        <div class="grand"><span>Итого с НДС</span><strong>${fmtMoney(t.saleWithVat)}</strong></div>
      </section>
    </div>`;
  els.calcDetails.querySelectorAll('[data-calc-field]').forEach(input=>{ input.addEventListener('focus',()=>setLastFocusedCell(input)); input.addEventListener('pointerdown',()=>setLastFocusedCell(input)); input.addEventListener('change',()=>{ const item=state.items.find(x=>x.id===num(input.closest('tr').dataset.id)); if(!item)return; applyCalcField(item,input.dataset.calcField,input.value); renderAll(); autosaveProject(); }); });
  els.calcDetails.querySelectorAll('[data-order-cost]').forEach(input=>input.addEventListener('change',()=>{ const k=input.dataset.orderCost; state.orderCost[k]=input.type==='number'?num(input.value,0):input.value; if(['material','thicknessMm','widthMm','lengthMm'].includes(k)){ const rec=materialRecord(state.orderCost.material); state.orderCost.priceKg=exactMaterialPrice(rec,state.orderCost.thicknessMm,state.orderCost.widthMm,state.orderCost.lengthMm,0); } renderAll(); autosaveProject(); }));
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
function makeProjectData(includeImages=true){ const layouts=includeImages?state.layouts:state.layouts.map(l=>({...l, imageData:'', autosaveImageSkipped:true})); return { version:VERSION, savedAt:new Date().toISOString(), settings:getSettings(), prices, orderCost: state.orderCost, items:state.items.map(item=>({...item, savedNoDxf:item.source==='dxf', previewSvg:makeSvg(item), rawEntities:null, entities:null, analysis:null})), services:state.services, layouts }; }
function saveProject(){ downloadText(`project_${dateStamp()}.json`, JSON.stringify(makeProjectData(), null, 2), 'application/json'); }
async function loadProject(file){ const data=JSON.parse(await file.text()); if(data.prices){ prices=data.prices; savePrices(); syncPaintInputsFromPrices(); } if(data.settings){ for(const [k,v] of Object.entries(data.settings)){ if(els[k]){ let value=v; if(k==='vatRate'&&num(value,20)<=1)value=num(value,0.2)*100; if(els[k].type==='checkbox')els[k].checked=Boolean(value); else els[k].value=value; } } if(els.minCut)els.minCut.value=0; saveSettings(); } state.nextId=1; state.nextServiceId=1; state.nextLayoutId=1; state.orderCost = data.orderCost || state.orderCost; state.items=(data.items||[]).map(x=>{ const item={...x, rawEntities:null, entities:[], analysis:{bbox:{minX:0,minY:0,maxX:0,maxY:0,width:x.geometry?.width||0,height:x.geometry?.height||0},cutLength:x.geometry?.cutLengthMm||0,pierces:x.geometry?.pierces||0,warnings:[],layers:[],segments:[]}}; item.id=state.nextId++; item.source=item.source||'manual'; item.ops={...defaultOps(), ...(item.ops||{})}; normalizeItem(item); item.warnings=Array.isArray(item.warnings)?item.warnings:[]; if(item.source==='dxf' && !item.rawEntities){ const msg='Проект загружен без исходной DXF-геометрии. Расчет и превью сохранены, но для повторной проверки загрузи DXF заново.'; if(!item.warnings.includes(msg)) item.warnings.push(msg); } return item; }); state.services=(data.services||[]).map(x=>({...x,id:state.nextServiceId++})); state.layouts=(data.layouts||[]).map(x=>({...x,id:state.nextLayoutId++})); state.selectedId=state.items[0]?.id||null; renderAll(); autosaveProject(); }
function exportCsv(){ const rows=[['Деталь','Кол-во','Материал','Толщина','Габарит X','Габарит Y','Рез м','Врезки','Вес кг','Металл','Резка','Гибка','Покраска','Итого продажа','Себестоимость']]; for(const item of state.items){ const c=calcItem(item), g=getGeometry(item); rows.push([item.name,c.qty,item.material,c.t,round(g.width,2),round(g.height,2),round(c.cutMTotal,3),c.piercesTotal,round(c.weightTotal,3),round(c.metalSale,2),round(c.cutSale,2),round(c.bendSale,2),round(c.paintSale,2),round(c.sale,2),round(c.cost,2)]); } const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n'); downloadText(`dxf_calc_${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8'); }
function copyQuote(){ const t=calcTotals(), s=getSettings(); const lines=[]; lines.push(`КП${s.orderNo?' №'+s.orderNo:''}${s.clientName?' — '+s.clientName:''}`); lines.push(''); state.items.forEach((item,i)=>{ const c=calcItem(item); const priceOne=c.qty?c.sale/c.qty:0; lines.push(`${i+1}. ${item.name} | t=${fmtNumber(c.t,1)} мм | ${item.material} | ${fmtNumber(c.qty,0)} шт | ${fmtMoney(priceOne)} | ${fmtMoney(c.sale)}`); }); if(state.services.length){ lines.push(''); state.services.forEach((svc,i)=>lines.push(`Доп. ${i+1}. ${svc.name} — ${fmtMoney(num(svc.sale,0))}`)); } lines.push(''); lines.push(`Итого без НДС: ${fmtMoney(t.saleNoVat)}`); lines.push(`НДС: ${fmtMoney(t.vat)}`); lines.push(`Итого с НДС: ${fmtMoney(t.saleWithVat)}`); const terms=[]; if(s.leadTime) terms.push(`Срок изготовления: ${s.leadTime}`); if(s.paymentTerms) terms.push(`Оплата: ${s.paymentTerms}`); if(s.deliveryTerms) terms.push(`Доставка: ${s.deliveryTerms}`); if(s.clientComment) terms.push(`Комментарий: ${s.clientComment}`); if(terms.length){ lines.push(''); lines.push(...terms); } navigator.clipboard?.writeText(lines.join('\n')); alert('КП скопировано в буфер обмена.'); }
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
function downscaleImageDataUrl(file, maxSize=1800, quality=0.82){
  return new Promise((resolve,reject)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{
      try{
        const scale=Math.min(1, maxSize/Math.max(img.width,img.height));
        const w=Math.max(1, Math.round(img.width*scale)), h=Math.max(1, Math.round(img.height*scale));
        const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
        const type='image/jpeg'; const data=canvas.toDataURL(type, quality);
        URL.revokeObjectURL(url); resolve({data,width:w,height:h,compressed:scale<1 || file.size>900000});
      } catch(err){ URL.revokeObjectURL(url); reject(err); }
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('Не удалось открыть картинку раскладки')); };
    img.src=url;
  });
}
async function addLayoutFiles(files){
  const list=[...files].filter(f=>/^image\/(png|jpeg)$/.test(f.type)||/\.(png|jpe?g)$/i.test(f.name));
  if(!list.length) throw new Error('Выбери JPEG или PNG раскладку. LXDS в этой версии добавляется через отдельный просмотрщик/сервер.');
  let bigCount=0;
  for(const file of list){
    const img=await downscaleImageDataUrl(file);
    if(file.size>900000 || img.compressed) bigCount++;
    state.layouts.push({ id:state.nextLayoutId++, fileName:file.name, imageData:img.data, originalSize:file.size, material:getSettings().defaultMaterial, thickness:getSettings().defaultThickness, sheetSize:'', sheetCount:1, usage:'', fill:'', comment: img.compressed ? 'Картинка сжата для автосохранения.' : '' });
  }
  if(bigCount) alert('Часть картинок раскладки была сжата, чтобы не сломать автосохранение браузера. Оригиналы храни в папке заказа.');
  renderAll(); autosaveProject();
}

function bindEvents(){ els.btnSelectFiles.addEventListener('click',()=>els.fileInput.click()); els.btnSelectFolder.addEventListener('click',()=>els.folderInput.click()); els.fileInput.addEventListener('change',e=>handleFiles(e.target.files)); els.folderInput.addEventListener('change',e=>handleFiles(e.target.files)); els.dropzone.addEventListener('dragover',e=>{e.preventDefault();els.dropzone.classList.add('dragover');}); els.dropzone.addEventListener('dragleave',()=>els.dropzone.classList.remove('dragover')); els.dropzone.addEventListener('drop',e=>{e.preventDefault();els.dropzone.classList.remove('dragover');handleFiles(e.dataTransfer.files);});
  if(els.btnAddManual)els.btnAddManual.addEventListener('click',addManualItem); if(els.btnAddManualPositions)els.btnAddManualPositions.addEventListener('click',addManualItem); els.btnAddService.addEventListener('click',addService); els.btnMergeDuplicates.addEventListener('click',mergeDuplicates); els.btnSaveProject.addEventListener('click',saveProject); els.btnLoadProject.addEventListener('click',()=>els.projectFileInput.click()); els.projectFileInput.addEventListener('change',e=>{ if(e.target.files[0])loadProject(e.target.files[0]).catch(err=>alert(err.message)); }); els.btnExportCsv.addEventListener('click',exportCsv); els.btnCopyQuote.addEventListener('click',copyQuote); els.btnClear.addEventListener('click',()=>{ if(!confirm('Очистить расчет?'))return; state.items=[]; state.services=[]; state.layouts=[]; state.orderCost={material:'гк ст3',widthMm:1250,lengthMm:2500,thicknessMm:3,sheets:0,priceKg:63.2,extraCost:0}; state.selectedId=null; renderAll(); autosaveProject(); });
  els.btnResetPrices.addEventListener('click',()=>{ if(!confirm('Сбросить базу цен к значениям по умолчанию?'))return; prices=clone(DEFAULT_PRICES); savePrices(); syncPaintInputsFromPrices(); renderAll(); }); els.btnExportPrices.addEventListener('click',exportPrices); els.btnImportPrices.addEventListener('click',()=>els.priceFileInput.click()); els.priceFileInput.addEventListener('change',e=>{ if(e.target.files[0])importPrices(e.target.files[0]).catch(err=>alert(err.message)); }); els.btnAddMaterial.addEventListener('click',addMaterial); if(els.btnAddSheetPrice)els.btnAddSheetPrice.addEventListener('click',addSheetPrice); els.btnAddCutThickness.addEventListener('click',addCutThickness); els.btnAddBendThickness.addEventListener('click',addBendThickness);
  document.querySelectorAll('.nav-tab').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active')); document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); btn.classList.add('active'); const view=$(`view-${btn.dataset.view}`); if(view)view.classList.add('active'); }));
  if(els.btnBulkApply)els.btnBulkApply.addEventListener('click',()=>applyBulk(false)); if(els.btnBulkDown)els.btnBulkDown.addEventListener('click',()=>applyBulk(true)); if(els.btnClearFilters)els.btnClearFilters.addEventListener('click',clearPositionFilters);
  if(els.btnPrintQuote)els.btnPrintQuote.addEventListener('click',()=>printSection('quote')); if(els.btnPrintProduction)els.btnPrintProduction.addEventListener('click',()=>printSection('production'));
  document.addEventListener('paste', e=>{ if(e.defaultPrevented) return; const el=document.activeElement; if(el?.dataset?.posField || el?.dataset?.calcField){ setLastFocusedCell(el); handleGridPaste(e); } });
  if(els.btnAddLayout)els.btnAddLayout.addEventListener('click',()=>els.layoutFileInput.click()); if(els.layoutFileInput)els.layoutFileInput.addEventListener('change',e=>{ if(e.target.files.length)addLayoutFiles(e.target.files).catch(err=>alert(err.message)); });
  document.querySelectorAll('.price-tab').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.price-tab').forEach(b=>b.classList.remove('active')); document.querySelectorAll('.price-tab-content').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); $(`tab-${btn.dataset.tab}`).classList.add('active'); }));
  [...SETTINGS_KEYS,'paintPriceM2','paintCostM2','powderConsumption','powderPrice'].forEach(key=>{ if(!els[key])return; const ev=els[key].type==='checkbox'?'change':'input'; els[key].addEventListener(ev,()=>{ syncPricesFromPaintInputs(); savePrices(); saveSettings(); if(['ignoreLayers','addThicknessToBlank'].includes(key))refreshAllDxfGeometry(); renderAll(); autosaveProject(); }); });
}
function init(){ loadPrices(); renderMaterialSelects(); syncPaintInputsFromPrices(); loadSettings(); if(els.minCut) els.minCut.value=0; bindEvents(); renderAll(); }
init();
