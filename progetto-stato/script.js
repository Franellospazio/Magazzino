document.addEventListener("DOMContentLoaded", async () => {

  // -----------------------------
  // Recupero IP pubblico
  // -----------------------------
  async function getIP() {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (!res.ok) throw new Error("Errore recupero IP");
      const data = await res.json();
      return data.ip;
    } catch (e) {
      console.error("Errore recupero IP:", e);
      return null;
    }
  }

  // -----------------------------
  // Mostra il form di richiesta accesso
  // -----------------------------
  function showRequestForm(ip) {
    const accessModal = document.createElement('div');
    accessModal.id = "accessModal";
    accessModal.style = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:9999;
    `;
    accessModal.innerHTML = `
      <div style="background:#fff;padding:30px;border-radius:10px;text-align:center;">
        <h2>Accesso richiesto</h2>
        <p>Inserisci la tua email aziendale per richiedere accesso:</p>
        <input type="email" id="accessEmail" placeholder="email@azienda.com" style="padding:8px;width:80%;margin-bottom:10px;">
        <button id="sendAccessBtn" style="padding:10px 20px;">Invia richiesta</button>
        <p id="accessMsg" style="margin-top:10px;color:red;"></p>
      </div>
    `;
    document.body.appendChild(accessModal);

    const emailInput = document.getElementById('accessEmail');
    const sendBtn = document.getElementById('sendAccessBtn');
    const msgP = document.getElementById('accessMsg');

    sendBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) { msgP.textContent = 'Inserisci un email valida'; return; }

      try {
        const res = await fetch('/api/richiesta-accesso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, ip })
        });
        const data = await res.json();
        if (!res.ok) msgP.textContent = data.error || 'Errore invio richiesta';
        else msgP.textContent = 'Richiesta inviata. Attendi approvazione.';
      } catch (e) {
        msgP.textContent = 'Errore server.';
      }
    });
  }

  // -----------------------------
  // Controllo accesso al caricamento
  // -----------------------------
  async function checkAccess() {
    const ip = await getIP();
    if (!ip) {
      document.body.innerHTML = "<h2>Impossibile ottenere il tuo IP.</h2>";
      return;
    }

    try {
      const res = await fetch('/api/verifica-accesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();

      if (data.allowed) {
        // IP approvato → avvia app
        initApp();
      } else {
        // Non approvato → mostra richiesta accesso
        showRequestForm(ip);
      }
    } catch (e) {
      console.error("Errore verifica accesso:", e);
      showRequestForm(ip);
    }
  }

  // -----------------------------
  // Funzioni principali app prodotti
  // -----------------------------
  function initApp() {
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

    // --- Password admin ---
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

    // --- Creazione lista prodotti ---
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

      if (showGiacenza) content += ` — <span style="color:red;">${p.Giacenza}</span> (<span style="color:blue;">${p.ScortaMinima}</span>)`;
      if (p.inordine && p.inordine > 0) content += `<br>🛒 In ordine: ${p.inordine}`;
      if (p.ImageURL) content += `<br><img src="${p.ImageURL}" alt="${p.Descrizione}" style="max-width:100px; max-height:100px; margin-top:5px;">`;
      else content += `<br><em>(img non presente)</em>`;

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

    // --- Eventi prodotti ---
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

    // --- Caricamento prodotti ---
    async function loadProdotti() {
      try {
        const res = await fetch("/api/prodotti");
        if (!res.ok) throw new Error(`Errore API: ${res.status}`);
        prodotti = await res.json();
      } catch (err) {
        console.error("Errore caricamento dati:", err);
      }
    }

    // --- Modal e gestione giacenza ---
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
      modalTitle.textContent = isAdmin ? "Aggiorna prodotto" : "Aggiorna giacenza";
      modalDescrizione.textContent = `Prodotto: ${prodotto.Descrizione}`;
      modalScorta.innerHTML = `Scorta minima: <span id="scortaMinSpan" class="min-qty">${prodotto.ScortaMinima}</span>`;
      counterValue.textContent = prodotto.Giacenza;
      aggiornaColore(document.getElementById("scortaMinSpan"));
      modal.style.display = "block";
    }

    function closeModal() { modal.style.display = "none"; selectedProdotto = null; }

    decrementBtn.addEventListener("click", () => {
      let val = parse
      Int(counterValue.textContent);
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
        closeModal();
      } catch (err) { console.error(err); alert("Errore aggiornamento prodotto!"); }
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
  }

  // Avvio controllo accesso
  await checkAccess();

});

