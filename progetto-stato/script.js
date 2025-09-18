document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const closeBtn = document.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescrizione = document.getElementById("modalDescrizione");
  const modalScorta = document.getElementById("modalScorta");
  const aggiornaBtn = document.getElementById("aggiornaBtn");
  const counterValue = document.getElementById("counterValue");
  const incrementBtn = document.getElementById("increment");
  const decrementBtn = document.getElementById("decrement");

  let prodotti = [];
  let selectedProdotto = null;
  let currentValue = 0;

  const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";   // <-- metti il tuo
  const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID"; // <-- metti il tuo

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
    modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;
    modalScorta.textContent = `Scorta minima: ${prodotto.ScortaMinima}`;
    currentValue = prodotto.Giacenza;
    counterValue.textContent = currentValue;
    aggiornaCircleColor();
    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  function aggiornaCircleColor() {
    if (!selectedProdotto) return;
    const min = selectedProdotto.ScortaMinima;
    if (currentValue > min) {
      counterValue.style.backgroundColor = "green";
      counterValue.style.color = "white";
    } else if (currentValue === min) {
      counterValue.style.backgroundColor = "gold";
      counterValue.style.color = "black";
    } else {
      counterValue.style.backgroundColor = "red";
      counterValue.style.color = "white";
    }
    counterValue.style.borderRadius = "50%";
    counterValue.style.padding = "10px 15px";
    counterValue.style.fontWeight = "bold";
    counterValue.style.display = "inline-block";
    counterValue.style.minWidth = "30px";
    counterValue.style.textAlign = "center";
  }

  incrementBtn.addEventListener("click", () => {
    currentValue++;
    counterValue.textContent = currentValue;
    aggiornaCircleColor();
  });

  decrementBtn.addEventListener("click", () => {
    currentValue--;
    counterValue.textContent = currentValue;
    aggiornaCircleColor();
  });

  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;

    try {
      const res = await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descrizione: selectedProdotto.Descrizione,
          Giacenza: currentValue
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Errore aggiornamento: ${res.status}`);
      }

      selectedProdotto.Giacenza = currentValue;

      // Aggiorna la lista filtrata in tempo reale
      const li = [...results.children].find(
        li => li.textContent.startsWith(selectedProdotto.Descrizione)
      );
      if (li) li.textContent = `${selectedProdotto.Descrizione} - Giacenza: ${currentValue}`;

      // 📧 Invio email solo se la giacenza è inferiore alla scorta minima
      if (currentValue < selectedProdotto.ScortaMinima) {
        const templateParams = {
          name: "Sistema Magazzino",
          time: new Date().toLocaleString()
        };

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
          .then(() => console.log("Email di allerta inviata"))
          .catch(err => console.error("Errore invio email:", err));
      }

      alert(`Giacenza aggiornata a ${currentValue}`);
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
