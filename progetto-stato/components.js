// components.js — Componenti condivisi: RiempimentoWidget + CampanellinoAcquisto
// Include EmailJS dal chiamante: <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>

// ────────────────────────────────────────────────────────────────────
// CONFIG EMAILJS
// ────────────────────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY  = 'BnJLQgx-iX-2J45cy';
const EMAILJS_SERVICE_ID  = 'service_487ujbw';
// Usa il template esistente template_l5an0k5 ("Gestione giacenze magazzino")
// Aggiungi nel corpo del template su EmailJS le variabili: {{tipo}}, {{operatore}}, {{nota}}
// Le variabili {{prodotto}}, {{giacenza}}, {{time}} sono già presenti
const EMAILJS_TEMPLATE_ID = 'template_l5an0k5';

// ────────────────────────────────────────────────────────────────────
// RIEMPIMENTO WIDGET
// ────────────────────────────────────────────────────────────────────
// Crea un elemento DOM con indicatore SVG ad arco + bottoni step
// opts: { valore: 0|25|50|75|100|null, onSave: fn(nuovoValore) }
function creaRiempimentoWidget(opts = {}) {
  const { valore = null, onSave } = opts;
  const steps = [0, 25, 50, 75, 100];

  const wrap = document.createElement('div');
  wrap.className = 'riempimento-widget';
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px;';

  // SVG arco
  const svgSize = 36;
  const R = 14;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const circumference = 2 * Math.PI * R;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', svgSize);
  svg.setAttribute('height', svgSize);
  svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
  svg.style.transform = 'rotate(-90deg)';
  svg.title = valore !== null ? `${valore}% pieno` : 'Non impostato';

  // Traccia sfondo
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', cx); bgCircle.setAttribute('cy', cy);
  bgCircle.setAttribute('r', R);
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', '#e0e0e0');
  bgCircle.setAttribute('stroke-width', '4');
  svg.appendChild(bgCircle);

  // Traccia progresso
  const fgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fgCircle.setAttribute('cx', cx); fgCircle.setAttribute('cy', cy);
  fgCircle.setAttribute('r', R);
  fgCircle.setAttribute('fill', 'none');
  fgCircle.setAttribute('stroke-width', '4');
  fgCircle.setAttribute('stroke-linecap', 'round');
  fgCircle.setAttribute('stroke-dasharray', circumference);
  svg.appendChild(fgCircle);

  // Testo % al centro (ruotato per compensare il rotate(-90deg) del svg)
  const testo = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  testo.setAttribute('x', cx); testo.setAttribute('y', cy + 1);
  testo.setAttribute('text-anchor', 'middle');
  testo.setAttribute('dominant-baseline', 'middle');
  testo.setAttribute('transform', `rotate(90, ${cx}, ${cy})`);
  testo.setAttribute('font-size', '8');
  testo.setAttribute('font-weight', 'bold');
  testo.setAttribute('fill', '#555');
  svg.appendChild(testo);

  function aggiornaVisuale(v) {
    const pct = v !== null ? v / 100 : 0;
    const dash = circumference * pct;
    fgCircle.setAttribute('stroke-dashoffset', circumference - dash);
    // Colore: verde >50%, giallo 25-50%, rosso 0-25%
    let colore = '#4caf50';
    if (v === null)    { colore = '#bbb'; }
    else if (v <= 25)  { colore = '#e53935'; }
    else if (v <= 50)  { colore = '#fb8c00'; }
    testo.textContent = v !== null ? `${v}` : '?';
    fgCircle.setAttribute('stroke', colore);
    svg.title = v !== null ? `${v}% pieno` : 'Riempimento non impostato';
  }
  aggiornaVisuale(valore);

  // Bottoni step
  const btnWrap = document.createElement('div');
  btnWrap.className = 'riempimento-steps';
  btnWrap.style.cssText = 'display:none;gap:3px;align-items:center;';

  let corrente = valore;

  steps.forEach(step => {
    const btn = document.createElement('button');
    btn.textContent = step === 0 ? '∅' : `${step}`;
    btn.title = step === 0 ? 'Vuoto (0%)' : `${step}%`;
    btn.style.cssText = `
      width:28px;height:28px;border-radius:50%;border:2px solid #ccc;
      background:#fff;font-size:10px;font-weight:bold;cursor:pointer;
      transition:all .15s;padding:0;line-height:1;
    `;
    btn.dataset.step = step;

    function aggiornaBtnStyle() {
      const attivo = corrente === step;
      btn.style.background = attivo ? _coloreStep(step) : '#fff';
      btn.style.color = attivo ? '#fff' : '#555';
      btn.style.borderColor = attivo ? _coloreStep(step) : '#ccc';
      btn.style.transform = attivo ? 'scale(1.15)' : 'scale(1)';
    }
    aggiornaBtnStyle();

    btn.addEventListener('click', async () => {
      corrente = step;
      aggiornaVisuale(step);
      steps.forEach(s => {
        const b = btnWrap.querySelector(`[data-step="${s}"]`);
        if (b) {
          const att = corrente === s;
          b.style.background = att ? _coloreStep(s) : '#fff';
          b.style.color = att ? '#fff' : '#555';
          b.style.borderColor = att ? _coloreStep(s) : '#ccc';
          b.style.transform = att ? 'scale(1.15)' : 'scale(1)';
        }
      });
      if (onSave) await onSave(step);
    });

    btnWrap.appendChild(btn);
  });

  // Click sul SVG mostra/nasconde i bottoni
  svg.style.cursor = 'pointer';
  svg.addEventListener('click', () => {
    const aperto = btnWrap.style.display === 'flex';
    btnWrap.style.display = aperto ? 'none' : 'flex';
  });

  wrap.appendChild(svg);
  wrap.appendChild(btnWrap);
  return wrap;
}

function _coloreStep(s) {
  if (s === 0)   return '#e53935';
  if (s <= 25)   return '#ef5350';
  if (s <= 50)   return '#fb8c00';
  if (s <= 75)   return '#43a047';
  return '#1e88e5';
}

// ────────────────────────────────────────────────────────────────────
// CAMPANELLINO ACQUISTO
// ────────────────────────────────────────────────────────────────────
// opts: { nomeProdotto, giacenza, unita, tipoProdotto ('reagente'|'consumabile'), emailOperatore }
function creaCampanellino(opts = {}) {
  const { nomeProdotto, giacenza, unita = 'pz', tipoProdotto = 'reagente', emailOperatore = '' } = opts;

  const btn = document.createElement('button');
  btn.className = 'campanellino-btn';
  btn.innerHTML = '🔔';
  btn.title = 'Richiedi acquisto';
  btn.style.cssText = `
    background:none;border:none;font-size:18px;cursor:pointer;
    padding:2px 4px;border-radius:6px;transition:background .15s;
    line-height:1;
  `;
  btn.addEventListener('mouseenter', () => btn.style.background = '#fff3cd');
  btn.addEventListener('mouseleave', () => btn.style.background = 'none');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    _mostraModaleCampanellino({ nomeProdotto, giacenza, unita, tipoProdotto, emailOperatore, btn });
  });

  return btn;
}

function _mostraModaleCampanellino({ nomeProdotto, giacenza, unita, tipoProdotto, emailOperatore, btn }) {
  // Rimuovi modali precedenti
  document.querySelectorAll('.campanellino-modal-overlay').forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'campanellino-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.45);
    display:flex;align-items:center;justify-content:center;
    z-index:99999;padding:16px;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background:#fff;border-radius:16px;padding:24px;
    max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.2);
  `;

  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <span style="font-size:28px;">🔔</span>
      <div>
        <div style="font-weight:700;font-size:16px;">Richiedi acquisto</div>
        <div style="font-size:13px;color:#666;">${nomeProdotto}</div>
      </div>
    </div>
    <div style="background:#f5f5f5;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;">
      <strong>Tipo:</strong> ${tipoProdotto === 'reagente' ? 'Reagente' : 'Consumabile'}<br>
      <strong>Giacenza attuale:</strong> ${giacenza !== undefined && giacenza !== null ? `${giacenza} ${unita}` : 'non monitorata'}
    </div>
    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">
      Nota per il responsabile acquisti <span style="font-weight:400;color:#888;">(opzionale)</span>
    </label>
    <textarea id="campanellino-nota" rows="3" placeholder="es. Urgente — scorte quasi esaurite, serve entro venerdì"
      style="width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 10px;
             font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
    <div id="campanellino-status" style="margin-top:10px;font-size:13px;display:none;"></div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button id="campanellino-annulla" style="flex:1;padding:10px;border:1.5px solid #ddd;
        background:#fff;border-radius:8px;cursor:pointer;font-size:14px;">Annulla</button>
      <button id="campanellino-invia" style="flex:1;padding:10px;background:#e67e22;
        color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">
        📧 Invia richiesta
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Chiudi cliccando overlay
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  modal.querySelector('#campanellino-annulla').addEventListener('click', () => overlay.remove());

  modal.querySelector('#campanellino-invia').addEventListener('click', async () => {
    const nota = modal.querySelector('#campanellino-nota').value.trim();
    const inviaBtn = modal.querySelector('#campanellino-invia');
    const statusDiv = modal.querySelector('#campanellino-status');

    inviaBtn.disabled = true;
    inviaBtn.textContent = 'Invio…';
    statusDiv.style.display = 'none';

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          // Variabili compatibili con template_l5an0k5
          title: `🔔 Richiesta acquisto — ${nomeProdotto}`,
          prodotto: nomeProdotto,
          tipo: tipoProdotto === 'reagente' ? 'Reagente' : 'Consumabile',
          giacenza: giacenza !== undefined && giacenza !== null ? `${giacenza} ${unita}` : 'non monitorata',
          scorta: '',  // non applicabile per richiesta manuale
          operatore: emailOperatore || 'Operatore (non identificato)',
          nota: nota || '(nessuna nota)',
          time: new Date().toLocaleString('it-IT'),
        },
        EMAILJS_PUBLIC_KEY
      );

      // Feedback visivo sul campanellino
      if (btn) {
        btn.innerHTML = '✅';
        btn.title = 'Richiesta inviata';
        btn.style.opacity = '0.6';
        setTimeout(() => { btn.innerHTML = '🔔'; btn.title = 'Richiedi acquisto'; btn.style.opacity = '1'; }, 4000);
      }

      statusDiv.style.display = 'block';
      statusDiv.style.color = '#2e7d32';
      statusDiv.style.background = '#e8f5e9';
      statusDiv.style.padding = '8px 12px';
      statusDiv.style.borderRadius = '6px';
      statusDiv.textContent = '✅ Richiesta inviata! Il responsabile riceverà la mail.';
      inviaBtn.style.display = 'none';
      modal.querySelector('#campanellino-annulla').textContent = 'Chiudi';
    } catch (err) {
      statusDiv.style.display = 'block';
      statusDiv.style.color = '#c62828';
      statusDiv.style.background = '#ffebee';
      statusDiv.style.padding = '8px 12px';
      statusDiv.style.borderRadius = '6px';
      statusDiv.textContent = `❌ Errore invio: ${err?.text || err?.message || 'riprova'}`;
      inviaBtn.disabled = false;
      inviaBtn.textContent = '📧 Invia richiesta';
    }
  });
}
