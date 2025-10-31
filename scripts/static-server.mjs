import http from 'node:http'
import { createReadStream, statSync, existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = normalize(join(__filename, '..'))

const PORT = process.env.PLAYWRIGHT_STATIC_PORT ? Number(process.env.PLAYWRIGHT_STATIC_PORT) : 4000
const ROOT = normalize(join(__dirname, '..', 'public-site'))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

function resolvePath(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0])
  if (p.endsWith('/')) p = p + 'index.html'
  if (p === '') p = '/index.html'
  return normalize(join(ROOT, p))
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || '/')
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  let target = filePath
  if (!existsSync(target)) {
    // try adding trailing slash index.html
    if (!target.endsWith('index.html')) {
      const alt = target.replace(/$/,'/index.html')
      if (existsSync(alt)) {
        target = alt
      }
    }
  }
  if (!existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
    return
  }
  const ext = extname(target)
  const type = MIME[ext] || 'application/octet-stream'
  try {
    const stat = statSync(target)
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size })
    createReadStream(target).pipe(res)
  }
  catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Server Error')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`Static server listening at http://127.0.0.1:${PORT}`)
})


