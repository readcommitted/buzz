// Minimal static server: node scripts/serve.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 5173;
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const insideRoot = (file) => {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

const types = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.ico':'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  // Reject traversal, hidden files, Windows separators, and null bytes before I/O.
  if (urlPath.includes('\\') || urlPath.includes('\0') ||
      urlPath.split('/').some(segment => segment.startsWith('.'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const requestedPath = path.resolve(root, `.${urlPath}`);
  if (!insideRoot(requestedPath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.realpath(requestedPath, (realError, filePath) => {
    // Resolve symlinks before serving so links cannot expose files outside root.
    if (!realError && (!insideRoot(filePath) ||
        path.relative(root, filePath).split(path.sep).some(segment => segment.startsWith('.')))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (realError) filePath = requestedPath;
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      const type = types[ext] || 'application/octet-stream';
      fs.readFile(filePath, (e, data) => {
        if (e) { res.writeHead(500); res.end('Server error'); return; }
        res.writeHead(200, {'Content-Type': type});
        res.end(data);
      });
    });
  });
});

server.listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://localhost:${port}`));
