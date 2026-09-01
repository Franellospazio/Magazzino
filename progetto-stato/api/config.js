// api/config.js — espone configurazione pubblica al frontend
export default function handler(req, res) {
  res.status(200).json({
    authEnabled: process.env.AUTH_ENABLED === 'true'
  });
}
