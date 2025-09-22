document.addEventListener("DOMContentLoaded", () => {
  console.log("Accesso.js caricato ✅");

  // Recupera IP pubblico
  async function getIP() {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (!res.ok) throw new Error("Errore IP");
      const data = await res.json();
      return data.ip;
    } catch (e) {
      console.error("Errore recupero IP:", e);
      return null;
    }
  }

  // Mostra il form di richiesta email
  function showRequestForm(ip) {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <h2>Richiesta Accesso</h2>
        <p>Inserisci la tua email aziendale per richiedere l’accesso.</p>
        <input type="email" id="emailInput" placeholder="nome@azienda.com"
               style="padding:10px;font-size:16px;width:250px;margin:10px 0;" />
        <button id="sendAccessBtn"
                style="padding:10px 20px;font-size:16px;cursor:pointer;">Invia</button>
        <p id="accessMsg" style="margin-top:10px;color:red;"></p>
      </div>
    `;

    const sendBtn = document.getElementById("sendAccessBtn");
    const emailInput = document.getElementById("emailInput");
    const msgP = document.getElementById("accessMsg");

    sendBtn.addEventListener("click", async () => {
      console.log("Click su Invia rilevato ✅");

      const email = emailInput.value.trim();
      if (!email) {
        msgP.textContent = "Inserisci un'email valida";
        return;
      }

      try {
        const res = await fetch("/api/richiesta-accesso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ip })
        });

        const data = await res.json();
        console.log("Risposta API:", res.status, data);

        if (!res.ok) {
          msgP.textContent = data.error || "Errore invio richiesta.";
        } else {
          msgP.style.color = "green";
          msgP.textContent = "Richiesta inviata ✅ Attendi approvazione.";
        }
      } catch (err) {
        console.error("Errore fetch richiesta-accesso:", err);
        msgP.textContent = "Errore server.";
      }
    });
  }

  // Verifica accesso al caricamento
  async function verificaAccesso() {
    const ip = await getIP();
    if (!ip) {
      document.body.innerHTML = "<h2>Impossibile ottenere il tuo IP.</h2>";
      return;
    }

    try {
      const res = await fetch("/api/verifica-accesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });

      const data = await res.json();
      console.log("Risposta verifica-accesso:", res.status, data);

      if (!res.ok || !data.allowed) {
        // Non approvato → mostro form
        showRequestForm(ip);
      } else {
        console.log("Accesso approvato ✅");
        // lascia l'utente sulla pagina normale
      }
    } catch (err) {
      console.error("Errore verifica-accesso:", err);
      showRequestForm("unknown");
    }
  }

  // Avvio
  verificaAccesso();
});
