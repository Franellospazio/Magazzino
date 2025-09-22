document.addEventListener("DOMContentLoaded", async () => {
  const ADMIN_APPROVED = false;
  const IP_API = "https://api.ipify.org?format=json"; // per rilevare IP pubblico

  // Funzione per ottenere IP
  async function getUserIP() {
    try {
      const res = await fetch(IP_API);
      if (!res.ok) throw new Error("Impossibile ottenere IP");
      const data = await res.json();
      return data.ip;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  // Funzione per inviare richiesta di accesso
  async function inviaRichiesta(email, ip) {
    try {
      const res = await fetch("/api/richiesta-accesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ip })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore invio richiesta");
      alert("Richiesta inviata all'amministratore. Attendi approvazione.");
    } catch (err) {
      console.error(err);
      alert("Errore invio richiesta accesso. Riprova.");
    }
  }

  // Funzione per verificare accesso
  async function verificaAccesso(ip) {
    try {
      const res = await fetch("/api/verifica-accesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.accesso === true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // Flusso principale
  const userIP = await getUserIP();
  if (!userIP) return;

  // Verifica se IP è approvato
  const accesso = await verificaAccesso(userIP);
  if (accesso) {
    console.log("IP approvato: modalità admin abilitata se conosci password.");
    return; // continua con script principale normalmente
  }

  // Se non approvato, chiedi email e invia richiesta
  let email = prompt("Inserisci la tua email aziendale per richiesta accesso:");
  if (!email) {
    alert("Email richiesta per procedere. Funzionalità admin non abilitata.");
    return;
  }

  await inviaRichiesta(email, userIP);

  // Messaggio all’utente
  alert("Attendi approvazione dell'amministratore. Potrai solo vedere i prodotti in lettura.");
})();
