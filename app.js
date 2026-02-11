// =======================================
// PlayMash — basado en CourseMash (A/B + Elo)
// Tema: Juegos más concurridos en PlayStation
// =======================================

// =====================
// 1) Datos (edítalos)
// =====================
// Nota pedagógica: esta lista es una "candidata" a juegos concurridos.
// Puedes actualizarla cada mes con datos públicos de descargas / actividad.
const juegos = [
  "Fortnite",
  "Call of Duty: Warzone",
  "Grand Theft Auto V",
  "Roblox",
  "Minecraft",
  "EA SPORTS FC 26",
  "NBA 2K26",
  "UFC 5",
  "It Takes Two",
  "Forza Horizon 5",
  "Avatar: Frontiers of Pandora",
  "Hogwarts Legacy",
  "Battlefield 6",
  "Fallout 4",
  "The Witcher 3: Wild Hunt",
  "Among Us",
  "Rocket League",
  "Tom Clancy’s Rainbow Six Siege",
  "eFootball",
  "Marvel Rivals"
];

// “Segmento” = tipo de jugador (filtra rankings separados)
const segmentos = {
  "CAS": "Casual (juego a ratos)",
  "COMP": "Competitivo (ranked / online)",
  "COOP": "Coop/Amigos (party)",
  "HIS": "Historia/Solo (campaña)",
  "F2P": "Prefiero gratis (free-to-play)",
  "NEW": "Nuevo en PlayStation"
};

// “Contexto” = pregunta de decisión (cada contexto tiene su propio Elo)
const contextos = {
  "CONC": "¿Cuál se siente más CONCURRIDO hoy (si entro, encuentro gente/partidas rápido)?",
  "AMIG": "¿Cuál recomiendas más para jugar con AMIGOS?",
  "COMP": "¿Cuál recomiendas más para COMPETIR online?",
  "REL":  "¿Cuál recomiendas más para RELAJARME sin estrés?",
  "HIST": "¿Cuál recomiendas más si quiero HISTORIA/campaña?"
};

// Elo
const RATING_INICIAL = 1000;
const K = 32;

// =====================
// 2) Estado + storage
// =====================
const STORAGE_KEY = "playmash_state_v1";

function defaultState(){
  const buckets = {};
  for (const seg of Object.keys(segmentos)){
    for (const ctx of Object.keys(contextos)){
      const key = `${seg}__${ctx}`;
      buckets[key] = {};
      juegos.forEach(j => buckets[key][j] = RATING_INICIAL);
    }
  }
  return { buckets, votes: [] };
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); }
  catch { return defaultState(); }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// =====================
// 3) Utilidades Elo
// =====================
function expectedScore(ra, rb){
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, itemA, itemB, winner){ // winner: "A" o "B"
  const ra = bucket[itemA], rb = bucket[itemB];
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = (winner === "A") ? 1 : 0;
  const sb = (winner === "B") ? 1 : 0;

  bucket[itemA] = ra + K * (sa - ea);
  bucket[itemB] = rb + K * (sb - eb);
}

function randomPair(){
  const a = juegos[Math.floor(Math.random() * juegos.length)];
  let b = a;
  while (b === a){
    b = juegos[Math.floor(Math.random() * juegos.length)];
  }
  return [a, b];
}

function bucketKey(seg, ctx){ return `${seg}__${ctx}`; }

function topN(bucket, n=10){
  const arr = Object.entries(bucket).map(([juego, rating]) => ({ juego, rating }));
  arr.sort((x,y) => y.rating - x.rating);
  return arr.slice(0, n);
}

// =====================
// 4) UI Wiring
// =====================
const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnNewPair = document.getElementById("btnNewPair");
const btnShowTop = document.getElementById("btnShowTop");
const topBox = document.getElementById("topBox");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

let currentA = null;
let currentB = null;

function fillSelect(selectEl, obj){
  selectEl.innerHTML = "";
  for (const [k, v] of Object.entries(obj)){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} — ${v}`;
    selectEl.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

// defaults
segmentSelect.value = "CAS";
contextSelect.value = "CONC";

function refreshQuestion(){
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel(){
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  refreshQuestion();
}

function renderTop(){
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const bucket = state.buckets[bucketKey(seg, ctx)];

  const rows = topN(bucket, 10);
  topBox.innerHTML = rows.map((r, idx) => `
    <div class="toprow">
      <div><b>${idx+1}.</b> ${r.juego}</div>
      <div>${r.rating.toFixed(1)}</div>
    </div>
  `).join("");
}

function vote(winner){ // "A" o "B"
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const key = bucketKey(seg, ctx);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  const ganador = (winner === "A") ? currentA : currentB;
  const perdedor = (winner === "A") ? currentB : currentA;

  // Guardamos el voto para auditar “qué decisiones humanas alimentan el ranking”
  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentos[seg],
    contexto: contextos[ctx],
    A: currentA,
    B: currentB,
    ganador,
    perdedor
  });

  saveState();
  renderTop();
  newDuel();
}

btnA.addEventListener("click", () => vote("A"));
btnB.addEventListener("click", () => vote("B"));
btnNewPair.addEventListener("click", () => newDuel());
btnShowTop.addEventListener("click", () => renderTop());

segmentSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });
contextSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });

btnReset.addEventListener("click", () => {
  if (!confirm("Esto borrará rankings y votos guardados en este navegador. ¿Continuar?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
});

btnExport.addEventListener("click", () => {
  if (state.votes.length === 0){
    alert("Aún no hay votos para exportar.");
    return;
  }
  const headers = ["ts","segmento","contexto","A","B","ganador","perdedor"];
  const lines = [headers.join(",")];

  for (const v of state.votes){
    const row = headers.map(h => {
      const val = String(v[h] ?? "").replaceAll('"','""');
      return `"${val}"`;
    }).join(",");
    lines.push(row);
  }

  const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "playmash_votos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

// init
newDuel();
renderTop();
refreshQuestion();
