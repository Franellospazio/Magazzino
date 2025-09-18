document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const closeBtn = document.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescrizione = document.getElementById("modalDescrizione");
  const modalScorta = document.getElementById("modalScorta");
  const inputGiacenza = document.getElementById("nuovaGiacenza");
  const aggiornaBtn = document.getElementById("aggiornaBtn");

  let prodotti = [];
  let selectedProdotto = null;

  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti");
      if (!res.ok) throw new Error(`Errore API: ${res.status}`);
      prodotti = await res.json();
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  }

  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = "Vuoi aggiornare giacenza?";
    modalDescrizione.textContent = `Prodotto: ${prodotto.descrizione}`;
    modalScorta.textContent = `Scorta minima: ${prodotto.scorta_minima}`;
    inputGiacenza.value = prodotto.giacenza;
    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;

    const giacenzaNum = Number(inputGiacenza.value);
    if (isNaN(giacenzaNum)) {
      alert("Inserisci un numero valido!");
      return;
    }

    try {
      const res = await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  descrizione: selectedProdotto.descrizione,
  Giacenza: giacenzaNum
})


      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Errore aggiornamento: ${res.status}`);
      }

      // Aggiorna localmente la giacenza
      selectedProdotto.giacenza = giacenzaNum;

      // Aggiorna la lista filtrata in tempo reale (opzionale)
      const li = [...results.children].find(li => li.textContent === selectedProdotto.descrizione);
      if (li) li.textContent = `${selectedProdotto.descrizione} - Giacenza: ${giacenzaNum}`;

      alert(`Giacenza aggiornata a ${giacenzaNum}`);
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Errore aggiornamento giacenza!");
    }
  });

  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    results.innerHTML = "";
    if (query.length < 2) return;

    const filtrati = prodotti.filter(p => p.descrizione.toLowerCase().includes(query));
    filtrati.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.descrizione;
      li.addEventListener("click", () => openModal(p));
      results.appendChild(li);
    });
  });

  loadProdotti();
});


