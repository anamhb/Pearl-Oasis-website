import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4174);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

http
  .createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const relative = decodeURIComponent(pathname === '/' ? 'index.html' : pathname).replace(/^\/+/, '');
    const file = path.resolve(root, relative);

    if (!file.toLowerCase().startsWith(root.toLowerCase() + path.sep)) {
      response.writeHead(403).end();
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'content-type': types[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Frame lab: http://127.0.0.1:${port}/`);
  });
