// /api/prodotti.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const tenantId = process.env.TENANT_ID;      // Es. a61a1fd9-a117-44c8-8ce6-d539aa12b1aa
  const clientId = process.env.CLIENT_ID;      // ID applicazione Azure
  const clientSecret = process.env.CLIENT_SECRET;  // Segreto generato su Azure
  const siteId = process.env.SITE_ID;          // SITE_ID SharePoint/OneDrive
  const fileId = process.env.FILE_ID;          // ID file Excel
  const tableName = "Prodotti";                // Nome tabella nel file Excel

  try {
    // Ottieni token OAuth app-only
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        scope: 'https://graph.microsoft.com/.default',
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return res.status(500).json({ error: `Errore token OAuth: ${text}` });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // --- GET: leggere i dati della tabella ---
    if (req.method === 'GET') {
      const graphRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${fileId}/workbook/tables/${tableName}/rows`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!graphRes.ok) {
        const text = await graphRes.text();
        return res.status(500).json({ error: `Errore Graph GET: ${text}` });
      }

      const data = await graphRes.json();
      // Restituisci solo l'array dei valori
      const rows = data.value.map(r => {
        return {
          descrizione: r.values[0][0],
          giacenza: r.values[0][1],
          scorta_minima: r.values[0][2]
        };
      });

      return res.status(200).json(rows);

    // --- PATCH: aggiornare la giacenza ---
    } else if (req.method === 'PATCH') {
      const { rowIndex, Giacenza } = req.body;

      const patchRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${fileId}/workbook/tables/${tableName}/rows/${rowIndex}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [[Giacenza]] })
      });

      if (!patchRes.ok) {
        const text = await patchRes.text();
        return res.status(500).json({ error: `Errore Graph PATCH: ${text}` });
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
