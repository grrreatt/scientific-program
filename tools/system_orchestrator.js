#!/usr/bin/env node

/*
  System Orchestrator (JS)
  - status: run quick checks (build, lint)
  - run-check <component>: deep diagnostics per subsystem
  Artifacts written to artifacts/ with timestamped logs.
*/

const { execSync } = require('child_process')
const { existsSync, mkdirSync, writeFileSync, readFileSync } = require('fs')
const path = require('path')

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', cwd: opts.cwd })
    return { code: 0, stdout: out, stderr: '' }
  } catch (e) {
    return { code: e.status || 1, stdout: String(e.stdout || ''), stderr: String(e.stderr || e) }
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function artifactPath(name) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(process.cwd(), 'artifacts')
  ensureDir(dir)
  return path.join(dir, `${ts}__${name}.log`)
}

function quickStatus() {
  const results = {}
  const build = run('npm run build')
  results.build = { code: build.code }
  writeFileSync(artifactPath('build'), build.stdout + '\n' + build.stderr)

  const lint = run('npm run lint')
  results.lint = { code: lint.code }
  writeFileSync(artifactPath('lint'), lint.stdout + '\n' + lint.stderr)

  // Basic schema files presence
  const schemaFiles = [
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/002_restructure_for_time_slots.sql',
    'supabase/migrations/003_restructure_halls_per_day.sql'
  ]
  results.schema = schemaFiles.every(f => existsSync(path.join(process.cwd(), f)))

  console.log(JSON.stringify(results, null, 2))
  return results
}

function runComponentDiagnostics(component) {
  const out = []
  const push = (s) => out.push(s)
  push(`Diagnostics for ${component}`)

  switch (component) {
    case 'engine': {
      const files = [
        'src/app/(admin)/edit-sessions/page.tsx',
        'src/components/session-form.tsx',
        'src/lib/supabase/client.ts'
      ]
      for (const f of files) {
        try { push(`FILE: ${f}\n` + readFileSync(path.join(process.cwd(), f), 'utf8').slice(0, 5000)) } catch {}
      }
      const needed = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
      const envReport = needed.map(k => `${k}=${process.env[k] ? 'present' : 'missing'}`).join('\n')
      push(envReport)
      break
    }
    case 'people': {
      const files = ['src/app/(admin)/participants/page.tsx']
      for (const f of files) { try { push(`FILE: ${f}\n` + readFileSync(path.join(process.cwd(), f), 'utf8').slice(0, 5000)) } catch {} }
      break
    }
    case 'tyres': {
      const files = ['src/components/ui/combobox.tsx', 'src/components/ui/time-picker.tsx']
      for (const f of files) { try { push(`FILE: ${f}\n` + readFileSync(path.join(process.cwd(), f), 'utf8').slice(0, 4000)) } catch {} }
      break
    }
    case 'suspension': {
      const f = 'src/lib/supabase/realtime.ts'
      try { push(`FILE: ${f}\n` + readFileSync(path.join(process.cwd(), f), 'utf8').slice(0, 6000)) } catch {}
      break
    }
    case 'doors': {
      const files = ['src/app/(admin)/dashboard/page.tsx', 'src/app/public-program/page.tsx']
      for (const f of files) { try { push(`FILE: ${f}\n` + readFileSync(path.join(process.cwd(), f), 'utf8').slice(0, 4000)) } catch {} }
      break
    }
    case 'seats': {
      const files = ['src/components/session-form.tsx']
      for (const f of files) { try { push(`FILE: ${f}\n` + readFileSync(path.join(process.cwd(), f), 'utf8').slice(0, 4000)) } catch {} }
      break
    }
    default:
      push('Unknown component')
  }

  const logFile = artifactPath(`diagnostics__${component}`)
  writeFileSync(logFile, out.join('\n\n'))
  console.log(`Wrote diagnostics to: ${logFile}`)
}

function main() {
  const [, , cmd, arg] = process.argv
  if (cmd === 'status') {
    quickStatus()
    return
  }
  if (cmd === 'run-check') {
    const valid = ['engine','tyres','suspension','doors','seats','people']
    if (!valid.includes(arg)) {
      console.error('Usage: node tools/system_orchestrator.js run-check <engine|tyres|suspension|doors|seats|people>')
      process.exit(1)
    }
    runComponentDiagnostics(arg)
    return
  }
  console.log('Usage:')
  console.log('  node tools/system_orchestrator.js status')
  console.log('  node tools/system_orchestrator.js run-check <component>')
}

main()


