import { createServer, request } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../dist/', import.meta.url))
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:5173')
  if (url.pathname.startsWith('/web/')) {
    const upstream = request('http://localhost:5000' + req.url, { method: req.method, headers: req.headers }, response => {
      res.writeHead(response.statusCode, response.headers)
      response.on('error', () => res.destroy())
      response.on('aborted', () => res.destroy())
      response.pipe(res)
    })
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() })
    req.pipe(upstream); res.on('close', () => upstream.destroy()); return
  }
  const appPath = /^\/(?:trips(?:\/[^/]+)?|callback|signed-out)?$/.test(url.pathname)
  const path = appPath ? resolve(root, 'index.html') : resolve(root, '.' + decodeURIComponent(url.pathname))
  if (!path.startsWith(root)) { res.writeHead(404); res.end(); return }
  try { const body = await readFile(path); res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(body) }
  catch { res.writeHead(404); res.end() }
})
server.listen(5173, '127.0.0.1', () => console.info('Static validation server listening on localhost:5173'))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close())
