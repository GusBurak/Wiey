// =====================================================
// Wiey — journal des repas
// Les repas sont stockés dans le navigateur (localStorage).
// =====================================================

const STORAGE_KEY = "wiey.meals";
const MEAL_TYPES = ["Petit-déjeuner", "Déjeuner", "Goûter", "Dîner"];
const TYPE_EMOJI = { "Petit-déjeuner": "🥐", "Déjeuner": "🥗", "Goûter": "🍎", "Dîner": "🍝" };

// ---------- Données ----------
function loadMeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* stockage indisponible */ }
  return demoMeals();
}

function saveMeals() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meals)); }
  catch (e) { alert("Impossible d'enregistrer (photo trop lourde ?)."); }
}

// Quelques repas d'exemple pour que le calendrier ne soit pas vide au premier lancement
function demoMeals() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const samples = [
    { name: "Tartines beurre & confiture", type: "Petit-déjeuner", emoji: "🍞", color: "#f6e3c4", notes: "Pain de campagne, confiture d'abricot." },
    { name: "Bowl saumon avocat", type: "Déjeuner", emoji: "🍣", color: "#fbd9cf", notes: "Riz vinaigré, saumon, avocat, edamame, sésame." },
    { name: "Pâtes au pesto", type: "Dîner", emoji: "🍝", color: "#dfeccd", notes: "Pesto maison, parmesan, pignons." },
    { name: "Salade grecque", type: "Déjeuner", emoji: "🥗", color: "#d9eedb", notes: "Tomates, concombre, feta, olives." },
    { name: "Pizza margherita", type: "Dîner", emoji: "🍕", color: "#f9d5c3", notes: "Chez Gino, pâte fine." },
    { name: "Yaourt & granola", type: "Petit-déjeuner", emoji: "🥣", color: "#eee6f6", notes: "Granola miel-amandes, fruits rouges." },
    { name: "Burger maison", type: "Dîner", emoji: "🍔", color: "#f3dcc0", notes: "Bœuf, cheddar, oignons confits." },
    { name: "Pomme & amandes", type: "Goûter", emoji: "🍎", color: "#f8d4d4", notes: "" },
    { name: "Curry de pois chiches", type: "Déjeuner", emoji: "🍛", color: "#f7e2b5", notes: "Lait de coco, épinards, riz basmati." },
    { name: "Soupe de légumes", type: "Dîner", emoji: "🍲", color: "#e5ecd2", notes: "Poireaux, carottes, pommes de terre." },
    { name: "Crêpes", type: "Goûter", emoji: "🥞", color: "#f6e7c9", notes: "Sucre et citron." },
    { name: "Tacos poulet", type: "Déjeuner", emoji: "🌮", color: "#f9e0c2", notes: "Poulet mariné, guacamole, salsa." },
  ];
  const list = [];
  let i = 0;
  for (let d = 1; d <= today; d++) {
    const count = (d * 7) % 4; // 0 à 3 repas par jour, de façon déterministe
    for (let k = 0; k < count; k++) {
      const s = samples[(i++ * 5) % samples.length];
      list.push({ id: `demo-${d}-${k}`, date: iso(new Date(y, m, d)), photo: null, ...s });
    }
  }
  return list;
}

let meals = loadMeals();

// ---------- Utilitaires ----------
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDate(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

// ---------- Calendrier ----------
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
          <button class="thumb" data-id="${meal.id}" style="background:${photoBg(meal)}" aria-label="${escapeHtml(meal.type + " : " + meal.name)}">
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
  preview.innerHTML = `
    <div class="preview-photo" style="background:${photoBg(meal)}">${photoHtml(meal)}</div>
    <div class="preview-info"><strong>${escapeHtml(meal.name)}</strong><span>${meal.type} · ${formatDate(meal.date)}</span></div>`;

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
  detailContent.innerHTML = `
    <div class="detail-photo" style="background:${photoBg(meal)}">${photoHtml(meal)}</div>
    <h2 class="modal-title" style="margin-bottom:0">${escapeHtml(meal.name)}</h2>
    <div class="detail-meta">
      <span class="tag">${meal.type}</span>
      <span class="tag neutral">${formatDate(meal.date)}</span>
    </div>
    <p class="detail-notes">${meal.notes ? escapeHtml(meal.notes) : "Pas de notes pour ce repas."}</p>
    <button class="danger-btn" data-delete="${meal.id}">Supprimer ce repas</button>`;
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

// ---------- Fenêtre ajout ----------
const addModal = document.getElementById("addModal");
const addForm = document.getElementById("addForm");
const photoInput = document.getElementById("photoInput");
const photoDrop = document.getElementById("photoDrop");
let pendingPhoto = null;

function openAdd() {
  addForm.reset();
  pendingPhoto = null;
  photoDrop.style.backgroundImage = "";
  photoDrop.classList.remove("has-photo");
  addForm.date.value = iso(new Date());
  addForm.type.value = guessMealType();
  addModal.hidden = false;
  setTimeout(() => addForm.name.focus(), 50);
}

function guessMealType() {
  const h = new Date().getHours();
  if (h < 11) return "Petit-déjeuner";
  if (h < 15) return "Déjeuner";
  if (h < 18) return "Goûter";
  return "Dîner";
}

// Redimensionne la photo pour ne pas saturer le stockage du navigateur
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const max = 800, scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    pendingPhoto = canvas.toDataURL("image/jpeg", 0.8);
    photoDrop.style.backgroundImage = `url(${pendingPhoto})`;
    photoDrop.classList.add("has-photo");
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
});

addForm.addEventListener("submit", e => {
  e.preventDefault();
  const data = new FormData(addForm);
  const meal = {
    id: `m-${Date.now()}`,
    name: data.get("name").trim(),
    date: data.get("date"),
    type: data.get("type"),
    notes: data.get("notes").trim(),
    photo: pendingPhoto,
    emoji: TYPE_EMOJI[data.get("type")],
    color: null,
  };
  meals.push(meal);
  saveMeals();
  closeModals();
  const [yy, mm] = meal.date.split("-").map(Number);
  viewDate = new Date(yy, mm - 1, 1);
  refresh();
});

document.querySelectorAll('[data-action="add"]').forEach(el => {
  el.addEventListener("click", openAdd);
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAdd(); } });
});

// ---------- Fermeture des fenêtres ----------
function closeModals() { detailModal.hidden = true; addModal.hidden = true; }
document.querySelectorAll(".modal-backdrop").forEach(bd => {
  bd.addEventListener("click", e => { if (e.target === bd || e.target.closest("[data-close]")) closeModals(); });
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModals(); });

// ---------- Qu'est-ce qu'on mange ? ----------
const ideaBody = document.getElementById("ideaBody");
let lastIdea = null;

function renderIdea() {
  // On propose un plat déjà mangé, en évitant les doublons de nom
  const unique = [...new Map(meals.map(m => [m.name.toLowerCase(), m])).values()];
  if (!unique.length) {
    ideaBody.innerHTML = `<p class="idea-empty">Ajoute quelques repas : on piochera dedans pour te donner des idées.</p>`;
    return;
  }
  const pool = unique.length > 1 ? unique.filter(m => m.name !== lastIdea) : unique;
  const pick = pool[Math.floor(Math.random() * pool.length)];
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
    .map(m => `<li data-id="${m.id}">${escapeHtml(m.name)}<small>${m.date.slice(8)}/${m.date.slice(5, 7)}</small></li>`)
    .join("");
}
document.getElementById("recentList").addEventListener("click", e => {
  const li = e.target.closest("li");
  if (li) openDetail(li.dataset.id);
});

// ---------- Menu mobile ----------
const sidebar = document.getElementById("sidebar");
document.getElementById("menuToggle").onclick = e => { e.stopPropagation(); sidebar.classList.toggle("open"); };
document.addEventListener("click", e => {
  if (sidebar.classList.contains("open") && !sidebar.contains(e.target)) sidebar.classList.remove("open");
});

// ---------- Lancement ----------
function refresh() { renderCalendar(); renderRecent(); renderIdea(); }
refresh();
