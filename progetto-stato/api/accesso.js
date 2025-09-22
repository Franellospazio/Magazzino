// accesso.js
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "userApprovedIP";

  async function getUserIP() {
    // Richiesta IP pubblico tramite servizio esterno
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip;
    } catch (err) {
      console.error("Impossibile ottenere IP:", err);
      return null;
    }
  }

  async function checkApproval(ip) {
    // Chiama un endpoint API per verificare se questo IP è approvato
    try {
      const res = await fetch("/api/check-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      return data.approved;
    } catch (err) {
      console.error("Errore controllo approvazione IP:", err);
      return false;
    }
  }

  async function requestApproval(email, ip) {
    // Chiama un endpoint API per inviare la richiesta di approvazione via email
    try {
      const res = await fetch("/api/request-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ip })
      });
      const data = await res.json();
      if (data.success) alert("Richiesta inviata! Attendi approvazione.");
      else alert("Errore invio richiesta.");
    } catch (err) {
      console.error("Errore richiesta approvazione:", err);
      alert("Errore invio richiesta.");
    }
  }

  async function initAccess() {
    let ip = await getUserIP();
    if (!ip) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === ip) {
      console.log("IP già approvato, accesso normale");
      return; // accesso già approvato
    }

    const approved = await checkApproval(ip);
    if (approved) {
      localStorage.setItem(STORAGE_KEY, ip);
      console.log("IP approvato dal server");
      return;
    }

    // IP non approvato → chiedi email
    const email = prompt("Inserisci la tua mail aziendale per richiedere accesso:");
    if (!email) {
      alert("Email richiesta per procedere");
      return;
    }

    await requestApproval(email, ip);
  }

  initAccess();
});
