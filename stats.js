// =====================================================
// Statistiques : tableau de bord
// - à gauche : qui a préparé (anneau) + répartition sur 6 mois (barres 100 %)
// - à droite : classements (ingrédients, restos, qui m'a fait à manger)
// Les « données d'exemple » sont générées en mémoire : rien n'est enregistré.
// =====================================================

// Ordre fixe des catégories (couleurs de la légende du calendrier)
const PREP_ORDER = [
  { key: "Moi", label: "Moi", cls: "prep-moi", cssVar: "--prep-moi" },
  { key: "Un proche", label: "Un proche", cls: "prep-proche", cssVar: "--prep-proche" },
  { key: "Un resto", label: "Resto", cls: "prep-resto", cssVar: "--prep-resto" },
  { key: "Livraison", label: "Livraison", cls: "prep-livraison", cssVar: "--prep-livraison" },
  { key: "Autre", label: "Autre", cls: "prep-autre", cssVar: "--prep-autre" },
];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const statsState = {
  mode: "month",                      // "month" | "year"
  anchor: new Date(),                 // un jour dans la période affichée
  demo: null,                         // null = choix automatique
};
let demoMealsCache = null;

function prepColor(key) {
  const p = PREP_ORDER.find(x => x.key === key) || PREP_ORDER[0];
  return getComputedStyle(document.documentElement).getPropertyValue(p.cssVar).trim();
}
function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

// ---------- Données d'exemple (déterministes) ----------
function generateDemoMeals() {
  let seed = 20260101;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const weighted = pairs => { let r = rnd() * pairs.reduce((a, [, w]) => a + w, 0); for (const [v, w] of pairs) if ((r -= w) < 0) return v; return pairs[0][0]; };

  const HOME = [
    ["Pâtes carbonara", ["Pâtes", "Lardon", "Œuf", "Parmesan", "Poivre"]],
    ["Poulet rôti", ["Poulet", "Pomme de terre", "Ail", "Thym"]],
    ["Salade composée", ["Salade", "Tomate", "Concombre", "Feta", "Huile d'olive"]],
    ["Curry de lentilles", ["Lentille corail", "Lait de coco", "Curry", "Oignon", "Riz basmati"]],
    ["Omelette", ["Œuf", "Fromage râpé", "Ciboulette"]],
    ["Risotto aux champignons", ["Riz arborio", "Champignon", "Parmesan", "Oignon"]],
    ["Soupe de légumes", ["Carotte", "Poireau", "Pomme de terre", "Oignon"]],
    ["Saumon et riz", ["Saumon", "Riz", "Brocoli", "Citron"]],
    ["Tacos maison", ["Tortilla", "Bœuf haché", "Tomate", "Oignon", "Fromage râpé"]],
    ["Pizza maison", ["Pâte à pizza", "Sauce tomate", "Mozzarella", "Basilic"]],
    ["Quiche lorraine", ["Pâte brisée", "Lardon", "Œuf", "Crème fraîche"]],
    ["Bowl poulet avocat", ["Poulet", "Avocat", "Riz", "Tomate cerise"]],
    ["Pâtes au pesto", ["Pâtes", "Pesto", "Parmesan", "Tomate cerise"]],
    ["Gratin dauphinois", ["Pomme de terre", "Crème fraîche", "Ail", "Fromage râpé"]],
  ];
  const FAMILY = [
    ["Maman", [["Lasagnes", ["Pâtes", "Bœuf haché", "Sauce tomate", "Parmesan"]], ["Blanquette de veau", ["Veau", "Carotte", "Champignon", "Crème fraîche", "Riz"]]]],
    ["Léa", [["Couscous", ["Semoule", "Poulet", "Carotte", "Courgette", "Pois chiche"]], ["Tajine", ["Poulet", "Citron", "Olive", "Oignon"]]]],
    ["Paul", [["Burger maison", ["Pain burger", "Bœuf haché", "Cheddar", "Salade", "Tomate"]]]],
    ["Papa", [["Côte de bœuf", ["Bœuf", "Pomme de terre", "Salade"]], ["Paella", ["Riz", "Crevette", "Poulet", "Poivron"]]]],
    ["Mamie", [["Pot-au-feu", ["Bœuf", "Carotte", "Poireau", "Navet"]], ["Tarte aux pommes", ["Pâte brisée", "Pomme", "Sucre"]]]],
  ];
  const RESTOS = [
    ["Chez Gino", "Pizza napolitaine", ["Pâte à pizza", "Mozzarella", "Sauce tomate", "Basilic"], 5],
    ["Sushi Kyo", "Plateau sushi", ["Riz vinaigré", "Saumon", "Algue nori", "Avocat"], 4],
    ["Le Petit Bistrot", "Entrecôte frites", ["Bœuf", "Frite", "Salade"], 3],
    ["Pho 14", "Pho au bœuf", ["Nouille de riz", "Bœuf", "Coriandre", "Citron vert"], 3],
    ["Big Mamma", "Pâtes à la truffe", ["Pâtes", "Parmesan", "Champignon", "Crème fraîche"], 2],
    ["Le Comptoir", "Croque-monsieur", ["Pain de mie", "Jambon", "Emmental", "Salade"], 2],
    ["Burger Theory", "Cheeseburger", ["Pain burger", "Bœuf haché", "Cheddar", "Frite"], 2],
    ["La Crêperie", "Galette complète", ["Farine", "Jambon", "Œuf", "Emmental"], 2],
    ["Istanbul Grill", "Kebab assiette", ["Agneau", "Frite", "Salade", "Sauce blanche"], 2],
  ];
  const DELIVERY = [
    ["Thaï Express", "Pad thaï", ["Nouille de riz", "Crevette", "Cacahuète", "Œuf"]],
    ["Poké Lab", "Poké bowl saumon", ["Riz", "Saumon", "Avocat", "Edamame"]],
    ["Pizza Hut", "Pizza pepperoni", ["Pâte à pizza", "Mozzarella", "Chorizo", "Sauce tomate"]],
    ["Bollywood", "Butter chicken", ["Poulet", "Riz basmati", "Crème liquide", "Curry"]],
  ];
  const OTHER = [["Cantine du bureau", ["Plat du jour"], 6], ["Food truck", ["Wrap poulet"], 1]];
  const BREAKFAST = [["Tartines", ["Pain", "Beurre", "Confiture"]], ["Yaourt granola", ["Yaourt", "Granola", "Fruits rouges"]], ["Porridge", ["Flocon d'avoine", "Lait", "Banane"]]];
  const SNACK = [["Pomme", ["Pomme"]], ["Crêpes", ["Farine", "Œuf", "Lait", "Sucre"]]];

  const meals = [];
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  // Moins de saisie certains mois (oublis), quasiment rien pendant les vacances d'août
  const monthFill = [0.95, 0.9, 0.7, 0.9, 0.85, 0.8, 0.75, 0.45, 0.9, 0.85, 0.9, 0.9];
  let id = 0, lastHome = null;
  for (let d = new Date(today.getFullYear(), 0, 1); d <= end; d.setDate(d.getDate() + 1)) {
    const m = d.getMonth(), wd = d.getDay(), weekend = wd === 0 || wd === 6;
    const vacation = m === 7 && d.getDate() >= 4 && d.getDate() <= 16;
    if (vacation && rnd() < 0.85) continue;
    if (rnd() > monthFill[m]) continue;                        // journée oubliée
    const date = ymd(d);
    const add = (type, by, preparer, name, ingredients, extra = {}) => meals.push({
      id: `demo-stats-${id++}`, name, date, type, course: type === "Déjeuner" || type === "Dîner" ? "Plat" : "",
      preparedBy: by, preparer, photo: null, rating: Math.round((3 + rnd() * 2) * 2) / 2,
      ingredients: ingredients.map(n => ({ name: n, qty: "", group: "" })), ...extra,
    });
    const meal = type => {
      const by = type === "Déjeuner" && !weekend
        ? weighted([["Moi", 35], ["Autre", 26], ["Un resto", 22], ["Livraison", 10], ["Un proche", 7]])
        : weekend
          ? weighted([["Moi", 36], ["Un proche", 28], ["Un resto", 24], ["Livraison", 9], ["Autre", 3]])
          : weighted([["Moi", 54], ["Un proche", 14], ["Un resto", 13], ["Livraison", 15], ["Autre", 4]]);
      if (by === "Moi") {
        if (lastHome && rnd() < 0.18) { add(type, "Moi", "", lastHome[0], lastHome[1], { leftover: true }); return; }
        const dish = pick(HOME); lastHome = dish; add(type, "Moi", "", dish[0], dish[1]); return;
      }
      if (by === "Un proche") { const [who, dishes] = weighted(FAMILY.map(f => [f, { Maman: 5, "Léa": 3, Paul: 2, Papa: 3, Mamie: 2 }[f[0]] || 1])); const dish = pick(dishes); add(type, by, who, dish[0], dish[1]); return; }
      if (by === "Un resto") { const r = weighted(RESTOS.map(x => [x, x[3]])); add(type, by, r[0], r[1], r[2]); return; }
      if (by === "Livraison") { const r = pick(DELIVERY); add(type, by, r[0], r[1], r[2]); return; }
      const o = weighted(OTHER.map(x => [x, x[2]])); add(type, "Autre", o[0], o[1][0], []);
    };
    if (rnd() < 0.18) { const b = pick(BREAKFAST); add("Petit-déjeuner", "Moi", "", b[0], b[1]); }
    if (rnd() < 0.86) meal("Déjeuner");
    if (rnd() < 0.08) { const s = pick(SNACK); add("Goûter", "Moi", "", s[0], s[1]); }
    if (rnd() < 0.88) meal("Dîner");
  }
  return meals;
}

function statsMeals() {
  if (useDemo()) return demoMealsCache || (demoMealsCache = generateDemoMeals());
  return meals;
}
function useDemo() {
  if (statsState.demo !== null) return statsState.demo;
  return meals.length < 30; // peu de vrais repas : on montre l'exemple par défaut
}

// ---------- Période ----------
function periodRange() {
  const a = statsState.anchor;
  if (statsState.mode === "year") return { start: `${a.getFullYear()}-01-01`, end: `${a.getFullYear()}-12-31`, label: String(a.getFullYear()) };
  const last = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
  const mm = String(a.getMonth() + 1).padStart(2, "0");
  return {
    start: `${a.getFullYear()}-${mm}-01`, end: `${a.getFullYear()}-${mm}-${last}`,
    label: a.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  };
}
function shiftPeriod(step) {
  const a = statsState.anchor;
  statsState.anchor = statsState.mode === "year" ? new Date(a.getFullYear() + step, a.getMonth(), 1) : new Date(a.getFullYear(), a.getMonth() + step, 1);
  renderStats();
}
function isCurrentOrFuture() {
  const now = new Date(), a = statsState.anchor;
  return statsState.mode === "year" ? a.getFullYear() >= now.getFullYear()
    : a.getFullYear() > now.getFullYear() || (a.getFullYear() === now.getFullYear() && a.getMonth() >= now.getMonth());
}

// ---------- Infobulle ----------
const chartTip = () => document.getElementById("chartTip");
function showTip(e, html) {
  const t = chartTip();
  t.innerHTML = html;
  t.hidden = false;
  const r = t.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  t.style.left = x + "px"; t.style.top = y + "px";
}
function hideTip() { chartTip().hidden = true; }
function bindTips(root) {
  root.querySelectorAll("[data-tip]").forEach(el => {
    el.addEventListener("mousemove", e => showTip(e, el.dataset.tip));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); showTip({ clientX: r.right, clientY: r.top }, el.dataset.tip); });
    el.addEventListener("blur", hideTip);
  });
}
const tipHtml = (title, color, label, value) =>
  escapeHtml(title) ? `<strong>${escapeHtml(title)}</strong><span class="tip-row"><i style="background:${color}"></i>${escapeHtml(label)}<b>${escapeHtml(value)}</b></span>` : "";

// ---------- Anneau : qui a préparé ----------
function renderDonut(list) {
  const el = document.getElementById("donutChart");
  const counts = PREP_ORDER.map(p => ({ ...p, n: list.filter(m => (m.preparedBy || "Moi") === p.key).length }));
  const total = counts.reduce((a, c) => a + c.n, 0);
  document.getElementById("donutSub").textContent = `${total} repas enregistrés · ${periodRange().label}`;
  if (!total) { el.innerHTML = `<p class="empty-chart">Aucun repas sur cette période.</p>`; return; }
  const R = 80, r = 54, C = 100;
  let angle = -Math.PI / 2;
  const arcs = counts.filter(c => c.n).map(c => {
    const a = (c.n / total) * Math.PI * 2;
    const a0 = angle, a1 = angle + a; angle = a1;
    const large = a > Math.PI ? 1 : 0;
    const p = (rad, rr) => `${(C + rr * Math.cos(rad)).toFixed(2)} ${(C + rr * Math.sin(rad)).toFixed(2)}`;
    const d = a >= Math.PI * 2 - 1e-6
      ? `M ${p(0, R)} A ${R} ${R} 0 1 1 ${p(Math.PI, R)} A ${R} ${R} 0 1 1 ${p(0, R)} M ${p(0, r)} A ${r} ${r} 0 1 0 ${p(Math.PI, r)} A ${r} ${r} 0 1 0 ${p(0, r)} Z`
      : `M ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 ${large} 0 ${p(a0, r)} Z`;
    return `<path d="${d}" fill="${prepColor(c.key)}" class="seg-arc" tabindex="0"
      data-tip="${escapeHtml(tipHtml(periodRange().label, prepColor(c.key), c.label, `${c.n} repas · ${pct(c.n, total)} %`))}"
      aria-label="${c.label} : ${c.n} repas, ${pct(c.n, total)} %"></path>`;
  }).join("");
  el.innerHTML = `
    <svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Répartition de qui a préparé les repas">
      <g class="donut-arcs">${arcs}</g>
      <text x="100" y="96" text-anchor="middle" class="donut-total">${total}</text>
      <text x="100" y="118" text-anchor="middle" class="donut-unit">repas</text>
    </svg>
    <ul class="legend-list">
      ${counts.map(c => `<li class="${c.n ? "" : "zero"}"><i class="sw" style="background:${prepColor(c.key)}"></i><span>${c.label}</span><b>${c.n}</b><em>${pct(c.n, total)} %</em></li>`).join("")}
    </ul>`;
  bindTips(el);
}

// ---------- Barres 100 % : 6 derniers mois ----------
function renderBars(all) {
  const el = document.getElementById("barsChart");
  const now = new Date();
  let endMonth = statsState.mode === "year"
    ? new Date(statsState.anchor.getFullYear(), 11, 1)
    : new Date(statsState.anchor.getFullYear(), statsState.anchor.getMonth(), 1);
  if (endMonth > now) endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(endMonth.getFullYear(), endMonth.getMonth() - i, 1));
  const H = 180;
  const cols = months.map(m => {
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = all.filter(x => x.date.startsWith(key));
    const total = inMonth.length;
    const label = `${MONTHS_FR[m.getMonth()]}${m.getMonth() === 0 || m.getFullYear() !== endMonth.getFullYear() ? " " + String(m.getFullYear()).slice(2) : ""}`;
    const longLabel = m.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    let segs = "";
    if (total) {
      // ordre fixe de bas en haut : Moi, Un proche, Resto, Livraison, Autre
      const parts = PREP_ORDER.map(p => ({ ...p, n: inMonth.filter(x => (x.preparedBy || "Moi") === p.key).length })).filter(p => p.n);
      segs = parts.map((p, idx) => {
        const h = (p.n / total) * 100;
        const top = idx === parts.length - 1, bottom = idx === 0;
        return `<div class="bar-seg${top ? " top" : ""}${bottom ? " bottom" : ""}" style="height:${h}%;background:${prepColor(p.key)}" tabindex="0"
          data-tip="${escapeHtml(tipHtml(longLabel, prepColor(p.key), p.label, `${p.n} repas · ${pct(p.n, total)} %`))}"
          aria-label="${longLabel}, ${p.label} : ${p.n} repas, ${pct(p.n, total)} %"></div>`;
      }).join("");
    }
    return `<div class="bar-col">
      <span class="bar-count">${total} repas</span>
      <div class="bar${total ? "" : " empty"}" style="height:${H}px" data-goto-month="${key}">${segs}</div>
      <button type="button" class="bar-label" data-goto-month="${key}" aria-label="Voir ${longLabel} dans le calendrier">${label}</button>
    </div>`;
  }).join("");
  el.innerHTML = `<div class="bars" role="img" aria-label="Répartition par mois de qui a préparé les repas">${cols}</div>
    <ul class="legend-list inline">${PREP_ORDER.map(p => `<li><i class="sw" style="background:${prepColor(p.key)}"></i><span>${p.label}</span></li>`).join("")}</ul>`;
  bindTips(el);
  el.querySelectorAll("[data-goto-month]").forEach(x => x.addEventListener("click", () => openMonthInCalendar(x.dataset.gotoMonth)));
}

// Clic sur un mois : on ouvre le calendrier sur ce mois
function openMonthInCalendar(key) {
  const [y, m] = key.split("-").map(Number);
  hideTip();
  viewDate = new Date(y, m - 1, 1);
  goHome();
  if (useDemo()) notify("Le calendrier montre tes vrais repas : les données d'exemple n'y apparaissent pas.");
}

// ---------- Classements ----------
function rankHtml(rows, color, emptyText) {
  if (!rows.length) return `<p class="empty-chart">${emptyText}</p>`;
  const max = Math.max(...rows.map(r => r.n));
  // Toujours 5 lignes : les places vides restent visibles pour garder la même hauteur
  const fillers = Array.from({ length: Math.max(0, 5 - rows.length) }, (_, k) => `
    <li class="placeholder" aria-hidden="true"><span class="rank-pos">${rows.length + k + 1}</span><span class="rank-name">—</span><span class="rank-bar"></span><span class="rank-val"></span></li>`).join("");
  return `<ol class="rank-list">${rows.map((r, i) => `
    <li tabindex="0" data-tip="${escapeHtml(`<strong>${escapeHtml(r.label)}</strong><span class="tip-row">${r.n} ${r.unit || "repas"}</span>`)}">
      <span class="rank-pos">${i + 1}</span>
      <span class="rank-name">${escapeHtml(r.label)}${r.sub ? `<small>${escapeHtml(r.sub)}</small>` : ""}</span>
      <span class="rank-bar"><span style="width:${Math.max(4, (r.n / max) * 100)}%;background:${r.color || color}"></span></span>
      <span class="rank-val">${r.n}</span>
    </li>`).join("")}${fillers}</ol>`;
}
function renderRankings(list) {
  const own = list.filter(m => !m.leftover);
  // 1. Ingrédients : nombre de repas où l'ingrédient apparaît
  const ing = new Map();
  own.forEach(m => new Set((m.ingredients || []).map(i => i.name)).forEach(name => {
    const k = normalizeText(name); const cur = ing.get(k) || { label: name, n: 0 }; cur.n++; ing.set(k, cur);
  }));
  const topIng = [...ing.values()].sort((a, b) => b.n - a.n).slice(0, 5).map(r => ({ ...r, unit: "repas" }));
  const ingEl = document.getElementById("rankIngredients");
  ingEl.innerHTML = rankHtml(topIng, "var(--accent)", "Aucun ingrédient enregistré sur cette période.");
  // 2. Restos
  const restos = new Map();
  own.filter(m => m.preparedBy === "Un resto" && m.preparer).forEach(m => { const k = m.preparer; restos.set(k, (restos.get(k) || 0) + 1); });
  const topRestos = [...restos].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, n]) => ({ label, n, unit: n > 1 ? "visites" : "visite" }));
  const restoEl = document.getElementById("rankRestos");
  restoEl.innerHTML = rankHtml(topRestos, prepColor("Un resto"), "Aucun resto sur cette période.");
  // 3. Qui m'a fait à manger : moi + les 4 proches qui ont le plus cuisiné (top 5)
  const mine = own.filter(m => (m.preparedBy || "Moi") === "Moi").length;
  const cooks = new Map();
  own.filter(m => m.preparedBy === "Un proche").forEach(m => { const k = m.preparer || "Un proche"; cooks.set(k, (cooks.get(k) || 0) + 1); });
  const topCooks = [{ label: "Moi", n: mine, color: prepColor("Moi") },
    ...[...cooks].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([label, n]) => ({ label, n, color: prepColor("Un proche") }))]
    .filter(r => r.n).sort((a, b) => b.n - a.n);
  const cookEl = document.getElementById("rankCooks");
  cookEl.innerHTML = rankHtml(topCooks, prepColor("Moi"), "Aucun repas fait maison ou par un proche sur cette période.");
  [ingEl, restoEl, cookEl].forEach(bindTips);
}

// ---------- Rendu global ----------
function renderStats() {
  const demo = useDemo();
  document.getElementById("demoToggle").checked = demo;
  document.getElementById("demoBanner").hidden = !demo;
  const range = periodRange();
  document.getElementById("periodLabel").textContent = range.label;
  document.querySelectorAll("#periodMode [data-mode]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.mode === statsState.mode)));
  document.getElementById("periodNext").disabled = isCurrentOrFuture();
  const all = statsMeals();
  const inPeriod = all.filter(m => m.date >= range.start && m.date <= range.end);
  renderDonut(inPeriod);
  renderBars(all);
  renderRankings(inPeriod);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("periodPrev").addEventListener("click", () => shiftPeriod(-1));
  document.getElementById("periodNext").addEventListener("click", () => shiftPeriod(1));
  document.getElementById("periodMode").addEventListener("click", e => {
    const b = e.target.closest("[data-mode]");
    if (!b || b.dataset.mode === statsState.mode) return;
    statsState.mode = b.dataset.mode;
    renderStats();
  });
  document.getElementById("demoToggle").addEventListener("change", e => { statsState.demo = e.target.checked; renderStats(); });
});
