export default function handler(req, res) {
  res.status(200).json({
    message: "Auth API is reachable",
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url
  });
} 