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

  const ADMIN_PASSWORD = "ori3";
  const STICKER_URL = "https://wonuzdqupujzeqhucxok.supabase.co/storage/v1/object/public/Admin/IMG_9082.webp";

  // Funzione per formattare la data in modo leggibile
  function formatData(timestamp) {
    if (!timestamp) return "Mai aggiornato";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Se è stato aggiornato oggi
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "Adesso" : `${diffMins} minuti fa`;
      }
      return diffHours === 1 ? "1 ora fa" : `${diffHours} ore fa`;
    }
    
    // Se è stato aggiornato ieri
    if (diffDays === 1) return "Ieri";
    
    // Se è stato aggiornato questa settimana
    if (diffDays < 7) return `${diffDays} giorni fa`;
    
    // Altrimenti mostra la data completa
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  // Password admin
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

  // Crea li prodotto
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

    // Colore dinamico per la giacenza
    let giacenzaColor = "green";
    if (p.Giacenza < p.ScortaMinima) giacenzaColor = "red";
    else if (p.Giacenza === p.ScortaMinima) giacenzaColor = "orange";

    // Giacenza (Scorta Minima)
    content += ` — <span style="color:${giacenzaColor};">${p.Giacenza}</span> (<span style="color:blue;">${p.ScortaMinima}</span>)`;

    if (p.inordine && p.inordine > 0) {
      content += `<br>🛒 In ordine: ${p.inordine}`;
    }

    // 👇 NUOVO: Aggiungi data ultimo aggiornamento
    if (p.ultimo_aggiornamento) {
      const dataFormatted = formatData(p.ultimo_aggiornamento);
      content += `<br><span style="color:#666; font-size:12px;">📅 Aggiornato: ${dataFormatted}</span>`;
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

  // Mostra tutti
  searchButton.addEventListener("click", () => {
    if (showingAll) resetAll();
    else {
      resetAll();
      prodotti.forEach(p => results.appendChild(createProductLi(p)));
      showingAll = true;
    }
  });

  // Sottoscorta
  sottoscortaBtn.addEventListener("click", () => {
    if (showingSottoscorta) resetAll();
    else {
      resetAll();
      const sottoscorta = prodotti.filter(p => p.Giacenza < p.ScortaMinima);
      sottoscorta.forEach(p => results.appendChild(createProductLi(p, true)));
      showingSottoscorta = true;
    }
  });

  // Categorie
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

  // Aggiorna colore giacenza
  function aggiornaColore(span) {
    const current = parseInt(counterValue.textContent);
    const min = parseInt(span.textContent);
    counterValue.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) counterValue.classList.add("qty-green");
    else if (current === min) counterValue.classList.add("qty-yellow");
    else counterValue.classList.add("qty-red");
  }

  // Modal
  function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = isAdmin ? "Aggiorna prodotto" : "Aggiorna giacenza";
    
    // 👇 Mostra data e ora accanto al nome prodotto
    let descrizioneText = `Prodotto: ${prodotto.Descrizione}`;
    if (prodotto.ultimo_aggiornamento) {
      const date = new Date(prodotto.ultimo_aggiornamento);
      const dataOra = date.toLocaleString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      descrizioneText += ` <span style="color:#666; font-size:14px;">(${dataOra})</span>`;
    } else {
      descrizioneText += ` <span style="color:#999; font-size:14px; font-style:italic;">(mai aggiornato)</span>`;
    }
    modalDescrizione.innerHTML = descrizioneText;

    // Scorta minima
    modalScorta.innerHTML = `Scorta minima: <span id="scortaMinSpan" class="min-qty">${prodotto.ScortaMinima}</span>`;

    // Modal admin
    if (isAdmin) {
      const inOrdineVal = prodotto.inordine ?? 0;

      modalScorta.innerHTML += `
        <br>In ordine:
        <div id="adminInOrdineContainerDynamic" class="admin-in-ordine-container">
          <button type="button" id="decInOrdine" class="qty-btn minus">−</button>
          <span id="inOrdineValue" class="qty-number qty-blue">${inOrdineVal}</span>
          <button type="button" id="incInOrdine" class="qty-btn plus">+</button>
        </div>
        <br>Modifica scorta minima: 
        <input type="number" id="scortaMinimaInput" value="${prodotto.ScortaMinima}" class="admin-scorta-input">
      `;

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
    let val = parseInt(counterValue.textContent);
    if (val > 0) counterValue.textContent = val - 1;
    aggiornaColore(document.getElementById("scortaMinSpan"));
  });

  incrementBtn.addEventListener("click", () => {
    counterValue.textContent = parseInt(counterValue.textContent) + 1;
    aggiornaColore(document.getElementById("scortaMinSpan"));
  });

  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;
    const giacenzaNum = parseInt(counterValue.textContent);
    if (isNaN(giacenzaNum)) { alert("Inserisci un numero valido!"); return; }

    let inOrdineNum = selectedProdotto.inordine ?? 0;
    let scortaMinimaNum = selectedProdotto.ScortaMinima;

    if (isAdmin) {
      const inOrdineValue = document.getElementById("inOrdineValue");
      const scortaMinimaInput = document.getElementById("scortaMinimaInput");
      if (inOrdineValue) inOrdineNum = parseInt(inOrdineValue.textContent) || 0;
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

      // Aggiorna il timestamp locale
      selectedProdotto.Giacenza = giacenzaNum;
      selectedProdotto.inordine = inOrdineNum;
      selectedProdotto.ScortaMinima = scortaMinimaNum;
      selectedProdotto.ultimo_aggiornamento = new Date().toISOString();

      // 👇 NUOVO: Invia email se NON admin e giacenza < scorta minima
      if (!isAdmin && giacenzaNum < scortaMinimaNum) {
        const now = new Date();
        const dataOra = now.toLocaleString('it-IT', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        try {
          await emailjs.send(
            'service_487ujbw',      // Service ID
            'template_l5an0k5',     // Template ID
            {
              title: 'Update Magazzino',
              prodotto: selectedProdotto.Descrizione,
              giacenza: giacenzaNum,
              scorta: scortaMinimaNum,
              time: dataOra,
              to_email: 'f.disabatino@sepack-lab.it'
            }
          );
          console.log('Email sottoscorta inviata con successo');
        } catch (emailErr) {
          console.error('Errore invio email:', emailErr);
          // Non bloccare il flusso se l'email fallisce
        }
      }

      closeModal();
      
      // Ricarica i risultati se stai visualizzando qualcosa
      if (showingAll) {
        results.innerHTML = "";
        prodotti.forEach(p => results.appendChild(createProductLi(p)));
      } else if (showingSottoscorta) {
        results.innerHTML = "";
        const sottoscorta = prodotti.filter(p => p.Giacenza < p.ScortaMinima);
        sottoscorta.forEach(p => results.appendChild(createProductLi(p, true)));
      } else if (showingCategorie && activeCategoryBtn) {
        results.innerHTML = "";
        const cat = activeCategoryBtn.textContent;
        const filtrati = prodotti.filter(p => p.categoria === cat);
        filtrati.forEach(p => results.appendChild(createProductLi(p)));
      }
      
    } catch (err) { 
      console.error(err); 
      alert("Errore aggiornamento prodotto!"); 
    }
  });

  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  search.addEventListener("input", () => {
    resetAll();
    const query = search.value.toLowerCase();
    if (!query) return;
    const filtrati = prodotti.filter(p => p.Descrizione.toLowerCase().includes(query));
    filtrati.forEach(p => results.appendChild(createProductLi(p)));
  });

  loadProdotti();
});
