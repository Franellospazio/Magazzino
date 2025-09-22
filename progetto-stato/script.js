document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const closeBtn = document.querySelector(".close");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescrizione = document.getElementById("modalDescrizione");
  const modalScorta = document.getElementById("modalScorta");
  const counterValue = document.getElementById("counterValue");
  const decrementBtn = document.getElementById("decrement");
  const incrementBtn = document.getElementById("increment");
  const aggiornaBtn = document.getElementById("aggiornaBtn");

  const searchButton = document.querySelector(".searchButton");
  const sottoscortaBtn = document.getElementById("sottoscortaBtn");
  const categorieMasterBtn = document.getElementById("categorieMasterBtn");
  const categorieContainer = document.getElementById("categorieContainer");

  const adminBtn = document.getElementById("adminBtn");

  let prodotti = [];
  let selectedProdotto = null;

  let showingAll = false;
  let showingSottoscorta = false;
  let showingCategorie = false;
  let activeCategoryBtn = null;

  let isAdmin = false;

  // toggle admin con password e sticker
  adminBtn.addEventListener("click", async () => {
    const password = prompt("Inserisci la password di 4 caratteri per entrare in modalità admin:");
    if (!password) return;

    if (password === "1234") { // sostituisci "1234" con la tua password reale
      isAdmin = !isAdmin;
      if (isAdmin) {
        adminBtn.textContent = "🔓 Admin ON";
        adminBtn.style.backgroundColor = "#27ae60";
      } else {
        adminBtn.textContent = "🛠️ Admin";
        adminBtn.style.backgroundColor = "#e74c3c";
      }
    } else {
      // invia sticker su Supabase o API
      try {
        await fetch("/api/sticker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testo: "Non sei amministratore!!" })
        });
        alert("Password errata! Sticker inviato.");
      } catch (err) {
        console.error("Errore invio sticker:", err);
      }
    }
  });

  // Funzione generica per creare li con immagini e formattazione chiave
  function createProductLi(p, showGiacenza = false) {
    const li = document.createElement("li");
    li.style.borderBottom = "1px solid #ccc";
    li.style.padding = "5px 0";

    const keyParts = p.Descrizione.split("_");
    const nome = keyParts[0];
    const taglio = keyParts[keyParts.length - 1];
    const middle = keyParts.slice(1, keyParts.length - 1).join("_");

    let content = `<strong style="color:black;">${nome}</strong>`;
    if (middle) content += ` <span style="color:#999;">${middle}</span>`;
    content += ` <span style="color:#2ecc71;">${taglio}</span>`;

    if (showGiacenza) {
      content += ` — <span style="color:red;">${p.Giacenza}</span> (<span style="color:blue;">${p.ScortaMinima}</span>)`;
    }

    if (p.inordine !== undefined && p.inordine !== null && p.inordine > 0) {
      content += `<br>🛒 In ordine: ${p.inordine}`;
    }

    if (p.ImageURL) {
      content += `<br><img src="${p.ImageURL}" alt="${p.Descrizione}" style="max-width:100px; max-height:100px; margin-top:5px;">`;
    } else {
      content += `<br><em>(img non presente)</em>`;
    }

    li.innerHTML = content;
    li.addEventListener("click", () => openModal(p));
    return li;
  }

  // Funzione per resettare tutto
  function resetAll() {
    results.innerHTML = "";
    categorieContainer.innerHTML = "";
    categorieContainer.style.display = "none";
    showingAll = false;
    showingSottoscorta = false;
    showingCategorie = false;
    activeCategoryBtn = null;
  }

  // MOSTRA / NASCONDI TUTTI I PRODOTTI
  searchButton.addEventListener("click", () => {
    if (showingAll) resetAll();
    else {
      resetAll();
      prodotti.forEach(p => results.appendChild(createProductLi(p)));
      showingAll = true;
    }
  });

  // SOTTOSCORTA
  sottoscortaBtn.addEventListener("click", () => {
    if (showingSottoscorta) {
      resetAll();
    } else {
      resetAll();
      const sottoscorta = prodotti.filter(p => p.Giacenza < p.ScortaMinima);
      sottoscorta.forEach(p => results.appendChild(createProductLi(p, true)));
      showingSottoscorta = true;
    }
  });

  // PULSANTE CATEGORIE
  categorieMasterBtn.addEventListener("click", () => {
    if (showingCategorie) {
      resetAll();
    } else {
      resetAll();
      categorieContainer.style.display = "flex";
      categorieContainer.innerHTML = "";

      const categorie = [...new Set(prodotti.map(p => p.categoria).filter(c => c))];

      categorie.forEach(cat => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = cat;
        btn.classList.add("categoriaBtn");
        btn.style.touchAction = "manipulation";
        btn.style.userSelect = "none";

        btn.addEventListener("click", () => {
          if (activeCategoryBtn === btn) {
            results.innerHTML = "";
            btn.classList.remove("active");
            activeCategoryBtn = null;
            return;
          }

          if (activeCategoryBtn) activeCategoryBtn.classList.remove("active");

          results.innerHTML = "";
          const filtrati = prodotti.filter(p => p.categoria === cat);
          filtrati.forEach(p => results.appendChild(createProductLi(p)));

          btn.classList.add("active");
          activeCategoryBtn = btn;
        });

        categorieContainer.appendChild(btn);
      });

      showingCategorie = true;
    }
  });

  // EmailJS config
  const EMAILJS_SERVICE_ID = "service_487ujbw";
  const EMAILJS_TEMPLATE_ID = "template_l5an0k5";

  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti");
      if (!res.ok) throw new Error(`Errore API: ${res.status}`);
      prodotti = await res.json();
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  }

  function aggiornaColore(scortaMinSpan) {
    const current = parseInt(counterValue.textContent);
    const min = parseInt(scortaMinSpan.textContent);
    counterValue.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) counterValue.classList.add("qty-green");
    else if (current === min) counterValue.classList.add("qty-yellow");
    else counterValue.classList.add("qty-red");
  }

  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = isAdmin ? "Aggiorna prodotto" : "Aggiorna giacenza";
    modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;

    // sempre mostra scorta minima con stile cerchietto
    modalScorta.innerHTML = `
      Scorta minima: <span id="scortaMinSpan" class="min-qty">${prodotto.ScortaMinima}</span>
    `;

    // se admin aggiungiamo campi input
    if (isAdmin) {
      modalScorta.innerHTML += `
        <br>In ordine: <input type="number" id="inOrdineInput" value="${prodotto.inordine || 0}" style="width:60px;">
        <br>Modifica scorta minima: <input type="number" id="scortaMinimaInput" value="${prodotto.ScortaMinima}" style="width:60px;">
      `;
    }

    counterValue.textContent = prodotto.Giacenza;
    aggiornaColore(document.getElementById("scortaMinSpan"));

    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  decrementBtn.addEventListener("click", () => {
    let current = parseInt(counterValue.textContent);
    if (current > 0) counterValue.textContent = current - 1;
    aggiornaColore(document.getElementById("scortaMinSpan"));
  });

  incrementBtn.addEventListener("click", () => {
    let current = parseInt(counterValue.textContent);
    counterValue.textContent = current + 1;
    aggiornaColore(document.getElementById("scortaMinSpan"));
  });

  // Aggiorna prodotto / giacenza
  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;
    const giacenzaNum = parseInt(counterValue.textContent);
    if (isNaN(giacenzaNum)) {
      alert("Inserisci un numero valido!");
      return;
    }

    let inOrdineNum = selectedProdotto.inordine || 0;
    let scortaMinimaNum = selectedProdotto.ScortaMinima;

    if (isAdmin) {
      const inOrdineInput = document.getElementById("inOrdineInput");
      const scortaMinimaInput = document.getElementById("scortaMinimaInput");
      if (inOrdineInput) inOrdineNum = parseInt(inOrdineInput.value) || 0;
      if (scortaMinimaInput) scortaMinimaNum = parseInt(scortaMinimaInput.value) || scortaMinimaNum;
    }

    try {
      const res = await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descrizione: selectedProdotto.Descrizione,
          Giacenza: giacenzaNum,
          inordine: inOrdineNum,
          ScortaMinima: scortaMinimaNum
        })
      });

      if (!res.ok) throw new Error(`Errore aggiornamento: ${res.status}`);

      selectedProdotto.Giacenza = giacenzaNum;
      selectedProdotto.inordine = inOrdineNum;
      selectedProdotto.ScortaMinima = scortaMinimaNum;

      // invia email solo se non sei in modalità admin
      if (!isAdmin && giacenzaNum < selectedProdotto.ScortaMinima) {
        const templateParams = {
          name: "Sistema Magazzino",
          time: new Date().toLocaleString(),
          prodotto: selectedProdotto.Descrizione,
          giacenza: giacenzaNum,
          scorta: selectedProdotto.ScortaMinima
        };
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
          .then(() => console.log("Email di allerta inviata"))
          .catch(err => console.error("Errore invio email:", err));
      }

      alert("Prodotto aggiornato!");
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Errore aggiornamento prodotto!");
    }
  });

  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  // Ricerca
  search.addEventListener("input", () => {
    resetAll();
    const query = search.value.toLowerCase();
    if (query.length < 1) return;

    const filtrati = prodotti.filter(p =>
      p.Descrizione.toLowerCase().includes(query)
    );

    filtrati.forEach(p => results.appendChild(createProductLi(p)));
  });

  loadProdotti();
});
