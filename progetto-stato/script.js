document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  let prodotti = [];

  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti");
      prodotti = await res.json();
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  }

  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    results.innerHTML = "";
    if (query.length < 2) return;

    const filtrati = prodotti.filter(p => p.descrizione.toLowerCase().includes(query));
    filtrati.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.descrizione;
      li.addEventListener("click", () => alert(`${p.descrizione} - Giacenza: ${p.giacenza}`));
      results.appendChild(li);
    });
  });

  loadProdotti();
});
