import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('dist')
const port = Number(process.env.PORT || 4173)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}
await stat(path.join(root, 'index.html'))
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader(
    'Permissions-Policy',
    'accelerometer=(self), gyroscope=(self), screen-wake-lock=(self)',
  )
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
  )
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405)
    response.end()
    return
  }
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    )
    if (pathname.includes('\\') || pathname.includes('\0'))
      throw new Error('Invalid path')
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
    const file = path.resolve(root, relative)
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid path')
    const body = await readFile(file)
    response.setHeader(
      'Content-Type',
      types[path.extname(file)] || 'application/octet-stream',
    )
    response.writeHead(200)
    response.end(request.method === 'HEAD' ? undefined : body)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})
server.listen(port, '127.0.0.1', () =>
  console.log('Heads Up test build: http://127.0.0.1:' + port),
)
