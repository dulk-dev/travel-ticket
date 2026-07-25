import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const assetsDir = 'dist-minitool/assets'
const jsFile = readdirSync(assetsDir).find((f) => f.endsWith('.js'))
if (!jsFile) {
  console.error('[scan] no JS file found in', assetsDir)
  process.exit(1)
}
const s = readFileSync(join(assetsDir, jsFile), 'utf8')

const checks = [
  ['createElement(a)', /createElement\(['"`]a['"`]\)/g],
  ['.download=', /\.download\s*=/g],
  ['target=_blank', /target\s*=\s*['"`]_blank/g],
  ['iframe/object', /<iframe|<object/g],
  ['inline script tag', /<script(?![^>]*src)/g],
  ['external href', /href\s*=\s*['"`]https?:/g],
  ['external src', /src\s*=\s*['"`]https?:/g],
  ['eval(', /eval\(/g],
  ['new Function', /new Function\(/g],
  ['WebAssembly', /WebAssembly\./g],
  ['window.open', /window\.open\(/g],
  ['window.prompt', /window\.prompt\(/g],
  ['location.href=', /location\.href\s*=/g],
  ['location.assign', /location\.assign\(/g],
  ['fetch(', /fetch\(/g],
  ['XMLHttpRequest', /XMLHttpRequest/g],
  ['WebSocket', /new WebSocket/g],
  ['EventSource', /new EventSource/g],
  ['Worker', /new Worker\(/g],
  ['serviceWorker', /serviceWorker\.register/g],
  ['clipboard', /navigator\.clipboard/g],
  ['geolocation', /navigator\.geolocation/g],
  ['execCommand', /execCommand\(/g],
]

let fail = 0
for (const [name, re] of checks) {
  const m = s.match(re)
  if (m) {
    console.log(`[HIT] ${name}: ${m.length} matches`)
    fail++
  }
}
if (fail === 0) console.log('[PASS] all forbidden patterns absent')
else console.log(`[FAIL] ${fail} patterns hit`)
