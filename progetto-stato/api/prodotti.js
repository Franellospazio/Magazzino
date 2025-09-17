// /api/prodotti.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const SHEET_ID = process.env.SHEET_ID;        // ID del foglio Google
  const API_KEY = process.env.GOOGLE_API_KEY;   // API Key creata su Google Cloud
  const TAB_NAME = "Foglio1";                   // nome del tab (metti quello esatto!)

  try {
    if (req.method === "GET") {
      // URL API Google Sheets
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB_NAME}?key=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        return res.status(500).json({ error: `Errore Google Sheets GET: ${text}` });
      }

      const data = await response.json();

      // Prima riga come header, le altre come dati
      const [header, ...rows] = data.values || [];
      const result = rows.map((row, index) => ({
        id: index,
        descrizione: row[0] || "",
        giacenza: Number(row[1] || 0),
        scorta_minima: Number(row[2] || 0),  // colonna C
      }));

      return res.status(200).json(result);

    } else if (req.method === "PATCH") {
      const { rowIndex, Giacenza } = await req.json();

      if (typeof rowIndex !== "number" || typeof Giacenza !== "number") {
        return res.status(400).json({ error: "rowIndex e Giacenza devono essere numeri" });
      }

      const patchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB_NAME}!B${rowIndex + 1}?valueInputOption=RAW&key=${API_KEY}`;
      const patchRes = await fetch(patchUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [[Giacenza]] })
      });

      if (!patchRes.ok) {
        const text = await patchRes.text();
        return res.status(500).json({ error: `Errore Google Sheets PATCH: ${text}` });
      }

      return res.status(200).json({ success: true });

    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

  } catch (err) {
    console.error("Errore API:", err);
    return res.status(500).json({ error: err.message });
  }
}
