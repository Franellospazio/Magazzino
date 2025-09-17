import { google } from "googleapis";

const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // ID del tuo foglio
const TAB_NAME = "Prodotti";

const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Lettura di tutti i prodotti
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TAB_NAME}!A2:C`,
      });

      const rows = result.data.values || [];
      const prodotti = rows.map((r, index) => ({
        id: index + 2, // riga reale nel foglio
        descrizione: r[0] || "",
        giacenza: Number(r[1] || 0),
        scorta_minima: Number(r[2] || 0),
      }));

      return res.status(200).json(prodotti);
    }

    if (req.method === "PATCH") {
      const { rowIndex, Giacenza } = req.body;
      if (!rowIndex || Giacenza == null) {
        return res.status(400).json({ error: "Dati mancanti" });
      }

      // Aggiorna colonna B (Giacenza)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TAB_NAME}!B${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [[Giacenza]] },
      });

      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).end(`Metodo ${req.method} non consentito`);
  } catch (err) {
    console.error("Errore API Google:", err);
    return res.status(500).json({ error: "Errore API Google", details: err.message });
  }
}
