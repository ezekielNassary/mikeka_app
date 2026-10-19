export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
  res.status(status).json({ error: err.message || 'Internal server error' });
}
