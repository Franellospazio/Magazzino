import fetch from "node-fetch";

export default async function handler(req, res) {
  const SHEET_ID = process.env.SHEET_ID;
  const API_KEY = process.env.GOOGLE_API_KEY;
  const TAB_NAME = "Magazzino"; // nome del foglio/tab all'interno dello spreadsheet

  try {
    if (req.method === "GET") {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB_NAME}?key=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        return res.status(500).json({ error: `Errore Google Sheets GET: ${text}` });
      }

      const data = await response.json();
      const [header, ...rows] = data.values;
      const result = rows.map((row, index) => ({
        id: index,
        descrizione: row[0],
        giacenza: Number(row[1]),
        scorta_minima: Number(row[2])
      }));

      return res.status(200).json(result);
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

  } catch (err) {
    console.error("Errore API:", err);
    return res.status(500).json({ error: err.message });
  }
}
