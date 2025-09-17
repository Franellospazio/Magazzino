import { google } from "googleapis";

const SHEET_ID = "1Gizvtr_kqZnWBJOxq6cQoEA6Gki_Ro7s5UiymQrqvdA";
const TAB_NAME = "Prodotti";

// Carica la chiave dal JSON salvato come variabile ambiente
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// Importantissimo: sostituisci i \n con vere nuove linee
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export default async function handler(req, res) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    if (req.method === "GET") {
      // Legge tutte le righe della tabella (escludendo intestazione)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A2:C`,
      });

      const rows = response.data.values || [];
      const prodotti = rows.map((r, i) => ({
        id: i + 2, // riga nel foglio
        descrizione: r[0] || "",
        giacenza: Number(r[1] || 0),
        scorta_minima: Number(r[2] || 0),
      }));

      return res.status(200).json(prodotti);
    }

    if (req.method === "PATCH") {
      const { rowIndex, Giacenza } = req.body;
      if (!rowIndex || Giacenza === undefined) {
        return res.status(400).json({ error: "rowIndex e Giacenza richiesti" });
      }

      // Aggiorna la colonna B (Giacenza) nella riga specificata
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!B${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[Giacenza]],
        },
      });

      return res.status(200).json({ message: "Giacenza aggiornata" });
    }

    return res.status(405).json({ error: "Metodo non consentito" });
  } catch (err) {
    console.error("Errore API Google:", err);
    return res.status(500).json({ error: "Errore API Google", details: err.message });
  }
}
