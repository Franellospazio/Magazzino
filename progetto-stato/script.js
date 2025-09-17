document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  let prodotti = [];

  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti");
      if (!res.ok) throw new Error(`Errore API: ${res.status}`);
      prodotti = await res.json();
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  }

  // Funzione per mostrare popup con messaggio più chiaro
  function mostraPopup(p) {
    const conferma = confirm(`Vuoi aggiornare la giacenza del prodotto "${p.descrizione}"?\nGiacenza attuale: ${p.giacenza}\nScorta minima: ${p.scorta_minima}`);
    if (!conferma) return;

    const nuovaGiacenza = prompt(`Inserisci nuova giacenza per "${p.descrizione}":`, p.giacenza);
    if (nuovaGiacenza === null) return; // annullato
    const giacenzaNum = Number(nuovaGiacenza);
    if (isNaN(giacenzaNum)) {
      alert("Inserisci un numero valido!");
      return;
    }

    // Aggiorna l'API
    fetch("/api/prodotti", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowIndex: p.id, Giacenza: giacenzaNum })
    })
      .then(res => {
        if (!res.ok) throw new Error(`Errore aggiornamento: ${res.status}`);
        p.giacenza = giacenzaNum; // aggiorna localmente
        alert(`Giacenza aggiornata a ${giacenzaNum}`);
      })
      .catch(err => console.error(err));
  }

  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    results.innerHTML = "";
    if (query.length < 2) return;

    const filtrati = prodotti.filter(p => p.descrizione.toLowerCase().includes(query));
    filtrati.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.descrizione;
      li.addEventListener("click", () => mostraPopup(p));
      results.appendChild(li);
    });
  });

  loadProdotti();
});
