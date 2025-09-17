// /api/prodotti.js
import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const TAB_NAME = 'Foglio1';
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export default async function handler(req, res) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A2:C`,
      });

      const rows = response.data.values || [];
      const prodotti = rows.map((row, index) => ({
        id: index + 2,
        descrizione: row[0] || '',
        giacenza: Number(row[1]) || 0,
        scorta_minima: Number(row[2]) || 0,
      }));

      return res.status(200).json(prodotti);

    } else if (req.method === 'PATCH') {
      const { rowIndex, Giacenza } = req.body;

      if (!rowIndex || Giacenza === undefined) {
        return res.status(400).json({ error: 'Parametri mancanti' });
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!B${rowIndex}`, 
        valueInputOption: 'RAW',
        requestBody: { values: [[Giacenza]] },
      });

      return res.status(200).json({ message: 'Giacenza aggiornata' });

    } else {
      res.setHeader('Allow', ['GET', 'PATCH']);
      return res.status(405).end(`Metodo ${req.method} non consentito`);
    }

  } catch (error) {
    console.error('Errore API Google:', error.response?.data || error.message);
    return res.status(500).json({ error: error.response?.data || error.message });
  }
}
