const crypto = require('node:crypto')
const fs = require('node:fs')
const directory = process.argv[2]
const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
const jwk = privateKey.export({ format: 'jwk' })
Object.assign(jwk, { kid: 'e2e', alg: 'ES256', use: 'sig', key_ops: ['sign', 'verify'] })
const secret = crypto.randomBytes(32).toString('hex')
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const unsigned = `${encode({ alg: 'ES256', typ: 'JWT', kid: 'e2e' })}.${encode({ role: 'service_role', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })}`
const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')
const env = [
  `E2E_JWT_SECRET=${secret}`,
  `E2E_JWT_KEYS='${JSON.stringify([jwk])}'`,
  `E2E_SERVICE_KEY=${unsigned}.${signature}`,
  `E2E_DIR=${directory}`,
].join('\n')
fs.writeFileSync(`${directory}/env`, env + '\n', { mode: 0o600 })
