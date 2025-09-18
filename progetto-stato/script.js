document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const closeBtn = document.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescrizione = document.getElementById("modalDescrizione");
  const modalScorta = document.getElementById("modalScorta");
  const aggiornaBtn = document.getElementById("aggiornaBtn");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  const qtyNumber = document.getElementById("qtyNumber");

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

  function updateCircleColor(giacenza, scorta) {
    qtyNumber.classList.remove("green-circle", "yellow-circle", "red-circle");
    if (giacenza > scorta) {
      qtyNumber.classList.add("green-circle");
    } else if (giacenza === scorta) {
      qtyNumber.classList.add("yellow-circle");
    } else {
      qtyNumber.classList.add("red-circle");
    }
  }

  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = "Vuoi aggiornare giacenza?";
    modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;
    modalScorta.textContent = `Scorta minima: ${prodotto.ScortaMinima}`;
    qtyNumber.textContent = prodotto.Giacenza;
    updateCircleColor(prodotto.Giacenza, prodotto.ScortaMinima);
    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  qtyMinus.addEventListener("click", () => {
    let val = parseInt(qtyNumber.textContent);
    if (val > 0) {
      val--;
      qtyNumber.textContent = val;
      updateCircleColor(val, selectedProdotto.ScortaMinima);
    }
  });

  qtyPlus.addEventListener("click", () => {
    let val = parseInt(qtyNumber.textContent);
    val++;
    qtyNumber.textContent = val;
    updateCircleColor(val, selectedProdotto.ScortaMinima);
  });

  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;
    const giacenzaNum = parseInt(qtyNumber.textContent);

    try {
      const res = await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descrizione: selectedProdotto.Descrizione,
          Giacenza: giacenzaNum
        })
      });

      if (!res.ok) throw new Error("Errore aggiornamento");
      selectedProdotto.Giacenza = giacenzaNum;

      // ✅ invio mail se giacenza < scorta minima
      if (giacenzaNum < selectedProdotto.ScortaMinima) {
        emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
          to_email: "f.disabatino@sepack-lab.it",
          messaggio: "Alcuni prodotti hanno una bassa giacenza"
        })
        .then(() => console.log("Mail inviata!"))
        .catch(err => console.error("Errore invio mail:", err));
      }

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
