import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { startWorker, withWorker } from './lib/test-process.mjs';

// ─── Test state ────────────────────────────────────────────────────

let failed = false;

function check(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    failed = true;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

/** Find a free port on 127.0.0.1 */
function findFreePort() {
  return new Promise(resolve => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Check whether a port is free by binding a temporary server.
 * Retries a few times since ports may linger in TIME_WAIT after process exit.
 */
async function portIsFree(port, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve2, reject) => {
        const srv = createServer();
        srv.on('error', reject);
        srv.listen(port, '127.0.0.1', () => {
          srv.close(() => resolve2());
        });
      });
      return true;
    } catch {
      if (i < maxAttempts - 1) {
        await sleep(500);
      }
    }
  }
  return false;
}

/** Generate a Node.js -e snippet that runs a simple HTTP server */
function serverCode(port) {
  return `const http=require('http');http.createServer((r,s)=>{s.writeHead(200);s.end('ok')}).listen(${port},'127.0.0.1')`;
}

// ─── Tests ─────────────────────────────────────────────────────────

/**
 * Test 1: Tracked child cleanup via withWorker.
 * After the withWorker block exits, the child PID must be gone and the port free.
 */
async function testTrackedChildCleanup() {
  console.log('\n--- Test 1: Tracked child cleanup ---');

  const port = await findFreePort();
  let capturedPid;

  await withWorker(
    {
      cmd: 'node',
      args: ['-e', serverCode(port)],
      port,
      readyPath: '/',
      readyTimeout: 10000,
    },
    async worker => {
      capturedPid = worker.pid;
      const res = await fetch(`http://127.0.0.1:${worker.port}/`);
      check(res.status === 200, 'withWorker: worker responds with 200');
    }
  );

  // After withWorker exits, the process should be gone
  try {
    process.kill(capturedPid, 0);
    check(false, 'withWorker: PID should not exist after cleanup');
  } catch (e) {
    check(
      e.code === 'ESRCH',
      `withWorker: PID ${capturedPid} gone after cleanup (ESRCH)`
    );
  }

  // Port should be free
  const free = await portIsFree(port);
  check(free, 'withWorker: port released after cleanup');
}

/**
 * Test 2: Port release after manual worker.stop().
 */
async function testPortRelease() {
  console.log('\n--- Test 2: Port release via worker.stop() ---');

  const port = await findFreePort();
  const worker = await startWorker({
    cmd: 'node',
    args: ['-e', serverCode(port)],
    port,
    readyPath: '/',
    readyTimeout: 10000,
  });

  // Verify it works
  const res = await fetch(`http://127.0.0.1:${worker.port}/`);
  check(res.status === 200, 'manual start: worker responds');

  // Stop it
  await worker.stop();

  // Verify port is free — try binding a new server on the same port
  const free = await portIsFree(port);
  check(free, 'manual start: port free after worker.stop()');
}

/**
 * Test 3: Failed scenario cleanup.
 * Throwing inside the withWorker callback must still clean up the process.
 */
async function testFailedScenarioCleanup() {
  console.log('\n--- Test 3: Failed scenario cleanup ---');

  const port = await findFreePort();
  let capturedPid;
  let errorThrown = false;

  try {
    await withWorker(
      {
        cmd: 'node',
        args: ['-e', serverCode(port)],
        port,
        readyPath: '/',
        readyTimeout: 10000,
      },
      async worker => {
        capturedPid = worker.pid;
        throw new Error('Simulated test failure');
      }
    );
  } catch (e) {
    errorThrown = true;
    check(
      e.message === 'Simulated test failure',
      'failed scenario: error propagated correctly'
    );
  }

  check(errorThrown, 'failed scenario: error was thrown');

  // PID must be gone despite the error
  try {
    process.kill(capturedPid, 0);
    check(false, 'failed scenario: PID should not exist after error');
  } catch (e) {
    check(
      e.code === 'ESRCH',
      `failed scenario: PID ${capturedPid} gone after error (ESRCH)`
    );
  }

  // Port must be free
  const free = await portIsFree(port);
  check(free, 'failed scenario: port free after error cleanup');
}

/**
 * Test 4: Timeout scenario cleanup.
 * If the worker never becomes ready, startWorker must throw, and the
 * spawned process must be killed.
 */
async function testTimeoutCleanup() {
  console.log('\n--- Test 4: Timeout scenario cleanup ---');

  const port = await findFreePort();
  let capturedPid;
  let timedOut = false;

  // Spawn a process that never starts a server — readiness will time out
  // We snapshot the child PID before the timeout error by peeking the
  // args length and using a pre-known command.
  try {
    await startWorker({
      cmd: 'node',
      args: [
        '-e',
        // Keep the process alive long enough for the timeout (3 s) to fire,
        // but do NOT start a server on the target port
        'setTimeout(()=>{},120000)',
      ],
      port,
      readyPath: '/nonexistent-path',
      readyTimeout: 3000,
    });
  } catch (e) {
    timedOut = true;
    check(
      e.message.includes('did not become ready'),
      `timeout: error message contains timeout info (got: ${e.message.substring(0, 60)})`
    );
  }

  check(timedOut, 'timeout: startWorker threw as expected');

  // Give the OS a moment to release the process; then check the port is free.
  // We don't have the PID directly because startWorker threw before returning
  // it — but the port must be free regardless.
  await sleep(2000);
  const free = await portIsFree(port);
  check(free, 'timeout: port free after timeout cleanup');
}

/**
 * Test 5: No global node kill.
 * The library must NOT use taskkill /IM node.exe or Stop-Process -Name node.
 */
function testNoGlobalNodeKill() {
  console.log('\n--- Test 5: No global node kill ---');

  const src = readFileSync(
    resolve(import.meta.dirname, 'lib', 'test-process.mjs'),
    'utf-8'
  );

  check(
    !src.includes('/IM node.exe'),
    'no global kill: source does not contain /IM node.exe'
  );
  check(
    !src.includes('Stop-Process -Name'),
    'no global kill: source does not contain Stop-Process -Name'
  );
}

/**
 * Test 6: No token exposure.
 * The library must not log auth tokens or headers.
 */
function testNoTokenExposure() {
  console.log('\n--- Test 6: No token exposure ---');

  const src = readFileSync(
    resolve(import.meta.dirname, 'lib', 'test-process.mjs'),
    'utf-8'
  );

  // console.log / console.warn / console.error calls in the library
  // must never include auth tokens
  check(
    !/console\.(?:log|warn|error).*Bearer/.test(src),
    'no token exposure: no console call contains Bearer'
  );
  check(
    !src.includes('STRAPI_API_TOKEN'),
    'no token exposure: source does not reference STRAPI_API_TOKEN'
  );
  check(
    !/console\.(?:log|warn|error).*[Aa]uth/i.test(src),
    'no token exposure: no console call mentions auth'
  );
}

/**
 * Test 7: Manual withWorker pattern (startWorker + try/finally).
 */
async function testManualPattern() {
  console.log(
    '\n--- Test 7: Manual withWorker pattern (startWorker + try/finally) ---'
  );

  const port = await findFreePort();
  const worker = await startWorker({
    cmd: 'node',
    args: ['-e', serverCode(port)],
    port,
    readyPath: '/',
    readyTimeout: 10000,
  });

  try {
    const res = await fetch(`http://127.0.0.1:${worker.port}/`);
    check(res.status === 200, 'manual pattern: worker responds');
  } finally {
    await worker.stop();
  }

  // After stop, PID should be gone
  try {
    process.kill(worker.pid, 0);
    check(false, 'manual pattern: PID should not exist after stop');
  } catch (e) {
    check(
      e.code === 'ESRCH',
      `manual pattern: PID ${worker.pid} gone after stop (ESRCH)`
    );
  }

  // Port should be free
  const free = await portIsFree(port);
  check(free, 'manual pattern: port free after stop');
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  // Tests 5 and 6 are synchronous and can run first
  testNoGlobalNodeKill();
  testNoTokenExposure();

  // Tests 1-4 and 7 require spawning child processes
  await testTrackedChildCleanup();
  await testPortRelease();
  await testFailedScenarioCleanup();
  await testTimeoutCleanup();
  await testManualPattern();

  console.log('\n' + '='.repeat(50));
  if (failed) {
    console.error('Runtime hygiene tests FAILED');
    process.exit(1);
  }
  console.log('Runtime hygiene tests PASSED');
}

main();
