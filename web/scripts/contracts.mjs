import openapiTS, { astToString } from 'openapi-typescript'
import { readFile, writeFile } from 'node:fs/promises'
let drift = false
for (const domain of ['trip', 'item']) {
  const generated = astToString(await openapiTS(new URL(`../../api/spec/${domain}.yml`, import.meta.url), { defaultNonNullable: false }))
  const path = new URL(`../src/shared/api/generated/${domain}.ts`, import.meta.url)
  if (process.argv.includes('--check')) {
    if (await readFile(path, 'utf8').catch(() => '') !== generated) { console.error(`${domain} contract types have drifted`); drift = true }
  } else await writeFile(path, generated)
}
if (drift) process.exitCode = 1
