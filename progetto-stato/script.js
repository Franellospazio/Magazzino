// progetto-stato/script.js
document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  let prodotti = [];

  // Carica i prodotti dall'API
  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti");
      if (!res.ok) throw new Error(`Errore API: ${res.status}`);
      prodotti = await res.json();
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  }

  // Aggiorna la giacenza sul server
  async function updateGiacenza(id, nuovoValore) {
    try {
      const res = await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: id, Giacenza: Number(nuovoValore) })
      });

      if (!res.ok) throw new Error(`Errore API PATCH: ${res.status}`);
      alert("Giacenza aggiornata!");
      // Aggiorna localmente
      prodotti[id].giacenza = Number(nuovoValore);
    } catch (err) {
      console.error("Errore aggiornamento giacenza:", err);
    }
  }

  // Ricerca dinamica
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    results.innerHTML = "";
    if (query.length < 2) return;

    const filtrati = prodotti.filter(p => p.descrizione.toLowerCase().includes(query));
    filtrati.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.descrizione} - Giacenza: ${p.giacenza} - Scorta minima: ${p.scorta_minima}`;
      
      li.addEventListener("click", () => {
        // Sostituisci il testo con un input per modificare la giacenza
        const input = document.createElement("input");
        input.type = "number";
        input.value = p.giacenza;
        input.style.width = "60px";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Salva";

        // Aggiorna al click
        saveBtn.addEventListener("click", () => {
          updateGiacenza(p.id, input.value);
          li.textContent = `${p.descrizione} - Giacenza: ${input.value} - Scorta minima: ${p.scorta_minima}`;
        });

        li.textContent = `${p.descrizione} - `;
        li.appendChild(input);
        li.appendChild(saveBtn);
      });

      results.appendChild(li);
    });
  });

  loadProdotti();
});
