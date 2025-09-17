// pages/api/prodotti.js
import { google } from "googleapis";

const SHEET_ID = "IL_TUO_SHEET_ID"; // sostituisci con il tuo
const TAB_NAME = "Prodotti"; // nome del tab del foglio

export default async function handler(req, res) {
  try {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    if (req.method === "GET") {
      // Legge tutti i prodotti
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A2:D`, // supponendo colonne: ID,Descrizione,Giacenza,Scorta
      });

      const rows = result.data.values || [];
      const prodotti = rows.map((row, i) => ({
        id: i + 1,
        descrizione: row[1] || "",
        giacenza: Number(row[2] || 0),
        scorta_minima: Number(row[3] || 0),
      }));

      return res.status(200).json(prodotti);
    }

    if (req.method === "PATCH") {
      const { rowIndex, Giacenza } = req.body;

      if (typeof rowIndex !== "number" || typeof Giacenza !== "number") {
        return res.status(400).json({ error: "Parametri non validi" });
      }

      // +2 perché la prima riga è header e gli indici partono da 0
      const range = `${TAB_NAME}!C${rowIndex + 2}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [[Giacenza]],
        },
      });

      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("Errore API:", err);
    res.status(500).json({ error: "Errore interno API" });
  }
}
