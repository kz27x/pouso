/* Pouso — trabalho em segundo plano: faz as abas paradas dormirem.
   Usa só tabs.query e tabs.discard, que não pedem permissão extra.
   Os endereços das abas (para a lista de exceções) só aparecem se a pessoa
   tiver liberado a permissão opcional "tabs". */
const DEF = { on: true, min: 30, except: [] };

function ensureAlarm() { chrome.alarms.create('pouso-sleep', { periodInMinutes: 1 }); }
chrome.runtime.onInstalled.addListener((d) => {
  ensureAlarm();
  // instalou agora: abre uma aba nova para a primeira abertura aparecer na hora
  if (d.reason === 'install') chrome.tabs.create({});
});
chrome.runtime.onStartup.addListener(ensureAlarm);

async function config() {
  const r = await chrome.storage.local.get('sleep');
  return Object.assign({}, DEF, r.sleep || {});
}

function excepted(tab, list) {
  if (!tab.url || !list.length) return false;
  let host = '';
  try { host = new URL(tab.url).hostname.replace(/^www\./, ''); } catch (e) { return false; }
  return list.some((e) => host === e || host.endsWith('.' + e));
}

async function sweep(force) {
  const cfg = await config();
  if (!force && !cfg.on) return 0;
  const now = Date.now(), limit = cfg.min * 60000;
  const tabs = await chrome.tabs.query({});
  let n = 0;
  for (const t of tabs) {
    if (t.active || t.pinned || t.audible || t.discarded || t.autoDiscardable === false) continue;
    if (t.status !== 'complete') continue;
    if (!force && now - (t.lastAccessed || now) < limit) continue;
    if (excepted(t, cfg.except)) continue;
    try { await chrome.tabs.discard(t.id); n++; } catch (e) { /* aba que o navegador não deixa dormir */ }
  }
  return n;
}

chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'pouso-sleep') sweep(false); });
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === 'sleepAll') { sweep(true).then((count) => reply({ count })); return true; }
  return false;
});
