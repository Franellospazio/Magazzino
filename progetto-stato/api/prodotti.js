import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "prodotti.json");

function readProdotti() {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Errore lettura JSON:", err);
    return [];
  }
}

function writeProdotti(prodotti) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(prodotti, null, 2), "utf-8");
  } catch (err) {
    console.error("Errore scrittura JSON:", err);
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const prodotti = readProdotti();
    return res.status(200).json(prodotti);
  }

  if (req.method === "PATCH") {
    const { id, Giacenza } = req.body;

    if (!id || Giacenza === undefined) {
      return res.status(400).json({ error: "id e Giacenza richiesti" });
    }

    const prodotti = readProdotti();
    const index = prodotti.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Prodotto non trovato" });
    }

    prodotti[index].giacenza = Number(Giacenza);
    writeProdotti(prodotti);

    return res.status(200).json({ message: "Giacenza aggiornata" });
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}
