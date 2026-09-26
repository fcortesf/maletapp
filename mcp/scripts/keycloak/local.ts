import { chmod, lstat, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { SetupError } from './admin.ts';
export function updateEnvironment(text: string, values: Record<string, string>): string {
  let output = text;
  for (const [key, value] of Object.entries(values)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || /[\r\n']/.test(value)) throw new SetupError('Unsupported environment setting.');
    const pattern = new RegExp(`^[ \t]*(?:export[ \t]+)?${key}[ \t]*=.*$`, 'gm');
    const matches = output.match(pattern) ?? [];
    if (matches.length > 1) throw new SetupError(`Duplicate ${key} assignments in environment file.`);
    if (parseEnv(output)[key] === value) continue;
    const assignment = `${key}='${value}'`;
    output = matches.length ? output.replace(pattern, () => assignment) : `${output}${output && !output.endsWith('\n') ? '\n' : ''}${assignment}\n`;
  }
  return output;
}
export async function saveEnvironment(path: string, values: Record<string, string>): Promise<boolean> {
  const stat = await lstat(path).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error; });
  if (stat && !stat.isFile()) throw new SetupError('Environment destination must be a regular file, not a symlink.');
  const previous = stat ? await readFile(path, 'utf8') : '';
  const next = updateEnvironment(previous, values);
  if (next === previous) { if (stat && (stat.mode & 0o777) !== 0o600) await chmod(path, 0o600); return false; }
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, next, { mode: 0o600, flag: 'wx' });
    await rename(temporary, path);
  } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
  return true;
}
export async function compose(gatewayDirectory: string, args: string[], environment: NodeJS.ProcessEnv, capture = false): Promise<string> {
  // Argument array, never shell interpolation. Child output is suppressed to avoid accidental secret disclosure.
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['compose', ...args], { cwd: gatewayDirectory, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => { if (capture) chunks.push(chunk); });
    child.stderr.on('data', () => {});
    child.once('error', () => reject(new SetupError('Could not execute Docker Compose.')));
    child.once('exit', code => code === 0 ? resolve(Buffer.concat(chunks).toString().trim()) : reject(new SetupError(`Docker Compose ${args[0]} failed (exit ${code}); output suppressed to protect credentials.`)));
  });
}
