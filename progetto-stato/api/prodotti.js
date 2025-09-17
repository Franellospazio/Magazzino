// /api/prodotti.js
import { google } from "googleapis";

export default async function handler(req, res) {
  const SHEET_ID = process.env.SHEET_ID; // ID del foglio Google
  const TAB_NAME = "Foglio1";             // nome del tab (metti quello esatto!)
  const KEY_FILE = "./service-account.json"; // path al JSON del service account

  try {
    // Autenticazione con service account
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    if (req.method === "GET") {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: TAB_NAME,
      });

      const [header, ...rows] = response.data.values || [];
      const result = rows.map((row, index) => ({
        id: index,
        descrizione: row[0] || "",
        giacenza: Number(row[1] || 0),
        scorta_minima: Number(row[2] || 0)
      }));

      return res.status(200).json(result);

    } else if (req.method === "PATCH") {
      const { rowIndex, Giacenza } = await req.json();

      if (typeof rowIndex !== "number" || typeof Giacenza !== "number") {
        return res.status(400).json({ error: "rowIndex e Giacenza devono essere numeri" });
      }

      const range = `${TAB_NAME}!B${rowIndex + 2}`; // +2 perché riga 1 è header
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: { values: [[Giacenza]] },
      });

      return res.status(200).json({ success: true });

    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

  } catch (err) {
    console.error("Errore API:", err);
    return res.status(500).json({ error: err.message });
  }
}
