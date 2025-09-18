document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const closeBtn = document.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescrizione = document.getElementById("modalDescrizione");
  const modalScorta = document.getElementById("modalScorta");
  const minGiacenzaSpan = document.getElementById("minGiacenza");
  const qtyNumber = document.getElementById("nuovaGiacenza");
  const minusBtn = document.querySelector(".qty-btn.minus");
  const plusBtn = document.querySelector(".qty-btn.plus");
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

  function aggiornaColore() {
    const current = parseInt(qtyNumber.textContent);
    const min = parseInt(minGiacenzaSpan.textContent);
    qtyNumber.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) qtyNumber.classList.add("qty-green");
    else if (current === min) qtyNumber.classList.add("qty-yellow");
    else qtyNumber.classList.add("qty-red");
  }

  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = "Vuoi aggiornare giacenza?";
    modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;
    minGiacenzaSpan.textContent = prodotto.ScortaMinima;
    qtyNumber.textContent = prodotto.Giacenza;
    aggiornaColore();
    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  minusBtn.addEventListener("click", () => {
    let current = parseInt(qtyNumber.textContent);
    if (current > 0) qtyNumber.textContent = current - 1;
    aggiornaColore();
  });

  plusBtn.addEventListener("click", () => {
    let current = parseInt(qtyNumber.textContent);
    qtyNumber.textContent = current + 1;
    aggiornaColore();
  });

  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;
    const giacenzaNum = parseInt(qtyNumber.textContent);
    if (isNaN(giacenzaNum)) {
      alert("Inserisci un numero valido!");
      return;
    }

    try {
      const res = await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descrizione: selectedProdotto.Descrizione,
          Giacenza: giacenzaNum
        })
      });

      if (!res.ok) throw new Error(`Errore aggiornamento: ${res.status}`);
      selectedProdotto.Giacenza = giacenzaNum;

      const li = [...results.children].find(
        li => li.textContent.startsWith(selectedProdotto.Descrizione)
      );
      if (li) li.textContent = `${selectedProdotto.Descrizione} - Giacenza: ${giacenzaNum}`;

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

    const filtrati = prodotti.filter(p =>
      p.Descrizione.toLowerCase().includes(query)
    );

    filtrati.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.Descrizione} - Giacenza: ${p.Giacenza}`;
      li.addEventListener("click", () => openModal(p));
      results.appendChild(li);
    });
  });

  loadProdotti();
});
