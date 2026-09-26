import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
export async function connect(token: string, endpoint = process.env.MCP_RESOURCE_URL ?? 'http://localhost:5001/mcp') {
  const client = new Client({ name: 'maletapp-smoke', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers: { authorization: `Bearer ${token}` } } }));
  return client;
}
export async function exercise(owner: Client, other?: Client) {
  async function call(c: Client, name: string, args: Record<string, unknown> = {}) {
    const result = await c.callTool({ name, arguments: args });
    if (result.isError) throw new Error(`Tool ${name} failed: ${JSON.stringify(result.structuredContent)}`);
    return (result.structuredContent as { result: any }).result;
  }
  assert.equal((await owner.listTools()).tools.length, 9);
  assert.equal((await owner.listPrompts()).prompts[0]?.name, 'preparar_equipaje');
  await call(owner, 'list_trips');
  const trip = await call(owner, 'create_trip', { destination: `MCP-TEST-${new Date().toISOString()}`, startDate: '2026-12-01', endDate: '2026-12-05' });
  console.info(`Created identifiable test trip ${trip.id}; retained for inspection (no existing data touched).`);
  assert.equal((await call(owner, 'get_trip', { tripId: trip.id })).startDate, '2026-12-01');
  await owner.getPrompt({ name: 'preparar_equipaje', arguments: { tripId: trip.id } });
  const item = await call(owner, 'add_item', { tripId: trip.id, name: 'MCP-TEST socks', notes: 'One pair per day', itemCount: 4 });
  assert.equal(item.notes, 'One pair per day'); assert.equal(item.itemCount, 4); assert(!('checkCount' in item));
  try {
    assert((await call(owner, 'list_items', { tripId: trip.id })).some((i: { id: string }) => i.id === item.id));
    assert.equal((await call(owner, 'edit_item', { itemId: item.id, name: 'MCP-TEST renamed', defaultItemId: null })).name, 'MCP-TEST renamed');
    assert.equal((await call(owner, 'set_item_packed', { itemId: item.id, isPacked: true })).isPacked, true);
    const unpacked = await call(owner, 'set_item_packed', { itemId: item.id, isPacked: false });
    assert.equal(unpacked.isPacked, false); assert.equal(unpacked.notes, 'One pair per day'); assert.equal(unpacked.itemCount, 4);
    if (other) {
      const otherTrips = await call(other, 'list_trips'); assert(!otherTrips.some((t: { id: string }) => t.id === trip.id));
      for (const [name, args] of [
        ['get_trip', { tripId: trip.id }], ['list_items', { tripId: trip.id }], ['add_item', { tripId: trip.id, name: 'Forbidden' }],
        ['get_item', { itemId: item.id }], ['edit_item', { itemId: item.id, name: 'Forbidden', notes: 'Forbidden', itemCount: 9 }],
        ['set_item_packed', { itemId: item.id, isPacked: true }], ['delete_item', { itemId: item.id }],
      ] as const) {
        const denied = await other.callTool({ name, arguments: args });
        assert.equal(denied.isError, true, name); assert.equal((denied.structuredContent as Record<string, unknown> | undefined)?.status, 403, name);
      }
      const unchanged = await call(owner, 'get_item', { itemId: item.id });
      assert.equal(unchanged.name, 'MCP-TEST renamed'); assert.equal(unchanged.isPacked, false); assert.equal(unchanged.notes, 'One pair per day'); assert.equal(unchanged.itemCount, 4);
    }
    const cleared = await call(owner, 'edit_item', { itemId: item.id, notes: null, itemCount: null });
    assert.equal(cleared.notes, null); assert.equal(cleared.itemCount, null);
    const edited = await call(owner, 'edit_item', { itemId: item.id, notes: 'Updated comment', itemCount: 2 });
    assert.equal(edited.notes, 'Updated comment'); assert.equal(edited.itemCount, 2);
    const readBack = await call(owner, 'get_item', { itemId: item.id });
    assert.equal(readBack.notes, 'Updated comment'); assert.equal(readBack.itemCount, 2);
  } finally {
    await call(owner, 'delete_item', { itemId: item.id });
  }
  assert(!(await call(owner, 'list_items', { tripId: trip.id })).some((i: { id: string }) => i.id === item.id));
  console.info(`Packing lifecycle passed; ${other ? 'two-user ownership checks passed' : 'second-user checks NOT run'}.`);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  // Token files must be private; never pass tokens in command arguments or print them.
  const tokenPath = process.env.MCP_TOKEN_FILE;
  if (!tokenPath) throw new Error('Set MCP_TOKEN_FILE to a private file containing an MCP access token.');
  const owner = await connect((await readFile(tokenPath, 'utf8')).trim());
  let other: Client | undefined;
  try {
    if (process.env.MCP_OTHER_TOKEN_FILE) other = await connect((await readFile(process.env.MCP_OTHER_TOKEN_FILE, 'utf8')).trim());
    await exercise(owner, other);
  } finally { await owner.close(); await other?.close(); }
}
