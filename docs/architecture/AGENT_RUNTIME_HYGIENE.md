# Agent Runtime Hygiene Rules

## LONG_RUNNING_COMMAND_RULE

### Build / Test / Git commands

- Must wait for exit code before proceeding
- When shell prompt ($ or >) appears, the command is finished immediately
- If Trae UI spinner shows for more than 60 seconds but shell prompt has already returned, the UI watcher is stale — do not continue waiting
- Use exit code (0 = pass, non-zero = fail) for judgment, do not rely on UI "background running" prompts

### Long-running services (Strapi, Wrangler dev)

- When starting: record PID, PORT, and PURPOSE
- When task completes: MUST stop
- Do NOT restart a service that is already running on the same port
- Default cleanup at phase end:
  - Wrangler / Astro dev = STOPPED
  - Strapi dev = STOPPED
  - PostgreSQL Docker = ALLOWED_RUNNING

## Service Lifecycle Recording

Format for starting services:

```
SERVICE_NAME: [name]
PID: [pid]
PORT: [port]
PURPOSE: [purpose]
START_TIME: [timestamp]
```

## Test Process Management

- Windows: Use `taskkill /PID <pid> /T /F` for tracked PID trees only
- POSIX: Use process group kill
- NEVER: `taskkill /IM node.exe`, `Stop-Process -Name node`, or any global node kill
- Test scripts must clean up wrangler workers after each test
- Use `scripts/lib/test-process.mjs` for unified lifecycle management

## Port Management

- Ports in use: 4321 (Astro dev, deprecated), 8787 (Frontend Wrangler), 1337 (Strapi CMS), 55433 (PostgreSQL)
- After tests: ports 8787 and 1337 must be FREE
- Port 55433 (PostgreSQL): may remain LISTENING
- Use `netstat -ano | Select-String "<port>"` to check port status on Windows

## Windows-Specific Rules

- Wrangler child processes spawn their own children; killing only the shell parent leaves orphans
- Always use PID tree termination: `taskkill /PID <pid> /T /F`
- Verify cleanup: check port is free after process termination
- `pnpm.cmd` is the correct command on Windows, not bare `pnpm`

## Prohibited Actions

- NEVER use `taskkill /IM node.exe` — kills ALL Node processes including unrelated ones
- NEVER use `Stop-Process -Name node` — same reason
- NEVER modify wrangler.jsonc or dist-out/server/wrangler.json without explicit user request
- NEVER add Cloudflare OAuth secrets to CI
- NEVER modify production Worker architecture to fix tests
