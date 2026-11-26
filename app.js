// =====================================================
// Wiey — journal des repas
// Les données sont stockées dans le navigateur (localStorage).
// =====================================================

const KEYS = { meals: "wiey.meals", people: "wiey.people", restaurants: "wiey.restaurants", restaurantInfo: "wiey.restaurantInfo", near: "wiey.near", deliveries: "wiey.deliveries", others: "wiey.others" };
const MEAL_TYPES = ["Petit-déjeuner", "Déjeuner", "Goûter", "Dîner"];
const COURSES = ["Apéritif", "Entrée", "Plat", "Dessert"];
const COURSE_MEALS = ["Déjeuner", "Dîner"]; // repas pour lesquels on précise le moment
const RATING_LABELS = ["", "Bof", "Moyen", "Bon", "Très bon", "Excellent"];

// ---------- Stockage ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* stockage indisponible */ }
  return fallback();
}
// ---------- Confirmation et messages intégrés à la page ----------
// (les fenêtres confirm()/alert() du navigateur sont bloquées dans la version publiée)
function askConfirm(message, okLabel = "Supprimer") {
  const modal = document.getElementById("confirmModal");
  const ok = document.getElementById("confirmOk");
  const cancel = document.getElementById("confirmCancel");
  document.getElementById("confirmText").textContent = message;
  ok.textContent = okLabel;
  modal.hidden = false;
  ok.focus();
  return new Promise(resolve => {
    const done = value => {
      modal.hidden = true;
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey, true);
      resolve(value);
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    const onBackdrop = e => { if (e.target === modal) done(false); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey, true);
  });
}
let toastTimer = null;
function notify(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { notify("Impossible d'enregistrer : le stockage du navigateur est peut-être plein."); return false; }
}

let meals = load(KEYS.meals, () => []);
// Repas avec photo mais sans miniature recadrée : on la calcule une fois, en arrière-plan
async function backfillThumbs() {
  let changed = false;
  for (const m of meals) {
    if (!m.photo || m.thumb) continue;
    try { m.thumb = await makeSmartThumb(m.photo); changed = true; } catch (e) { /* photo illisible */ }
  }
  if (changed) { saveMeals(); renderCalendar(); renderRecent(); }
}
let people = load(KEYS.people, () => []);
let restaurants = load(KEYS.restaurants, () => []);
let restaurantInfo = load(KEYS.restaurantInfo, () => ({})); // nom du resto → adresse
let deliveries = load(KEYS.deliveries, () => []); // restos déjà commandés en livraison
let others = load(KEYS.others, () => []); // précisions déjà saisies pour « Autre » (cantine, traiteur…)
let nearPlace = load(KEYS.near, () => null); // { name, longitude, latitude } : ville de référence pour la recherche
const saveMeals = () => save(KEYS.meals, meals);

// Nettoyage unique : retire les repas d'exemple (identifiants « demo-… ») et les
// proches / restaurants fictifs qui allaient avec, sauf s'ils servent à un vrai repas.
(function removeDemoData() {
  const DEMO_PEOPLE = ["Léa", "Maman"];
  const DEMO_RESTAURANTS = ["Chez Gino", "Sushi Shop", "El Taco"];
  const before = meals.length;
  meals = meals.filter(m => !String(m.id).startsWith("demo-"));
  const used = new Set(meals.map(m => m.preparer).filter(Boolean));
  const p = people.filter(n => !DEMO_PEOPLE.includes(n) || used.has(n));
  const r = restaurants.filter(n => !DEMO_RESTAURANTS.includes(n) || used.has(n));
  if (meals.length !== before) saveMeals();
  if (p.length !== people.length) { people = p; save(KEYS.people, people); }
  if (r.length !== restaurants.length) { restaurants = r; save(KEYS.restaurants, restaurants); }
})();

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
  return escapeHtml(guessEmoji(meal));
}
// Miniature recadrée sur l'assiette (calendrier, listes) ; la photo entière sinon
function thumbHtml(meal) {
  if (meal.photo) return `<img src="${meal.thumb || meal.photo}" alt="">`;
  return escapeHtml(guessEmoji(meal));
}

// Sans photo : un emoji selon le repas
const DEFAULT_EMOJI = { "Petit-déjeuner": "🥐", "Déjeuner": "🍽️", "Goûter": "🍪", "Dîner": "🍽️" };
function guessEmoji(meal) { return DEFAULT_EMOJI[meal.type] || "🍽️"; }
function photoBg(meal) {
  return meal.photo ? "transparent" : (meal.color || "var(--accent-soft)");
}
function sortByMoment(a, b) {
  const courseIdx = m => (m.course ? COURSES.indexOf(m.course) : 2);
  return MEAL_TYPES.indexOf(a.type) - MEAL_TYPES.indexOf(b.type) || courseIdx(a) - courseIdx(b);
}
function mealMoment(meal) { return meal.course ? `${meal.type} · ${meal.course}` : meal.type; }
function preparedLabel(meal) {
  if (!meal.preparedBy) return "";
  if (meal.preparedBy === "Moi") return "Fait maison";
  if (meal.preparedBy === "Un proche") return meal.preparer ? `Par ${meal.preparer}` : "Par un proche";
  if (meal.preparedBy === "Livraison") return meal.preparer ? `Livré par ${meal.preparer}` : "En livraison";
  if (meal.preparedBy === "Autre") return meal.preparer || "Autre";
  return meal.preparer ? `Chez ${meal.preparer}` : "Au restaurant";
}
// Couleur de bordure des miniatures selon qui a préparé le repas
function prepClass(meal) {
  return { "Un proche": "prep-proche", "Un resto": "prep-resto", "Livraison": "prep-livraison", "Autre": "prep-autre" }[meal.preparedBy] || "prep-moi";
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
  // #ajouter = nouveau repas ; #modifier/<id> = modifier une fiche existante
  const editMatch = location.hash.match(/^#modifier\/(.+)$/);
  const editMeal = editMatch && meals.find(m => m.id === decodeURIComponent(editMatch[1]));
  if (editMatch && !editMeal) { goHome(); return; }
  // #ajouter/AAAA-MM-JJ = nouveau repas à une date précise (bouton + d'une case du calendrier)
  const addMatch = location.hash.match(/^#ajouter(?:\/(\d{4}-\d{2}-\d{2}))?$/);
  const adding = !!addMatch || !!editMeal;
  homeView.hidden = adding;
  addView.hidden = !adding;
  document.querySelector(".menu-item").classList.toggle("active", !adding);
  closeModals();
  if (adding) openAddPage(editMeal || null, addMatch && addMatch[1]);
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
      <div class="day-head">
        <span class="day-num">${dayNum}</span>
        <button type="button" class="day-add" data-add-date="${dateIso}" aria-label="Ajouter un repas le ${formatDate(dateIso)}" title="Ajouter un repas ce jour-là">+</button>
      </div>
      <div class="thumbs">
        ${dayMeals.slice(0, 2).map((meal, i) => {
          // Au-delà de 2 repas, la 2e vignette affiche « +N » et ouvre la liste du jour
          const more = i === 1 && dayMeals.length > 2 ? dayMeals.length - 2 : 0;
          return `
          <button class="thumb ${prepClass(meal)}${meal.leftover ? " leftover" : ""}"${more
            ? ` data-day="${dateIso}" data-more="+${more}" aria-label="${dayMeals.length} repas le ${escapeHtml(formatDate(dateIso))} : voir tout"`
            : ` data-id="${escapeHtml(meal.id)}" aria-label="${escapeHtml(mealMoment(meal) + " : " + meal.name)}"`} style="background:${photoBg(meal)}">
            ${thumbHtml(meal)}
          </button>`;
        }).join("")}
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
  preview.classList.toggle("with-photo", !!meal.photo);
  preview.innerHTML = `
    <div class="preview-photo" style="background:${photoBg(meal)}">${photoHtml(meal)}</div>
    <div class="preview-info"><strong>${escapeHtml(meal.name)}${meal.leftover ? " ♻️" : ""}</strong><span>${escapeHtml(mealMoment(meal))} · ${formatDate(meal.date)}${stars}</span></div>`;

  // Aperçu centré à l'écran
  preview.style.left = "50%";
  preview.style.top = "50%";
  preview.classList.add("visible");
}
function hidePreview() { preview.classList.remove("visible"); }

grid.addEventListener("mouseover", e => { const t = e.target.closest(".thumb"); if (t && t.dataset.id) showPreview(t); });
grid.addEventListener("mouseout", e => { if (e.target.closest(".thumb") && !e.relatedTarget?.closest?.(".thumb")) hidePreview(); });
grid.addEventListener("click", e => {
  const add = e.target.closest("[data-add-date]");
  if (add) { location.hash = "ajouter/" + add.dataset.addDate; return; }
  const t = e.target.closest(".thumb");
  if (!t) return;
  hidePreview();
  if (t.dataset.day) openDayList(t.dataset.day);
  else openDetail(t.dataset.id);
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
    <div class="detail-photo${meal.photo ? " full" : ""}" style="background:${photoBg(meal)}">${photoHtml(meal)}</div>
    <h2 class="modal-title" style="margin-bottom:0">${escapeHtml(meal.name)}</h2>
    <div class="detail-meta">
      <span class="tag">${escapeHtml(mealMoment(meal))}</span>
      ${meal.leftover ? `<span class="tag neutral">♻️ Restes</span>` : ""}
      <span class="tag neutral">${formatDate(meal.date)}</span>
      ${prepared ? `<span class="tag neutral">${escapeHtml(prepared)}</span>` : ""}
      ${meal.rating ? `<span class="tag neutral detail-stars" aria-label="${formatRating(meal.rating)}">${starsHtml(meal.rating, "mini")}<span>${formatRating(meal.rating)}</span></span>` : ""}
    </div>
    ${meal.preparedBy === "Un resto" && meal.preparerAddress ? `<div class="detail-section"><h3>Restaurant</h3><p>${escapeHtml(meal.preparer)} · <span class="muted-text">${escapeHtml(meal.preparerAddress)}</span></p></div>` : ""}
    ${ingredientsDetailHtml(ingredients)}
    ${meal.recipeUrl && isWebLink(meal.recipeUrl) ? `<div class="detail-section"><h3>Recette</h3><p><a href="${escapeHtml(meal.recipeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meal.recipeUrl)}</a></p></div>` : ""}
    ${meal.improve ? `<div class="detail-section"><h3>À améliorer</h3><p>${escapeHtml(meal.improve)}</p></div>` : ""}
    ${meal.leftover && meal.improved ? `<div class="detail-section"><h3>Amélioré ✓</h3>${meal.improvedFrom ? `<p class="muted-text">À améliorer : ${escapeHtml(meal.improvedFrom)}</p>` : ""}<p>${escapeHtml(meal.improvedText || "C'est mieux cette fois-ci.")}</p>${meal.ratingBefore != null && meal.ratingBefore !== meal.rating ? `<p class="muted-text">Note : ${formatRating(meal.ratingBefore)} → ${formatRating(meal.rating)}</p>` : ""}</div>` : ""}
    ${meal.notes ? `<div class="detail-section"><h3>Notes</h3><p>${escapeHtml(meal.notes)}</p></div>` : ""}
    <div class="detail-actions">
      <button class="primary-btn small" data-edit="${escapeHtml(meal.id)}">Modifier</button>
      <button class="danger-btn" data-delete="${escapeHtml(meal.id)}">Supprimer ce repas</button>
    </div>`;
  detailModal.hidden = false;
}

detailContent.addEventListener("click", async e => {
  const open = e.target.closest("[data-open-meal]");
  if (open) { openDetail(open.dataset.openMeal); return; }
  const addDay = e.target.closest("[data-add-day]");
  if (addDay) { location.hash = "ajouter/" + addDay.dataset.addDay; return; }
  if (e.target.dataset.edit) { location.hash = "modifier/" + encodeURIComponent(e.target.dataset.edit); return; }
  const id = e.target.dataset.delete;
  if (!id) return;
  const meal = meals.find(x => x.id === id);
  if (!await askConfirm(`Supprimer « ${meal ? meal.name : "ce repas"} » du calendrier ?`, "Supprimer le repas")) return;
  meals = meals.filter(x => x.id !== id);
  saveMeals();
  closeModals();
  refresh();
  notify("Repas supprimé.");
});

// Liste de tous les repas d'un jour (vignette « +N »)
function openDayList(dateIso) {
  const dayMeals = meals.filter(m => m.date === dateIso).sort(sortByMoment);
  detailContent.innerHTML = `
    <h2 class="modal-title">${escapeHtml(formatDate(dateIso))}</h2>
    <div class="leftover-list day-list">
      ${dayMeals.map(m => `
        <button type="button" class="leftover-item" data-open-meal="${escapeHtml(m.id)}">
          <span class="leftover-thumb thumb-border ${prepClass(m)}" style="background:${photoBg(m)}">${thumbHtml(m)}</span>
          <span class="leftover-text"><strong>${escapeHtml(m.name)}${m.leftover ? " ♻️" : ""}</strong><small>${escapeHtml(mealMoment(m))}${preparedLabel(m) ? " · " + escapeHtml(preparedLabel(m)) : ""}</small></span>
        </button>`).join("")}
    </div>
    <div class="detail-actions" style="margin-top:14px">
      <button class="primary-btn small" data-add-day="${dateIso}">+ Ajouter un repas ce jour-là</button>
    </div>`;
  detailModal.hidden = false;
}

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
  draft = { photo: null, photoBlob: null, preparer: "", rating: 0, sections: [{ id: newId(), name: "", items: [] }], course: "Plat", preparerAddress: "", leftover: false, leftoverName: "" };
}

function openAddPage(meal, presetDate) {
  resetDraft();
  form.reset();
  draft.editingId = meal ? meal.id : null;
  document.getElementById("addTitle").textContent = meal ? "Modifier le repas" : "Ajouter un repas";
  document.getElementById("submitBtn").textContent = meal ? "Enregistrer les modifications" : "Enregistrer le repas";
  form.date.value = meal ? meal.date : (presetDate || iso(new Date()));
  form.type.value = meal ? meal.type : "Déjeuner"; // Déjeuner par défaut pour un nouveau repas
  if (meal) fillDraftFromMeal(meal);
  renderCourse();
  photoDrop.style.backgroundImage = draft.photo ? `url(${draft.photo})` : "";
  photoDrop.classList.toggle("has-photo", !!draft.photo);
  document.getElementById("photoDateHint").hidden = true;
  document.querySelectorAll(".add-form .invalid").forEach(el => el.classList.remove("invalid"));
  document.querySelectorAll(".field-error").forEach(el => (el.hidden = true));
  preparerAddRow.hidden = true;
  preparerNew.value = "";
  closePlaceList();
  lastRemote = { query: "", results: [], status: "" };
  if (meal) {
    preparedBy.value = meal.preparedBy || "Moi";
    draft.preparer = meal.preparer || "";
    draft.preparerAddress = meal.preparerAddress || "";
    // Un proche / resto supprimé de la liste entre-temps : on le remet pour pouvoir le garder
    if (draft.preparer && preparedBy.value !== "Moi" && !preparerList().includes(draft.preparer)) preparerList().push(draft.preparer);
  }
  renderPreparer();
  renderTypeChips();
  renderPreparedByChips();
  if (meal?.leftover) draft.leftoverName = meal.name;
  draft.improved = !!meal?.improved;
  improvedText.value = meal?.improvedText || "";
  setLeftoverMode(!!meal?.leftover);
  renderStars();
  closeSectionChooser();
  closeAutocomplete();
  renamingId = null;
  editingItemId = null;
  renderIngredients();
  updateAnalyzeState();
}

// Pré-remplit le brouillon à partir d'une fiche existante
function fillDraftFromMeal(meal) {
  form.name.value = meal.name || "";
  form.recipeUrl.value = meal.recipeUrl || "";
  form.improve.value = meal.improve || "";
  form.notes.value = meal.notes || "";
  draft.photo = meal.photo || null;
  draft.thumb = meal.thumb || null;
  draft.photoBlob = meal.photo ? dataUrlToBlob(meal.photo) : null;
  draft.rating = meal.rating || 0;
  draft.course = meal.course || "Plat";
  const ingredients = meal.ingredients || [];
  qtyToggle.checked = ingredients.some(i => i.qty);
  const groups = new Map();
  ingredients.forEach(i => { const g = i.group || ""; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); });
  draft.sections = [{ id: newId(), name: "", items: [] }];
  for (const [g, items] of groups) {
    const section = g ? { id: newId(), name: g, items: [], open: false } : draft.sections[0];
    if (g) draft.sections.push(section);
    section.items = items.map(i => ({ id: newId(), name: i.name, qty: i.qty || "", pending: false }));
  }
}
function dataUrlToBlob(dataUrl) {
  try {
    const [head, b64] = dataUrl.split(",");
    const mime = (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch (e) { return null; }
}


// ---------- Photo ----------
// Redimensionnée pour ne pas saturer le stockage du navigateur
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  // La date de prise de vue est lue dans le fichier d'origine (la réduction ci-dessous l'efface)
  readPhotoDate(file).then(applyPhotoDate);
  const img = new Image();
  img.onload = () => {
    const max = 900, scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    draft.photo = canvas.toDataURL("image/jpeg", 0.8);
    draft.thumb = null;
    const forPhoto = draft.photo;
    makeSmartThumb(forPhoto).then(t => { if (draft.photo === forPhoto) draft.thumb = t; }).catch(() => {});
    canvas.toBlob(b => { draft.photoBlob = b; updateAnalyzeState(); }, "image/jpeg", 0.85);
    photoDrop.style.backgroundImage = `url(${draft.photo})`;
    photoDrop.classList.add("has-photo");
    URL.revokeObjectURL(img.src);
    // Nouvelle photo : les anciennes suggestions non validées ne valent plus
    draft.sections.forEach(sec => (sec.items = sec.items.filter(x => !x.pending)));
    renderIngredients();
  };
  img.onerror = () => notify("Cette image n'a pas pu être lue.");
  img.src = URL.createObjectURL(file);
});

// ---------- Date de prise de vue (données EXIF des photos JPEG) ----------
async function readPhotoDate(file) {
  try {
    const v = new DataView(await file.slice(0, 512 * 1024).arrayBuffer());
    if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null; // pas un JPEG
    let off = 2;
    while (off + 10 < v.byteLength) {
      const marker = v.getUint16(off), size = v.getUint16(off + 2);
      if ((marker & 0xFF00) !== 0xFF00) break;
      if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return parseExifDate(v, off + 10); // « Exif »
      if (marker === 0xFFDA) break; // début de l'image : plus de métadonnées après
      off += 2 + size;
    }
  } catch (e) { /* fichier illisible : on ignore */ }
  return null;
}
function parseExifDate(v, tiff) {
  const little = v.getUint16(tiff) === 0x4949;
  const u16 = o => v.getUint16(o, little), u32 = o => v.getUint32(o, little);
  const tags = ifd => { const out = {}; const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; out[u16(e)] = e; } return out; };
  const text = e => {
    const count = u32(e + 4), at = count > 4 ? tiff + u32(e + 8) : e + 8;
    let str = ""; for (let i = 0; i < count - 1 && at + i < v.byteLength; i++) str += String.fromCharCode(v.getUint8(at + i));
    return str;
  };
  const ifd0 = tags(tiff + u32(tiff + 4));
  let raw = null;
  if (ifd0[0x8769]) { // sous-dossier Exif : DateTimeOriginal (prise de vue), sinon DateTimeDigitized
    const exif = tags(tiff + u32(ifd0[0x8769] + 8));
    if (exif[0x9003]) raw = text(exif[0x9003]); else if (exif[0x9004]) raw = text(exif[0x9004]);
  }
  if (!raw && ifd0[0x0132]) raw = text(ifd0[0x0132]); // DateTime
  const m = raw && raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, hour: Number(m[4]) } : null;
}
function applyPhotoDate(info) {
  const hint = document.getElementById("photoDateHint");
  hint.hidden = true;
  if (!info || info.date < "2000-01-01" || info.date > iso(new Date())) return;
  const previous = form.date.value;
  if (previous === info.date) {
    hint.textContent = "📅 La date correspond à celle de la photo.";
    hint.hidden = false;
    return;
  }
  form.date.value = info.date;
  form.date.dispatchEvent(new Event("change"));
  hint.innerHTML = `📅 Date reprise de la photo : ${escapeHtml(formatDate(info.date))}` +
    (previous ? ` · <button type="button" class="link-inline" data-keep-date="${previous}">garder le ${escapeHtml(formatDate(previous))}</button>` : "");
  hint.hidden = false;
}
document.getElementById("photoDateHint").addEventListener("click", e => {
  const keep = e.target.closest("[data-keep-date]");
  if (!keep) return;
  form.date.value = keep.dataset.keepDate;
  form.date.dispatchEvent(new Event("change"));
  e.currentTarget.hidden = true;
});

// ---------- Pastilles à cocher pour « Repas » et « Préparé par » ----------
// Le <select> caché garde la valeur (le reste du code le lit) ; les pastilles le pilotent.
function chipSelect(select, container) {
  const render = () => {
    container.innerHTML = [...select.options].map(o =>
      `<button type="button" class="chip" role="radio" aria-checked="${o.value === select.value}" tabindex="${o.value === select.value ? 0 : -1}" data-value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</button>`).join("");
  };
  const choose = value => {
    if (value === select.value) return;
    select.value = value;
    select.dispatchEvent(new Event("change"));
    render();
    // Garde le focus sur la pastille, sauf si le changement l'a envoyé ailleurs (ex. champ du resto)
    const a = document.activeElement;
    if (!a || a === document.body || container.contains(a)) container.querySelector(`[data-value="${CSS.escape(value)}"]`)?.focus();
  };
  container.addEventListener("click", e => { const c = e.target.closest("[data-value]"); if (c) choose(c.dataset.value); });
  container.addEventListener("keydown", e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const values = [...select.options].map(o => o.value);
    choose(values[(values.indexOf(select.value) + step + values.length) % values.length]);
  });
  render();
  return render; // à rappeler quand la valeur change par le code
}
const renderTypeChips = chipSelect(form.type, document.getElementById("typeChips"));
const renderPreparedByChips = chipSelect(document.getElementById("preparedBy"), document.getElementById("preparedByChips"));

// ---------- Moment du repas (déjeuner / dîner) ----------
const courseField = document.getElementById("courseField");
const courseChips = document.getElementById("courseChips");
function renderCourse() {
  courseField.hidden = !COURSE_MEALS.includes(form.type.value);
  courseChips.innerHTML = COURSES.map(c =>
    `<button type="button" class="chip" role="radio" aria-checked="${c === draft.course}" data-course="${c}">${c}</button>`).join("");
}
form.type.addEventListener("change", renderCourse);
courseChips.addEventListener("click", e => {
  const chip = e.target.closest("[data-course]");
  if (!chip) return;
  draft.course = chip.dataset.course;
  renderCourse();
  courseChips.querySelector(`[data-course="${draft.course}"]`).focus();
});
courseChips.addEventListener("keydown", e => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  draft.course = COURSES[(COURSES.indexOf(draft.course) + step + COURSES.length) % COURSES.length];
  renderCourse();
  courseChips.querySelector(`[data-course="${draft.course}"]`).focus();
});

// ---------- Préparé par ----------
function preparerList() {
  return { "Un proche": people, "Un resto": restaurants, "Livraison": deliveries, "Autre": others }[preparedBy.value] || [];
}
function preparerKey() {
  return { "Un proche": KEYS.people, "Un resto": KEYS.restaurants, "Livraison": KEYS.deliveries, "Autre": KEYS.others }[preparedBy.value];
}
const isResto = () => preparedBy.value === "Un resto";
const isDelivery = () => preparedBy.value === "Livraison";
const isOther = () => preparedBy.value === "Autre";

function renderPreparer() {
  const mode = preparedBy.value;
  preparerPicker.hidden = mode === "Moi";
  if (mode === "Moi") { draft.preparer = ""; draft.preparerAddress = ""; renderNear(); return; }
  const list = preparerList();
  if (draft.preparer && !list.includes(draft.preparer)) draft.preparer = "";
  // Livraison / Autre : une seule valeur. Une fois choisie, elle s'affiche seule avec une croix pour la changer.
  if (isDelivery() || isOther()) {
    preparerChips.innerHTML = draft.preparer
      ? `<span class="chip selected-chip">${escapeHtml(draft.preparer)}<button type="button" class="chip-x" data-clear aria-label="Changer">${ICON_X}</button></span>`
      : "";
    preparerAddRow.hidden = !!draft.preparer;
    preparerNew.placeholder = isOther() ? "Préciser (facultatif) : cantine, traiteur, food truck…" : "Nom du resto qui a livré";
    renderNear();
    return;
  }
  preparerChips.innerHTML =
    list.map(n => `<button type="button" class="chip" role="radio" aria-checked="${n === draft.preparer}" data-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("") +
    (isResto() ? "" : `<button type="button" class="chip add-chip" data-add>+ Ajouter un proche</button>`);
  // Pour un resto, le champ de recherche est toujours visible
  if (isResto()) preparerAddRow.hidden = false;
  preparerNew.placeholder = isResto() ? "Rechercher un restaurant…" : "Prénom du proche";
  renderNear();
}

preparedBy.addEventListener("change", () => {
  draft.preparer = "";
  draft.preparerAddress = "";
  preparerAddRow.hidden = true;
  closePlaceList();
  renderPreparer();
  // Pas encore de proche enregistré, ou mode resto : on ouvre directement la saisie
  if (preparedBy.value !== "Moi" && (isResto() || isDelivery() || isOther() || !preparerList().length)) showPreparerInput();
});

preparerChips.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  if (chip.hasAttribute("data-add")) { showPreparerInput(); return; }
  if (e.target.closest("[data-clear]")) { draft.preparer = ""; renderPreparer(); showPreparerInput(); return; }
  if (!chip.dataset.name) return;
  draft.preparer = draft.preparer === chip.dataset.name ? "" : chip.dataset.name;
  draft.preparerAddress = draft.preparer ? (restaurantInfo[draft.preparer] || "") : "";
  renderPreparer();
});

function showPreparerInput() {
  preparerAddRow.hidden = false;
  preparerNew.value = "";
  preparerNew.focus();
}

function addPreparer(name = preparerNew.value.trim(), address = "") {
  name = String(name).trim().slice(0, 80);
  if (!name) { preparerNew.focus(); return; }
  const list = preparerList();
  const existing = list.find(n => n.toLowerCase() === name.toLowerCase());
  if (!existing) {
    list.push(name);
    list.sort((a, b) => a.localeCompare(b, "fr"));
    save(preparerKey(), list);
  }
  draft.preparer = existing || name;
  if (isResto()) {
    if (address) { restaurantInfo[draft.preparer] = address; save(KEYS.restaurantInfo, restaurantInfo); }
    draft.preparerAddress = restaurantInfo[draft.preparer] || "";
  }
  preparerNew.value = "";
  closePlaceList();
  if (!isResto()) preparerAddRow.hidden = true;
  renderPreparer();
}
const preparerNewOk = document.getElementById("preparerNewOk");
preparerNewOk.addEventListener("click", () => addPreparer());
preparerNew.addEventListener("keydown", e => {
  const open = !placeBox.hidden && placeItems.length;
  if (e.key === "ArrowDown" && open) { e.preventDefault(); setPlaceActive((placeActive + 1) % placeItems.length); }
  else if (e.key === "ArrowUp" && open) { e.preventDefault(); setPlaceActive((placeActive - 1 + placeItems.length) % placeItems.length); }
  else if (e.key === "Enter") {
    e.preventDefault();
    if (open && placeActive >= 0) choosePlace(placeItems[placeActive]);
    else addPreparer();
  } else if (e.key === "Escape") {
    e.stopPropagation();
    if (!placeBox.hidden) closePlaceList();
    else if (!isResto()) preparerAddRow.hidden = true;
  }
});
preparerNew.addEventListener("input", onPlaceInput);
preparerNew.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== preparerNew) closePlaceList(); }, 150));

// ---------- Suggestions pendant la saisie d'un nom (proche ou resto) ----------
// 1) les noms déjà enregistrés ; 2) pour un resto, les lieux trouvés par Mapbox
const PLACES_SERVER = "Mapbox";
const PLACE_TOOLS = ["search_and_geocode_tool", "poi_search_tool", "forward_geocode_tool"];
let mcpApi = null;
let placeTool = null, placeSchema = null;
let placeProblem = null;            // erreur durable (connecteur absent, refusé…)
let placeItems = [], placeActive = -1, placeTimer = null, placeSeq = 0;
let lastRemote = { query: "", results: [], status: "" };

const placeBox = document.createElement("ul");
placeBox.className = "ac-list place-list";
placeBox.id = "placeList";
placeBox.setAttribute("role", "listbox");
placeBox.hidden = true;
preparerAddRow.appendChild(placeBox);
preparerNew.setAttribute("role", "combobox");
preparerNew.setAttribute("aria-controls", "placeList");
preparerNew.setAttribute("aria-autocomplete", "list");

async function initPlaces() {
  try { mcpApi = window.claude?.use ? await window.claude.use("mcp") : null; }
  catch (e) { mcpApi = null; }
  renderNear();
}

const PLACE_ERRORS = {
  server_not_connected: "Pour des suggestions de lieux, connecte Mapbox dans claude.ai (Réglages → Connecteurs).",
  needs_reauth: "Reconnecte Mapbox dans claude.ai (Réglages → Connecteurs) pour retrouver les suggestions de lieux.",
  selection_required: "Choisis quel connecteur Mapbox utiliser dans la fenêtre proposée par Claude.",
  not_in_manifest: "Mapbox n'est pas autorisé pour ce site : tu peux l'activer dans les permissions de la page.",
  approval_required: "Les suggestions Mapbox demandent ton autorisation.",
  blocked_by_policy: "Mapbox est bloqué par ton organisation.",
  no_tool: "Le connecteur Mapbox ne propose pas de recherche de lieux.",
};
const DURABLE = ["server_not_connected", "needs_reauth", "not_in_manifest", "blocked_by_policy", "no_tool", "not_granted", "capability_disabled", "capability_removed"];

function onPlaceInput() {
  const q = preparerNew.value.trim();
  clearTimeout(placeTimer);
  if (q.length < 2) { lastRemote = { query: "", results: [], status: "" }; return closePlaceList(); }
  const remote = isResto() && mcpApi && !placeProblem && q.length >= 3;
  if (remote && lastRemote.query !== q) {
    lastRemote = { query: q, results: lastRemote.results, status: "loading" };
    placeTimer = setTimeout(() => searchPlaces(q), 350);
  }
  renderPlaceList();
}

async function searchPlaces(q) {
  const seq = ++placeSeq;
  try {
    if (!placeTool) {
      const res = await mcpApi.listTools(PLACES_SERVER);
      const srv = res.servers.find(s => s.server === PLACES_SERVER);
      if (!srv || !srv.tools.length) throw { code: "server_not_connected" };
      const names = srv.tools.map(t => t.name);
      placeTool = PLACE_TOOLS.find(n => names.includes(n));
      if (!placeTool) throw { code: "no_tool" };
    }
    if (!placeSchema) placeSchema = await mcpApi.describeTool(PLACES_SERVER, placeTool).then(d => d.inputSchema).catch(() => null);
    const result = await mcpApi.callTool(PLACES_SERVER, placeTool, buildPlaceInput(q), { cache: { staleTime: 60000, gcTime: 600000 } });
    // Le schéma devient lisible après la première autorisation : on le relit pour les recherches suivantes
    if (!placeSchema) placeSchema = await mcpApi.describeTool(PLACES_SERVER, placeTool).then(d => d.inputSchema).catch(() => null);
    if (seq !== placeSeq) return;
    lastRemote = { query: q, results: parsePlaces(result).slice(0, 5), status: "done" };
  } catch (e) {
    if (seq !== placeSeq) return;
    const code = e?.code || "upstream_error";
    if (DURABLE.includes(code)) { placeProblem = code; renderNear(); }
    lastRemote = { query: q, results: [], status: "error:" + code };
  }
  if (preparerNew.value.trim() === q) renderPlaceList();
}

// Construit la requête d'après le schéma du connecteur (lu à l'exécution)
function buildPlaceInput(q) {
  const props = (placeSchema && placeSchema.properties) || {};
  const has = k => Object.prototype.hasOwnProperty.call(props, k);
  const mentions = (k, word) => JSON.stringify(props[k] || "").includes(word);
  const qKey = ["q", "query", "searchText", "search_text", "text"].find(has) || "q";
  const input = { [qKey]: q };
  if (has("limit")) input.limit = 5;
  if (has("language")) input.language = "fr";
  if (has("types")) input.types = ["poi"];
  if (has("format") && mentions("format", "json_string")) input.format = "json_string";
  if (has("auto_complete")) input.auto_complete = true;
  // Sans position, Mapbox se base sur l'emplacement de son serveur : on lui donne la ville choisie
  if (nearPlace && (has("proximity") || !placeSchema)) input.proximity = { longitude: nearPlace.longitude, latitude: nearPlace.latitude };
  return input;
}

// Lit la réponse, qu'elle soit en GeoJSON, en liste ou en texte
function parsePlaces(result) {
  let data = result?.payload;
  if (data == null) data = (result?.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { /* texte libre */ } }
  const list = Array.isArray(data) ? data : (data?.features || data?.results || data?.suggestions || data?.places);
  let out = [];
  if (Array.isArray(list)) {
    out = list.map(f => {
      const p = f?.properties || f || {};
      const name = p.name || p.name_preferred || p.text || p.title || (p.place_name || "").split(",")[0];
      const address = p.full_address || p.place_formatted || p.address || p.place_name || "";
      return { name: String(name || "").trim(), address: String(address || "").trim() };
    });
  } else if (typeof data === "string") {
    // Texte : « 1. Nom » puis une ligne d'adresse
    const lines = data.split("\n").map(l => l.trim()).filter(Boolean);
    lines.forEach((l, i) => {
      const m = l.match(/^\d+[.)]\s*\**(.+?)\**$/);
      if (!m) return;
      const next = lines[i + 1] || "";
      const addr = /^\d+[.)]/.test(next) ? "" : next.replace(/^(address|adresse|full address)\s*:\s*/i, "");
      out.push({ name: m[1].trim(), address: addr });
    });
  }
  const seen = new Set();
  return out.filter(p => {
    if (!p.name) return false;
    if (p.address.toLowerCase().startsWith(p.name.toLowerCase() + ",")) p.address = p.address.slice(p.name.length + 1).trim();
    const key = normalizeText(p.name + "|" + p.address);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderPlaceList() {
  const q = preparerNew.value.trim();
  const nq = normalizeText(q);
  // Un resto : uniquement les suggestions Mapbox. Livraison : tous les restos déjà enregistrés.
  const pool = isResto() ? [] : isDelivery() ? [...new Set([...deliveries, ...restaurants])] : isOther() ? others : people;
  const saved = pool
    .filter(n => normalizeText(n).includes(nq) && normalizeText(n) !== "")
    .sort((a, b) => normalizeText(a).indexOf(nq) - normalizeText(b).indexOf(nq))
    .slice(0, 4)
    .map(n => ({ name: n, address: isResto() ? (restaurantInfo[n] || "") : "", saved: true }));
  const savedKeys = new Set(saved.map(s => normalizeText(s.name)));
  const remote = (lastRemote.query && isResto() ? lastRemote.results : [])
    .filter(r => !savedKeys.has(normalizeText(r.name)));
  placeItems = [...saved, ...remote];

  let status = "";
  if (isResto() && q.length >= 3) {
    if (!mcpApi) status = "";
    else if (placeProblem) status = PLACE_ERRORS[placeProblem] || "";
    else if (lastRemote.status === "loading") status = "Recherche sur Mapbox…";
    else if (lastRemote.status.startsWith("error:")) status = PLACE_ERRORS[lastRemote.status.slice(6)] || "Suggestions Mapbox indisponibles pour le moment.";
    else if (lastRemote.status === "done" && !remote.length && !saved.length) status = "Aucun lieu trouvé sur Mapbox.";
  }
  if (!placeItems.length && !status) return closePlaceList();

  const row = (p, i) => `<li role="option" id="pl-${i}" data-i="${i}">
      <span class="place-main"><span>${escapeHtml(p.name)}</span>${p.address ? `<small class="place-addr">${escapeHtml(p.address)}</small>` : ""}</span>
      ${p.saved ? `<small>déjà enregistré</small>` : ""}
    </li>`;
  let html = saved.map((p, i) => row(p, i)).join("");
  if (remote.length) html += `<li class="ac-head" role="presentation">Suggestions Mapbox</li>` + remote.map((p, j) => row(p, saved.length + j)).join("");
  if (status) html += `<li class="ac-status" role="presentation">${escapeHtml(status)}</li>`;
  placeBox.innerHTML = html;
  placeBox.hidden = false;
  preparerNew.setAttribute("aria-expanded", "true");
  setPlaceActive(placeItems.length && normalizeText(placeItems[0].name).startsWith(nq) ? 0 : -1);
}
function setPlaceActive(i) {
  placeActive = i;
  placeBox.querySelectorAll("li[data-i]").forEach(li => li.classList.toggle("active", Number(li.dataset.i) === i));
  preparerNew.setAttribute("aria-activedescendant", i >= 0 ? `pl-${i}` : "");
}
function closePlaceList() {
  placeBox.hidden = true;
  placeItems = []; placeActive = -1;
  preparerNew.setAttribute("aria-expanded", "false");
}
function choosePlace(p) { addPreparer(p.name, p.address); }
placeBox.addEventListener("mousedown", e => {
  const li = e.target.closest("li[data-i]");
  if (!li) return;
  e.preventDefault();
  choosePlace(placeItems[Number(li.dataset.i)]);
});
placeBox.addEventListener("mousemove", e => { const li = e.target.closest("li[data-i]"); if (li) setPlaceActive(Number(li.dataset.i)); });

// ---------- Ville de référence pour la recherche de restos ----------
const nearRow = document.getElementById("nearRow");
const nearLabel = document.getElementById("nearLabel");
const nearBtn = document.getElementById("nearBtn");
const nearEdit = document.getElementById("nearEdit");
const nearInput = document.getElementById("nearInput");
const nearStatus = document.getElementById("nearStatus");

function renderNear() {
  nearRow.hidden = !(isResto() && mcpApi && !placeProblem);
  nearLabel.textContent = nearPlace ? `Résultats autour de ${nearPlace.name}` : "Choisis ta ville pour des résultats proches de toi";
  nearBtn.textContent = nearPlace ? "changer" : "choisir";
}
nearBtn.addEventListener("click", () => {
  nearEdit.hidden = false;
  nearStatus.textContent = "";
  nearInput.value = nearPlace?.name || "";
  nearInput.focus();
  nearInput.select();
});
async function saveNear() {
  const q = nearInput.value.trim();
  if (!q) { nearInput.focus(); return; }
  nearStatus.textContent = "Recherche de la ville…";
  try {
    if (!placeTool) {
      const res = await mcpApi.listTools(PLACES_SERVER);
      const srv = res.servers.find(x => x.server === PLACES_SERVER);
      if (!srv || !srv.tools.length) throw { code: "server_not_connected" };
      placeTool = PLACE_TOOLS.find(n => srv.tools.some(t => t.name === n));
      if (!placeTool) throw { code: "no_tool" };
    }
    const result = await mcpApi.callTool(PLACES_SERVER, placeTool, { q, types: ["place", "locality", "district"], language: "fr" });
    let data = result?.payload;
    if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { data = null; } }
    const f = data?.features?.[0];
    const coords = f?.geometry?.coordinates || (f?.properties?.coordinates && [f.properties.coordinates.longitude, f.properties.coordinates.latitude]);
    if (!f || !Array.isArray(coords) || coords.length < 2) { nearStatus.textContent = "Ville introuvable, essaie un autre nom."; return; }
    const p = f.properties || {};
    nearPlace = { name: String(p.name || q).slice(0, 60), longitude: Number(coords[0]), latitude: Number(coords[1]) };
    save(KEYS.near, nearPlace);
    nearEdit.hidden = true;
    lastRemote = { query: "", results: [], status: "" };
    renderNear();
    preparerNew.focus();
    if (preparerNew.value.trim().length >= 3) onPlaceInput();
  } catch (e) {
    const code = e?.code || "upstream_error";
    if (DURABLE.includes(code)) { placeProblem = code; renderNear(); }
    nearStatus.textContent = PLACE_ERRORS[code] || "La ville n'a pas pu être cherchée pour le moment.";
  }
}
document.getElementById("nearOk").addEventListener("click", saveNear);
nearInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); saveNear(); }
  if (e.key === "Escape") { e.stopPropagation(); nearEdit.hidden = true; }
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

// Menu déroulant pour ranger un ingrédient dans une rubrique
function rubricSelectHtml(item, section) {
  const inMain = section === mainSection();
  const subs = draft.sections.slice(1);
  const used = new Set(subs.map(x => normalizeText(x.name)));
  const fresh = SECTION_SUGGESTIONS.filter(n => !used.has(normalizeText(n)));
  return `<select class="rubric-select empty" data-move="${item.id}" aria-label="Rubrique de ${escapeHtml(item.name)}">
    ${inMain ? `<option value="" selected hidden>Ranger</option>` : `<option value="${mainSection().id}">Sans rubrique</option>`}
    ${subs.map(x => `<option value="${x.id}"${x === section ? " selected" : ""}>${escapeHtml(x.name)}</option>`).join("")}
    <optgroup label="Nouvelle rubrique">
      <option value="other">Nommer une rubrique…</option>
      ${fresh.map(n => `<option value="new:${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
    </optgroup>
  </select>`;
}

// Déplace un ingrédient validé vers une autre rubrique (à la suite des validés)
function moveItem(itemId, targetSid) {
  const found = findItem(itemId);
  const target = draft.sections.find(x => x.id === targetSid);
  if (!found || !target || found.section === target) return;
  found.section.items.splice(found.index, 1);
  const firstPending = target.items.findIndex(x => x.pending);
  target.items.splice(firstPending < 0 ? target.items.length : firstPending, 0, found.item);
  justAdded.add(found.item.id);
  if (target !== mainSection() && !target.open) flashIds.add(target.id);
}

const ICON_PEN = `<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4"/></svg>`;
let renamingId = null; // sous-rubrique dont le nom est en cours de modification
let editingItemId = null; // ingrédient dont le nom est en cours de modification

function itemRowHtml(it, s, showQty) {
  return `
    <li class="ingredient${it.pending ? " pending" : ""}${justAdded.has(it.id) ? " entering" : ""}${flashIds.has(it.id) ? " flash" : ""}" data-iid="${it.id}">
      ${it.pending ? `<span class="pending-mark" title="Suggestion de l'analyse photo">✨</span>` : ""}
      ${editingItemId === it.id
        ? `<input type="text" class="item-edit-input" data-edit-item="${it.id}" value="${escapeHtml(it.name)}" maxlength="60" aria-label="Modifier l'ingrédient">`
        : it.pending
          ? `<span class="ingredient-name">${escapeHtml(it.name)}</span>`
          : `<span class="ingredient-name editable" data-edit-name="${it.id}" title="Cliquer pour modifier">${escapeHtml(it.name)}<button type="button" class="pen-btn item-pen" data-edit-name="${it.id}" aria-label="Modifier ${escapeHtml(it.name)}">${ICON_PEN}</button></span>`}
      ${it.pending ? `
        <button type="button" class="round-btn ok" data-accept="${it.id}" aria-label="Valider ${escapeHtml(it.name)}">${ICON_CHECK}</button>
        <button type="button" class="round-btn no" data-remove="${it.id}" aria-label="Retirer ${escapeHtml(it.name)}">${ICON_X}</button>`
      : `
        ${rubricSelectHtml(it, s)}
        ${showQty ? `<input type="text" class="qty-input" data-qty="${it.id}" value="${escapeHtml(it.qty)}" placeholder="Ex. 200 g" aria-label="Quantité de ${escapeHtml(it.name)}">` : (it.qty ? `<span class="qty-text">${escapeHtml(it.qty)}</span>` : "")}
        <button type="button" class="round-btn no" data-remove="${it.id}" aria-label="Retirer ${escapeHtml(it.name)}">${ICON_X}</button>`}
    </li>`;
}

// Nom d'une sous-rubrique : texte + crayon, ou champ de saisie pendant la modification
function sectionNameHtml(s) {
  if (renamingId === s.id) {
    return `<input type="text" class="rename-input" data-rename="${s.id}" value="${escapeHtml(s.name)}" maxlength="40" aria-label="Nouveau nom de la sous-rubrique">`;
  }
  return `<span class="section-title">
      <span class="ing-section-name">${escapeHtml(s.name)}</span>
      <button type="button" class="pen-btn" data-rename-section="${s.id}" aria-label="Renommer ${escapeHtml(s.name)}" title="Renommer">${ICON_PEN}</button>
    </span>`;
}

// Sous-rubrique terminée : une ligne dans la liste, ses ingrédients en petit dessous
function groupRowHtml(s) {
  const items = s.items.filter(x => !x.pending);
  const detail = items.length
    ? items.map(i => escapeHtml(i.name) + (i.qty ? ` <span class="qty-text">(${escapeHtml(i.qty)})</span>` : "")).join(" · ")
    : "Aucun ingrédient";
  return `
    <li class="ingredient group-row${justAdded.has(s.id) ? " entering" : ""}${flashIds.has(s.id) ? " flash" : ""}" data-gid="${s.id}">
      <div class="group-body">
        ${sectionNameHtml(s)}
        <span class="group-items">${detail}</span>
      </div>
      <button type="button" class="text-btn" data-open-section="${s.id}">Modifier</button>
      <button type="button" class="round-btn no" data-remove-section="${s.id}" aria-label="Supprimer la sous-rubrique ${escapeHtml(s.name)}">${ICON_X}</button>
    </li>`;
}

// Sous-rubrique en cours de modification : s'ouvre à sa place dans la liste
function subEditorHtml(s, showQty) {
  return `
    <li class="ing-section sub-editor${justAdded.has(s.id) ? " entering" : ""}" data-sid="${s.id}">
      <div class="ing-section-head">
        ${sectionNameHtml(s)}
        <span class="ing-section-actions">
          <button type="button" class="text-btn" data-close-section="${s.id}">${ICON_CHECK} Terminé</button>
          <button type="button" class="remove-btn" data-remove-section="${s.id}" aria-label="Supprimer la sous-rubrique ${escapeHtml(s.name)}">${ICON_X}</button>
        </span>
      </div>
      <ul class="ingredient-list">${s.items.map(it => itemRowHtml(it, s, showQty)).join("")}</ul>
      <div class="add-inline ac-wrap">
        <input type="text" class="ing-input" data-sid="${s.id}" placeholder="Ajouter dans « ${escapeHtml(s.name)} »…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false">
        <button type="button" class="small-btn" data-add-to="${s.id}">Ajouter</button>
      </div>
    </li>`;
}

function renderIngredients(focusSectionId) {
  const showQty = qtyToggle.checked;
  const main = mainSection();
  const subs = draft.sections.slice(1);
  const validated = main.items.filter(x => !x.pending);
  const pending = main.items.filter(x => x.pending);
  const pendingCount = pending.length;

  // Liste principale : ingrédients, puis sous-rubriques terminées, puis suggestions à valider
  const mainHtml = `
    <div class="ing-section" data-sid="${main.id}">
      <ul class="ingredient-list">
        ${validated.map(it => itemRowHtml(it, main, showQty)).join("")}
        ${subs.map(x => x.open ? subEditorHtml(x, showQty) : groupRowHtml(x)).join("")}
        ${pending.map(it => itemRowHtml(it, main, showQty)).join("")}
      </ul>
      ${pendingCount ? `<div class="pending-bar">
        <p class="hint">✨ ${pendingCount} suggestion${pendingCount > 1 ? "s" : ""} de l'analyse à valider (✓) ou retirer (✕). Celles non validées ne seront pas enregistrées.</p>
        <span class="pending-actions">
          ${pendingCount > 1 ? `<button type="button" class="text-btn ok" data-accept-all>${ICON_CHECK} Tout valider</button>
          <button type="button" class="text-btn muted" data-reject-all>${ICON_X} Tout retirer</button>` : ""}
        </span>
      </div>` : ""}
      <div class="add-inline ac-wrap">
        <input type="text" class="ing-input" data-sid="${main.id}" placeholder="Ajouter un ingrédient…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false">
        <button type="button" class="small-btn" data-add-to="${main.id}">Ajouter</button>
      </div>
    </div>`;

  ingSections.innerHTML = mainHtml;
  justAdded.clear();
  flashIds.clear();
  renderSectionChips();
  const renameInput = ingSections.querySelector(".rename-input, .item-edit-input");
  if (renameInput) { renameInput.focus(); renameInput.select(); }
  else if (focusSectionId) ingSections.querySelector(`.ing-input[data-sid="${focusSectionId}"]`)?.focus();
}

// ---------- Renommer une sous-rubrique ----------
function commitRename(input, keep) {
  if (renamingId !== input.dataset.rename) return;
  const s = draft.sections.find(x => x.id === renamingId);
  renamingId = null;
  const name = capitalize(input.value.trim().slice(0, 40));
  if (keep && s && name && name !== s.name) {
    const clash = draft.sections.find(x => x !== s && normalizeText(x.name) === normalizeText(name));
    if (clash) notify(`Une sous-rubrique « ${clash.name} » existe déjà.`);
    else { s.name = name; flashIds.add(s.id); }
  }
  renderIngredients();
}
ingSections.addEventListener("keydown", e => {
  if (!e.target.matches(".rename-input")) return;
  if (e.key === "Enter") { e.preventDefault(); commitRename(e.target, true); }
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); commitRename(e.target, false); }
});
ingSections.addEventListener("focusout", e => {
  if (e.target.matches(".rename-input")) commitRename(e.target, true);
});

// ---------- Modifier le nom d'un ingrédient ----------
function commitItemEdit(input, keep) {
  if (editingItemId !== input.dataset.editItem) return;
  const found = findItem(editingItemId);
  editingItemId = null;
  if (keep && found) {
    const name = capitalize(singularize(input.value.trim().slice(0, 60)));
    if (!name) notify("Le nom de l'ingrédient ne peut pas être vide.");
    else if (name !== found.item.name) {
      const clash = findByName(name);
      if (clash && clash !== found.item) { notify(`« ${clash.name} » est déjà dans la liste.`); flashIds.add(clash.id); }
      else { found.item.name = name; flashIds.add(found.item.id); }
    }
  }
  renderIngredients();
}
ingSections.addEventListener("click", e => {
  const t = e.target.closest("[data-edit-name]");
  if (!t || editingItemId) return;
  editingItemId = t.dataset.editName;
  closeAutocomplete();
  renderIngredients();
});
ingSections.addEventListener("keydown", e => {
  if (!e.target.matches(".item-edit-input")) return;
  if (e.key === "Enter") { e.preventDefault(); commitItemEdit(e.target, true); }
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); commitItemEdit(e.target, false); }
});
ingSections.addEventListener("focusout", e => {
  if (e.target.matches(".item-edit-input")) commitItemEdit(e.target, true);
});

// Saisie manuelle : plusieurs ingrédients possibles, séparés par des virgules
function submitTyped(input, pickedName) {
  const sid = input.dataset.sid;
  const values = pickedName ? [pickedName] : input.value.split(",");
  values.forEach(v => addIngredient(sid, v));
  input.value = "";
  closeAutocomplete();
  renderIngredients(sid);
}

ingSections.addEventListener("click", async e => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.accept) { acceptItem(t.dataset.accept); renderIngredients(); }
  else if (t.hasAttribute("data-accept-all")) {
    mainSection().items.filter(x => x.pending).forEach(x => acceptItem(x.id));
    analyzeStatus.textContent = "Toutes les suggestions ont été validées.";
    renderIngredients();
  }
  else if (t.hasAttribute("data-reject-all")) {
    const rows = ingSections.querySelectorAll(".ingredient.pending");
    rows.forEach(r => r.classList.add("leaving"));
    setTimeout(() => {
      draft.sections.forEach(sec => (sec.items = sec.items.filter(x => !x.pending)));
      analyzeStatus.textContent = "Suggestions retirées.";
      renderIngredients();
    }, 160);
  }
  else if (t.dataset.remove) removeItem(t.dataset.remove);
  else if (t.dataset.addTo) submitTyped(ingSections.querySelector(`.ing-input[data-sid="${t.dataset.addTo}"]`));
  else if (t.dataset.closeSection) {
    // « Terminé » : ce qui est encore tapé est ajouté, puis le champ se referme
    const input = ingSections.querySelector(`.ing-input[data-sid="${t.dataset.closeSection}"]`);
    if (input?.value.trim()) input.value.split(",").forEach(v => addIngredient(t.dataset.closeSection, v));
    draft.sections.find(x => x.id === t.dataset.closeSection).open = false;
    justAdded.add(t.dataset.closeSection);
    closeAutocomplete();
    renderIngredients();
  }
  else if (t.dataset.renameSection) {
    renamingId = t.dataset.renameSection;
    renderIngredients();
  }
  else if (t.dataset.openSection) {
    draft.sections.slice(1).forEach(x => (x.open = x.id === t.dataset.openSection));
    renderIngredients(t.dataset.openSection);
  }
  else if (t.dataset.removeSection) {
    const s = draft.sections.find(x => x.id === t.dataset.removeSection);
    if (s.items.some(x => !x.pending) && !await askConfirm(`Supprimer la sous-rubrique « ${s.name} » et ses ingrédients ?`)) return;
    draft.sections = draft.sections.filter(x => x !== s);
    renderIngredients();
  }
});
ingSections.addEventListener("change", e => {
  const sel = e.target.closest(".rubric-select");
  if (!sel) return;
  const v = sel.value;
  if (v === "other") {
    pendingMoveId = sel.dataset.move;
    openSectionChooser();
    renderIngredients(); // remet le menu dans son état tant que la rubrique n'est pas créée
    sectionOther.focus();
    return;
  }
  if (v.startsWith("new:")) {
    const sec = createSection(v.slice(4), false);
    moveItem(sel.dataset.move, sec.id);
  } else moveItem(sel.dataset.move, v);
  renderIngredients();
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
    .map(n => `<button type="button" class="chip" data-section-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("");
  document.getElementById("sectionSuggestHint").hidden = !sectionChips.children.length;
}
let pendingMoveId = null; // ingrédient à ranger dans la rubrique « Autre… » en cours de création

function createSection(name, open) {
  name = capitalize(name.trim().slice(0, 40));
  if (!name) return null;
  let section = draft.sections.find(x => normalizeText(x.name) === normalizeText(name));
  if (!section) { section = { id: newId(), name, items: [], open }; draft.sections.push(section); justAdded.add(section.id); }
  return section;
}
function addSection(name) {
  const moving = pendingMoveId;
  const section = createSection(name, !moving);
  if (!section) { sectionOther.focus(); return; }
  if (moving) moveItem(moving, section.id);
  else {
    // Une seule sous-rubrique ouverte à la fois pour garder la page lisible
    draft.sections.slice(1).forEach(x => (x.open = x === section));
  }
  closeSectionChooser();
  renderIngredients(moving ? null : section.id);
}
// Le nom libre est le choix principal ; les noms proposés ne sont que des suggestions
function openSectionChooser() {
  sectionChoices.hidden = false;
  addSectionBtn.hidden = true;
  sectionOther.value = "";
  renderSectionChips();
  sectionOther.focus();
}
function closeSectionChooser() {
  sectionChoices.hidden = true;
  addSectionBtn.hidden = false;
  pendingMoveId = null;
}
addSectionBtn.addEventListener("click", () => openSectionChooser());
document.getElementById("sectionChooserClose").addEventListener("click", closeSectionChooser);
sectionChips.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  addSection(chip.dataset.sectionName);
});
document.getElementById("sectionOtherOk").addEventListener("click", () => addSection(sectionOther.value));
sectionOther.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); addSection(sectionOther.value); }
  if (e.key === "Escape") { e.stopPropagation(); closeSectionChooser(); }
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
  if (draft.leftover) { saveLeftover(); return; }
  const name = form.name.value.trim();
  const recipeUrl = form.recipeUrl.value.trim();
  const badName = !name;
  const badUrl = !!recipeUrl && !isWebLink(recipeUrl);
  setError(form.name, document.getElementById("nameError"), badName);
  setError(form.recipeUrl, document.getElementById("urlError"), badUrl);
  if (badName) { form.name.focus(); return; }
  if (badUrl) { form.recipeUrl.focus(); return; }
  if (!form.date.value) form.date.value = iso(new Date());

  // Un nom tapé dans « Préparé par » sans avoir validé est pris en compte
  if (preparedBy.value !== "Moi" && !draft.preparer && preparerNew.value.trim()) addPreparer();

  // Un ingrédient tapé mais pas encore ajouté est pris en compte
  ingSections.querySelectorAll(".ing-input").forEach(input =>
    input.value.split(",").forEach(v => v.trim() && addIngredient(input.dataset.sid, v)));

  const type = form.type.value;
  const meal = {
    id: draft.editingId || `m-${Date.now()}`,
    name,
    date: form.date.value,
    type,
    course: COURSE_MEALS.includes(type) ? draft.course : "",
    photo: draft.photo,
    thumb: draft.photo ? draft.thumb : null,
    emoji: null, // calculé à l'affichage (guessEmoji) quand il n'y a pas de photo
    color: null,
    preparedBy: preparedBy.value,
    preparer: preparedBy.value === "Moi" ? "" : draft.preparer,
    preparerAddress: preparedBy.value === "Un resto" && draft.preparer ? (restaurantInfo[draft.preparer] || "") : "",
    rating: draft.rating,
    // Liste à plat ; « group » = nom de la sous-rubrique ("" pour la liste principale)
    ingredients: draft.sections.flatMap(sec => sec.items.filter(i => !i.pending)
      .map(i => ({ name: i.name, qty: i.qty.trim(), group: sec.name }))),
    recipeUrl,
    improve: form.improve.value.trim(),
    notes: form.notes.value.trim(),
  };
  storeMeal(meal);
});

function storeMeal(meal) {
  const previous = meals.slice();
  const idx = draft.editingId ? meals.findIndex(m => m.id === draft.editingId) : -1;
  if (idx >= 0) meals[idx] = meal; else meals.push(meal);
  if (!saveMeals()) { meals = previous; return; }
  backfillThumbs(); // au cas où la miniature n'était pas encore prête à l'enregistrement
  const [yy, mm] = meal.date.split("-").map(Number);
  viewDate = new Date(yy, mm - 1, 1);
  goHome();
}

// =====================================================
// Restes : reprendre un plat mangé sur les 7 derniers jours ouvrés
// =====================================================
const leftoverToggle = document.getElementById("leftoverToggle");
const leftoverList = document.getElementById("leftoverList");
const leftoverError = document.getElementById("leftoverError");

// Premier jour de la fenêtre : on remonte jusqu'au 7e jour ouvré (lundi → vendredi)
function leftoverWindowStart(dateIso) {
  const [y, m, d] = dateIso.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  let count = 0;
  for (;;) {
    const wd = day.getDay();
    if (wd !== 0 && wd !== 6 && ++count === 7) break;
    day.setDate(day.getDate() - 1);
  }
  return iso(day);
}

// Plats proposés : un par nom, le plus récent d'abord
function leftoverCandidates() {
  const end = form.date.value || iso(new Date());
  const start = leftoverWindowStart(end);
  const byName = new Map();
  meals
    .filter(m => m.id !== draft.editingId && m.date >= start && m.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date) || sortByMoment(b, a))
    .forEach(m => { const k = normalizeText(m.name); if (!byName.has(k)) byName.set(k, m); });
  // En modification, le plat déjà choisi reste proposé même s'il sort de la fenêtre
  if (draft.leftoverName && !byName.has(normalizeText(draft.leftoverName))) {
    const src = firstOccurrence(draft.leftoverName);
    if (src) byName.set(normalizeText(src.name), src);
  }
  return [...byName.values()];
}

// Première fois où le plat a été mangé (hors restes) : c'est elle qui sert de modèle
function firstOccurrence(name) {
  const key = normalizeText(name);
  const same = meals.filter(m => m.id !== draft.editingId && normalizeText(m.name) === key)
    .sort((a, b) => a.date.localeCompare(b.date) || sortByMoment(a, b));
  return same.find(m => !m.leftover) || same[0] || null;
}

function renderLeftovers() {
  const list = leftoverCandidates();
  if (!list.length) {
    leftoverList.innerHTML = `<p class="hint">Aucun plat enregistré sur les 7 derniers jours ouvrés avant le ${escapeHtml(formatDate(form.date.value || iso(new Date())))}.</p>`;
    return;
  }
  const selectedKey = normalizeText(draft.leftoverName);
  leftoverList.innerHTML = list.map(m => {
    const on = normalizeText(m.name) === selectedKey;
    return `<button type="button" class="leftover-item${on ? " selected" : ""}" role="radio" aria-checked="${on}" data-leftover="${escapeHtml(m.name)}">
      <span class="leftover-thumb" style="background:${photoBg(m)}">${thumbHtml(m)}</span>
      <span class="leftover-text">
        <strong>${escapeHtml(m.name)}</strong>
        <small>${escapeHtml(mealMoment(m))} · ${escapeHtml(formatDate(m.date))}</small>
      </span>
      ${on ? `<span class="leftover-check">${ICON_CHECK}</span>` : ""}
    </button>`;
  }).join("");
}

const NOTES_PLACEHOLDER = form.notes.placeholder;
function setLeftoverMode(on) {
  draft.leftover = on;
  form.notes.placeholder = on ? "Comment étaient ces restes ? Réchauffés, accompagnés d'autre chose…" : NOTES_PLACEHOLDER;
  leftoverToggle.checked = on;
  form.classList.toggle("leftover-mode", on);
  leftoverError.hidden = true;
  closeAutocomplete();
  closePlaceList();
  if (on) { renderLeftovers(); renderLeftoverImprove(); } else renderLeftoverRating(null);
}
leftoverToggle.addEventListener("change", () => setLeftoverMode(leftoverToggle.checked));
form.date.addEventListener("change", () => { if (draft.leftover) renderLeftovers(); });

leftoverList.addEventListener("click", e => {
  const item = e.target.closest("[data-leftover]");
  if (!item) return;
  draft.leftoverName = item.dataset.leftover;
  // Le moment du repas reprend celui d'origine (modifiable)
  const src = firstOccurrence(draft.leftoverName);
  if (src?.course) { draft.course = src.course; renderCourse(); }
  leftoverError.hidden = true;
  if (draft.improved) draft.rating = src?.rating || 0;
  renderLeftovers();
  renderLeftoverImprove();
});

// ---------- Restes : « À améliorer » de la première fois ----------
const leftoverImprove = document.getElementById("leftoverImprove");
const improvedToggle = document.getElementById("improvedToggle");
const improvedField = document.getElementById("improvedField");
const improvedText = document.getElementById("improvedText");
function renderLeftoverImprove() {
  const src = draft.leftoverName && firstOccurrence(draft.leftoverName);
  const comment = src?.improve || "";
  leftoverImprove.hidden = !comment; // rien à améliorer la première fois : pas de rubrique
  document.getElementById("leftoverImproveText").textContent = comment;
  improvedToggle.checked = !!draft.improved;
  improvedField.hidden = !draft.improved;
  renderLeftoverRating(src);
}
// « J'ai amélioré » coché : la note sur 5 réapparaît pour pouvoir la changer
function renderLeftoverRating(src) {
  const show = draft.leftover && !!draft.improved && !!src?.improve;
  form.classList.toggle("show-rating", show);
  document.getElementById("noteLabel").textContent = show ? "Nouvelle note" : "Note";
  const hint = document.getElementById("noteOrigHint");
  hint.hidden = !show;
  if (show) hint.textContent = src.rating ? `La première fois : ${formatRating(src.rating)}` : "Pas de note la première fois.";
  renderStars();
}
improvedToggle.addEventListener("change", () => {
  draft.improved = improvedToggle.checked;
  improvedField.hidden = !draft.improved;
  const src = draft.leftoverName && firstOccurrence(draft.leftoverName);
  if (draft.improved) { draft.rating = src?.rating || 0; improvedText.focus(); } // on part de la note d'origine
  renderLeftoverRating(src);
});

function saveLeftover() {
  const src = draft.leftoverName && firstOccurrence(draft.leftoverName);
  if (!src) { leftoverError.hidden = false; leftoverList.querySelector("button")?.focus(); return; }
  if (!form.date.value) form.date.value = iso(new Date());
  const type = form.type.value;
  // Tout est repris de la première occurrence, sauf la date et le repas
  storeMeal({
    id: draft.editingId || `m-${Date.now()}`,
    name: src.name,
    date: form.date.value,
    type,
    course: COURSE_MEALS.includes(type) ? (draft.course || src.course || "Plat") : "",
    photo: src.photo || null,
    thumb: src.thumb || null,
    emoji: null,
    color: null,
    preparedBy: src.preparedBy || "Moi",
    preparer: src.preparer || "",
    preparerAddress: src.preparerAddress || "",
    rating: src.improve && draft.improved ? draft.rating : (src.rating || 0),
    ratingBefore: src.improve && draft.improved ? (src.rating || 0) : null,
    ingredients: (src.ingredients || []).map(i => ({ ...i })),
    recipeUrl: src.recipeUrl || "",
    improve: "", // le commentaire d'origine n'est montré que si « J'ai amélioré » est coché
    improved: !!src.improve && !!draft.improved,
    improvedFrom: src.improve && draft.improved ? src.improve : "",
    improvedText: src.improve && draft.improved ? improvedText.value.trim() : "",
    notes: form.notes.value.trim(), // les notes sont propres à ce repas de restes
    leftover: true,
    leftoverOf: src.id,
  });
}

// ---------- Menu mobile ----------
const sidebar = document.getElementById("sidebar");
document.querySelectorAll(".menu-toggle").forEach(btn =>
  btn.addEventListener("click", e => { e.stopPropagation(); sidebar.classList.toggle("open"); }));
document.addEventListener("click", e => {
  if (sidebar.classList.contains("open") && !sidebar.contains(e.target)) sidebar.classList.remove("open");
});

// ---------- Lancement ----------
function refresh() { renderCalendar(); renderRecent(); }
initSample();
initPlaces();
backfillThumbs();
renderRecent();
route();
