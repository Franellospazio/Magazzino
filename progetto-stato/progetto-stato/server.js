const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Apri il database SQLite
const db = new sqlite3.Database('./prodotti.sqlite', (err) => {
  if (err) return console.error(err.message);
  console.log('Database aperto correttamente');
});

// Endpoint per ricerca prodotti
app.get('/api/prodotti', (req, res) => {
  const query = req.query.query || '';
  db.all(
    "SELECT rowid as id, Descrizione, Giacenza, ScortaMinima FROM Prodotti WHERE LOWER(Descrizione) LIKE ?",
    [`%${query.toLowerCase()}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Endpoint per aggiornare Giacenza
app.patch('/api/prodotti/:id', (req, res) => {
  const { Giacenza } = req.body;
  const { id } = req.params;

  db.run(
    "UPDATE Prodotti SET Giacenza = ? WHERE rowid = ?",
    [Giacenza, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.listen(3000, () => console.log('Server avviato su http://localhost:3000'));
