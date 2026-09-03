document.addEventListener("DOMContentLoaded", async () => {

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const SUPABASE_URL_CLIENT  = 'https://wonuzdqupujzeqhucxok.supabase.co';
  const SUPABASE_ANON_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvbnV6ZHF1cHVqemVxaHVjeG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNzYzMjQsImV4cCI6MjA3Mzc1MjMyNH0.UVNF-cb7W9nynV327q4Qz8-vdDk6_6IKbwrvFwVA2Mw';
  const sbClient = supabase.createClient(SUPABASE_URL_CLIENT, SUPABASE_ANON_KEY);

  // Leggi config dal server — AUTH_ENABLED si cambia da Vercel env vars
  const configRes = await fetch('/api/config');
  const config = await configRes.json();
  const AUTH_ENABLED = config.authEnabled;

  const { data: { session } } = await sbClient.auth.getSession();
  const solaLettura = new URLSearchParams(window.location.search).get('readonly') === '1';

  if (AUTH_ENABLED && !session && !solaLettura) {
    window.location.href = '/login.html';
    return;
  }

  let isReadonly = AUTH_ENABLED ? !session : false;
  let currentSession = session;

  sbClient.auth.onAuthStateChange((event, s) => {
    if (AUTH_ENABLED && event === 'SIGNED_OUT') window.location.href = '/login.html';
    if (s) currentSession = s;
  });

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': currentSession ? `Bearer ${currentSession.access_token}` : ''
    };
  }

  let isAdminFromDB = false;
  if (AUTH_ENABLED && session) {
    const profileRes = await fetch(
      `${SUPABASE_URL_CLIENT}/rest/v1/profiles?select=is_admin&id=eq.${session.user.id}`,
      { headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      }}
    );
    const profileData = await profileRes.json();
    isAdminFromDB = profileData?.[0]?.is_admin === true;
  }
  const search = document.getElementById("search");
  const results = document.getElementById("results");
  const modal = document.getElementById("giacenzaModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
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
  let reagenti = [];
  let selectedProdotto = null;
  let selectedReagente = null;
  let showingAll = false;
  let showingSottoscorta = false;
  let showingInOrdine = false;
  let showingCategorie = false;
  let activeCategoryBtn = null;
  let isAdmin = AUTH_ENABLED ? isAdminFromDB : false;
  let fornitoriCache = {};
  let tuttiFornitori = [];

  const ADMIN_PASSWORD = "ori3";
  const STICKER_URL = "https://wonuzdqupujzeqhucxok.supabase.co/storage/v1/object/public/Admin/IMG_9082.webp";

  // ─── Modalità sola lettura ────────────────────────────────────────────────
  if (isReadonly) {
    // Nascondi bottoni modifica
    if (adminBtn) adminBtn.style.display = "none";
    if (nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "none";
    // Aggiungi banner sola lettura
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed; bottom:0; left:0; right:0; background:#f39c12; color:white; text-align:center; padding:6px; font-size:12px; font-weight:bold; z-index:9999;";
    banner.innerHTML = '👁 Modalità sola lettura — <a href="/login.html" style="color:white; text-decoration:underline;">Accedi</a> per modificare';
    document.body.appendChild(banner);
  }

  // ─── Utility date ─────────────────────────────────────────────────────────
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

  function formatDataBreve(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function toInputDate(ts) {
    if (!ts) return "";
    return new Date(ts).toISOString().split('T')[0];
  }

  // ─── Bottoni fissi ────────────────────────────────────────────────────────
  function hideFixedBtns() {
    adminBtn.style.display = "none";
    if (adrBtn) adrBtn.style.display = "none";
    if (nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "none";
  }
  function showFixedBtns() {
    adminBtn.style.display = "";
    if (adrBtn) adrBtn.style.display = "";
    if (isAdmin && nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "inline-flex";
  }

  // ─── Admin ────────────────────────────────────────────────────────────────
  if (AUTH_ENABLED) {
    if (isAdmin) {
      adminBtn.textContent = "🔓 Admin ON";
      adminBtn.style.backgroundColor = "#27ae60";
      if (nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "inline-flex";
      const statsBtn = document.getElementById('statsBtn');
      if (statsBtn) statsBtn.style.display = "inline-flex";
      loadTuttiFornitori();
    } else {
      adminBtn.textContent = "🚪 Esci";
    }
    adminBtn.addEventListener("click", async () => {
      if (confirm("Vuoi uscire?")) {
        await sbClient.auth.signOut();
        window.location.href = '/login.html';
      }
    });
  } else {
    // Auth disabilitata: bottone usa vecchia password
    adminBtn.textContent = "🛠️ Admin";
    adminBtn.addEventListener("click", () => {
      const pw = prompt("Inserisci password admin:");
      if (pw === ADMIN_PASSWORD) {
        isAdmin = true;
        adminBtn.textContent = "🔓 Admin ON";
        adminBtn.style.backgroundColor = "#27ae60";
        if (nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "inline-flex";
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) statsBtn.style.display = "inline-flex";
        loadTuttiFornitori();
        alert("Modalità admin attivata!");
      } else {
        isAdmin = false;
        adminBtn.textContent = "🛠️ Admin";
        adminBtn.style.backgroundColor = "#e74c3c";
        if (nuovoFornitoreBtn) nuovoFornitoreBtn.style.display = "none";
        results.innerHTML = `<img src="${STICKER_URL}" alt="Non sei amministratore!!" style="max-width:200px;">`;
      }
    });
  }

  if (nuovoFornitoreBtn) {
    nuovoFornitoreBtn.addEventListener("click", async () => {
      const nome = prompt("Nome del nuovo fornitore:");
      if (!nome || !nome.trim()) return;
      try {
        const res = await fetch("/api/fornitori", { method: "POST", headers: authHeaders(), body: JSON.stringify({ nome: nome.trim() }) });
        if (!res.ok) throw new Error();
        const nuovo = await res.json();
        tuttiFornitori.push(nuovo);
        tuttiFornitori.sort((a, b) => a.nome.localeCompare(b.nome));
        alert(`Fornitore "${nuovo.nome}" aggiunto!`);
      } catch { alert("Errore durante l'aggiunta del fornitore."); }
    });
  }

  // ─── Carica dati ─────────────────────────────────────────────────────────
  async function loadProdotti() {
    try {
      const res = await fetch("/api/prodotti", { headers: authHeaders() });
      if (!res.ok) throw new Error();
      prodotti = await res.json();
    } catch (err) { console.error("Errore caricamento prodotti:", err); }
  }

  async function loadReagenti() {
    try {
      const res = await fetch("/api/reagenti", { headers: authHeaders() });
      if (!res.ok) throw new Error();
      reagenti = await res.json();
    } catch (err) { console.error("Errore caricamento reagenti:", err); }
  }

  async function reloadReagenti() {
    await loadReagenti();
    if (showingSottoscorta) sottoscortaBtn.click(); // refresh vista
  }

  async function loadGruppiEq() {
    try {
      const res = await fetch("/api/gruppi", { headers: authHeaders() });
      if (!res.ok) return;
      window._gruppiEq = await res.json();
    } catch (err) { console.error("Errore gruppi:", err); }
  }

  async function loadTuttiFornitori() {
    try {
      const res = await fetch("/api/fornitori?tutti=1", { headers: authHeaders() });
      if (!res.ok) return;
      tuttiFornitori = await res.json();
    } catch (err) { console.error("Errore fornitori:", err); }
  }

  async function loadFornitori(descrizione) {
    if (fornitoriCache[descrizione]) return fornitoriCache[descrizione];
    try {
      const res = await fetch(`/api/fornitori?prodotto=${encodeURIComponent(descrizione)}`, { headers: authHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      fornitoriCache[descrizione] = data;
      return data;
    } catch { return []; }
  }

  // Helper: ottieni nome fornitore per raggruppamento (con fallback al primo associato)
  function getFornitoreKeyProdotto(p) {
    if (p.fornitore_selezionato_nome) return p.fornitore_selezionato_nome;
    if (p.fornitori && p.fornitori.length > 0) return p.fornitori[0].nome;
    return "— Senza fornitore —";
  }
  function getFornitoreKeyReagente(g) {
    if (g.fornitore_selezionato_nome) return g.fornitore_selezionato_nome;
    return g.fornitore || "— Senza fornitore —";
  }

  // ─── Li gruppo equivalenza (sottoscorta) ─────────────────────────────────
  function createGruppoLi(g) {
    const li = document.createElement("li");
    li.style.cssText = "border-bottom:1px solid #ccc; padding:6px 0;";
    const mancanti = g._gruppoScorta - g._gruppoGiacenza;
    li.innerHTML = `
      <strong style="color:#c0392b;">⚠️ Gruppo: ${g._gruppoNome}</strong>
      <br><span style="font-size:12px; color:#666;">Giacenza totale gruppo: <span style="color:red; font-weight:bold;">${g._gruppoGiacenza}</span> / scorta minima: <span style="color:blue;">${g._gruppoScorta}</span> — mancanti: <span style="color:red;">−${mancanti}</span></span>
      <br><span style="font-size:11px; color:#999;">Prodotti nel gruppo intercambiabili tra loro</span>
    `;
    return li;
  }

  // ─── Li prodotto normale ──────────────────────────────────────────────────
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
    let gc = p.Giacenza < p.ScortaMinima ? "red" : p.Giacenza === p.ScortaMinima ? "orange" : "green";
    content += ` — <span style="color:${gc};">${p.Giacenza}</span> (<span style="color:blue;">${p.ScortaMinima}</span>)`;
    if (p.inordine && p.inordine > 0) content += `<br>🛒 In ordine: ${p.inordine}`;
    if (p.ultimo_aggiornamento) content += `<br><span style="color:#666; font-size:12px;">📅 Aggiornato: ${formatData(p.ultimo_aggiornamento)}</span>`;
    content += p.ImageURL ? `<br><img src="${p.ImageURL}" alt="${p.Descrizione}" style="max-width:100px; max-height:100px; margin-top:5px;">` : `<br><em>(img non presente)</em>`;
    li.innerHTML = content;
    li.addEventListener("click", () => { if (!isReadonly) openModal(p); });
    return li;
  }

  // ─── Li reagente (gruppo) ─────────────────────────────────────────────────
  function createReagenteLi(g) {
    const li = document.createElement("li");
    li.style.borderBottom = "1px solid #ccc";
    li.style.padding = "5px 0";
    li.dataset.reagente = g.nome_prodotto;
    let gc = g.giacenza < g.scorta_minima ? "red" : g.giacenza === g.scorta_minima ? "orange" : "green";
    let content = `<strong style="color:black;">${g.nome_prodotto}</strong>`;
    content += ` — <span style="color:${gc};">${g.giacenza}</span>`;
    if (g.scorta_minima > 0) content += ` (<span style="color:blue;">${g.scorta_minima}</span>)`;
    if (g.inordine && g.inordine > 0) content += `<br>🛒 In ordine: ${g.inordine}`;
    if (g.nota) content += `<br><span style="display:inline-block; margin-top:3px; background:#2980b9; color:white; font-size:11px; font-weight:bold; padding:2px 10px; border-radius:10px;">📌 ${g.nota}</span>`;
    li.innerHTML = content;
    li.addEventListener("click", () => { if (!isReadonly) openReagenteModal(g); });
    return li;
  }

  function createProductLiOrdine(p) {
    const li = createProductLi(p);
    if (p.fornitore_selezionato_nome) {
      const br = document.createElement("br");
      const tag = document.createElement("span");
      tag.style.cssText = "display:inline-block; margin-top:3px; background:#8e44ad; color:white; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:10px;";
      tag.textContent = "🏭 " + p.fornitore_selezionato_nome;
      li.appendChild(br); li.appendChild(tag);
    }
    return li;
  }

  // ─── Reset / Refresh ──────────────────────────────────────────────────────
  function resetAll() {
    results.innerHTML = "";
    categorieContainer.innerHTML = "";
    categorieContainer.style.display = "none";
    if (mislContainer) { mislContainer.innerHTML = ""; mislContainer.style.display = "none"; }
    if (typeof fornitoriContainer !== 'undefined' && fornitoriContainer) { fornitoriContainer.innerHTML = ""; fornitoriContainer.style.display = "none"; }
    activeMislBtn = null;
    showingAll = false; showingSottoscorta = false;
    showingInOrdine = false; showingCategorie = false;
    activeCategoryBtn = null;
  }

  function renderAll() {
    prodotti.forEach(p => results.appendChild(createProductLi(p)));
    if (reagenti.length > 0) {
      const header = document.createElement("li");
      header.style.cssText = "background:#16a085; color:white; font-weight:bold; padding:8px 12px; font-size:13px; list-style:none; border-radius:6px; margin-top:8px;";
      header.textContent = "🧪 Reagenti";
      results.appendChild(header);
      reagenti.forEach(g => results.appendChild(createReagenteLi(g)));
    }
  }

  function renderInOrdine() {
    // Prodotti normali in ordine
    const inOrdine = prodotti.filter(p => p.inordine && p.inordine > 0);
    const reagentiInOrdine = reagenti.filter(g => g.inordine && g.inordine > 0);

    if (inOrdine.length === 0 && reagentiInOrdine.length === 0) {
      results.innerHTML = "<li style='padding:10px; color:#999;'>Nessun prodotto in ordine.</li>";
      return;
    }

    // Prodotti normali raggruppati per fornitore
    const gruppi = {};
    inOrdine.forEach(p => {
      const key = getFornitoreKeyProdotto(p);
      if (!gruppi[key]) gruppi[key] = [];
      gruppi[key].push({ tipo: 'prodotto', data: p });
    });

    // Reagenti raggruppati per fornitore
    reagentiInOrdine.forEach(g => {
      const key = getFornitoreKeyReagente(g);
      if (!gruppi[key]) gruppi[key] = [];
      gruppi[key].push({ tipo: 'reagente', data: g });
    });

    Object.entries(gruppi).sort(([a], [b]) => a.localeCompare(b)).forEach(([fornitore, lista]) => {
      const header = document.createElement("li");
      header.style.cssText = "background:#8e44ad; color:white; font-weight:bold; padding:8px 12px; font-size:14px; list-style:none; border-radius:6px; margin-top:8px;";
      header.textContent = "🏭 " + fornitore;
      results.appendChild(header);
      lista.forEach(item => {
        if (item.tipo === 'prodotto') results.appendChild(createProductLiOrdine(item.data));
        else results.appendChild(createReagenteLi(item.data));
      });
    });
  }

  function refreshLista() {
    if (showingAll) { results.innerHTML = ""; renderAll(); }
    else if (showingSottoscorta) {
      results.innerHTML = "";
      const prodSotto = prodotti.filter(p => p.Giacenza < p.ScortaMinima);
      const gruppiGiaVisti2 = new Set();
      const reagSotto = [];
      reagenti.forEach(g => {
        if (g.in_gruppo) {
          if (!gruppiGiaVisti2.has(g.gruppo_id) && g.gruppo_sottoscorta) {
            gruppiGiaVisti2.add(g.gruppo_id);
            reagSotto.push({ ...g, _isGruppo: true, _gruppoNome: g.gruppo_nome, _gruppoGiacenza: g.gruppo_giacenza, _gruppoScorta: g.gruppo_scorta_minima });
          }
        } else {
          if (g.scorta_minima > 0 && g.giacenza < g.scorta_minima) reagSotto.push(g);
        }
      });
      const grpForn = {};
      prodSotto.forEach(p => { const k = getFornitoreKeyProdotto(p); if (!grpForn[k]) grpForn[k] = []; grpForn[k].push({ tipo: 'prodotto', data: p }); });
      reagSotto.forEach(g => { const k = g._isGruppo ? '— Gruppo equivalenza —' : getFornitoreKeyReagente(g); if (!grpForn[k]) grpForn[k] = []; grpForn[k].push({ tipo: g._isGruppo ? 'gruppo' : 'reagente', data: g }); });
      Object.entries(grpForn).sort(([a],[b]) => a.localeCompare(b)).forEach(([fornitore, lista]) => {
        const header = document.createElement("li");
        header.style.cssText = "background:#e67e22; color:white; font-weight:bold; padding:8px 12px; font-size:14px; list-style:none; border-radius:6px; margin-top:8px;";
        header.textContent = "🏭 " + fornitore;
        results.appendChild(header);
        lista.forEach(item => {
          if (item.tipo === 'prodotto') results.appendChild(createProductLi(item.data));
          else if (item.tipo === 'gruppo') results.appendChild(createGruppoLi(item.data));
          else results.appendChild(createReagenteLi(item.data));
        });
      });
    }
    else if (showingInOrdine) { results.innerHTML = ""; renderInOrdine(); }
    else if (showingCategorie && activeCategoryBtn) {
      results.innerHTML = "";
      prodotti.filter(p => p.categoria === activeCategoryBtn.textContent).forEach(p => results.appendChild(createProductLi(p)));
    }
  }

  // Aggiorna solo il li di un singolo reagente nella lista corrente, senza ri-renderizzare tutto
  function patchReagenteLiInList(gruppo) {
    const existing = results.querySelector(`[data-reagente="${CSS.escape(gruppo.nome_prodotto)}"]`);
    if (existing) {
      const nuovo = createReagenteLi(gruppo);
      results.replaceChild(nuovo, existing);
    }
  }

  // ─── Filtri ───────────────────────────────────────────────────────────────
  searchButton.addEventListener("click", () => {
    if (showingAll) resetAll();
    else { resetAll(); renderAll(); showingAll = true; }
  });

  sottoscortaBtn.addEventListener("click", () => {
    if (showingSottoscorta) { resetAll(); return; }
    resetAll();
    showingSottoscorta = true;

    const prodSotto = prodotti.filter(p => p.Giacenza < p.ScortaMinima);

    // Reagenti: prodotti in gruppo → usa giacenza gruppo; altrimenti individuale
    const gruppiGiaVisti = new Set(); // evita duplicati per gruppo
    const reagSotto = [];
    reagenti.forEach(g => {
      if (g.in_gruppo) {
        // Considera il gruppo solo una volta
        if (!gruppiGiaVisti.has(g.gruppo_id) && g.gruppo_sottoscorta) {
          gruppiGiaVisti.add(g.gruppo_id);
          // Aggiungi un elemento rappresentativo del gruppo
          reagSotto.push({
            ...g,
            _isGruppo: true,
            _gruppoNome: g.gruppo_nome,
            _gruppoGiacenza: g.gruppo_giacenza,
            _gruppoScorta: g.gruppo_scorta_minima
          });
        }
      } else {
        if (g.scorta_minima > 0 && g.giacenza < g.scorta_minima) {
          reagSotto.push(g);
        }
      }
    });

    if (prodSotto.length === 0 && reagSotto.length === 0) {
      results.innerHTML = "<li style='padding:10px; color:#999;'>Nessun prodotto sottoscorta.</li>";
      return;
    }

    // Raggruppa per fornitore
    const grpForn = {};
    prodSotto.forEach(p => {
      const key = getFornitoreKeyProdotto(p);
      if (!grpForn[key]) grpForn[key] = [];
      grpForn[key].push({ tipo: 'prodotto', data: p });
    });
    reagSotto.forEach(g => {
      const key = g._isGruppo ? '— Gruppo equivalenza —' : getFornitoreKeyReagente(g);
      if (!grpForn[key]) grpForn[key] = [];
      grpForn[key].push({ tipo: g._isGruppo ? 'gruppo' : 'reagente', data: g });
    });

    Object.entries(grpForn).sort(([a], [b]) => a.localeCompare(b)).forEach(([fornitore, lista]) => {
      const header = document.createElement("li");
      header.style.cssText = "background:#e67e22; color:white; font-weight:bold; padding:8px 12px; font-size:14px; list-style:none; border-radius:6px; margin-top:8px;";
      header.textContent = "🏭 " + fornitore;
      results.appendChild(header);
      lista.forEach(item => {
        if (item.tipo === 'prodotto') results.appendChild(createProductLi(item.data));
        else if (item.tipo === 'gruppo') results.appendChild(createGruppoLi(item.data));
        else results.appendChild(createReagenteLi(item.data));
      });
    });
  });

  inOrdineBtn.addEventListener("click", () => {
    if (showingInOrdine) { resetAll(); return; }
    resetAll(); showingInOrdine = true; renderInOrdine();
  });

  let mislContainer = null;
  let activeMislBtn = null;

  categorieMasterBtn.addEventListener("click", () => {
    if (showingCategorie) { resetAll(); return; }
    resetAll();
    categorieContainer.style.display = "flex";

    // Categorie prodotti normali
    const categorie = [...new Set(prodotti.map(p => p.categoria).filter(c => c))];
    categorie.forEach(cat => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.textContent = cat; btn.classList.add("categoriaBtn");
      btn.style.touchAction = "manipulation"; btn.style.userSelect = "none";
      btn.addEventListener("click", () => {
        if (activeCategoryBtn === btn) { results.innerHTML = ""; btn.classList.remove("active"); activeCategoryBtn = null; if (mislContainer) { mislContainer.innerHTML = ""; mislContainer.style.display = "none"; } return; }
        if (activeCategoryBtn) activeCategoryBtn.classList.remove("active");
        if (mislContainer) { mislContainer.innerHTML = ""; mislContainer.style.display = "none"; }
        activeMislBtn = null;
        results.innerHTML = "";
        prodotti.filter(p => p.categoria === cat).forEach(p => results.appendChild(createProductLi(p)));
        btn.classList.add("active"); activeCategoryBtn = btn;
      });
      categorieContainer.appendChild(btn);
    });

    // Bottone FORNITORI
    let fornitoriContainer = null;
    const selectedFornitori = new Set();

    const fornitoriBtn = document.createElement("button");
    fornitoriBtn.type = "button"; fornitoriBtn.textContent = "🏭 Fornitori"; fornitoriBtn.classList.add("categoriaBtn");
    fornitoriBtn.style.touchAction = "manipulation"; fornitoriBtn.style.userSelect = "none";
    fornitoriBtn.addEventListener("click", () => {
      if (activeCategoryBtn === fornitoriBtn) {
        results.innerHTML = ""; fornitoriBtn.classList.remove("active"); activeCategoryBtn = null;
        if (fornitoriContainer) { fornitoriContainer.innerHTML = ""; fornitoriContainer.style.display = "none"; }
        if (mislContainer) { mislContainer.innerHTML = ""; mislContainer.style.display = "none"; }
        selectedFornitori.clear(); activeMislBtn = null;
        return;
      }
      if (activeCategoryBtn) activeCategoryBtn.classList.remove("active");
      if (mislContainer) { mislContainer.innerHTML = ""; mislContainer.style.display = "none"; }
      activeCategoryBtn = fornitoriBtn; fornitoriBtn.classList.add("active");
      results.innerHTML = ""; selectedFornitori.clear();

      // Raccogli tutti i fornitori unici da prodotti e reagenti
      const fornSet = new Set();
      prodotti.forEach(p => { const k = getFornitoreKeyProdotto(p); if (k !== "— Senza fornitore —") fornSet.add(k); });
      reagenti.forEach(g => { const k = getFornitoreKeyReagente(g); if (k !== "— Senza fornitore —") fornSet.add(k); });
      const fornList = [...fornSet].sort((a, b) => a.localeCompare(b));

      if (!fornitoriContainer) {
        fornitoriContainer = document.createElement("div");
        fornitoriContainer.style.cssText = "display:flex; flex-wrap:wrap; gap:6px; padding:8px 0 4px; width:100%;";
        categorieContainer.parentNode.insertBefore(fornitoriContainer, categorieContainer.nextSibling);
      }
      fornitoriContainer.innerHTML = "";
      fornitoriContainer.style.display = "flex";

      function renderFornitoriResults() {
        results.innerHTML = "";
        if (selectedFornitori.size === 0) return;
        const gruppi = {};
        prodotti.forEach(p => {
          const k = getFornitoreKeyProdotto(p);
          if (selectedFornitori.has(k)) { if (!gruppi[k]) gruppi[k] = []; gruppi[k].push({ tipo: 'prodotto', data: p }); }
        });
        reagenti.forEach(g => {
          const k = getFornitoreKeyReagente(g);
          if (selectedFornitori.has(k)) { if (!gruppi[k]) gruppi[k] = []; gruppi[k].push({ tipo: 'reagente', data: g }); }
        });
        Object.entries(gruppi).sort(([a],[b]) => a.localeCompare(b)).forEach(([forn, lista]) => {
          const hdr = document.createElement("li");
          hdr.style.cssText = "background:#8e44ad; color:white; font-weight:bold; padding:8px 12px; font-size:14px; list-style:none; border-radius:6px; margin-top:8px;";
          hdr.textContent = "🏭 " + forn;
          results.appendChild(hdr);
          lista.forEach(item => {
            if (item.tipo === 'prodotto') results.appendChild(createProductLi(item.data));
            else results.appendChild(createReagenteLi(item.data));
          });
        });
      }

      fornList.forEach(forn => {
        const fb = document.createElement("button");
        fb.type = "button"; fb.textContent = forn; fb.classList.add("categoriaBtn");
        fb.style.cssText = "background:#1a1a2e; border:1.5px solid #8e44ad; color:#8e44ad; border-radius:16px; padding:5px 14px; font-size:12px; cursor:pointer; touch-action:manipulation;";
        fb.addEventListener("click", () => {
          if (selectedFornitori.has(forn)) {
            selectedFornitori.delete(forn);
            fb.style.background = "#1a1a2e"; fb.style.color = "#8e44ad";
          } else {
            selectedFornitori.add(forn);
            fb.style.background = "#8e44ad"; fb.style.color = "white";
          }
          renderFornitoriResults();
        });
        fornitoriContainer.appendChild(fb);
      });
    });
    categorieContainer.appendChild(fornitoriBtn);

    // Bottone MISL
    const mislBtn = document.createElement("button");
    mislBtn.type = "button"; mislBtn.textContent = "🧪 MISL"; mislBtn.classList.add("categoriaBtn");
    mislBtn.style.touchAction = "manipulation"; mislBtn.style.userSelect = "none";
    mislBtn.addEventListener("click", () => {
      if (activeCategoryBtn === mislBtn) {
        results.innerHTML = ""; mislBtn.classList.remove("active"); activeCategoryBtn = null;
        if (mislContainer) { mislContainer.innerHTML = ""; mislContainer.style.display = "none"; }
        activeMislBtn = null;
        return;
      }
      if (activeCategoryBtn) activeCategoryBtn.classList.remove("active");
      activeCategoryBtn = mislBtn; mislBtn.classList.add("active");
      results.innerHTML = "";

      // Raccogli tutte le MISL uniche dai progressivi
      const mislSet = new Set();
      reagenti.forEach(g => {
        g.progressivi.forEach(r => { if (r.misl && r.misl.trim()) mislSet.add(r.misl.trim()); });
      });
      const mislList = [...mislSet].sort((a, b) => a.localeCompare(b));

      // Mostra secondo livello MISL
      if (!mislContainer) {
        mislContainer = document.createElement("div");
        mislContainer.style.cssText = "display:flex; flex-wrap:wrap; gap:6px; padding:8px 0 4px; width:100%;";
        categorieContainer.parentNode.insertBefore(mislContainer, categorieContainer.nextSibling);
      }
      mislContainer.innerHTML = "";
      mislContainer.style.display = "flex";

      mislList.forEach(misl => {
        const mb = document.createElement("button");
        mb.type = "button"; mb.textContent = misl; mb.classList.add("categoriaBtn");
        mb.style.cssText = "background:#8e44ad; color:white; border:none; border-radius:16px; padding:5px 14px; font-size:12px; font-weight:bold; cursor:pointer; touch-action:manipulation;";
        mb.addEventListener("click", () => {
          if (activeMislBtn === mb) {
            results.innerHTML = ""; mb.style.opacity = "1"; activeMislBtn = null; return;
          }
          if (activeMislBtn) activeMislBtn.style.opacity = "1";
          activeMislBtn = mb; mb.style.opacity = "0.7";
          results.innerHTML = "";

          // Filtra reagenti che hanno almeno un progressivo con questa MISL
          const reagentiFiltrati = reagenti.filter(g =>
            g.progressivi.some(r => r.misl && r.misl.trim() === misl)
          );

          if (reagentiFiltrati.length === 0) {
            results.innerHTML = "<li style='padding:10px; color:#999;'>Nessun reagente trovato.</li>";
            return;
          }

          reagentiFiltrati.forEach(g => {
            // Prendi posizione dal primo progressivo con questa MISL non chiuso
            const progConMisl = g.progressivi.find(r => r.misl && r.misl.trim() === misl && !r.data_chiusura)
                             || g.progressivi.find(r => r.misl && r.misl.trim() === misl);
            const posizione = progConMisl?.posizione || '—';

            const li = document.createElement("li");
            li.style.borderBottom = "1px solid #ccc";
            li.style.padding = "5px 0";
            li.dataset.reagente = g.nome_prodotto;
            let gc = g.giacenza < g.scorta_minima ? "red" : g.giacenza === g.scorta_minima ? "orange" : "green";
            let content = `<strong style="color:black;">${g.nome_prodotto}</strong>`;
            content += ` — <span style="color:${gc};">${g.giacenza}</span>`;
            if (g.scorta_minima > 0) content += ` (<span style="color:blue;">${g.scorta_minima}</span>)`;
            content += `<br><span style="display:inline-block; margin-top:3px; background:#8e44ad; color:white; font-size:11px; font-weight:bold; padding:2px 10px; border-radius:10px;">📍 ${posizione}</span>`;
            if (g.nota) content += ` <span style="display:inline-block; margin-top:3px; background:#2980b9; color:white; font-size:11px; font-weight:bold; padding:2px 10px; border-radius:10px;">📌 ${g.nota}</span>`;
            li.innerHTML = content;
            li.addEventListener("click", () => { if (!isReadonly) openReagenteModal(g); });
            results.appendChild(li);
          });
        });
        mislContainer.appendChild(mb);
      });
    });
    categorieContainer.appendChild(mislBtn);
    showingCategorie = true;
  });

  // ─── Ricerca ──────────────────────────────────────────────────────────────
  search.addEventListener("input", () => {
    resetAll();
    const query = search.value.toLowerCase();
    if (!query) return;
    prodotti.filter(p => p.Descrizione.toLowerCase().includes(query)).forEach(p => results.appendChild(createProductLi(p)));
    const reagentiFiltrati = reagenti
      .filter(g => g.nome_prodotto.toLowerCase().includes(query))
      .sort((a, b) => {
        const aN = a.nota ? 1 : 0;
        const bN = b.nota ? 1 : 0;
        if (bN !== aN) return bN - aN;
        return a.nome_prodotto.localeCompare(b.nome_prodotto);
      });
    if (reagentiFiltrati.length > 0) {
      const header = document.createElement("li");
      header.style.cssText = "background:#16a085; color:white; font-weight:bold; padding:8px 12px; font-size:13px; list-style:none; border-radius:6px; margin-top:8px;";
      header.textContent = "🧪 Reagenti";
      results.appendChild(header);
      reagentiFiltrati.forEach(g => results.appendChild(createReagenteLi(g)));
    }
  });

  // ─── Colore giacenza ──────────────────────────────────────────────────────
  function aggiornaColore(span) {
    const current = parseInt(counterValue.textContent);
    const min = parseInt(span.textContent);
    counterValue.classList.remove("qty-green", "qty-yellow", "qty-red");
    if (current > min) counterValue.classList.add("qty-green");
    else if (current === min) counterValue.classList.add("qty-yellow");
    else counterValue.classList.add("qty-red");
  }

  // ─── Fornitori admin (prodotti normali) ───────────────────────────────────
  function renderFornitoriAdmin(fornitori, prodottoDescrizione) {
    const container = document.createElement("div");
    container.style.cssText = "margin-top:12px; border-top:1px solid #eee; padding-top:10px;";
    const titolo = document.createElement("div");
    titolo.style.cssText = "font-size:12px; font-weight:700; color:#555; margin-bottom:8px; letter-spacing:0.05em; text-transform:uppercase;";
    titolo.textContent = "🏭 Fornitori associati";
    container.appendChild(titolo);
    const lista = document.createElement("div");
    container.appendChild(lista);

    function aggiornLista(fList) {
      lista.innerHTML = "";
      fList.forEach((f, idx) => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:6px; margin-bottom:6px;";
        const badge = document.createElement("span");
        badge.style.cssText = "background:#8e44ad; color:white; border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; flex-shrink:0;";
        badge.textContent = idx + 1;
        const nomeSpan = document.createElement("span");
        nomeSpan.style.cssText = "flex:1; font-size:13px; font-weight:600;";
        nomeSpan.textContent = f.nome;
        const upBtn = document.createElement("button");
        upBtn.type = "button"; upBtn.textContent = "↑";
        upBtn.style.cssText = "border:none; background:#ddd; border-radius:4px; padding:2px 7px; cursor:pointer; font-size:13px;";
        upBtn.disabled = idx === 0;
        upBtn.addEventListener("click", async () => {
          const prev = fList[idx - 1];
          await fetch("/api/fornitori", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: f.id, ordine: idx }) });
          await fetch("/api/fornitori", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: prev.id, ordine: idx + 1 }) });
          fList[idx - 1] = f; fList[idx] = prev;
          fornitoriCache[prodottoDescrizione] = fList;
          aggiornLista(fList);
        });
        const downBtn = document.createElement("button");
        downBtn.type = "button"; downBtn.textContent = "↓";
        downBtn.style.cssText = "border:none; background:#ddd; border-radius:4px; padding:2px 7px; cursor:pointer; font-size:13px;";
        downBtn.disabled = idx === fList.length - 1;
        downBtn.addEventListener("click", async () => {
          const next = fList[idx + 1];
          await fetch("/api/fornitori", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: f.id, ordine: idx + 2 }) });
          await fetch("/api/fornitori", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: next.id, ordine: idx + 1 }) });
          fList[idx + 1] = f; fList[idx] = next;
          fornitoriCache[prodottoDescrizione] = fList;
          aggiornLista(fList);
        });
        const delBtn = document.createElement("button");
        delBtn.type = "button"; delBtn.textContent = "✕";
        delBtn.style.cssText = "border:none; background:#e74c3c; color:white; border-radius:4px; padding:2px 7px; cursor:pointer; font-size:13px;";
        delBtn.addEventListener("click", async () => {
          if (!confirm(`Rimuovere ${f.nome}?`)) return;
          await fetch("/api/fornitori", { method: "DELETE", headers: authHeaders(), body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: f.id }) });
          fList.splice(idx, 1);
          fornitoriCache[prodottoDescrizione] = fList;
          aggiornLista(fList);
        });
        row.appendChild(badge); row.appendChild(nomeSpan); row.appendChild(upBtn); row.appendChild(downBtn); row.appendChild(delBtn);
        lista.appendChild(row);
      });
      const disponibili = tuttiFornitori.filter(t => !fList.find(f => f.id === t.id));
      if (disponibili.length > 0) {
        const addRow = document.createElement("div");
        addRow.style.cssText = "margin-top:8px; display:flex; gap:6px; align-items:center;";
        const sel = document.createElement("select");
        sel.style.cssText = "flex:1; padding:5px; border:1.5px solid #8e44ad; border-radius:6px; font-size:13px;";
        sel.innerHTML = `<option value="">— Aggiungi fornitore —</option>` + disponibili.map(f => `<option value="${f.id}">${f.nome}</option>`).join("");
        const addBtn = document.createElement("button");
        addBtn.type = "button"; addBtn.textContent = "＋";
        addBtn.style.cssText = "background:#8e44ad; color:white; border:none; border-radius:6px; padding:5px 12px; font-size:16px; cursor:pointer;";
        addBtn.addEventListener("click", async () => {
          if (!sel.value) return;
          const fId = parseInt(sel.value);
          await fetch("/api/fornitori", { method: "POST", headers: authHeaders(), body: JSON.stringify({ prodotto: prodottoDescrizione, fornitore_id: fId }) });
          const nuovo = tuttiFornitori.find(f => f.id === fId);
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

  // ─── Modal prodotto normale ───────────────────────────────────────────────
  async function openModal(prodotto) {
    selectedProdotto = prodotto;
    selectedReagente = null;
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
      const defaultId = prodotto.fornitore_selezionato ?? (fornitori.length > 0 ? fornitori[0].id : null);
      let fornitoreHTML = "";
      if (fornitori.length === 1) {
        fornitoreHTML = `<div style="margin-top:10px; font-size:13px; color:#555;">🏭 Fornitore: <strong>${fornitori[0].nome}</strong></div><input type="hidden" id="fornitoreSelezionato" value="${fornitori[0].id}">`;
      } else if (fornitori.length >= 2) {
        const btns = fornitori.map(f => {
          const active = f.id === defaultId;
          const style = active ? "background:#8e44ad; color:white; border-color:#8e44ad;" : "background:#f0f0f0; color:#333; border-color:#ccc;";
          return `<button type="button" class="fornitore-btn" data-id="${f.id}" style="padding:6px 14px; border:1.5px solid; border-radius:20px; font-size:13px; font-weight:bold; cursor:pointer; margin:3px; ${style}">${f.nome}</button>`;
        }).join("");
        fornitoreHTML = `<div style="margin-top:10px;"><span style="font-size:12px; color:#555; font-weight:bold;">🏭 Fornitore ordine:</span><br><div id="fornitoreBtns" style="margin-top:6px;">${btns}</div></div><input type="hidden" id="fornitoreSelezionato" value="${defaultId ?? ''}">`;
      }
      scortaHTML += `<br>In ordine:<div id="adminInOrdineContainerDynamic" class="admin-in-ordine-container"><button type="button" id="decInOrdine" class="qty-btn minus">−</button><span id="inOrdineValue" class="qty-number qty-blue">${inOrdineVal}</span><button type="button" id="incInOrdine" class="qty-btn plus">+</button></div>${fornitoreHTML}<br>Modifica scorta minima:<input type="number" id="scortaMinimaInput" value="${prodotto.ScortaMinima}" class="admin-scorta-input">`;
    }
    modalScorta.innerHTML = scortaHTML;

    if (isAdmin) {
      document.getElementById("decInOrdine").addEventListener("click", () => { const el = document.getElementById("inOrdineValue"); let v = parseInt(el.textContent); if (v > 0) el.textContent = v - 1; });
      document.getElementById("incInOrdine").addEventListener("click", () => { const el = document.getElementById("inOrdineValue"); el.textContent = parseInt(el.textContent) + 1; });
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
      const fornitori = fornitoriCache[prodotto.Descrizione] || [];
      modalScorta.appendChild(renderFornitoriAdmin([...fornitori], prodotto.Descrizione));
    }

    document.getElementById("counterSection").style.display = "";
    aggiornaBtn.style.display = "";
    counterValue.textContent = prodotto.Giacenza;
    aggiornaColore(document.getElementById("scortaMinSpan"));
    hideFixedBtns();
    modal.style.display = "block";
  }

  // ─── Modal reagente ───────────────────────────────────────────────────────
  async function openReagenteModal(gruppo) {
    // Assicura che i gruppi siano caricati prima di aprire il modal
    if (!window._gruppiEq || window._gruppiEq.length === 0) {
      await loadGruppiEq();
    }
    selectedReagente = gruppo;
    selectedProdotto = null;
    modalTitle.textContent = isAdmin ? "Reagente — Admin" : "Reagente";
    modalDescrizione.innerHTML = `<strong>${gruppo.nome_prodotto}</strong><br>
      <span style="color:#666; font-size:13px;">
        Giacenza: <strong style="color:${gruppo.giacenza < gruppo.scorta_minima ? 'red' : 'green'};">${gruppo.giacenza}</strong>
        ${gruppo.scorta_minima > 0 ? ` (min: ${gruppo.scorta_minima})` : ''}
      </span>`;

    document.getElementById("counterSection").style.display = "none";
    aggiornaBtn.style.display = "none";

    // Separa progressivi in 3 gruppi (già ordinati dall'API)
    const aperti    = gruppo.progressivi.filter(r => r.data_apertura && !r.data_chiusura);
    const nonAperti = gruppo.progressivi.filter(r => !r.data_apertura && !r.data_chiusura);
    const chiusi    = gruppo.progressivi.filter(r => r.data_chiusura);

    function rowHTML(r, style = "") {
      const scadenza = r.scadenza_sepack ? `<span style="color:#e74c3c; font-size:11px;">⏰ ${r.scadenza_sepack}</span>` : '';
      let statoLabel = '';
      let aperturLabel = '';
      if (r.data_chiusura) {
        statoLabel   = `<span style="color:#aaa; font-size:12px;">🔒 ${formatDataBreve(r.data_chiusura)}</span>`;
        aperturLabel = `<span style="color:#aaa; font-size:12px;">📂 ${formatDataBreve(r.data_apertura)}</span>`;
      } else if (r.data_apertura) {
        statoLabel   = `<span style="color:#e67e22; font-size:12px;">📂 ${formatDataBreve(r.data_apertura)}</span>`;
        aperturLabel = '';
      } else {
        statoLabel   = `<span style="color:#999; font-size:14px;">—</span>`;
        aperturLabel = '';
      }
      return `<div class="reagente-row" data-progressivo="${r.progressivo}"
        style="border:1px solid #ddd; border-radius:8px; padding:8px 12px; margin-bottom:6px; cursor:pointer; ${style}">
        <div style="display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:8px;">
          <strong style="font-size:14px; color:#2c3e50;">${r.progressivo}</strong>
          ${statoLabel}
          ${scadenza}
        </div>
        ${aperturLabel ? `<div style="margin-top:4px; font-size:11px; color:#aaa;">Aperta: ${aperturLabel}</div>` : ''}
      </div>`;
    }

    function sectionHeader(label, color) {
      return `<div style="font-size:10px; font-weight:700; color:${color}; letter-spacing:0.12em; text-transform:uppercase; margin:10px 0 6px;">${label}</div>`;
    }

    let html = '';

    if (aperti.length > 0) {
      html += sectionHeader('📂 Aperti', '#e67e22');
      aperti.forEach(r => { html += rowHTML(r); });
    }
    if (nonAperti.length > 0) {
      html += sectionHeader('⬜ Non ancora aperti', '#27ae60');
      nonAperti.forEach(r => { html += rowHTML(r); });
    }
    if (chiusi.length > 0) {
      html += sectionHeader('🔒 Chiusi', '#aaa');
      chiusi.forEach(r => { html += rowHTML(r, 'opacity:0.5;'); });
    }

    // Sezione in ordine — visibile solo in admin
    if (isAdmin) {
      html += `
        <div style="margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
          <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">🏭 Fornitore ordine</div>
          <select id="reagenteFornitoreSelect" style="width:100%; padding:6px; border:1.5px solid #8e44ad; border-radius:5px; font-size:13px;">
            <option value="">— Nessun fornitore selezionato —</option>
            ${tuttiFornitori.map(f => `<option value="${f.id}" ${gruppo.fornitore_selezionato === f.id ? 'selected' : ''}>${f.nome}</option>`).join('')}
          </select>
          <button id="salvaFornitoreReagenteBtn" style="margin-top:6px; padding:5px 14px; background:#8e44ad; color:white; border:none; border-radius:5px; font-size:13px; cursor:pointer;">Salva fornitore</button>
        </div>
        <div style="margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
          <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">In ordine</div>
          <div class="admin-in-ordine-container">
            <button type="button" id="decInOrdineR" class="qty-btn minus">−</button>
            <span id="inOrdineValueR" class="qty-number qty-blue">${gruppo.inordine || 0}</span>
            <button type="button" id="incInOrdineR" class="qty-btn plus">+</button>
          </div>
          <button id="salvaInOrdineBtn" style="margin-top:6px; padding:5px 14px; background:#8e44ad; color:white; border:none; border-radius:5px; font-size:13px; cursor:pointer;">Salva in ordine</button>
        </div>
        <div style="margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
          <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">Scorta minima</div>
          <input type="number" id="reagenteScortaMinima" value="${gruppo.scorta_minima}" style="width:80px; padding:5px; border:1.5px solid #00B4CC; border-radius:5px; font-size:15px; text-align:center;">
          <button id="salvaScortaBtn" style="margin-left:8px; padding:5px 14px; background:#16a085; color:white; border:none; border-radius:5px; font-size:13px; cursor:pointer;">Salva</button>
        </div>
        <div style="margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
          <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">🔗 Gruppo equivalenza</div>
          ${gruppo.in_gruppo
            ? `<div style="background:#fff3cd; border:1px solid #ffc107; border-radius:6px; padding:8px; font-size:12px; color:#856404;">
                Questo prodotto appartiene al gruppo <strong>${gruppo.gruppo_nome}</strong><br>
                Giacenza totale gruppo: <strong>${gruppo.gruppo_giacenza}</strong> / scorta minima: <strong>${gruppo.gruppo_scorta_minima}</strong>
                <br><button id="rimuoviDaGruppoBtn" style="margin-top:6px; padding:4px 10px; background:#e74c3c; color:white; border:none; border-radius:5px; font-size:11px; cursor:pointer;">Rimuovi dal gruppo</button>
              </div>`
            : `<div style="font-size:12px; color:#999; margin-bottom:6px;">Nessun gruppo assegnato — la scorta minima individuale è attiva.</div>
               <select id="gruppoSelect" style="width:100%; padding:6px; border:1.5px solid #16a085; border-radius:5px; font-size:13px;">
                 <option value="">— Seleziona gruppo —</option>
                 ${(window._gruppiEq || []).map(g => `<option value="${g.id}">${g.nome} (scorta: ${g.scorta_minima})</option>`).join('')}
               </select>
               <button id="aggiungiAGruppoBtn" style="margin-top:6px; padding:5px 14px; background:#16a085; color:white; border:none; border-radius:5px; font-size:13px; cursor:pointer;">Aggiungi al gruppo</button>
               <button id="nuovoGruppoBtn" style="margin-top:6px; margin-left:8px; padding:5px 14px; background:#8e44ad; color:white; border:none; border-radius:5px; font-size:13px; cursor:pointer;">+ Nuovo gruppo</button>`
          }
        </div>
          <input type="text" id="reagenteNotaInput" value="${gruppo.nota || ''}" placeholder="Es: Lavaggio celle, GC-MS..." style="width:100%; padding:6px; border:1.5px solid #2980b9; border-radius:5px; font-size:13px; box-sizing:border-box;">
          <button id="salvaNotaBtn" style="margin-top:6px; padding:5px 14px; background:#2980b9; color:white; border:none; border-radius:5px; font-size:13px; cursor:pointer;">Salva nota</button>
        </div>`;
    }

    modalScorta.innerHTML = html;

    // Listener progressivi
    modalScorta.querySelectorAll(".reagente-row").forEach(row => {
      row.addEventListener("mouseenter", () => row.style.background = "#f8f8f8");
      row.addEventListener("mouseleave", () => row.style.background = "");
      row.addEventListener("click", () => openProgressivoDetail(row.dataset.progressivo, gruppo));
    });

    if (isAdmin) {
      document.getElementById("decInOrdineR").addEventListener("click", () => {
        const el = document.getElementById("inOrdineValueR");
        let v = parseInt(el.textContent); if (v > 0) el.textContent = v - 1;
      });
      document.getElementById("incInOrdineR").addEventListener("click", () => {
        const el = document.getElementById("inOrdineValueR");
        el.textContent = parseInt(el.textContent) + 1;
      });
      // Gestione gruppo equivalenza
      if (gruppo.in_gruppo) {
        document.getElementById("rimuoviDaGruppoBtn")?.addEventListener("click", async () => {
          if (!confirm(`Rimuovere "${gruppo.nome_prodotto}" dal gruppo "${gruppo.gruppo_nome}"?`)) return;
          await fetch("/api/gruppi", {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ id: gruppo.gruppo_id, rimuovi_membri: [gruppo.nome_prodotto] })
          });
          gruppo.in_gruppo = false; gruppo.gruppo_id = null; gruppo.gruppo_nome = null;
          alert("Rimosso dal gruppo.");
          closeModal();
        });
      } else {
        document.getElementById("aggiungiAGruppoBtn")?.addEventListener("click", async () => {
          const sel = document.getElementById("gruppoSelect");
          if (!sel.value) { alert("Seleziona un gruppo."); return; }
          const res = await fetch("/api/gruppi", {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ id: parseInt(sel.value), aggiungi_membri: [gruppo.nome_prodotto] })
          });
          if (res.ok) {
            alert("Aggiunto al gruppo!");
            closeModal();
            await reloadReagenti();
          } else {
            alert("Errore nel salvataggio.");
          }
        });

        document.getElementById("nuovoGruppoBtn")?.addEventListener("click", async () => {
          const nome = prompt("Nome del nuovo gruppo:");
          if (!nome) return;
          const scorta = parseInt(prompt("Scorta minima del gruppo:") || "0");
          const res = await fetch("/api/gruppi", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ nome, scorta_minima: scorta, membri: [gruppo.nome_prodotto] })
          });
          const newGruppo = await res.json();
          window._gruppiEq = window._gruppiEq || [];
          window._gruppiEq.push(newGruppo);
          alert(`Gruppo "${nome}" creato!`);
          closeModal();
          await reloadReagenti();
        });
      }

      document.getElementById("salvaFornitoreReagenteBtn").addEventListener("click", async () => {
        const sel = document.getElementById("reagenteFornitoreSelect");
        const fId = sel.value ? parseInt(sel.value) : null;
        const fNome = sel.value ? sel.options[sel.selectedIndex].text : null;
        await fetch("/api/reagenti", {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ nome_prodotto: gruppo.nome_prodotto, fornitore_selezionato: fId })
        });
        gruppo.fornitore_selezionato = fId;
        gruppo.fornitore_selezionato_nome = fNome;
        patchReagenteLiInList(gruppo);
        alert("Fornitore salvato!");
      });

      document.getElementById("salvaInOrdineBtn").addEventListener("click", async () => {
        const val = parseInt(document.getElementById("inOrdineValueR").textContent);
        await fetch("/api/reagenti", {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ nome_prodotto: gruppo.nome_prodotto, inordine: val })
        });
        gruppo.inordine = val;
        patchReagenteLiInList(gruppo);
        alert("In ordine aggiornato!");
      });
      document.getElementById("salvaNotaBtn").addEventListener("click", async () => {
        const notaVal = document.getElementById("reagenteNotaInput").value.trim();
        await fetch("/api/reagenti", {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ nome_prodotto: gruppo.nome_prodotto, nota: notaVal })
        });
        gruppo.nota = notaVal;
        patchReagenteLiInList(gruppo);
        alert("Nota salvata!");
      });
      document.getElementById("salvaScortaBtn").addEventListener("click", async () => {
        const sm = parseInt(document.getElementById("reagenteScortaMinima").value);
        if (isNaN(sm)) return;
        await fetch("/api/reagenti", {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ progressivo: gruppo.progressivi[0].progressivo, scorta_minima: sm })
        });
        gruppo.scorta_minima = sm;
        gruppo.progressivi.forEach(p => p.scorta_minima = sm);
        alert("Scorta minima aggiornata!");
      });
    }

    hideFixedBtns();
    modal.style.display = "block";
  }

  // ─── Dettaglio progressivo ────────────────────────────────────────────────
  function openProgressivoDetail(progressivo, gruppo) {
    const r = gruppo.progressivi.find(x => x.progressivo === progressivo);
    if (!r) return;
    const aperto = !!r.data_apertura;

    let html = `
      <button id="backToGruppo" style="background:none; border:1px solid #ccc; border-radius:5px; padding:4px 10px; cursor:pointer; font-size:13px; margin-bottom:12px;">← Indietro</button>
      <div style="font-size:13px; color:#555; margin-bottom:10px;"><strong style="color:#2c3e50; font-size:16px;">${r.progressivo}</strong></div>
      <table style="width:100%; font-size:13px; border-collapse:collapse;">
        <tr><td style="color:#777; padding:4px 0; width:40%;">Tipo</td><td><strong>${r.tipo || '—'}</strong></td></tr>
        <tr><td style="color:#777; padding:4px 0;">ID Sepack</td><td><strong>${r.id_sepack || '—'}</strong></td></tr>
        <tr><td style="color:#777; padding:4px 0;">Fornitore</td><td><strong>${r.fornitore || '—'}</strong></td></tr>
        <tr><td style="color:#777; padding:4px 0;">Lotto</td><td><strong>${r.lotto || '—'}</strong></td></tr>
        <tr><td style="color:#777; padding:4px 0;">Scadenza</td><td><strong>${r.scadenza_sepack || '—'}</strong></td></tr>
        <tr><td style="color:#777; padding:4px 0;">Posizione</td><td><strong>${r.posizione || '—'}</strong></td></tr>
        <tr><td style="color:#777; padding:4px 0;">MISL</td><td><strong>${r.misl || '—'}</strong></td></tr>
        <tr><td style="color:#777; padding:4px 0;">Apertura</td><td><strong>${formatDataBreve(r.data_apertura)}</strong></td></tr>
      </table>`;

    if (!aperto && !r.data_chiusura) {
      // Bottone apri — solo se non ancora aperto e non chiuso
      html += `
        <div style="margin-top:16px; text-align:center;">
          <p style="font-size:13px; color:#555; margin-bottom:8px;">Data apertura:</p>
          <input type="date" id="dataAperturaInput" value="${toInputDate(new Date())}" style="padding:6px; border:1.5px solid #00B4CC; border-radius:5px; font-size:14px; margin-bottom:10px;">
          <br>
          <button id="apriBtn" style="background:#27ae60; color:white; border:none; border-radius:8px; padding:10px 24px; font-size:15px; font-weight:bold; cursor:pointer;">📂 Apri questa bottiglia</button>
        </div>`;
    } else if (aperto && !r.data_chiusura && !isAdmin) {
      // Bottone chiudi — solo utente normale, solo se aperta e non già chiusa
      html += `
        <div style="margin-top:12px; padding:8px 12px; background:#fef9e7; border-radius:6px; font-size:13px; color:#e67e22; font-weight:bold; margin-bottom:10px;">
          📂 Aperta il ${formatDataBreve(r.data_apertura)}
        </div>
        <div style="text-align:center;">
          <button id="chiudiBtn" style="background:#e74c3c; color:white; border:none; border-radius:8px; padding:10px 24px; font-size:15px; font-weight:bold; cursor:pointer;">🔒 Chiudi bottiglia (esaurita)</button>
        </div>`;
    } else if (aperto && !r.data_chiusura && isAdmin) {
      // Admin vede solo il badge apertura, la chiusura la fa dalla sezione modifica date
      html += `
        <div style="margin-top:12px; padding:8px 12px; background:#fef9e7; border-radius:6px; font-size:13px; color:#e67e22; font-weight:bold; margin-bottom:10px;">
          📂 Aperta il ${formatDataBreve(r.data_apertura)}
        </div>`;
    } else if (r.data_chiusura) {
      // Già chiusa
      html += `
        <div style="margin-top:12px; padding:8px 12px; background:#f9f9f9; border-radius:6px; font-size:13px; color:#aaa; font-weight:bold; margin-bottom:10px;">
          🔒 Chiusa il ${formatDataBreve(r.data_chiusura)}
        </div>`;
    }

    // Sezione admin
    if (isAdmin) {
      html += `
        <div style="margin-top:14px; border-top:1px solid #eee; padding-top:10px;">
          <div style="font-size:11px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Modifica — Admin</div>
          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end;">
            <div>
              <label style="font-size:12px; color:#555;">Data apertura</label><br>
              <input type="date" id="adminAperturaInput" value="${toInputDate(r.data_apertura)}" style="padding:5px; border:1.5px solid #00B4CC; border-radius:5px; font-size:13px;">
            </div>
            <div>
              <label style="font-size:12px; color:#555;">Data chiusura</label><br>
              <input type="date" id="adminChiusuraInput" value="${toInputDate(r.data_chiusura)}" style="padding:5px; border:1.5px solid #e74c3c; border-radius:5px; font-size:13px;">
            </div>
          </div>
          <button id="adminSalvaProgressivoBtn" style="margin-top:10px; background:#2980b9; color:white; border:none; border-radius:6px; padding:8px 18px; font-size:14px; cursor:pointer;">💾 Salva modifiche</button>
        </div>`;
    }

    modalScorta.innerHTML = html;
    document.getElementById("backToGruppo").addEventListener("click", () => openReagenteModal(gruppo));

    // Apri bottiglia
    if (!aperto && !r.data_chiusura) {
      document.getElementById("apriBtn").addEventListener("click", async () => {
        const dataVal = document.getElementById("dataAperturaInput").value;
        if (!dataVal) return;
        await fetch("/api/reagenti", {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ progressivo: r.progressivo, data_apertura: new Date(dataVal).toISOString() })
        });
        r.data_apertura = new Date(dataVal).toISOString();
        alert(`Bottiglia ${r.progressivo} aperta!`);
        openProgressivoDetail(progressivo, gruppo);
      });
    } else if (aperto && !r.data_chiusura && !isAdmin) {
      document.getElementById("chiudiBtn").addEventListener("click", async () => {
        if (r.data_chiusura) {
          alert("Questa bottiglia è già chiusa.");
          return;
        }
        if (!confirm(`Confermi la chiusura della bottiglia ${r.progressivo}? La giacenza diminuirà di 1.`)) return;
        const oggi = new Date().toISOString();
        const resp = await fetch("/api/reagenti", {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ progressivo: r.progressivo, data_chiusura: oggi })
        });
        const respJson = await resp.json();
        r.data_chiusura = oggi;
        gruppo.giacenza = Math.max(0, gruppo.giacenza - 1);

        // Mail solo se NON admin e giacenza scende sotto scorta minima
        if (!isAdmin && gruppo.scorta_minima > 0 && gruppo.giacenza < gruppo.scorta_minima) {
          const now = new Date();
          const dataOra = now.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          try {
            await emailjs.send('service_487ujbw', 'template_l5an0k5', {
              title: 'Reagente Sottoscorta',
              prodotto: gruppo.nome_prodotto,
              giacenza: gruppo.giacenza,
              scorta: gruppo.scorta_minima,
              time: dataOra,
              to_email: 'f.disabatino@sepack-lab.it'
            });
          } catch (e) { console.error('Errore email reagente:', e); }
        }

        patchReagenteLiInList(gruppo);
        closeModal();
      });
    }

    // Admin salva modifiche
    if (isAdmin) {
      document.getElementById("adminSalvaProgressivoBtn").addEventListener("click", async () => {
        const aperturaVal = document.getElementById("adminAperturaInput").value;
        const chiusuraVal = document.getElementById("adminChiusuraInput").value;
        const body = { progressivo: r.progressivo };
        body.data_apertura = aperturaVal ? new Date(aperturaVal).toISOString() : null;
        body.data_chiusura = chiusuraVal ? new Date(chiusuraVal).toISOString() : null;

        const resp = await fetch("/api/reagenti", {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(body)
        });

        const eraChiuso = !!r.data_chiusura;

        // Aggiorna il record nell'array gruppo.progressivi (stesso riferimento)
        r.data_apertura = body.data_apertura;
        r.data_chiusura = body.data_chiusura;

        // Aggiorna giacenza
        if (!eraChiuso && body.data_chiusura) {
          gruppo.giacenza = Math.max(0, gruppo.giacenza - 1);
        } else if (eraChiuso && !body.data_chiusura) {
          gruppo.giacenza++;
        }

        // Aggiorna header modal
        modalDescrizione.innerHTML = `<strong>${gruppo.nome_prodotto}</strong><br>
          <span style="color:#666; font-size:13px;">
            Giacenza: <strong style="color:${gruppo.giacenza < gruppo.scorta_minima ? 'red' : 'green'};">${gruppo.giacenza}</strong>
            ${gruppo.scorta_minima > 0 ? ` (min: ${gruppo.scorta_minima})` : ''}
          </span>`;

        patchReagenteLiInList(gruppo);

        // Riordina progressivi: aperti → non aperti → chiusi
        gruppo.progressivi.sort((a, b) => {
          const stato = x => x.data_chiusura ? 2 : x.data_apertura ? 0 : 1;
          const sa = stato(a), sb = stato(b);
          if (sa !== sb) return sa - sb;
          const parse = p => { const [y, n] = p.progressivo.split('-').map(Number); return y * 10000 + n; };
          return parse(a) - parse(b);
        });

        // Ritorna al modal del gruppo aggiornato
        openReagenteModal(gruppo);
      });
    }
  }

  // ─── Chiudi modal ─────────────────────────────────────────────────────────
  function closeModal() {
    modal.style.display = "none";
    selectedProdotto = null;
    selectedReagente = null;
    showFixedBtns();
  }

  modalCloseBtn.addEventListener("click", closeModal);
  window.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  // ─── Aggiorna prodotto normale ────────────────────────────────────────────
  decrementBtn.addEventListener("click", () => {
    let val = parseInt(counterValue.textContent);
    if (val > 0) counterValue.textContent = val - 1;
    const span = document.getElementById("scortaMinSpan");
    if (span) aggiornaColore(span);
  });
  incrementBtn.addEventListener("click", () => {
    counterValue.textContent = parseInt(counterValue.textContent) + 1;
    const span = document.getElementById("scortaMinSpan");
    if (span) aggiornaColore(span);
  });

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
        headers: authHeaders(),
        body: JSON.stringify({ descrizione: selectedProdotto.Descrizione, Giacenza: giacenzaNum, inordine: inOrdineNum, ScortaMinima: scortaMinimaNum, fornitore_selezionato: fornitoreId, isAdmin })
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

  // ─── Init ─────────────────────────────────────────────────────────────────
  Promise.all([loadProdotti(), loadReagenti(), loadGruppiEq()]);
});
