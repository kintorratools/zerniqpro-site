/**
 * Unified test process management for Wrangler dev workers.
 *
 * Manages spawning, readiness polling, and safe process termination
 * of Wrangler dev workers started by test scripts. Works on both Windows
 * and POSIX (Linux/macOS).
 *
 * Spawn behavior (matching the proven pre-7C-C pattern):
 *   - Windows: shell:true for .cmd/.bat, shell:false for direct binaries
 *   - POSIX:   no detached, no shell (same as old inline spawn)
 *
 * @example
 * import { startWorker } from '../lib/test-process.mjs';
 *
 * const worker = await startWorker({
 *   cmd: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
 *   args: ['exec', 'wrangler', 'dev', '--config', 'dist-out/server/wrangler.json', '--ip', '127.0.0.1', '--port', '61234'],
 *   port: 61234,
 *   readyPath: '/',
 *   cwd: path.resolve(import.meta.dirname, '..'),
 * });
 * try {
 *   const res = await fetch(`http://127.0.0.1:${worker.port}/`);
 *   // ... test assertions
 * } finally {
 *   await worker.stop();
 * }
 *
 * // Or use the withWorker convenience wrapper:
 * import { withWorker } from '../lib/test-process.mjs';
 * await withWorker({ cmd: 'pnpm', args: [...], port: 61234 }, async (worker) => {
 *   const res = await fetch(`http://127.0.0.1:${worker.port}/`);
 * });
 */

import { spawn, exec } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_READY_TIMEOUT = 30000;
const POLL_INTERVAL = 500;
const FETCH_TIMEOUT = 1000;
const KILL_WAIT_MS = 5000;
const IS_WIN = process.platform === 'win32';

/**
 * Start a Wrangler dev worker process and wait for it to become ready.
 *
 * Spawns the child process with the same spawn options as the proven
 * pre-7C-C pattern (shell:true on Windows for .cmd/.bat only, no detached).
 *
 * Polls `http://127.0.0.1:{port}{readyPath}` every 500ms until the server
 * responds (any HTTP status) or the timeout is reached.
 *
 * @param {object} options
 * @param {string}  options.cmd           - Executable to spawn (e.g. 'pnpm.cmd' on Windows, 'pnpm' on POSIX)
 * @param {string[]} options.args         - Arguments passed to the executable
 * @param {number}  options.port          - Port the worker will listen on
 * @param {string}  [options.readyPath]   - Path to poll for readiness (default: '/')
 * @param {number}  [options.readyTimeout] - Max wait in ms for readiness (default: 30000)
 * @param {string}  [options.cwd]         - Working directory for the child process
 * @returns {Promise<{pid: number, port: number, stop: () => Promise<void>}>}
 */
export async function startWorker(options) {
  const {
    cmd,
    args,
    port,
    readyPath = '/',
    readyTimeout = DEFAULT_READY_TIMEOUT,
    cwd,
  } = options;

  // Only set shell:true on Windows when the command is a .cmd/.bat file.
  // Spawning node directly with shell:true would mangle -e arguments.
  const needsShell = IS_WIN && /\.(cmd|bat)$/i.test(cmd);
  const spawnOpts = {
    stdio: ['ignore', 'pipe', 'pipe'],
    ...(needsShell ? { shell: true } : {}),
  };
  if (cwd) {
    spawnOpts.cwd = cwd;
  }

  const child = spawn(cmd, args, spawnOpts);

  // Drain stdout/stderr to prevent backpressure from blocking the child
  if (child.stdout) child.stdout.resume();
  if (child.stderr) child.stderr.resume();

  const pid = child.pid;
  let exited = false;
  let exitCode = null;

  child.on('exit', code => {
    exited = true;
    exitCode = code;
  });

  const readyUrl = `http://127.0.0.1:${port}${readyPath}`;

  // Poll until the worker responds or we time out
  for (let elapsed = 0; elapsed < readyTimeout; elapsed += POLL_INTERVAL) {
    if (exited) {
      throw new Error(
        `Worker process (PID ${pid}) exited with code ${exitCode} before ready`
      );
    }

    try {
      await fetch(readyUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      // Any HTTP response (including 4xx/5xx) means the server is listening
      return {
        pid,
        port,
        stop: () => stopWorker(pid, port, () => exited),
      };
    } catch {
      // Connection refused, timeout, or DNS error — server not ready yet
    }

    await sleep(POLL_INTERVAL);
  }

  // Timeout reached — kill the process tree and throw
  try {
    await killProcessTree(pid);
  } catch {
    // Best-effort cleanup
  }
  throw new Error(
    `Worker did not become ready within ${readyTimeout}ms on port ${port} (PID ${pid})`
  );
}

/**
 * Convenience wrapper that ensures the worker is always stopped, even if
 * the test function throws.
 *
 * @param {object}   options - Same options as {@link startWorker}
 * @param {(worker: {pid: number, port: number}) => Promise<void>} fn - Test function
 * @returns {Promise<void>}
 */
export async function withWorker(options, fn) {
  const worker = await startWorker(options);
  try {
    await fn(worker);
  } finally {
    await worker.stop();
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Kill the entire process tree rooted at `pid`.
 *
 * - Windows: `taskkill /PID <pid> /T /F` — kills the tree, never `taskkill /IM node.exe`
 * - POSIX:   `process.kill(pid, 'SIGTERM')` — signals the process directly
 *
 * @param {number} pid
 */
async function killProcessTree(pid) {
  if (IS_WIN) {
    await new Promise(resolve => {
      exec(`taskkill /PID ${pid} /T /F`, { windowsHide: true }, () =>
        resolve()
      );
    });
  } else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Process may have already exited — that's fine
    }
  }
}

/**
 * Poll until the process with the given PID is gone, or `maxWaitMs` elapses.
 * Logs a warning (but does not throw) if the process fails to exit in time.
 *
 * @param {number} pid
 * @param {number} maxWaitMs
 */
async function waitForExit(pid, maxWaitMs) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      // Signal 0 is a no-op existence check on both Windows and POSIX
      process.kill(pid, 0);
      await sleep(200);
    } catch {
      // ESRCH: process no longer exists
      return;
    }
  }
  console.warn(
    `[test-process] Process ${pid} did not exit within ${maxWaitMs}ms`
  );
}

/**
 * Verify that `port` is free by attempting to bind a temporary server.
 * If the port is still in use, logs a warning but does not throw —
 * port availability is a best-effort check in cleanup.
 *
 * @param {number} port
 * @returns {Promise<void>}
 */
function verifyPortFree(port) {
  return new Promise(resolve => {
    const srv = createServer();
    srv.on('error', () => {
      console.warn(`[test-process] Port ${port} is still in use after cleanup`);
      resolve();
    });
    srv.listen(port, '127.0.0.1', () => {
      srv.close(() => resolve());
    });
  });
}

/**
 * Stop a tracked worker process.
 *
 * - No-op if the process has already exited.
 * - Kills the process tree, waits up to 5 s for exit, then verifies the port is free.
 *
 * @param {number}   pid
 * @param {number}   port
 * @param {() => boolean} isExited - Getter for the exited flag (captured from closure)
 */
async function stopWorker(pid, port, isExited) {
  if (isExited()) return;

  await killProcessTree(pid);
  await waitForExit(pid, KILL_WAIT_MS);
  await verifyPortFree(port);
}
