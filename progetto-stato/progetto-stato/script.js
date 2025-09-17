let prodotti = [];
let selectedProdotto = null;

const searchInput = document.querySelector('.searchTerm');
const results = document.getElementById('results');
const card = document.getElementById('card');
const descrizione = document.getElementById('descrizione');
const giacenza = document.getElementById('giacenza');
const scorta = document.getElementById('scorta');
const saveBtn = document.getElementById('save');

// Carica prodotti dall'API Vercel
fetch("/api/prodotti")
  .then(res => res.json())
  .then(data => {
    prodotti = data.map((row, index) => ({
      id: index,
      Descrizione: row.values[0][0],
      Giacenza: row.values[0][1],
      ScortaMinima: row.values[0][2]
    }));
  })
  .catch(err => console.error("Errore caricamento dati:", err));

// Ricerca dinamica
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  results.innerHTML = "";
  if (query.length < 2) return;

  const filtrati = prodotti.filter(p =>
    p.Descrizione.toLowerCase().includes(query)
  );

  filtrati.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.Descrizione;
    li.addEventListener("click", () => mostraProdotto(p));
    results.appendChild(li);
  });
});

function mostraProdotto(p) {
  selectedProdotto = p;
  descrizione.textContent = p.Descrizione;
  giacenza.value = p.Giacenza;
  scorta.textContent = p.ScortaMinima;
  card.classList.remove("hidden");
  results.innerHTML = "";
  searchInput.value = "";

  saveBtn.onclick = async () => {
    const nuovoValore = parseInt(giacenza.value);
    if (isNaN(nuovoValore) || nuovoValore < 0) return alert("Valore non valido");

    try {
      await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: selectedProdotto.id, Giacenza: nuovoValore })
      });
      selectedProdotto.Giacenza = nuovoValore;
      alert("Giacenza aggiornata!");
    } catch (err) {
      console.error("Errore aggiornamento:", err);
      alert("Errore aggiornamento Giacenza");
    }
  };
}
