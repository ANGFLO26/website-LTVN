import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const output = 'artifacts/final-01-fixes-2026-10-03'
for (const file of ['admin/src/services/api.ts', 'api/src/modules/news-events/news-events.service.ts', 'src/context/DataContext.tsx']) {
  const destination = path.join(output, 'source-before', file)
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(file, destination)
}
const runner = await readFile('artifacts/final-01-2026-10-03/run-regressions.mjs', 'utf8')
await writeFile(path.join(output, 'run-regressions.mjs'), runner.replaceAll('artifacts/final-01-2026-10-03', output))
console.log('Saved three production source baselines; copied runner with new artifact output only')
