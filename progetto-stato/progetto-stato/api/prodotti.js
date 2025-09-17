import fetch from 'node-fetch';

export default async function handler(req, res) {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const fileId = process.env.FILE_ID;
  const tableName = "Prodotti";

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
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (req.method === 'GET') {
    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/tables/${tableName}/rows`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await graphRes.json();
    res.status(200).json(data.value);
  } else if (req.method === 'PATCH') {
    const { rowIndex, Giacenza } = req.body;
    await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/tables/${tableName}/rows/${rowIndex}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [[Giacenza]] })
    });
    res.status(200).json({ success: true });
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
