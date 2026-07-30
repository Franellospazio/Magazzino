document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const closeBtn = document.getElementById("modalCloseBtn");
  const modalTitle = document.getElementById("modalTitle");
  const modalDescrizione = document.getElementById("modalDescrizione");
  const modalScorta = document.getElementById("modalScorta");
  const counterValue = document.getElementById("counterValue");
  const decrementBtn = document.getElementById("decrement");
  const incrementBtn = document.getElementById("increment");
  const aggiornaBtn = document.getElementById("aggiornaBtn");
  const searchButton = document.querySelector(".searchButton");
  const sottoscortaBtn = document.getElementById("sottoscortaBtn");
  const inOrdineBtn = document.getElementById("inOrdineBtn");
  const categorieMasterBtn = document.getElementById("categorieMasterBtn");
  const categorieContainer = document.getElementById("categorieContainer");
  const adminBtn = document.getElementById("adminBtn");
  const nuovoFornitoreBtn = document.getElementById("nuovoFornitoreBtn");
  const adrBtn = document.getElementById("adrBtn");

  let prodotti = [];
  let selectedProdotto = null;
  let showingAll = false;
  let showingSottoscorta = false;
  let showingInOrdine = false;
  let showingCategorie = false;
  let activeCategoryBtn = null;
  let isAdmin = false;
  let fornitoriCache = {};
  let tuttiFornitori = []; // cache globale di tutti i fornitori

  const ADMIN_PASSWORD = "ori3";
  const STICKER_URL = "https://wonuzdqupujzeqhucxok.supabase.co/storage/v1/object/public/Admin/IMG_9082.webp";

  // ─── Formattazione data ───────────────────────────────────────────────────
  function formatData(timestamp) {
    if (!timestamp) return "Mai aggiornato";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "Adesso" : `${diffMins} minuti fa`;
      }
      return diffHours === 1 ? "1 ora fa" : `${diffHours} ore fa`;
    }
    if (diffDays === 1) return "Ieri";
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────
  adminBtn.addEventListener("click", () => {
    const pw = prompt("Inserisci password admin (4 caratteri):");
    if (pw === ADMIN_PASSWORD) {
      isAdmin = true;
      adminBtn.textContent = "🔓 Admin ON";
      adminBtn.style.backgroundColor = "#27ae60";
      nuovoFornitoreBtn.style.display = "inline-flex";
      loadTuttiFornitori();
      alert("Modalità admin attivata!");
    } else {
      isAdmin = false;
      adminBtn.textContent = "🛠️ Admin";
      adminBtn.style.backgroundColor = "#e74c3c";
      nuovoFornitoreBtn.style.display = "none";
      results.innerHTML = `<img src="${STICKER_URL}" alt="Non sei amministratore!!" style="max-width:200px;">`;
    }
  });

  // ─── Bottone nuovo fornitore globale ─────────────────────────────────────
  nuovoFornitoreBtn.addEventListener("click", async () => {
    const nome = prompt("Nome del nuovo fornitore:");
    if (!nome || !nome.trim()) return;
    try {
      const res = await fetch("/api/fornitori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() })
      });
      if (!res.ok) throw new Error();
      const nuovo = await res.json();
      tuttiFornitori.push(nuovo);
      tuttiFornitori.sort((a, b) => a.nome.localeCompare(b.nome));
      alert(`Fornitore "${nuovo.nome}" aggiunto!`);
    } catch {
      alert("Errore durante l'aggiunta del fornitore.");
    }
  });

  // ─── Carica tutti i fornitori disponibili ────────────────────────────────
  async function loadTuttiFornitori() {
    try {
      const res = await fetch("/api/fornitori?tutti=1");
      if (!res.ok) return;
      tuttiFornitori = await res.json();
    } catch (err) {
      console.error("Errore caricamento tutti fornitori:", err);
    }
  }

  // ─── Carica fornitori per prodotto (con cache) ────────────────────────────
  async function loadFornitori(descrizione) {
    try {
      const res = await fetch(`/api/fornitori?prodotto=${encodeURIComponent(descrizione)}`);
      if (!res.ok) return [];
      const data = await res.json();
      fornitoriCache[descrizione] = data;
      return data;
    } catch (err) {
      console.error("Errore caricamento fornitori:", err);
      return [];
    }
  }

  // ─── Crea li prodotto ─────────────────────────────────────────────────────
  function createProductLi(p) {
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

    let giacenzaColor = "green";
    if (p.Giacenza < p.ScortaMinima) giacenzaColor = "red";
    else if (p.Giacenza === p.ScortaMinima) giacenzaColor = "orange";
    content += ` — <span style="color:${giacenzaColor};">${p.Giacenza}</span> (<span style="color:blue;">${p.ScortaMinima}</span>)`;

    if (p.inordine && p.inordine > 0) content += `<br>🛒 In ordine: ${p.inordine}`;
    if (p.ultimo_aggiornamento) content += `<br><span style="color:#666; font-size:12px;">📅 Aggiornato: ${formatData(p.ultimo_aggiornamento)}</span>`;
    if (p.ImageURL) content += `<br><img src="${p.ImageURL}" alt="${p.Descrizione}" style="max-width:100px; max-height:100px; margin-top:5px;">`;
    else content += `<br><em>(img non presente)</em>`;

    li.innerHTML = content;
    li.addEventListener("click", () => openModal(p));
    return li;
  }

  function createProductLiOrdine(p) {
    const li = createProductLi(p);
    if (p.fornitore_selezionato_nome) {
      const br = document.createElement("br");
      const tag = document.createElement("span");
      tag.style.cssText = "display:inline-block; margin-top:3px; background:#8e44ad; color:white; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:10px;";
      tag.textContent = "🏭 " + p.fornitore_selezionato_nome;
      li.appendChild(br);
      li.appendChild(tag);
    }
    return li;
  }

  // ─── Reset / Refresh ──────────────────────────────────────────────────────
  function resetAll() {
    results.innerHTML = "";
    categorieContainer.innerHTML = "";
    categorieContainer.style.display = "none";
    showingAll = false;
    showingSottoscorta = false;
    showingInOrdine = false;
    showingCategorie = false;
    activeCategoryBtn = null;
  }

  function renderInOrdine() {
    const inOrdine = prodotti.filter(p => p.inordine && p.inordine > 0);
    if (inOrdine.length === 0) {
      results.innerHTML = "<li style='padding:10px; color:#999;'>Nessun prodotto in ordine.</li>";
      return;
    }
    const gruppi = {};
    inOrdine.forEach(p => {
      const key = p.fornitore_selezionato_nome || "— Senza fornitore —";
      if (!gruppi[key]) gruppi[key] = [];
      gruppi[key].push(p);
    });
    Object.entries(gruppi).forEach(([fornitore, lista]) => {
      const header = document.createElement("li");
      header.style.cssText = "background:#8e44ad; color:white; font-weight:bold; padding:8px 12px; font-size:14px; list-style:none; border-radius:6px; margin-top:8px;";
      header.textContent = "🏭 " + fornitore;
      results.appendChild(header);
      lista.forEach(p => results.appendChild(createProductLiOrdine(p)));
    });
  }

  function refreshLista() {
    if (showingAll) { results.innerHTML = ""; prodotti.forEach(p => results.appendChild(createProductLi(p))); }
    else if (showingSottoscorta) { results.innerHTML = ""; prodotti.filter(p => p.Giacenza < p.ScortaMinima).forEach(p => results.appendChild(createProductLi(p))); }
    else if (showingInOrdine) { results.innerHTML = ""; renderInOrdine(); }
    else if (showingCategorie && activeCategoryBtn) {
      results.innerHTML = "";
      const cat = activeCategoryBtn.textContent;
      prodotti.filter(p => p.categoria === cat).forEach(p => results.appendChild(createProductLi(p)));
    }
  }

  // ─── Filtri ───────────────────────────────────────────────────────────────
  searchButton.addEventListener("click", () => {
    if (showingAll) resetAll();
    else { resetAll(); prodotti.forEach(p => results.appendChild(createProductLi(p))); showingAll = true; }
  });

  sottoscortaBtn.addEventListener("click", () => {
    if (showingSottoscorta) resetAll();
    else { resetAll(); prodotti.filter(p => p.Giacenza < p.ScortaMinima).forEach(p => results.appendChild(createProductLi(p))); showingSottoscorta = true; }
  });

  inOrdineBtn.addEventListener("click", () => {
    if (showingInOrdine) { resetAll(); return; }
    resetAll(); showingInOrdine = true; renderInOrdine();
  });

  categorieMasterBtn.addEventListener("click", () => {
    if (showingCategorie) { resetAll(); return; }
    resetAll();
    categorieContainer.style.display = "flex";
    const categorie = [...new Set(prodotti.map(p => p.categoria).filter(c => c))];
    categorie.forEach(cat => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.textContent = cat; btn.classList.add("categoriaBtn");
      btn.style.touchAction = "manipulation"; btn.style.userSelect = "none";
      btn.addEventListener("click", () => {
        if (activeCategoryBtn === btn) { results.innerHTML = ""; btn.classList.remove("active"); activeCategoryBtn = null; return; }
        if (activeCategoryBtn) activeCategoryBtn.classList.remove("active");
        results.innerHTML = "";
        prodotti.filter(p => p.categoria === cat).forEach(p => results.appendChild(createProductLi(p)));
        btn.classList.add("active"); activeCategoryBtn = btn;
      });
      categorieContainer.appendChild(btn);
    });
    showingCategorie = true;
  });

  // ─── Carica prodotti ──────────────────────────────────────────────────────
  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti");
      if (!res.ok) throw new Error();
      prodotti = await res.json();
    } catch (err) { console.error("Errore caricamento dati:", err); }
  }

  // ─── Colore giacenza ──────────────────────────────────────────────────────
  function aggiornaColore(span) {
    const current = parseInt(counterValue.textContent);
    const min = parseInt(span.textContent);
    counterValue.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) counterValue.classList.add("qty-green");
    else if (current === min) counterValue.classList.add("qty-yellow");
    else counterValue.classList.add("qty-red");
  }

  // ─── Sezione gestione fornitori nel modal ─────────────────────────────────
  // Renderizza la lista fornitori associati con up/down/elimina e il + per aggiungerne
  function renderFornitoriAdmin(fornitori, prodottoDescrizione) {
    const container = document.createElement("div");
    container.id = "fornitoriAdminSection";
    container.style.cssText = "margin-top:12px; border-top:1px solid #eee; padding-top:10px;";

    const titolo = document.createElement("div");
    titolo.style.cssText = "font-size:12px; font-weight:700; color:#555; margin-bottom:8px; letter-spacing:0.05em; text-transform:uppercase;";
    titolo.textContent = "🏭 Fornitori associati";
    container.appendChild(titolo);

    // Lista fornitori con controlli
    const lista = document.createElement("div");
    lista.id = "fornitoriLista";
    container.appendChild(lista);

    function aggiornLista(fList) {
      lista.innerHTML = "";
      fList.forEach((f, idx) => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:6px; margin-bottom:6px;";

        // Badge ordine
        const badge = document.createElement("span");
        badge.style.cssText = "background:#8e44ad; color:white; border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; flex-shrink:0;";
        badge.textContent = idx + 1;

        // Nome
        const nomeSpan = document.createElement("span");
        nomeSpan.style.cssText = "flex:1; font-size:13px; font-weight:600;";
        nomeSpan.textContent = f.nome;

        // Su
        const upBtn = document.createElement("button");
        upBtn.type = "button"; upBtn.textContent = "↑";
        upBtn.style.cssText = "border:none; background:#ddd; border-radius:4px; padding:2px 7px; cursor:pointer; font-size:13px;";
        upBtn.disabled = idx === 0;
        upBtn.addEventListener("click", async () => {
          const prev = fList[idx - 1];
          await fetch("/api/fornitori", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: f.id, ordine: idx }) });
          await fetch("/api/fornitori", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: prev.id, ordine: idx + 1 }) });
          // Swap locale
          fList[idx - 1] = f; fList[idx] = prev;
          fList[idx - 1].ordine = idx; fList[idx].ordine = idx + 1;
          fornitoriCache[prodottoDescrizione] = fList;
          aggiornLista(fList);
        });

        // Giù
        const downBtn = document.createElement("button");
        downBtn.type = "button"; downBtn.textContent = "↓";
        downBtn.style.cssText = "border:none; background:#ddd; border-radius:4px; padding:2px 7px; cursor:pointer; font-size:13px;";
        downBtn.disabled = idx === fList.length - 1;
        downBtn.addEventListener("click", async () => {
          const next = fList[idx + 1];
          await fetch("/api/fornitori", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: f.id, ordine: idx + 2 }) });
          await fetch("/api/fornitori", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: next.id, ordine: idx + 1 }) });
          fList[idx + 1] = f; fList[idx] = next;
          fList[idx].ordine = idx + 1; fList[idx + 1].ordine = idx + 2;
          fornitoriCache[prodottoDescrizione] = fList;
          aggiornLista(fList);
        });

        // Elimina
        const delBtn = document.createElement("button");
        delBtn.type = "button"; delBtn.textContent = "✕";
        delBtn.style.cssText = "border:none; background:#e74c3c; color:white; border-radius:4px; padding:2px 7px; cursor:pointer; font-size:13px;";
        delBtn.addEventListener("click", async () => {
          if (!confirm(`Rimuovere ${f.nome} da questo prodotto?`)) return;
          await fetch("/api/fornitori", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: f.id }) });
          fList.splice(idx, 1);
          // Ricalcola ordini
          fList.forEach((x, i) => { x.ordine = i + 1; });
          fornitoriCache[prodottoDescrizione] = fList;
          aggiornLista(fList);
        });

        row.appendChild(badge); row.appendChild(nomeSpan); row.appendChild(upBtn); row.appendChild(downBtn); row.appendChild(delBtn);
        lista.appendChild(row);
      });

      // Bottone aggiungi fornitore
      const disponibili = tuttiFornitori.filter(t => !fList.find(f => f.id === t.id));
      if (disponibili.length > 0) {
        const addRow = document.createElement("div");
        addRow.style.cssText = "margin-top:8px; display:flex; gap:6px; align-items:center;";

        const sel = document.createElement("select");
        sel.style.cssText = "flex:1; padding:5px; border:1.5px solid #8e44ad; border-radius:6px; font-size:13px;";
        sel.innerHTML = `<option value="">— Aggiungi fornitore —</option>` + disponibili.map(f => `<option value="${f.id}">${f.nome}</option>`).join("");

        const addBtn = document.createElement("button");
        addBtn.type = "button"; addBtn.textContent = "＋";
        addBtn.style.cssText = "background:#8e44ad; color:white; border:none; border-radius:6px; padding:5px 12px; font-size:16px; cursor:pointer; font-weight:bold;";
        addBtn.addEventListener("click", async () => {
          if (!sel.value) return;
          const fornitoreId = parseInt(sel.value);
          await fetch("/api/fornitori", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: fornitoreId }) });
          const nuovo = tuttiFornitori.find(f => f.id === fornitoreId);
          fList.push({ id: nuovo.id, nome: nuovo.nome, ordine: fList.length + 1 });
          fornitoriCache[prodottoDescrizione] = fList;
          aggiornLista(fList);
        });

        addRow.appendChild(sel); addRow.appendChild(addBtn);
        lista.appendChild(addRow);
      }
    }

    aggiornLista(fornitori);
    return container;
  }

  // ─── Selettore fornitore per l'ordine (bottoni pill) ─────────────────────
  function renderFornitoreOrdine(fornitori, currentFornitoreId) {
    if (fornitori.length === 0) return { html: "", currentId: null };

    const defaultId = currentFornitoreId ?? fornitori[0].id;

    if (fornitori.length === 1) {
      return {
        html: `<div style="margin-top:10px; font-size:13px; color:#555;">🏭 Fornitore: <strong>${fornitori[0].nome}</strong></div>
               <input type="hidden" id="fornitoreSelezionato" value="${fornitori[0].id}">`,
        currentId: fornitori[0].id
      };
    }

    const btns = fornitori.map(f => {
      const active = f.id === defaultId;
      const style = active ? "background:#8e44ad; color:white; border-color:#8e44ad;" : "background:#f0f0f0; color:#333; border-color:#ccc;";
      return `<button type="button" class="fornitore-btn" data-id="${f.id}"
                style="padding:6px 14px; border:1.5px solid; border-radius:20px; font-size:13px; font-weight:bold; cursor:pointer; margin:3px; transition:all 0.15s; ${style}">
                ${f.nome}
              </button>`;
    }).join("");

    return {
      html: `<div style="margin-top:10px;">
               <span style="font-size:12px; color:#555; font-weight:bold;">🏭 Fornitore ordine:</span><br>
               <div id="fornitoreBtns" style="margin-top:6px;">${btns}</div>
             </div>
             <input type="hidden" id="fornitoreSelezionato" value="${defaultId}">`,
      currentId: defaultId
    };
  }

  // ─── Modal ────────────────────────────────────────────────────────────────
  async function openModal(prodotto) {
    selectedProdotto = prodotto;
    modalTitle.textContent = isAdmin ? "Aggiorna prodotto" : "Aggiorna giacenza";

    let descrizioneText = `Prodotto: ${prodotto.Descrizione}`;
    if (prodotto.ultimo_aggiornamento) {
      const date = new Date(prodotto.ultimo_aggiornamento);
      const dataOra = date.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      descrizioneText += ` <span style="color:#666; font-size:14px;">(${dataOra})</span>`;
    } else {
      descrizioneText += ` <span style="color:#999; font-size:14px; font-style:italic;">(mai aggiornato)</span>`;
    }
    modalDescrizione.innerHTML = descrizioneText;

    let scortaHTML = `Scorta minima: <span id="scortaMinSpan" class="min-qty">${prodotto.ScortaMinima}</span>`;

    if (isAdmin) {
      const inOrdineVal = prodotto.inordine ?? 0;
      const fornitori = await loadFornitori(prodotto.Descrizione);
      const { html: fornitoreOrdineHTML } = renderFornitoreOrdine(fornitori, prodotto.fornitore_selezionato);

      scortaHTML += `
        <br>In ordine:
        <div id="adminInOrdineContainerDynamic" class="admin-in-ordine-container">
          <button type="button" id="decInOrdine" class="qty-btn minus">−</button>
          <span id="inOrdineValue" class="qty-number qty-blue">${inOrdineVal}</span>
          <button type="button" id="incInOrdine" class="qty-btn plus">+</button>
        </div>
        ${fornitoreOrdineHTML}
        <br>Modifica scorta minima:
        <input type="number" id="scortaMinimaInput" value="${prodotto.ScortaMinima}" class="admin-scorta-input">`;
    }

    modalScorta.innerHTML = scortaHTML;

    if (isAdmin) {
      // Listener +/-
      document.getElementById("decInOrdine").addEventListener("click", () => {
        const el = document.getElementById("inOrdineValue");
        let val = parseInt(el.textContent); if (val > 0) el.textContent = val - 1;
      });
      document.getElementById("incInOrdine").addEventListener("click", () => {
        const el = document.getElementById("inOrdineValue");
        el.textContent = parseInt(el.textContent) + 1;
      });

      // Listener bottoni fornitore ordine
      const fornitoreBtns = document.getElementById("fornitoreBtns");
      if (fornitoreBtns) {
        fornitoreBtns.addEventListener("click", (e) => {
          const btn = e.target.closest(".fornitore-btn");
          if (!btn) return;
          fornitoreBtns.querySelectorAll(".fornitore-btn").forEach(b => { b.style.background = "#f0f0f0"; b.style.color = "#333"; b.style.borderColor = "#ccc"; });
          btn.style.background = "#8e44ad"; btn.style.color = "white"; btn.style.borderColor = "#8e44ad";
          document.getElementById("fornitoreSelezionato").value = btn.dataset.id;
        });
      }

      // Sezione gestione fornitori (aggiungi/elimina/ordina)
      const fornitori = fornitoriCache[prodotto.Descrizione] || [];
      const sezione = renderFornitoriAdmin([...fornitori], prodotto.Descrizione);
      modalScorta.appendChild(sezione);
    }

    counterValue.textContent = prodotto.Giacenza;
    aggiornaColore(document.getElementById("scortaMinSpan"));
    hideFixedBtns();
    modal.style.display = "block";
  }

  function hideFixedBtns() {
    adminBtn.style.display = "none";
    adrBtn.style.display = "none";
    if (nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "none";
  }

  function showFixedBtns() {
    adminBtn.style.display = "";
    adrBtn.style.display = "";
    if (isAdmin && nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "inline-flex";
  }

  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
    showFixedBtns();
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

  // ─── Aggiorna ─────────────────────────────────────────────────────────────
  aggiornaBtn.addEventListener("click", async () => {
    if (!selectedProdotto) return;
    const giacenzaNum = parseInt(counterValue.textContent);
    if (isNaN(giacenzaNum)) { alert("Inserisci un numero valido!"); return; }

    let inOrdineNum = selectedProdotto.inordine ?? 0;
    let scortaMinimaNum = selectedProdotto.ScortaMinima;
    let fornitoreId = selectedProdotto.fornitore_selezionato ?? null;

    if (isAdmin) {
      const inOrdineEl = document.getElementById("inOrdineValue");
      const scortaEl = document.getElementById("scortaMinimaInput");
      const fornitoreEl = document.getElementById("fornitoreSelezionato");
      if (inOrdineEl) inOrdineNum = parseInt(inOrdineEl.textContent) || 0;
      if (scortaEl) scortaMinimaNum = parseInt(scortaEl.value) || scortaMinimaNum;
      if (fornitoreEl && fornitoreEl.value) fornitoreId = parseInt(fornitoreEl.value);
    }

    if (inOrdineNum === 0) fornitoreId = null;

    try {
      const res = await fetch("/api/prodotti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descrizione: selectedProdotto.Descrizione, Giacenza: giacenzaNum, inordine: inOrdineNum, ScortaMinima: scortaMinimaNum, fornitore_selezionato: fornitoreId })
      });
      if (!res.ok) throw new Error();

      let fornitoreNome = null;
      if (fornitoreId) {
        const fList = fornitoriCache[selectedProdotto.Descrizione] || [];
        const f = fList.find(f => f.id === fornitoreId);
        if (f) fornitoreNome = f.nome;
      }

      selectedProdotto.Giacenza = giacenzaNum;
      selectedProdotto.inordine = inOrdineNum;
      selectedProdotto.ScortaMinima = scortaMinimaNum;
      selectedProdotto.fornitore_selezionato = fornitoreId;
      selectedProdotto.fornitore_selezionato_nome = fornitoreNome;
      selectedProdotto.ultimo_aggiornamento = new Date().toISOString();

      if (!isAdmin && giacenzaNum < scortaMinimaNum) {
        const now = new Date();
        const dataOra = now.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        try {
          await emailjs.send('service_487ujbw', 'template_l5an0k5', { title: 'Update Magazzino', prodotto: selectedProdotto.Descrizione, giacenza: giacenzaNum, scorta: scortaMinimaNum, time: dataOra, to_email: 'f.disabatino@sepack-lab.it' });
        } catch (e) { console.error('Errore email:', e); }
      }

      closeModal();
      refreshLista();
    } catch (err) { console.error(err); alert("Errore aggiornamento prodotto!"); }
  });

  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  search.addEventListener("input", () => {
    resetAll();
    const query = search.value.toLowerCase();
    if (!query) return;
    prodotti.filter(p => p.Descrizione.toLowerCase().includes(query)).forEach(p => results.appendChild(createProductLi(p)));
  });

  loadProdotti();
});
