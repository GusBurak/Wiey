// =====================================================
// Wiey — journal des repas
// Les données sont stockées dans le navigateur (localStorage).
// =====================================================

const KEYS = { meals: "wiey.meals", people: "wiey.people", restaurants: "wiey.restaurants" };
const MEAL_TYPES = ["Petit-déjeuner", "Déjeuner", "Goûter", "Dîner"];
const TYPE_EMOJI = { "Petit-déjeuner": "🥐", "Déjeuner": "🥗", "Goûter": "🍎", "Dîner": "🍝" };
const RATING_LABELS = ["", "Bof", "Moyen", "Bon", "Très bon", "Excellent"];

// ---------- Stockage ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* stockage indisponible */ }
  return fallback();
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { alert("Impossible d'enregistrer (stockage du navigateur plein ?)."); return false; }
}

// Quelques repas d'exemple pour que le calendrier ne soit pas vide au premier lancement
function demoMeals() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const samples = [
    { name: "Tartines beurre & confiture", type: "Petit-déjeuner", emoji: "🍞", color: "#f6e3c4", ingredients: ["Pain de campagne", "Beurre", "Confiture d'abricot"], preparedBy: "Moi", rating: 3 },
    { name: "Bowl saumon avocat", type: "Déjeuner", emoji: "🍣", color: "#fbd9cf", ingredients: ["Riz vinaigré", "Saumon", "Avocat", "Edamame", "Sésame"], preparedBy: "Un resto", preparer: "Sushi Shop", rating: 4 },
    { name: "Pâtes au pesto", type: "Dîner", emoji: "🍝", color: "#dfeccd", ingredients: ["Pâtes", "Basilic", "Parmesan", "Pignons", "Huile d'olive"], preparedBy: "Moi", rating: 4, improve: "Faire griller les pignons avant." },
    { name: "Salade grecque", type: "Déjeuner", emoji: "🥗", color: "#d9eedb", ingredients: ["Tomates", "Concombre", "Feta", "Olives", "Oignon rouge"], preparedBy: "Moi", rating: 3 },
    { name: "Pizza margherita", type: "Dîner", emoji: "🍕", color: "#f9d5c3", ingredients: ["Pâte à pizza", "Sauce tomate", "Mozzarella", "Basilic"], preparedBy: "Un resto", preparer: "Chez Gino", rating: 5 },
    { name: "Yaourt & granola", type: "Petit-déjeuner", emoji: "🥣", color: "#eee6f6", ingredients: ["Yaourt grec", "Granola", "Fruits rouges", "Miel"], preparedBy: "Moi", rating: 4 },
    { name: "Burger maison", type: "Dîner", emoji: "🍔", color: "#f3dcc0", ingredients: ["Pain burger", "Bœuf haché", "Cheddar", "Oignons confits"], preparedBy: "Un proche", preparer: "Léa", rating: 5 },
    { name: "Pomme & amandes", type: "Goûter", emoji: "🍎", color: "#f8d4d4", ingredients: ["Pomme", "Amandes"], preparedBy: "Moi", rating: 3 },
    { name: "Curry de pois chiches", type: "Déjeuner", emoji: "🍛", color: "#f7e2b5", ingredients: ["Pois chiches", "Lait de coco", "Épinards", "Riz basmati", "Curry"], preparedBy: "Moi", rating: 4, improve: "Un peu plus épicé." },
    { name: "Soupe de légumes", type: "Dîner", emoji: "🍲", color: "#e5ecd2", ingredients: ["Poireaux", "Carottes", "Pommes de terre"], preparedBy: "Un proche", preparer: "Maman", rating: 4 },
    { name: "Crêpes", type: "Goûter", emoji: "🥞", color: "#f6e7c9", ingredients: ["Farine", "Œufs", "Lait", "Sucre", "Citron"], preparedBy: "Moi", rating: 5 },
    { name: "Tacos poulet", type: "Déjeuner", emoji: "🌮", color: "#f9e0c2", ingredients: ["Tortillas", "Poulet", "Guacamole", "Salsa"], preparedBy: "Un resto", preparer: "El Taco", rating: 3 },
  ];
  const list = [];
  let i = 0;
  for (let d = 1; d <= today; d++) {
    const count = (d * 7) % 4; // 0 à 3 repas par jour, de façon déterministe
    for (let k = 0; k < count; k++) {
      const s = samples[(i++ * 5) % samples.length];
      list.push({
        id: `demo-${d}-${k}`, date: iso(new Date(y, m, d)), photo: null, preparer: "", improve: "", recipeUrl: "",
        ...s, ingredients: s.ingredients.map(name => ({ name, qty: "" })),
      });
    }
  }
  return list;
}

let meals = load(KEYS.meals, demoMeals);
let people = load(KEYS.people, () => ["Léa", "Maman"]);
let restaurants = load(KEYS.restaurants, () => ["Chez Gino", "Sushi Shop", "El Taco"]);
const saveMeals = () => save(KEYS.meals, meals);

// ---------- Utilitaires ----------
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDate(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function photoHtml(meal) {
  if (meal.photo) return `<img src="${meal.photo}" alt="">`;
  return escapeHtml(meal.emoji || TYPE_EMOJI[meal.type] || "🍽️");
}
function photoBg(meal) {
  return meal.photo ? "transparent" : (meal.color || "var(--accent-soft)");
}
function sortByMoment(a, b) {
  return MEAL_TYPES.indexOf(a.type) - MEAL_TYPES.indexOf(b.type);
}
function preparedLabel(meal) {
  if (!meal.preparedBy) return "";
  if (meal.preparedBy === "Moi") return "Fait maison";
  if (meal.preparedBy === "Un proche") return meal.preparer ? `Par ${meal.preparer}` : "Par un proche";
  return meal.preparer ? `Chez ${meal.preparer}` : "Au restaurant";
}
function isWebLink(url) { return /^https?:\/\/\S+$/i.test(url); }
const ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const ICON_X = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ICON_STAR = `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>`;

// =====================================================
// Navigation entre les vues (#ajouter = page d'ajout)
// =====================================================
const homeView = document.getElementById("homeView");
const addView = document.getElementById("addView");

function route() {
  const adding = location.hash === "#ajouter";
  homeView.hidden = adding;
  addView.hidden = !adding;
  document.querySelector(".menu-item").classList.toggle("active", !adding);
  if (adding) openAddPage();
  else refresh();
  document.querySelector(".content").scrollTop = 0;
  sidebar.classList.remove("open");
}
window.addEventListener("hashchange", route);

document.querySelectorAll('[data-action="add"]').forEach(el => {
  el.addEventListener("click", () => { location.hash = "ajouter"; });
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); location.hash = "ajouter"; } });
});
document.querySelectorAll('.back-link, .link-btn, .menu-item').forEach(a =>
  a.addEventListener("click", e => { e.preventDefault(); goHome(); }));

function goHome() {
  if (location.hash) history.pushState("", "", location.pathname + location.search);
  route();
}

// =====================================================
// Calendrier
// =====================================================
let viewDate = new Date();
viewDate.setDate(1);

const grid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");

function renderCalendar() {
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  monthTitle.textContent = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const todayIso = iso(new Date());

  const byDate = {};
  meals.forEach(meal => (byDate[meal.date] ||= []).push(meal));

  let html = "";
  for (let cell = 0; cell < totalCells; cell++) {
    const dayNum = cell - firstWeekday + 1;
    if (dayNum < 1 || dayNum > daysInMonth) { html += `<div class="day empty"></div>`; continue; }
    const dateIso = iso(new Date(y, m, dayNum));
    const dayMeals = (byDate[dateIso] || []).sort(sortByMoment);
    const classes = ["day"];
    if (dateIso === todayIso) classes.push("today");
    if (cell % 7 >= 5) classes.push("weekend");
    html += `<div class="${classes.join(" ")}">
      <span class="day-num">${dayNum}</span>
      <div class="thumbs">
        ${dayMeals.map(meal => `
          <button class="thumb" data-id="${escapeHtml(meal.id)}" style="background:${photoBg(meal)}" aria-label="${escapeHtml(meal.type + " : " + meal.name)}">
            ${photoHtml(meal)}
          </button>`).join("")}
      </div>
    </div>`;
  }
  grid.innerHTML = html;
}

document.getElementById("prevMonth").onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); };
document.getElementById("nextMonth").onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); };
document.getElementById("todayBtn").onclick = () => { viewDate = new Date(); viewDate.setDate(1); renderCalendar(); };

// ---------- Aperçu au survol ----------
const preview = document.getElementById("hoverPreview");

function showPreview(thumb) {
  const meal = meals.find(x => x.id === thumb.dataset.id);
  if (!meal) return;
  const stars = meal.rating ? ` · ★ ${meal.rating.toLocaleString("fr-FR")}` : "";
  preview.innerHTML = `
    <div class="preview-photo" style="background:${photoBg(meal)}">${photoHtml(meal)}</div>
    <div class="preview-info"><strong>${escapeHtml(meal.name)}</strong><span>${meal.type} · ${formatDate(meal.date)}${stars}</span></div>`;

  const r = thumb.getBoundingClientRect();
  const w = 260, h = preview.offsetHeight || 250, gap = 10;
  let left = r.right + gap;
  if (left + w > window.innerWidth - 8) left = r.left - w - gap;
  if (left < 8) left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  let top = r.top + r.height / 2 - h / 2;
  top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
  preview.classList.add("visible");
}
function hidePreview() { preview.classList.remove("visible"); }

grid.addEventListener("mouseover", e => { const t = e.target.closest(".thumb"); if (t) showPreview(t); });
grid.addEventListener("mouseout", e => { if (e.target.closest(".thumb") && !e.relatedTarget?.closest?.(".thumb")) hidePreview(); });
grid.addEventListener("click", e => {
  const t = e.target.closest(".thumb");
  if (t) { hidePreview(); openDetail(t.dataset.id); }
});

// ---------- Fenêtre détails ----------
const detailModal = document.getElementById("detailModal");
const detailContent = document.getElementById("detailContent");

function openDetail(id) {
  const meal = meals.find(x => x.id === id);
  if (!meal) return;
  const ingredients = meal.ingredients || [];
  const prepared = preparedLabel(meal);
  detailContent.innerHTML = `
    <div class="detail-photo" style="background:${photoBg(meal)}">${photoHtml(meal)}</div>
    <h2 class="modal-title" style="margin-bottom:0">${escapeHtml(meal.name)}</h2>
    <div class="detail-meta">
      <span class="tag">${meal.type}</span>
      <span class="tag neutral">${formatDate(meal.date)}</span>
      ${prepared ? `<span class="tag neutral">${escapeHtml(prepared)}</span>` : ""}
      ${meal.rating ? `<span class="tag neutral detail-stars" aria-label="${formatRating(meal.rating)}">${starsHtml(meal.rating, "mini")}<span>${formatRating(meal.rating)}</span></span>` : ""}
    </div>
    ${ingredientsDetailHtml(ingredients)}
    ${meal.recipeUrl && isWebLink(meal.recipeUrl) ? `<div class="detail-section"><h3>Recette</h3><p><a href="${escapeHtml(meal.recipeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meal.recipeUrl)}</a></p></div>` : ""}
    ${meal.improve ? `<div class="detail-section"><h3>À améliorer</h3><p>${escapeHtml(meal.improve)}</p></div>` : ""}
    ${meal.notes ? `<div class="detail-section"><h3>Notes</h3><p>${escapeHtml(meal.notes)}</p></div>` : ""}
    <button class="danger-btn" data-delete="${escapeHtml(meal.id)}">Supprimer ce repas</button>`;
  detailModal.hidden = false;
}

detailContent.addEventListener("click", e => {
  const id = e.target.dataset.delete;
  if (!id || !confirm("Supprimer ce repas ?")) return;
  meals = meals.filter(x => x.id !== id);
  saveMeals();
  closeModals();
  refresh();
});

// Ingrédients regroupés : liste principale puis sous-rubriques
function ingredientsDetailHtml(ingredients) {
  if (!ingredients.length) return "";
  const groups = new Map();
  ingredients.forEach(i => { const g = i.group || ""; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); });
  const list = items => `<ul>${items.map(i => `<li>${escapeHtml(i.name)}${i.qty ? ` — ${escapeHtml(i.qty)}` : ""}</li>`).join("")}</ul>`;
  const main = groups.get("") || [];
  groups.delete("");
  return `<div class="detail-section"><h3>Ingrédients</h3>${main.length ? list(main) : ""}${
    [...groups].map(([g, items]) => `<h4>${escapeHtml(g)}</h4>${list(items)}`).join("")}</div>`;
}

function closeModals() { detailModal.hidden = true; }
detailModal.addEventListener("click", e => { if (e.target === detailModal || e.target.closest("[data-close]")) closeModals(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModals(); });

// ---------- Qu'est-ce qu'on mange ? ----------
const ideaBody = document.getElementById("ideaBody");
let lastIdea = null;

function renderIdea() {
  // On propose un plat déjà mangé (en privilégiant les mieux notés), sans doublon de nom
  const unique = [...new Map(meals.map(m => [m.name.toLowerCase(), m])).values()];
  if (!unique.length) {
    ideaBody.innerHTML = `<p class="idea-empty">Ajoute quelques repas : on piochera dedans pour te donner des idées.</p>`;
    return;
  }
  const pool = unique.length > 1 ? unique.filter(m => m.name !== lastIdea) : unique;
  const weights = pool.map(m => (m.rating || 3) ** 2);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  const pick = pool.find((_, i) => (r -= weights[i]) < 0) || pool[0];
  lastIdea = pick.name;
  const lastTime = meals.filter(m => m.name === pick.name).map(m => m.date).sort().pop();
  ideaBody.innerHTML = `
    <div class="idea-photo" style="background:${photoBg(pick)}">${photoHtml(pick)}</div>
    <div class="idea-text">
      <strong>${escapeHtml(pick.name)}</strong>
      <span>${pick.type} · dernière fois ${formatDate(lastTime)}</span>
    </div>`;
}
document.getElementById("nextIdea").onclick = renderIdea;

// ---------- Récents (menu de gauche) ----------
function renderRecent() {
  const list = [...meals].sort((a, b) => b.date.localeCompare(a.date) || sortByMoment(b, a)).slice(0, 8);
  document.getElementById("recentList").innerHTML = list
    .map(m => `<li data-id="${escapeHtml(m.id)}">${escapeHtml(m.name)}<small>${m.date.slice(8)}/${m.date.slice(5, 7)}</small></li>`)
    .join("");
}
document.getElementById("recentList").addEventListener("click", e => {
  const li = e.target.closest("li");
  if (li) openDetail(li.dataset.id);
});

// =====================================================
// Page « Ajouter un repas »
// =====================================================
const form = document.getElementById("addForm");
const photoInput = document.getElementById("photoInput");
const photoDrop = document.getElementById("photoDrop");
const preparedBy = document.getElementById("preparedBy");
const preparerPicker = document.getElementById("preparerPicker");
const preparerChips = document.getElementById("preparerChips");
const preparerAddRow = document.getElementById("preparerAddRow");
const preparerNew = document.getElementById("preparerNew");
const starsEl = document.getElementById("stars");
const starsLabel = document.getElementById("starsLabel");
const qtyToggle = document.getElementById("qtyToggle");
const analyzeBtn = document.getElementById("analyzeBtn");
const analyzeStatus = document.getElementById("analyzeStatus");
const ingSections = document.getElementById("ingSections");
const addSectionBtn = document.getElementById("addSectionBtn");
const sectionChoices = document.getElementById("sectionChoices");
const sectionChips = document.getElementById("sectionChips");
const sectionOtherRow = document.getElementById("sectionOtherRow");
const sectionOther = document.getElementById("sectionOther");

// État du formulaire en cours
let draft;
function resetDraft() {
  draft = { photo: null, photoBlob: null, preparer: "", rating: 0, sections: [{ id: newId(), name: "", items: [] }] };
}

function openAddPage() {
  resetDraft();
  form.reset();
  form.date.value = iso(new Date());
  form.type.value = guessMealType();
  photoDrop.style.backgroundImage = "";
  photoDrop.classList.remove("has-photo");
  document.querySelectorAll(".add-form .invalid").forEach(el => el.classList.remove("invalid"));
  document.querySelectorAll(".field-error").forEach(el => (el.hidden = true));
  renderPreparer();
  renderStars();
  sectionChoices.hidden = true;
  sectionOtherRow.hidden = true;
  addSectionBtn.hidden = false;
  closeAutocomplete();
  renderIngredients();
  updateAnalyzeState();
}

function guessMealType() {
  const h = new Date().getHours();
  if (h < 11) return "Petit-déjeuner";
  if (h < 15) return "Déjeuner";
  if (h < 18) return "Goûter";
  return "Dîner";
}

// ---------- Photo ----------
// Redimensionnée pour ne pas saturer le stockage du navigateur
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const max = 900, scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    draft.photo = canvas.toDataURL("image/jpeg", 0.8);
    canvas.toBlob(b => { draft.photoBlob = b; updateAnalyzeState(); }, "image/jpeg", 0.85);
    photoDrop.style.backgroundImage = `url(${draft.photo})`;
    photoDrop.classList.add("has-photo");
    URL.revokeObjectURL(img.src);
    // Nouvelle photo : les anciennes suggestions non validées ne valent plus
    draft.sections.forEach(sec => (sec.items = sec.items.filter(x => !x.pending)));
    renderIngredients();
  };
  img.onerror = () => alert("Cette image n'a pas pu être lue.");
  img.src = URL.createObjectURL(file);
});

// ---------- Préparé par ----------
function preparerList() { return preparedBy.value === "Un proche" ? people : restaurants; }

function renderPreparer() {
  const mode = preparedBy.value;
  preparerPicker.hidden = mode === "Moi";
  if (mode === "Moi") { draft.preparer = ""; return; }
  const list = preparerList();
  const addLabel = mode === "Un proche" ? "Ajouter un proche" : "Ajouter un restaurant";
  if (draft.preparer && !list.includes(draft.preparer)) draft.preparer = "";
  preparerChips.innerHTML =
    list.map(n => `<button type="button" class="chip" role="radio" aria-checked="${n === draft.preparer}" data-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("") +
    `<button type="button" class="chip add-chip" data-add>+ ${addLabel}</button>`;
  preparerNew.placeholder = mode === "Un proche" ? "Prénom du proche" : "Nom du restaurant";
}

preparedBy.addEventListener("change", () => {
  draft.preparer = "";
  preparerAddRow.hidden = true;
  renderPreparer();
  // Pas encore de proche / resto enregistré : on ouvre directement la saisie
  if (preparedBy.value !== "Moi" && !preparerList().length) showPreparerInput();
});

preparerChips.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  if (chip.hasAttribute("data-add")) { showPreparerInput(); return; }
  draft.preparer = draft.preparer === chip.dataset.name ? "" : chip.dataset.name;
  renderPreparer();
});

function showPreparerInput() {
  preparerAddRow.hidden = false;
  preparerNew.value = "";
  preparerNew.focus();
}

function addPreparer() {
  const name = preparerNew.value.trim();
  if (!name) { preparerNew.focus(); return; }
  const list = preparerList();
  const existing = list.find(n => n.toLowerCase() === name.toLowerCase());
  if (!existing) {
    list.push(name);
    list.sort((a, b) => a.localeCompare(b, "fr"));
    save(preparedBy.value === "Un proche" ? KEYS.people : KEYS.restaurants, list);
  }
  draft.preparer = existing || name;
  preparerAddRow.hidden = true;
  renderPreparer();
}
document.getElementById("preparerNewOk").addEventListener("click", addPreparer);
preparerNew.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); addPreparer(); }
  if (e.key === "Escape") { e.stopPropagation(); preparerAddRow.hidden = true; }
});

// ---------- Note sur 5 (demi-étoiles possibles) ----------
function starsHtml(rating, cls = "") {
  return [1, 2, 3, 4, 5].map(n => {
    const fill = Math.max(0, Math.min(1, rating - (n - 1))) * 100;
    return `<span class="star ${cls}" data-n="${n}"><span class="star-bg">${ICON_STAR}</span><span class="star-fill" style="width:${fill}%">${ICON_STAR}</span></span>`;
  }).join("");
}
function formatRating(r) { return r.toLocaleString("fr-FR") + "/5"; }
function ratingLabel(r) {
  if (!r) return "Pas encore noté";
  return `${formatRating(r)} · ${RATING_LABELS[Math.ceil(r)]}`;
}
function renderStars(preview) {
  const value = preview ?? draft.rating;
  starsEl.innerHTML = starsHtml(value);
  starsEl.setAttribute("aria-valuenow", draft.rating);
  starsEl.setAttribute("aria-valuetext", ratingLabel(draft.rating));
  starsLabel.textContent = ratingLabel(value);
}
// Moitié gauche d'une étoile = demi-point, moitié droite = point entier
function ratingFromPointer(e) {
  const star = e.target.closest(".star");
  if (!star) return null;
  const r = star.getBoundingClientRect();
  return Number(star.dataset.n) - (e.clientX - r.left < r.width / 2 ? 0.5 : 0);
}
starsEl.addEventListener("click", e => {
  const v = ratingFromPointer(e);
  if (v == null) return;
  draft.rating = draft.rating === v ? 0 : v; // recliquer sur la même valeur efface la note
  renderStars();
});
starsEl.addEventListener("mousemove", e => { const v = ratingFromPointer(e); if (v != null) renderStars(v); });
starsEl.addEventListener("mouseleave", () => renderStars());
starsEl.addEventListener("keydown", e => {
  const steps = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 };
  if (e.key in steps) draft.rating = Math.max(0, Math.min(5, draft.rating + steps[e.key]));
  else if (e.key === "Home") draft.rating = 0;
  else if (e.key === "End") draft.rating = 5;
  else if (/^[0-5]$/.test(e.key)) draft.rating = Number(e.key);
  else return;
  e.preventDefault();
  renderStars();
});

// ---------- Ingrédients ----------
// draft.sections = [{ id, name, items: [{ id, name, qty, pending }] }]
// La première section (sans nom) est la liste principale ; les autres sont des sous-rubriques.
// « pending » = suggestion de l'analyse photo pas encore validée.
const SECTION_SUGGESTIONS = ["Épices", "Herbes", "Sauce", "Assaisonnement", "Marinade", "Garniture", "Accompagnement", "Pâte"];
let uid = 0;
const newId = () => `x${++uid}`;
const justAdded = new Set();   // éléments à animer à l'apparition
const flashIds = new Set();    // éléments à faire clignoter (doublon, validation)

function mainSection() { return draft.sections[0]; }
function findItem(itemId) {
  for (const s of draft.sections) {
    const i = s.items.findIndex(x => x.id === itemId);
    if (i >= 0) return { section: s, index: i, item: s.items[i] };
  }
  return null;
}
function findByName(name) {
  const key = normalizeText(name);
  for (const s of draft.sections) {
    const item = s.items.find(x => normalizeText(x.name) === key);
    if (item) return item;
  }
  return null;
}
function ingredientHistory() {
  return meals.flatMap(m => (m.ingredients || []).map(i => capitalize(singularize(i.name))));
}

// Ajoute un ingrédient (mis au singulier) à une section.
// Les ingrédients validés passent avant les suggestions en attente.
function addIngredient(sectionId, rawName, { pending = false } = {}) {
  const name = capitalize(singularize(String(rawName).trim().slice(0, 60)));
  if (!name) return null;
  const existing = findByName(name);
  if (existing) {
    if (existing.pending && !pending) return acceptItem(existing.id, sectionId);
    flashIds.add(existing.id);
    return null;
  }
  const section = draft.sections.find(s => s.id === sectionId) || mainSection();
  const item = { id: newId(), name, qty: "", pending };
  if (pending) section.items.push(item);
  else {
    const firstPending = section.items.findIndex(x => x.pending);
    section.items.splice(firstPending < 0 ? section.items.length : firstPending, 0, item);
  }
  justAdded.add(item.id);
  return item;
}

// Valide une suggestion : elle rejoint la liste à la suite des ingrédients validés
function acceptItem(itemId, targetSectionId) {
  const found = findItem(itemId);
  if (!found) return null;
  found.section.items.splice(found.index, 1);
  found.item.pending = false;
  const target = draft.sections.find(s => s.id === targetSectionId) || found.section;
  const firstPending = target.items.findIndex(x => x.pending);
  target.items.splice(firstPending < 0 ? target.items.length : firstPending, 0, found.item);
  flashIds.add(found.item.id);
  return found.item;
}

// Retrait avec une petite animation de sortie
function removeItem(itemId) {
  const row = ingSections.querySelector(`[data-iid="${itemId}"]`);
  const done = () => {
    const found = findItem(itemId);
    if (found) found.section.items.splice(found.index, 1);
    renderIngredients();
  };
  if (!row) return done();
  row.classList.add("leaving");
  setTimeout(done, 160);
}

function renderIngredients(focusSectionId) {
  const showQty = qtyToggle.checked;
  ingSections.innerHTML = draft.sections.map((s, sIdx) => {
    const pendingCount = s.items.filter(x => x.pending).length;
    return `
    <div class="ing-section${sIdx ? " sub" : ""}" data-sid="${s.id}">
      ${sIdx ? `<div class="ing-section-head">
        <span class="ing-section-name">${escapeHtml(s.name)}</span>
        <button type="button" class="remove-btn" data-remove-section="${s.id}" aria-label="Supprimer la sous-rubrique ${escapeHtml(s.name)}">${ICON_X}</button>
      </div>` : ""}
      <ul class="ingredient-list">
        ${s.items.map(it => `
        <li class="ingredient${it.pending ? " pending" : ""}${justAdded.has(it.id) ? " entering" : ""}${flashIds.has(it.id) ? " flash" : ""}" data-iid="${it.id}">
          ${it.pending ? `<span class="pending-mark" title="Suggestion de l'analyse photo">✨</span>` : ""}
          <span class="ingredient-name">${escapeHtml(it.name)}</span>
          ${it.pending ? `
            <button type="button" class="round-btn ok" data-accept="${it.id}" aria-label="Valider ${escapeHtml(it.name)}">${ICON_CHECK}</button>
            <button type="button" class="round-btn no" data-remove="${it.id}" aria-label="Retirer ${escapeHtml(it.name)}">${ICON_X}</button>`
          : `
            ${showQty ? `<input type="text" class="qty-input" data-qty="${it.id}" value="${escapeHtml(it.qty)}" placeholder="Ex. 200 g" aria-label="Quantité de ${escapeHtml(it.name)}">` : (it.qty ? `<span class="qty-text">${escapeHtml(it.qty)}</span>` : "")}
            <button type="button" class="round-btn no" data-remove="${it.id}" aria-label="Retirer ${escapeHtml(it.name)}">${ICON_X}</button>`}
        </li>`).join("")}
      </ul>
      ${pendingCount ? `<p class="hint">✨ ${pendingCount} suggestion${pendingCount > 1 ? "s" : ""} de l'analyse à valider (✓) ou retirer (✕). Celles non validées ne seront pas enregistrées.</p>` : ""}
      <div class="add-inline ac-wrap">
        <input type="text" class="ing-input" data-sid="${s.id}" placeholder="${sIdx ? `Ajouter dans « ${escapeHtml(s.name)} »…` : "Ajouter un ingrédient…"}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false">
        <button type="button" class="small-btn" data-add-to="${s.id}">Ajouter</button>
      </div>
    </div>`;
  }).join("");
  justAdded.clear();
  flashIds.clear();
  renderSectionChips();
  if (focusSectionId) ingSections.querySelector(`.ing-input[data-sid="${focusSectionId}"]`)?.focus();
}

// Saisie manuelle : plusieurs ingrédients possibles, séparés par des virgules
function submitTyped(input, pickedName) {
  const sid = input.dataset.sid;
  const values = pickedName ? [pickedName] : input.value.split(",");
  values.forEach(v => addIngredient(sid, v));
  input.value = "";
  closeAutocomplete();
  renderIngredients(sid);
}

ingSections.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.accept) { acceptItem(t.dataset.accept); renderIngredients(); }
  else if (t.dataset.remove) removeItem(t.dataset.remove);
  else if (t.dataset.addTo) submitTyped(ingSections.querySelector(`.ing-input[data-sid="${t.dataset.addTo}"]`));
  else if (t.dataset.removeSection) {
    const s = draft.sections.find(x => x.id === t.dataset.removeSection);
    if (s.items.some(x => !x.pending) && !confirm(`Supprimer « ${s.name} » et ses ingrédients ?`)) return;
    draft.sections = draft.sections.filter(x => x !== s);
    renderIngredients();
  }
});
ingSections.addEventListener("input", e => {
  if (e.target.dataset.qty) { const f = findItem(e.target.dataset.qty); if (f) f.item.qty = e.target.value; }
  if (e.target.matches(".ing-input")) updateAutocomplete(e.target);
});
ingSections.addEventListener("focusin", e => { if (e.target.matches(".ing-input")) updateAutocomplete(e.target); });
ingSections.addEventListener("focusout", e => {
  // On ne ferme que si le focus a vraiment quitté les champs d'ingrédients
  if (e.target.matches(".ing-input")) setTimeout(() => {
    const a = document.activeElement;
    if (!a?.matches?.(".ing-input") && !acBox.contains(a)) closeAutocomplete();
  }, 120);
});
ingSections.addEventListener("keydown", e => {
  if (!e.target.matches(".ing-input")) return;
  const input = e.target;
  const open = !acBox.hidden && acItems.length;
  if (e.key === "ArrowDown" && open) { e.preventDefault(); setActive((acActive + 1) % acItems.length); }
  else if (e.key === "ArrowUp" && open) { e.preventDefault(); setActive((acActive - 1 + acItems.length) % acItems.length); }
  else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); closeAutocomplete(); }
  else if (e.key === "Enter") {
    e.preventDefault();
    if (open && acActive >= 0) submitTyped(input, acItems[acActive].name);
    else submitTyped(input);
  } else if (e.key === "Tab" && open && acActive >= 0 && input.value.trim()) {
    e.preventDefault();
    submitTyped(input, acItems[acActive].name);
  }
});
qtyToggle.addEventListener("change", () => {
  renderIngredients();
  if (qtyToggle.checked) ingSections.querySelector(".qty-input")?.focus();
});

// ---------- Suggestions pendant la saisie ----------
const acBox = document.createElement("ul");
acBox.className = "ac-list";
acBox.id = "acList";
acBox.setAttribute("role", "listbox");
acBox.hidden = true;
let acItems = [], acActive = -1, acInput = null;

function updateAutocomplete(input) {
  const query = input.value;
  // Pas de suggestion quand on tape une liste séparée par des virgules
  if (query.includes(",") || query.trim().length < 2) return closeAutocomplete();
  const section = draft.sections.find(s => s.id === input.dataset.sid);
  acItems = suggestIngredients(query, {
    history: ingredientHistory(),
    exclude: draft.sections.flatMap(s => s.items.filter(x => !x.pending).map(x => x.name)),
    preferCategory: section?.name ? categoryForSection(section.name) : null,
  });
  if (!acItems.length) return closeAutocomplete();
  acInput = input;
  input.parentElement.appendChild(acBox);
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-controls", "acList");
  const q = normalizeText(query);
  acBox.innerHTML = acItems.map((it, i) => {
    // Met en gras la partie tapée quand elle est au début d'un mot
    const n = normalizeText(it.name);
    let at = n.startsWith(q) ? 0 : n.indexOf(" " + q) + 1;
    if (!q || at < 0 || (at === 0 && !n.startsWith(q))) at = -1;
    const label = at >= 0
      ? escapeHtml(it.name.slice(0, at)) + "<strong>" + escapeHtml(it.name.slice(at, at + q.length)) + "</strong>" + escapeHtml(it.name.slice(at + q.length))
      : escapeHtml(it.name);
    const meta = it.uses ? "déjà utilisé" : (it.category || "");
    return `<li role="option" id="ac-${i}" data-i="${i}"><span>${label}</span>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</li>`;
  }).join("");
  acBox.hidden = false;
  // Le premier choix est présélectionné quand il commence par ce qui a été tapé
  setActive(normalizeText(acItems[0].name).startsWith(normalizeText(singularize(query))) || normalizeText(acItems[0].name).startsWith(q) ? 0 : -1);
}
function setActive(i) {
  acActive = i;
  [...acBox.children].forEach((li, j) => li.classList.toggle("active", j === i));
  acInput?.setAttribute("aria-activedescendant", i >= 0 ? `ac-${i}` : "");
  acBox.children[i]?.scrollIntoView({ block: "nearest" });
}
function closeAutocomplete() {
  acBox.hidden = true;
  acItems = []; acActive = -1;
  acInput?.setAttribute("aria-expanded", "false");
  acInput = null;
}
acBox.addEventListener("mousedown", e => {
  const li = e.target.closest("li");
  if (!li || !acInput) return;
  e.preventDefault(); // garde le focus dans le champ
  submitTyped(acInput, acItems[Number(li.dataset.i)].name);
});
acBox.addEventListener("mousemove", e => { const li = e.target.closest("li"); if (li) setActive(Number(li.dataset.i)); });

// ---------- Sous-rubriques ----------
function renderSectionChips() {
  const used = new Set(draft.sections.map(s => normalizeText(s.name)));
  sectionChips.innerHTML = SECTION_SUGGESTIONS.filter(n => !used.has(normalizeText(n)))
    .map(n => `<button type="button" class="chip" data-section-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("") +
    `<button type="button" class="chip add-chip" data-section-other>Autre…</button>`;
}
function addSection(name) {
  name = capitalize(name.trim().slice(0, 40));
  if (!name) return;
  let section = draft.sections.find(s => normalizeText(s.name) === normalizeText(name));
  if (!section) { section = { id: newId(), name, items: [] }; draft.sections.push(section); }
  sectionChoices.hidden = true;
  sectionOtherRow.hidden = true;
  addSectionBtn.hidden = false;
  renderIngredients(section.id);
}
addSectionBtn.addEventListener("click", () => {
  sectionChoices.hidden = false;
  addSectionBtn.hidden = true;
  renderSectionChips();
});
sectionChips.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  if (chip.hasAttribute("data-section-other")) {
    sectionOtherRow.hidden = false;
    sectionOther.value = "";
    sectionOther.focus();
  } else addSection(chip.dataset.sectionName);
});
document.getElementById("sectionOtherOk").addEventListener("click", () => addSection(sectionOther.value));
sectionOther.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); addSection(sectionOther.value); }
  if (e.key === "Escape") { e.stopPropagation(); sectionChoices.hidden = true; addSectionBtn.hidden = false; }
});

// ---------- Analyse de la photo par Claude ----------
// Disponible quand le site est ouvert depuis Claude (version publiée).
let sampleFn = null;
let sampleState = "loading"; // loading | ready | unavailable

async function initSample() {
  try {
    if (!window.claude?.use) throw new Error("hors de Claude");
    const sample = await window.claude.use("sample");
    const limits = sample && await sample.limits().catch(() => null);
    if (sample && limits?.images) { sampleFn = sample; sampleState = "ready"; }
    else sampleState = "unavailable";
  } catch (e) { sampleState = "unavailable"; }
  updateAnalyzeState();
}

function updateAnalyzeState(message) {
  if (sampleState === "unavailable") {
    analyzeBtn.disabled = true;
    analyzeStatus.textContent = "L'analyse de photo fonctionne sur la version du site ouverte dans Claude. Ajoute les ingrédients à la main ci-dessous.";
    return;
  }
  analyzeBtn.disabled = sampleState !== "ready" || !draft?.photoBlob;
  if (message) analyzeStatus.textContent = message;
  else if (!draft?.photoBlob) analyzeStatus.textContent = "Ajoute une photo pour obtenir des suggestions.";
  else if (sampleState === "loading") analyzeStatus.textContent = "Préparation de l'analyse…";
  else analyzeStatus.textContent = "Claude va proposer les ingrédients visibles sur la photo.";
}

const ANALYZE_ERRORS = {
  not_granted: "Analyse non autorisée. Tu peux ajouter les ingrédients à la main.",
  sampling_disabled: "L'analyse n'est pas disponible sur ce compte.",
  rate_limited: "Trop de demandes pour le moment, réessaie dans un instant.",
  image_rejected: "Cette photo n'a pas pu être analysée. Essaie avec une autre image.",
  refused: "Cette photo n'a pas pu être analysée.",
  invalid_json: "La réponse n'était pas exploitable. Réessaie.",
};

analyzeBtn.addEventListener("click", async () => {
  if (!sampleFn || !draft.photoBlob) return;
  const blob = draft.photoBlob;
  analyzeBtn.disabled = true;
  analyzeStatus.textContent = "Analyse de la photo en cours…";
  try {
    const name = form.name.value.trim();
    const result = await sampleFn.json(
      "Voici la photo d'un repas" + (name ? ` (nom donné par l'utilisateur : « ${name.slice(0, 80)} »)` : "") + ". " +
      "Liste les ingrédients visibles ou très probables dans ce plat. " +
      "Réponds uniquement avec un tableau JSON de 3 à 12 chaînes, en français, noms courts au singulier ou tels qu'on les écrit dans une recette, sans quantités. " +
      'Exemple : ["Tomate", "Mozzarella", "Basilic", "Huile d\'olive"]. ' +
      "Si la photo ne montre pas de nourriture, réponds [].",
      { images: [blob], modelTier: "default" }
    );
    if (blob !== draft.photoBlob) return; // la photo a changé entre-temps
    // Retire les anciennes suggestions non validées, puis ajoute les nouvelles (au singulier)
    draft.sections.forEach(sec => (sec.items = sec.items.filter(x => !x.pending)));
    const added = (Array.isArray(result) ? result : [])
      .filter(x => typeof x === "string")
      .map(x => addIngredient(mainSection().id, x, { pending: true }))
      .filter(Boolean);
    renderIngredients();
    updateAnalyzeState(added.length
      ? `${added.length} suggestion${added.length > 1 ? "s" : ""} ajoutée${added.length > 1 ? "s" : ""} à la liste : valide celles qui sont justes.`
      : "Aucun nouvel ingrédient repéré sur la photo.");
  } catch (e) {
    if (e?.code === "not_granted" || e?.code === "sampling_disabled") sampleState = "unavailable";
    updateAnalyzeState(ANALYZE_ERRORS[e?.code] || "L'analyse a échoué. Réessaie.");
    if (sampleState === "unavailable") analyzeStatus.textContent = ANALYZE_ERRORS[e.code];
  }
});

// ---------- Enregistrement ----------
function setError(input, errorEl, show) {
  input.classList.toggle("invalid", show);
  errorEl.hidden = !show;
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const name = form.name.value.trim();
  const recipeUrl = form.recipeUrl.value.trim();
  const badName = !name;
  const badUrl = !!recipeUrl && !isWebLink(recipeUrl);
  setError(form.name, document.getElementById("nameError"), badName);
  setError(form.recipeUrl, document.getElementById("urlError"), badUrl);
  if (badName) { form.name.focus(); return; }
  if (badUrl) { form.recipeUrl.focus(); return; }
  if (!form.date.value) form.date.value = iso(new Date());

  // Un ingrédient tapé mais pas encore ajouté est pris en compte
  ingSections.querySelectorAll(".ing-input").forEach(input =>
    input.value.split(",").forEach(v => v.trim() && addIngredient(input.dataset.sid, v)));

  const type = form.type.value;
  const meal = {
    id: `m-${Date.now()}`,
    name,
    date: form.date.value,
    type,
    photo: draft.photo,
    emoji: TYPE_EMOJI[type],
    color: null,
    preparedBy: preparedBy.value,
    preparer: preparedBy.value === "Moi" ? "" : draft.preparer,
    rating: draft.rating,
    // Liste à plat ; « group » = nom de la sous-rubrique ("" pour la liste principale)
    ingredients: draft.sections.flatMap(sec => sec.items.filter(i => !i.pending)
      .map(i => ({ name: i.name, qty: i.qty.trim(), group: sec.name }))),
    recipeUrl,
    improve: form.improve.value.trim(),
  };
  meals.push(meal);
  if (!saveMeals()) { meals.pop(); return; }
  const [yy, mm] = meal.date.split("-").map(Number);
  viewDate = new Date(yy, mm - 1, 1);
  goHome();
});

// ---------- Menu mobile ----------
const sidebar = document.getElementById("sidebar");
document.querySelectorAll(".menu-toggle").forEach(btn =>
  btn.addEventListener("click", e => { e.stopPropagation(); sidebar.classList.toggle("open"); }));
document.addEventListener("click", e => {
  if (sidebar.classList.contains("open") && !sidebar.contains(e.target)) sidebar.classList.remove("open");
});

// ---------- Lancement ----------
function refresh() { renderCalendar(); renderRecent(); renderIdea(); }
initSample();
renderRecent();
route();
