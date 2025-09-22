document.addEventListener('DOMContentLoaded', () => {
  const accessModal = document.createElement('div');
  accessModal.innerHTML = `
    <div id="accessModal" style="
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:9999;
    ">
      <div style="background:#fff;padding:30px;border-radius:10px;text-align:center;">
        <h2>Accesso richiesto</h2>
        <p>Inserisci la tua email aziendale per richiedere accesso:</p>
        <input type="email" id="accessEmail" placeholder="email@azienda.com" style="padding:8px;width:80%;margin-bottom:10px;">
        <button id="sendAccessBtn" style="padding:10px 20px;">Invia richiesta</button>
        <p id="accessMsg" style="margin-top:10px;color:red;"></p>
      </div>
    </div>
  `;
  document.body.appendChild(accessModal);

  const modalDiv = document.getElementById('accessModal');
  const emailInput = document.getElementById('accessEmail');
  const sendBtn = document.getElementById('sendAccessBtn');
  const msgP = document.getElementById('accessMsg');

  async function checkAccess() {
    const ip = await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip);
    const res = await fetch('/api/verifica-accesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    const data = await res.json();
    if (data.approved) {
      modalDiv.style.display = 'none';
    } else {
      modalDiv.style.display = 'flex';
    }
  }

  sendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) { msgP.textContent = 'Inserisci un email valida'; return; }

    const ip = await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip);

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

  checkAccess(); // verifica all'avvio
});
