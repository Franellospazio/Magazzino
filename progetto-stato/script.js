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

  const ADMIN_PASSWORD = "1234";
  const STICKER_URL = "https://wonuzdqupujzeqhucxok.supabase.co/storage/v1/object/public/Admin/IMG_9082.webp";

  // Toggle admin con password
  adminBtn.addEventListener("click", () => {
    const pw = prompt("Inserisci password admin (4 caratteri):");
    if (pw === ADMIN_PASSWORD) {
      isAdmin = true;
      adminBtn.textContent = "🔓 Admin ON";
      adminBtn.style.backgroundColor = "#27ae60";
      alert("Modalità admin attivata!");
    } else {
      isAdmin = false;
      adminBtn.textContent = "🛠️ Admin";
      adminBtn.style.backgroundColor = "#e74c3c";
      results.innerHTML = `<img src="${STICKER_URL}" alt="Non sei amministratore!!" style="max-width:200px;">`;
    }
  });

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

  function resetAll() {
    results.innerHTML = "";
    categorieContainer.innerHTML = "";
    categorieContainer.style.display = "none";
    showingAll = false;
    showingSottoscorta = false;
    showingCategorie = false;
    activeCategoryBtn = null;
  }

  searchButton.addEventListener("click", () => {
    if (showingAll) resetAll();
    else {
      resetAll();
      prodotti.forEach(p => results.appendChild(createProductLi(p)));
      showingAll = true;
    }
  });

  sottoscortaBtn.addEventListener("click", () => {
    if (showingSottoscorta) resetAll();
    else {
      resetAll();
      const sottoscorta = prodotti.filter(p => p.Giacenza < p.ScortaMinima);
      sottoscorta.forEach(p => results.appendChild(createProductLi(p, true)));
      showingSottoscorta = true;
    }
  });

  categorieMasterBtn.addEventListener("click", () => {
    if (showingCategorie) resetAll();
    else {
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

  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti");
      if (!res.ok) throw new Error(`Errore API: ${res.status}`);
      prodotti = await res.json();
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  }

  function aggiornaColore(span) {
    const current = parseInt(counterValue.textContent);
    const min = parseInt(span.textContent);
    counterValue.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) counterValue.classList.add("qty-green");
    else if (current === min) counterValue.classList.add("qty-yellow");
    else counterValue.classList.add("qty-red");
  }

  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = isAdmin ? "Aggiorna prodotto (Admin)" : "Aggiorna giacenza";
    modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;

    if (!isAdmin) {
      modalScorta.innerHTML = `
        Scorta minima: <span id="scortaMinSpan" class="min-qty">${prodotto.ScortaMinima}</span>
      `;
      counterValue.textContent = prodotto.Giacenza;
      aggiornaColore(document.getElementById("scortaMinSpan"));
      modal.style.display = "block";
      return;
    }

    // Modal Admin
    modalScorta.innerHTML = `
      <div>
        <label>Scorta minima:</label>
        <input type="number" id="scortaMinimaInput" value="${prodotto.ScortaMinima}" style="width:60px;">
      </div>
      <div style="margin-top:5px;">
        <label>🛒 In ordine:</label>
        <button type="button" id="decInOrdine" style="color:white;background:red;border:none;width:25px;">−</button>
        <span id="inOrdineValue" style="display:inline-block;width:40px;text-align:center;">${prodotto.inordine || 0}</span>
        <button type="button" id="incInOrdine" style="color:white;background:green;border:none;width:25px;">+</button>
      </div>
      <div style="margin-top:5px;">
        <label>📦 Giacenza:</label>
        <button type="button" id="decGiacenza" style="color:white;background:red;border:none;width:25px;">−</button>
        <span id="giacenzaValue" style="display:inline-block;width:40px;text-align:center;">${prodotto.Giacenza}</span>
        <button type="button" id="incGiacenza" style="color:white;background:green;border:none;width:25px;">+</button>
      </div>
      <div style="margin-top:10px;">
        <button id="aggiornaBtn">Aggiorna</button>
      </div>
    `;

    // Eventi In Ordine
    const decInOrdine = document.getElementById("decInOrdine");
    const incInOrdine = document.getElementById("incInOrdine");
    const inOrdineValue = document.getElementById("inOrdineValue");
    decInOrdine.addEventListener("click", () => {
      let val = parseInt(inOrdineValue.textContent);
      if (val > 0) val--;
      inOrdineValue.textContent = val;
    });
    incInOrdine.addEventListener("click", () => {
      let val = parseInt(inOrdineValue.textContent);
      val++;
      inOrdineValue.textContent = val;
    });

    // Eventi Giacenza
    const decGiacenza = document.getElementById("decGiacenza");
    const incGiacenza = document.getElementById("incGiacenza");
    const giacenzaValue = document.getElementById("giacenzaValue");
    decGiacenza.addEventListener("click", () => {
      let val = parseInt(giacenzaValue.textContent);
      if (val > 0) val--;
      giacenzaValue.textContent = val;
    });
    incGiacenza.addEventListener("click", () => {
      let val = parseInt(giacenzaValue.textContent);
      val++;
      giacenzaValue.textContent = val;
    });

    // Aggiorna btn
    document.getElementById("aggiornaBtn").addEventListener("click", async () => {
      const scortaMinimaNum = parseInt(document.getElementById("scortaMinimaInput").value) || prodotto.ScortaMinima;
      const inOrdineNum = parseInt(inOrdineValue.textContent) || 0;
      const giacenzaNum = parseInt(giacenzaValue.textContent) || prodotto.Giacenza;

      try {
        const res = await fetch("/api/prodotti", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descrizione: prodotto.Descrizione,
            Giacenza: giacenzaNum,
            inordine: inOrdineNum,
            ScortaMinima: scortaMinimaNum
          })
        });
        if (!res.ok) throw new Error(`Errore aggiornamento: ${res.status}`);

        prodotto.Giacenza = giacenzaNum;
        prodotto.inordine = inOrdineNum;
        prodotto.ScortaMinima = scortaMinimaNum;

        alert("Prodotto aggiornato!");
        closeModal();
      } catch (err) {
        console.error(err);
        alert("Errore aggiornamento prodotto!");
      }
    });

    modal.style.display = "block";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
  }

  decrementBtn.addEventListener("click", () => {
    let current = parseInt(counterValue.textContent);
    if (current > 0) counterValue.textContent = current - 1;
  });

  incrementBtn.addEventListener("click", () => {
    let current = parseInt(counterValue.textContent);
    counterValue.textContent = current + 1;
  });

  search.addEventListener("input", () => {
    resetAll();
    const query = search.value.toLowerCase();
    if (query.length < 1) return;
    const filtrati = prodotti.filter(p => p.Descrizione.toLowerCase().includes(query));
    filtrati.forEach(p => results.appendChild(createProductLi(p)));
  });

  window.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  closeBtn.addEventListener("click", closeModal);

  loadProdotti();
});
