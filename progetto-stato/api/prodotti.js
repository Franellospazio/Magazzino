const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const fileId = process.env.FILE_ID;
  const tableName = "Prodotti";

  try {
    // Ottieni token OAuth
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

    if (req.method === 'GET') {
      const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/tables/${tableName}/rows`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!graphRes.ok) {
        const text = await graphRes.text();
        return res.status(500).json({ error: `Errore Graph GET: ${text}` });
      }

      const data = await graphRes.json();
      return res.status(200).json(data.value);

    } else if (req.method === 'PATCH') {
      const { rowIndex, Giacenza } = req.body;

      const patchRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/tables/${tableName}/rows/${rowIndex}`, {
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
};
