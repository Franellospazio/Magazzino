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
  const searchDiv = document.querySelector(".search");

  let prodotti = [];
  let selectedProdotto = null;

  let showingAll = false;
  let showingSottoscorta = false;
  let showingCategorie = false;

  // Contenitore dinamico per i pulsanti categoria
  const categorieContainer = document.createElement("div");
  categorieContainer.id = "categorieContainer";
  categorieContainer.classList.add("categorie-container");
  searchDiv.appendChild(categorieContainer);

  // Pulsante master categorie 🏷️
  const categorieMasterBtn = document.createElement("button");
  categorieMasterBtn.type = "button";
  categorieMasterBtn.textContent = "🏷️ Categorie";
  categorieMasterBtn.classList.add("categoriaMasterBtn");
  categorieMasterBtn.style.marginLeft = "5px";
  searchDiv.appendChild(categorieMasterBtn);

  // Funzione generica per creare li con immagini
  function createProductLi(p, showGiacenza = false) {
    const li = document.createElement("li");
    li.style.borderBottom = "1px solid #ccc";
    li.style.padding = "5px 0";

    let content = `<strong>${p.Descrizione}</strong>`;
    if (showGiacenza) {
      content += ` — <span style="color:red;">${p.Giacenza}</span> (<span style="color:blue;">${p.ScortaMinima}</span>)`;
    }

    // immagine sempre alla fine
    if (p.ImageURL) {
      content += `<br><img src="${p.ImageURL}" alt="${p.Descrizione}" style="max-width:100px; max-height:100px; margin-top:5px;">`;
    } else {
      content += `<br><em>(img non presente)</em>`;
    }

    li.innerHTML = content;
    li.addEventListener("click", () => openModal(p));
    return li;
  }

  // Reset generale (nasconde prodotti e pulsanti categorie figlie)
  function resetAll() {
    results.innerHTML = "";
    categorieContainer.innerHTML = "";
    showingAll = false;
    showingSottoscorta = false;
    showingCategorie = false;
  }

  // MOSTRA / NASCONDI TUTTI I PRODOTTI
  searchButton.addEventListener("click", () => {
    resetAll();
    prodotti.forEach(p => results.appendChild(createProductLi(p)));
    showingAll = true;
  });

  // SOTTOSCORTA
  sottoscortaBtn.addEventListener("click", () => {
    resetAll();
    const sottoscorta = prodotti.filter(p => p.Giacenza < p.ScortaMinima);
    sottoscorta.forEach(p => results.appendChild(createProductLi(p, true)));
    showingSottoscorta = true;
  });

  // Pulsante master categorie
  categorieMasterBtn.addEventListener("click", () => {
    if (showingCategorie) {
      categorieContainer.innerHTML = "";
      showingCategorie = false;
    } else {
      categorieContainer.innerHTML = "";
      const categorie = [...new Set(prodotti.map(p => p.categoria).filter(c => c))];
      categorie.forEach(cat => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = cat; // senza emoji
        btn.classList.add("categoriaBtn");

        btn.addEventListener("click", () => {
          results.innerHTML = "";
          const filtrati = prodotti.filter(p => p.categoria === cat);
          filtrati.forEach(p => results.appendChild(createProductLi(p)));
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

  function aggiornaColore(minGiacenzaSpan) {
    const current = parseInt(counterValue.textContent);
    const min = parseInt(minGiacenzaSpan.textContent);
    counterValue.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) counterValue.classList.add("qty-green");
    else if (current === min) counterValue.classList.add("qty-yellow");
    else counterValue.classList.add("qty-red");
  }

  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = "Vuoi aggiornare giacenza?";
    modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;
    modalScorta.innerHTML = `Scorta minima: <span class="min-qty" id="minGiacenza">${prodotto.ScortaMinima}</span>`;

    const minGiacenzaSpan = document.getElementById("minGiacenza");
    counterValue.textContent = prodotto.Giacenza;
    aggiornaColore(minGiacenzaSpan);

    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  decrementBtn.addEventListener("click", () => {
    let current = parseInt(counterValue.textContent);
    if (current > 0) counterValue.textContent = current - 1;
    const minGiacenzaSpan = document.getElementById("minGiacenza");
    aggiornaColore(minGiacenzaSpan);
  });

  incrementBtn.addEventListener("click", () => {
    let current = parseInt(counterValue.textContent);
    counterValue.textContent = current + 1;
    const minGiacenzaSpan = document.getElementById("minGiacenza");
    aggiornaColore(minGiacenzaSpan);
  });

  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;
    const giacenzaNum = parseInt(counterValue.textContent);
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

      if (giacenzaNum < selectedProdotto.ScortaMinima) {
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
