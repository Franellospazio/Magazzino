// script.js completo (inserisci YOUR_SERVICE_ID e YOUR_TEMPLATE_ID)
document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const closeBtn = document.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescrizione = document.getElementById("modalDescrizione");
  const modalScorta = document.getElementById("modalScorta");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  const qtyNumber = document.getElementById("qtyNumber");
  const aggiornaBtn = document.getElementById("aggiornaBtn");

  // Sostituisci qui:
  const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";   // es. service_xxx
  const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID"; // es. template_xxx
  const ALERT_TO_EMAIL = "f.disabatino@sepack-lab.it";

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
    const current = parseInt(qtyNumber.textContent || "0", 10);
    const min = parseInt(selectedProdotto?.ScortaMinima ?? 0, 10);
    qtyNumber.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) qtyNumber.classList.add("qty-green");
    else if (current === min) qtyNumber.classList.add("qty-yellow");
    else qtyNumber.classList.add("qty-red");
  }

  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = "Vuoi aggiornare giacenza?";
    modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;
    modalScorta.textContent = `Scorta minima: ${prodotto.ScortaMinima}`;
    qtyNumber.textContent = prodotto.Giacenza;
    aggiornaColore();
    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  qtyMinus.addEventListener("click", () => {
    if (!selectedProdotto) return;
    let current = parseInt(qtyNumber.textContent || "0", 10);
    if (current > 0) current--;
    qtyNumber.textContent = current;
    aggiornaColore();
  });

  qtyPlus.addEventListener("click", () => {
    if (!selectedProdotto) return;
    let current = parseInt(qtyNumber.textContent || "0", 10);
    current++;
    qtyNumber.textContent = current;
    aggiornaColore();
  });

  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;
    const giacenzaNum = parseInt(qtyNumber.textContent || "0", 10);

    if (isNaN(giacenzaNum)) {
      alert("Inserisci un numero valido!");
      return;
    }

    try {
      // Aggiorna il DB (la tua API)
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

      // **Invia la mail SOLO se giacenza < scorta minima** (richiesta tua)
      if (giacenzaNum < selectedProdotto.ScortaMinima) {
        // prepara i parametri per il template
        const templateParams = {
          name: "Sistema Magazzino",
          time: new Date().toLocaleString(),
          messaggio: "Alcuni prodotti hanno una bassa giacenza",
          to_email: ALERT_TO_EMAIL
        };

        // invio (assicurati di aver impostato SERVICE_ID e TEMPLATE_ID)
        if (typeof emailjs !== "undefined" && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID) {
          emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
            .then(() => console.log("Email di allerta inviata a", ALERT_TO_EMAIL))
            .catch(err => console.error("Errore invio email:", err));
        } else {
          console.warn("EmailJS non inizializzato correttamente o ID mancanti.");
        }
      }

      // aggiorna lista visuale se presente
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
