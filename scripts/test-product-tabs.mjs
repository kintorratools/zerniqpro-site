/**
 * test-product-tabs.mjs
 *
 * Regression test for the Product Detail tabs (Description / Specifications /
 * Blueprints). Fetches a real SSR-rendered product page, then simulates the
 * deterministic `selectTab(index)` client logic 20 times and verifies that:
 *
 *   - the 3 tab controls and 3 panels never disappear from the DOM
 *   - exactly one panel is visible (no `hidden`) and one button is `active`
 *   - each panel's content stays byte-for-byte identical to the initial render
 *
 * Panels:
 *   #tabs-with-card-1  (Description, visible by default)
 *   #tabs-with-card-2  (Specifications, hidden)
 *   #tabs-with-card-3  (Blueprints, hidden)
 *
 * Usage:
 *   node scripts/test-product-tabs.mjs
 *   BASE=http://localhost:4321 node scripts/test-product-tabs.mjs
 */

const BASE = process.env.BASE ?? 'http://localhost:4321';
const PRODUCT_URL = `${BASE}/products/item-a765`;
const CYCLE_COUNT = 20;
const PANEL_IDS = ['tabs-with-card-1', 'tabs-with-card-2', 'tabs-with-card-3'];

let passed = 0;
let failed = 0;
let tabPanelDisappearCount = 0;
let tabContentMutationCount = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// String-parser fallback (used when jsdom is not installed)
// ---------------------------------------------------------------------------

/** Strip tags/scripts/styles and collapse whitespace to approximate visible text. */
function visibleText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the exclusive end index of the <div> that starts at `start`, by
 * balancing nested <div>/</div> tags.
 */
function findMatchingDivEnd(html, start) {
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const open = html.indexOf('<div', i);
    const close = html.indexOf('</div>', i);
    if (open === -1 && close === -1) break;
    if (open !== -1 && (close === -1 || open < close)) {
      depth++;
      i = open + 4;
    } else {
      depth--;
      i = close + 6;
      if (depth === 0) return close + 6;
    }
  }
  return html.length;
}

/** Extract the tab panel <div> elements by their known ids. */
function extractPanels(html) {
  return PANEL_IDS.map(id => {
    const openStart = html.indexOf(`<div id="${id}"`);
    if (openStart === -1) return null;
    const openEnd = html.indexOf('>', openStart) + 1;
    const end = findMatchingDivEnd(html, openStart);
    const openTag = html.slice(openStart, openEnd);
    return {
      id,
      openTag,
      hidden: /\bhidden\b/.test(openTag),
      content: html.slice(openEnd, end),
    };
  });
}

/** Extract the tab <button> controls (any element with a data-target attribute). */
function extractButtons(html) {
  return [...html.matchAll(/<button\b[^>]*\bdata-target="([^"]+)"[^>]*>/g)].map(
    m => ({
      dataTarget: m[1],
      openTag: m[0],
      active: /\bactive\b/.test(m[0]),
    })
  );
}

/** Add/remove the `hidden` class on a panel opening tag (string simulation). */
function setHidden(openTag, hidden) {
  if (hidden) {
    return /\bhidden\b/.test(openTag)
      ? openTag
      : openTag.replace(
          'class="product-tab-panel"',
          'class="product-tab-panel hidden"'
        );
  }
  return openTag.replace(
    'class="product-tab-panel hidden"',
    'class="product-tab-panel"'
  );
}

/** Add/remove the `active` class on a button opening tag (string simulation). */
function setActive(openTag, active) {
  if (active) {
    return /\bactive\b/.test(openTag)
      ? openTag
      : openTag.replace('class="', 'class="active ');
  }
  return openTag.replace(/\bactive\b\s*/, '');
}

function buildStringSim(html) {
  let workingHtml = html;

  function selectTab(index) {
    // Toggle button `active` class.
    extractButtons(workingHtml).forEach((btn, i) => {
      const newOpenTag = setActive(btn.openTag, i === index);
      if (newOpenTag !== btn.openTag) {
        workingHtml = workingHtml.replace(btn.openTag, newOpenTag);
      }
    });

    // Toggle panel `hidden` class.
    extractPanels(workingHtml).forEach((panel, i) => {
      if (!panel) return;
      const newOpenTag = setHidden(panel.openTag, i !== index);
      if (newOpenTag !== panel.openTag) {
        workingHtml = workingHtml.replace(panel.openTag, newOpenTag);
      }
    });
  }

  function snapshot() {
    return {
      buttons: extractButtons(workingHtml),
      panels: extractPanels(workingHtml),
    };
  }

  return { selectTab, snapshot };
}

// ---------------------------------------------------------------------------
// jsdom engine (preferred when available)
// ---------------------------------------------------------------------------

function buildJsdomSim(html, JSDOM) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  function snapshot() {
    const buttons = [...doc.querySelectorAll('[data-target]')].map(b => ({
      dataTarget: b.getAttribute('data-target'),
      active: b.classList.contains('active'),
    }));
    const panels = PANEL_IDS.map(id => {
      const el = doc.getElementById(id);
      if (!el) return null;
      return {
        id,
        hidden: el.classList.contains('hidden'),
        content: el.innerHTML,
      };
    });
    return { buttons, panels };
  }

  function selectTab(index) {
    const buttons = [...doc.querySelectorAll('[data-target]')];
    const panels = PANEL_IDS.map(id => doc.getElementById(id));
    buttons.forEach((btn, i) => btn.classList.toggle('active', i === index));
    panels.forEach((panel, i) => {
      if (!panel) return;
      panel.classList.toggle('hidden', i !== index);
    });
  }

  return { selectTab, snapshot };
}

async function loadJsdom() {
  try {
    const mod = await import('jsdom');
    return mod.JSDOM;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== test-product-tabs ===');
  console.log(`URL: ${PRODUCT_URL}\n`);

  let res;
  try {
    res = await fetch(PRODUCT_URL);
  } catch (err) {
    console.error(`FAIL  fetch failed: ${err.message}`);
    console.error('Is the Astro dev server running? (npm run dev)');
    process.exit(1);
  }

  const html = await res.text();
  check('HTTP 200', res.status === 200, `status=${res.status}`);
  check('HTML body non-empty', html.length > 0, `${html.length} bytes`);
  if (res.status !== 200 || html.length === 0) {
    console.error('Cannot continue: page did not load.');
    process.exit(1);
  }

  const JSDOM = await loadJsdom();
  const sim = JSDOM ? buildJsdomSim(html, JSDOM) : buildStringSim(html);
  console.log(
    `Engine: ${JSDOM ? 'jsdom' : 'string parser (jsdom not installed)'}\n`
  );

  const initial = sim.snapshot();
  const initialContents = initial.panels.map(p => (p ? p.content : null));

  // ── Initial state assertions ──
  console.log('--- initial state ---');
  check(
    '3 tab controls ([data-target])',
    initial.buttons.length === 3,
    `found ${initial.buttons.length}`
  );
  check(
    '3 panels (.product-tab-panel)',
    initial.panels.length === 3 && initial.panels.every(Boolean),
    `found ${initial.panels.filter(Boolean).length}`
  );

  if (initial.panels.length === 3 && initial.panels.every(Boolean)) {
    check('Panel 1 visible initially (no hidden)', !initial.panels[0].hidden);
    check('Panel 2 hidden initially', initial.panels[1].hidden);
    check('Panel 3 hidden initially', initial.panels[2].hidden);
    check(
      'Button 1 active initially, buttons 2/3 inactive',
      initial.buttons[0].active &&
        !initial.buttons[1].active &&
        !initial.buttons[2].active
    );

    const descText = visibleText(initial.panels[0].content);
    check(
      'Description content present (long text + <h2>)',
      initial.panels[0].content.includes('<h2') && descText.length >= 80,
      `${descText.length} visible chars`
    );
    check(
      'Specifications content present (table or spec list)',
      initial.panels[1].content.includes('<table') ||
        initial.panels[1].content.includes('<h3'),
      initial.panels[1].content.includes('<table')
        ? 'table found'
        : 'spec list found'
    );
    check(
      'Blueprints content present (<img>)',
      initial.panels[2].content.includes('<img')
    );
  }

  console.log(
    `\nInitial panel content lengths: ${initial.panels
      .map((p, i) => `panel${i + 1}=${p ? p.content.length : 'MISSING'}B`)
      .join(', ')}`
  );

  // ── 20-cycle regression ──
  console.log(
    `\n--- cycling ${CYCLE_COUNT} times (Description -> Specifications -> Blueprints) ---`
  );
  for (let step = 1; step <= CYCLE_COUNT; step++) {
    const index = (step - 1) % 3;
    sim.selectTab(index);
    const { buttons, panels } = sim.snapshot();

    const controlsOk = buttons.length === 3;
    const missingPanels = panels.filter(p => !p).length;
    const panelsOk = panels.length === 3 && missingPanels === 0;
    if (missingPanels > 0) tabPanelDisappearCount += missingPanels;

    let visibilityOk = false;
    let activeOk = false;
    if (panelsOk && controlsOk) {
      visibilityOk = panels.every((panel, i) => panel.hidden === (i !== index));
      activeOk = buttons.every((btn, i) => btn.active === (i === index));
    }

    let contentOk = true;
    const mutations = [];
    if (panelsOk) {
      panels.forEach((panel, i) => {
        if (panel.content !== initialContents[i]) {
          contentOk = false;
          tabContentMutationCount++;
          mutations.push(
            `panel${i + 1}: ${panel.content.length}B != initial ${initialContents[i].length}B`
          );
        }
      });
    }

    const details = [];
    if (!controlsOk) details.push(`controls=${buttons.length}`);
    if (!panelsOk) details.push(`panels=${panels.filter(Boolean).length}/3`);
    if (!visibilityOk) details.push('visibility mismatch');
    if (!activeOk) details.push('active mismatch');
    if (!contentOk) details.push(`mutation: ${mutations.join('; ')}`);

    check(
      `cycle ${String(step).padStart(2, '0')} (tab ${index + 1})`,
      controlsOk && panelsOk && visibilityOk && activeOk && contentOk,
      details.join('; ') || 'ok'
    );
  }

  // ── Final re-click on Description ──
  console.log('\n--- final re-click on Description ---');
  sim.selectTab(0);
  const final = sim.snapshot();
  const descriptionRestored =
    final.panels[0] && final.panels[0].content === initialContents[0];
  if (!descriptionRestored) tabContentMutationCount++;
  check(
    'Description content matches initial after re-click',
    descriptionRestored,
    final.panels[0]
      ? `${final.panels[0].content.length}B vs initial ${initialContents[0].length}B`
      : 'panel 1 missing'
  );
  check(
    'Only Description visible after re-click',
    final.panels.every((panel, i) => panel.hidden === (i !== 0))
  );

  // ── Metrics / summary ──
  console.log('\n=== TAB METRICS ===');
  console.log(`TAB_CYCLE_COUNT=${CYCLE_COUNT}`);
  console.log(`TAB_PANEL_DISAPPEAR_COUNT=${tabPanelDisappearCount}`);
  console.log(`TAB_CONTENT_MUTATION_COUNT=${tabContentMutationCount}`);

  console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\nTAB TEST: FAIL');
    process.exit(1);
  }
  console.log('\nTAB TEST: PASS');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
