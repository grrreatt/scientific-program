#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { writeFileSync } = require('fs')

async function main() {
  const url = process.env.APP_URL || 'http://localhost:3000'
  const res = await fetch(`${url}/api/export/workshops?filter=all`)
  if (!res.ok) {
    const body = await res.text()
    console.error('Workshop export failed', res.status, body)
    process.exit(1)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const path = `artifacts/workshop_export_${Date.now()}.xlsx`
  writeFileSync(path, buf)
  console.log(JSON.stringify({ ok: true, bytes: buf.length, path }))
}

main().catch((e) => { console.error(e); process.exit(1) })


