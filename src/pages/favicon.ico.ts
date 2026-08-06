import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DIST = resolve('public/favicon.ico');

export const GET: APIRoute = async () => {
  try {
    const buffer = await readFile(DIST);
    return new Response(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'image/x-icon' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
