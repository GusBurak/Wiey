// =====================================================
// Dictionnaire d'ingrédients (au singulier) + mise au singulier
// Sert aux suggestions pendant la saisie.
// =====================================================

const INGREDIENT_DICTIONARY = {
  "Légume": [
    "Ail", "Artichaut", "Asperge", "Aubergine", "Avocat", "Betterave", "Brocoli", "Butternut",
    "Carotte", "Céleri", "Céleri-rave", "Champignon", "Champignon de Paris", "Chou", "Chou blanc",
    "Chou rouge", "Chou de Bruxelles", "Chou-fleur", "Chou kale", "Concombre", "Courge", "Courgette",
    "Cresson", "Échalote", "Endive", "Épinard", "Fenouil", "Haricot vert", "Laitue", "Mâche",
    "Maïs", "Navet", "Oignon", "Oignon rouge", "Oignon nouveau", "Panais", "Patate douce",
    "Petit pois", "Poireau", "Poivron", "Poivron rouge", "Poivron vert", "Pomme de terre",
    "Potiron", "Radis", "Roquette", "Salade", "Tomate", "Tomate cerise", "Tomate séchée",
    "Topinambour", "Olive", "Olive noire", "Olive verte", "Cornichon", "Câpre", "Edamame",
    "Germe de soja", "Pousse d'épinard", "Algue nori", "Cœur de palmier",
  ],
  "Fruit": [
    "Abricot", "Ananas", "Banane", "Cassis", "Cerise", "Citron", "Citron vert", "Clémentine",
    "Coing", "Datte", "Figue", "Fraise", "Framboise", "Fruit de la passion", "Grenade",
    "Groseille", "Kiwi", "Litchi", "Mangue", "Melon", "Mûre", "Myrtille", "Nectarine",
    "Orange", "Pamplemousse", "Pastèque", "Pêche", "Poire", "Pomme", "Prune", "Raisin",
    "Raisin sec", "Rhubarbe", "Fruits rouges", "Noix de coco",
  ],
  "Féculent": [
    "Riz", "Riz basmati", "Riz complet", "Riz vinaigré", "Riz arborio", "Pâtes", "Spaghetti",
    "Penne", "Tagliatelle", "Fusilli", "Lasagne", "Nouille", "Nouille de riz", "Gnocchi",
    "Quinoa", "Boulgour", "Semoule", "Couscous", "Polenta", "Lentille", "Lentille corail",
    "Pois chiche", "Haricot rouge", "Haricot blanc", "Fève", "Pain", "Pain de campagne",
    "Pain complet", "Baguette", "Pain de mie", "Pain burger", "Pain pita", "Tortilla", "Wrap",
    "Galette de riz", "Biscotte", "Flocon d'avoine", "Granola", "Muesli", "Céréales",
    "Farine", "Farine complète", "Fécule de maïs", "Maïzena", "Chapelure", "Pâte feuilletée",
    "Pâte brisée", "Pâte à pizza", "Crouton",
  ],
  "Protéine": [
    "Bœuf", "Bœuf haché", "Steak", "Veau", "Porc", "Agneau", "Poulet", "Blanc de poulet",
    "Cuisse de poulet", "Dinde", "Canard", "Magret de canard", "Lardon", "Jambon", "Jambon cru",
    "Bacon", "Chorizo", "Saucisse", "Merguez", "Saucisson", "Viande hachée", "Œuf", "Jaune d'œuf",
    "Blanc d'œuf", "Saumon", "Saumon fumé", "Thon", "Cabillaud", "Colin", "Sardine", "Maquereau",
    "Truite", "Dorade", "Bar", "Crevette", "Moule", "Calamar", "Noix de Saint-Jacques", "Crabe",
    "Surimi", "Anchois", "Tofu", "Tofu fumé", "Tempeh", "Seitan", "Falafel",
  ],
  "Produit laitier": [
    "Lait", "Lait d'avoine", "Lait d'amande", "Lait de coco", "Beurre", "Beurre demi-sel",
    "Crème fraîche", "Crème liquide", "Yaourt", "Yaourt grec", "Fromage blanc", "Skyr",
    "Mascarpone", "Ricotta", "Mozzarella", "Burrata", "Feta", "Parmesan", "Comté", "Emmental",
    "Gruyère", "Cheddar", "Chèvre", "Roquefort", "Camembert", "Brie", "Raclette", "Reblochon",
    "Fromage râpé", "Halloumi",
  ],
  "Herbe": [
    "Basilic", "Persil", "Persil plat", "Coriandre", "Ciboulette", "Menthe", "Aneth", "Thym",
    "Romarin", "Laurier", "Origan", "Estragon", "Sauge", "Cerfeuil", "Herbes de Provence",
    "Fines herbes", "Citronnelle",
  ],
  "Épice": [
    "Sel", "Fleur de sel", "Poivre", "Poivre noir", "Piment", "Piment d'Espelette", "Paprika",
    "Paprika fumé", "Cumin", "Curcuma", "Curry", "Garam masala", "Gingembre", "Cannelle",
    "Muscade", "Clou de girofle", "Cardamome", "Badiane", "Safran", "Vanille", "Ras el hanout",
    "Quatre-épices", "Graine de sésame", "Sésame", "Graine de fenouil", "Za'atar", "Sumac",
  ],
  "Sauce": [
    "Sauce tomate", "Coulis de tomate", "Concentré de tomate", "Pesto", "Pesto rouge",
    "Mayonnaise", "Ketchup", "Moutarde", "Moutarde à l'ancienne", "Sauce soja", "Sauce teriyaki",
    "Sauce nuoc-mâm", "Sauce barbecue", "Sauce sriracha", "Tabasco", "Harissa", "Vinaigrette",
    "Sauce béchamel", "Sauce bolognaise", "Sauce au poivre", "Sauce blanche", "Sauce samouraï",
    "Guacamole", "Houmous", "Tzatziki", "Salsa", "Tahini", "Pâte de curry", "Bouillon",
    "Bouillon de légumes", "Fond de veau",
  ],
  "Assaisonnement": [
    "Huile d'olive", "Huile de tournesol", "Huile de sésame", "Huile de colza", "Vinaigre",
    "Vinaigre balsamique", "Vinaigre de cidre", "Vinaigre de riz", "Jus de citron", "Sucre",
    "Sucre roux", "Sucre glace", "Miel", "Sirop d'érable", "Levure", "Levure chimique", "Vin blanc",
    "Vin rouge", "Bicarbonate",
  ],
  "Fruit sec": [
    "Amande", "Noix", "Noisette", "Noix de cajou", "Pistache", "Cacahuète", "Pignon de pin",
    "Graine de courge", "Graine de tournesol", "Graine de chia", "Graine de lin", "Beurre de cacahuète",
  ],
  "Sucré": [
    "Chocolat", "Chocolat noir", "Chocolat au lait", "Cacao", "Pâte à tartiner", "Confiture",
    "Confiture d'abricot", "Compote", "Caramel", "Crème pâtissière", "Chantilly", "Glace",
    "Biscuit", "Spéculoos", "Meringue",
  ],
};

// Index : nom normalisé → { name, category }
const INGREDIENT_INDEX = new Map();
for (const [category, names] of Object.entries(INGREDIENT_DICTIONARY)) {
  for (const name of names) INGREDIENT_INDEX.set(normalizeText(name), { name, category });
}

function normalizeText(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/\s+/g, " ").trim();
}

// ---------- Mise au singulier ----------
// Mots qui s'écrivent pareil au singulier et au pluriel
const INVARIABLE_WORDS = new Set([
  "noix", "pois", "radis", "ananas", "riz", "mais", "anchois", "cassis", "jus", "brebis",
  "couscous", "houmous", "panais", "salsifis", "frais", "gras", "os", "bois", "nachos", "tapas",
  "colis",
]);
// Petits mots après lesquels on ne touche plus à rien (« pomme de terre », « huile d'olive »)
const CONNECTORS = new Set(["de", "d", "du", "des", "a", "au", "aux", "en", "la", "le", "l", "sans", "avec"]);

function singularWord(word) {
  const n = normalizeText(word);
  if (n.length <= 3 || INVARIABLE_WORDS.has(n)) return word;
  if (/eaux$/.test(n)) return word.slice(0, -1);              // poireaux → poireau
  if (/aux$/.test(n)) {                                        // bocaux → bocal (si connu), sinon → au
    const al = word.slice(0, -3) + "al";
    return INGREDIENT_INDEX.has(normalizeText(al)) ? al : word.slice(0, -1);
  }
  if (/(eux|oux|aux)$/.test(n)) return word.slice(0, -1);     // choux → chou
  if (/[^s]s$/.test(n)) return word.slice(0, -1);              // tomates → tomate
  return word;
}

function singularize(text) {
  const raw = String(text).trim().replace(/\s+/g, " ");
  if (!raw) return raw;
  // Déjà un nom connu (y compris ceux qui restent au pluriel : « Pâtes », « Céréales »…)
  if (INGREDIENT_INDEX.has(normalizeText(raw))) return INGREDIENT_INDEX.get(normalizeText(raw)).name;

  const tokens = raw.split(/(\s+|')/); // garde les espaces et apostrophes
  let stop = false;
  const out = tokens.map(tok => {
    if (/^\s+$|^'$/.test(tok) || stop) return tok;
    if (CONNECTORS.has(normalizeText(tok))) { stop = true; return tok; }
    return tok.split("-").map(singularWord).join("-");          // choux-fleurs → chou-fleur
  }).join("");

  const known = INGREDIENT_INDEX.get(normalizeText(out));
  return known ? known.name : out;
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// ---------- Suggestions pendant la saisie ----------
// history : noms déjà utilisés dans les repas (prioritaires)
// preferCategory : catégorie à remonter (ex. « Épice » dans la sous-rubrique Épices)
function suggestIngredients(query, { history = [], exclude = [], preferCategory = null, limit = 6 } = {}) {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const qSing = normalizeText(singularize(query));
  const excluded = new Set(exclude.map(normalizeText));

  const candidates = new Map();
  for (const [key, entry] of INGREDIENT_INDEX) candidates.set(key, { ...entry, uses: 0 });
  for (const name of history) {
    const key = normalizeText(name);
    const c = candidates.get(key) || { name, category: null, uses: 0 };
    c.uses++;
    candidates.set(key, c);
  }

  const scored = [];
  for (const [key, c] of candidates) {
    if (excluded.has(key)) continue;
    let score;
    if (key === q || key === qSing) score = 100;
    else if (key.startsWith(q) || key.startsWith(qSing)) score = 80;
    else if (key.split(/[\s'-]/).some(w => w.startsWith(q) || w.startsWith(qSing))) score = 60;
    else if (key.includes(q)) score = 40;
    else continue;
    score += Math.min(c.uses, 5) * 3;
    if (preferCategory && c.category === preferCategory) score += 15;
    score -= key.length * 0.2; // à score égal, les noms courts d'abord
    scored.push({ ...c, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Catégorie associée à une sous-rubrique, pour mieux trier les suggestions
function categoryForSection(sectionName) {
  const n = normalizeText(sectionName);
  if (n.startsWith("epice")) return "Épice";
  if (n.startsWith("herbe")) return "Herbe";
  if (n.startsWith("sauce") || n.startsWith("vinaigrette")) return "Sauce";
  if (n.startsWith("assaisonnement") || n.startsWith("marinade")) return "Assaisonnement";
  if (n.startsWith("accompagnement")) return "Féculent";
  if (n.startsWith("garniture") || n.startsWith("topping")) return "Légume";
  if (n.startsWith("pate")) return "Féculent";
  return null;
}
