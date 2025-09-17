// Mock dati
const prodotti = [
  { id: 1, descrizione: "Vite esagonale M10", giacenza: 25, scorta_minima: 10 },
  { id: 2, descrizione: "Rondella 8mm", giacenza: 100, scorta_minima: 30 },
  { id: 3, descrizione: "Dado M8", giacenza: 40, scorta_minima: 15 },
];

const search = document.getElementById("search");
const results = document.getElementById("results");
const card = document.getElementById("card");
const descrizione = document.getElementById("descrizione");
const giacenza = document.getElementById("giacenza");
const scorta = document.getElementById("scorta");
const save = document.getElementById("save");
const toast = document.getElementById("toast");

let selectedProdotto = null;

// Ricerca dinamica
search.addEventListener("input", () => {
  const query = search.value.toLowerCase();
  results.innerHTML = "";
  if (query.length < 2) return;

  const filtrati = prodotti.filter((p) =>
    p.descrizione.toLowerCase().includes(query)
  );

  filtrati.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.descrizione;
    li.addEventListener("click", () => mostraProdotto(p));
    results.appendChild(li);
  });
});

function mostraProdotto(p) {
  selectedProdotto = p;
  descrizione.textContent = p.descrizione;
  giacenza.value = p.giacenza;
  scorta.textContent = p.scorta_minima;
  card.classList.remove("hidden");
  results.innerHTML = "";
  search.value = "";
}

save.addEventListener("click", () => {
  if (!selectedProdotto) return;
  const nuovoValore = parseInt(giacenza.value);
  if (isNaN(nuovoValore) || nuovoValore < 0) {
    mostraToast("Valore non valido", "error");
    return;
  }

  selectedProdotto.giacenza = nuovoValore;
  mostraToast("Giacenza aggiornata!", "success");
});

function mostraToast(msg, type) {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2000);
}
