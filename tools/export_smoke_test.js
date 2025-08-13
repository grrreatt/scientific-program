#!/usr/bin/env node

import('node:fs').then(async ({ writeFileSync }) => {
  const url = process.env.APP_URL || 'http://localhost:3000'
  const res = await fetch(`${url}/api/export`)
  if (!res.ok) {
    const body = await res.text()
    console.error('Export failed', res.status, body)
    process.exit(1)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const path = `artifacts/export_smoke_${Date.now()}.xlsx`
  writeFileSync(path, buf)
  console.log(JSON.stringify({ ok: true, bytes: buf.length, path }))
}).catch(e => { console.error(e); process.exit(1) })


