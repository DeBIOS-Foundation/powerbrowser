// Unit suite for the batching sender (04-03, TEL-01/TEL-02).
//
// PLAIN NODE, NO BUILD, NO BROWSER. Imports the sender straight from
// src/ (erasable syntax only -- node type-stripping accepts it), with a
// stubbed fetch and a controllable clock. Run: node
// theia/extensions/telemetry/test/telemetry-sender.test.mjs
//
// DISCRIMINATION PROOF. With TELEMETRY_TEST_STUB=always-send the sender
// is swapped for a stub that POSTs on every call ignoring level,
// batching, timers and retry -- and the suite must go red, with the red
// on the off-sends-nothing assertion. scripts/verify-telemetry.mjs
// --self-test drives exactly that and requires the failure. The off test
// also performs a same-run on-level control send through the same stub,
// so a zero-call pass can never be a stub that records nothing (the
// CLAUDE.md absence-of-log-line lesson).

import { PowerBrowserTelemetrySender } from '../src/browser/telemetry-sender.ts';

const BROKEN = process.env.TELEMETRY_TEST_STUB === 'always-send';

// A sender that delivers nothing right: every call POSTs immediately,
// ignoring level, batching, timers and retry. Every test below must fail
// against it.
class AlwaysSendStub {
    constructor(options) {
        this.fetchFn = options.fetchFn;
        this.calls = 0;
    }
    sendEventData() { this.calls += 1; void this.fetchFn('https://example.org/telemetry/v1/events', { method: 'POST', headers: {}, body: '{}' }); }
    sendErrorData() { this.calls += 1; void this.fetchFn('https://example.org/telemetry/v1/events', { method: 'POST', headers: {}, body: '{}' }); }
    async flush() {}
    dispose() {}
}

function makeClock() {
    let now = 1000;
    let nextId = 1;
    const timeouts = new Map();
    const intervals = new Map();
    return {
        now: () => now,
        setTimeoutFn: (cb, ms) => { const id = nextId++; timeouts.set(id, { cb, at: now + ms }); return id; },
        clearTimeoutFn: id => { timeouts.delete(id); },
        setIntervalFn: (cb, ms) => { const id = nextId++; intervals.set(id, { cb, ms, at: now + ms }); return id; },
        clearIntervalFn: id => { intervals.delete(id); },
        advance(ms) {
            const end = now + ms;
            let guard = 100000;
            while (guard-- > 0) {
                let best = null;
                for (const [id, t] of timeouts) {
                    if (t.at <= end && (best === null || t.at < best.at)) best = { at: t.at, run: () => { timeouts.delete(id); t.cb(); } };
                }
                for (const [id, iv] of intervals) {
                    if (iv.at <= end && (best === null || iv.at < best.at)) best = { at: iv.at, run: () => { iv.at += iv.ms; iv.cb(); } };
                }
                if (best === null) break;
                now = best.at;
                best.run();
            }
            now = end;
            if (guard <= 0) throw new Error('fake clock did not settle');
        },
    };
}

function makeFetch(script) {
    const plan = script ?? [{ ok: true }];
    const calls = [];
    const fn = async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) });
        const next = plan.length > 1 ? plan.shift() : plan[0];
        return { ok: next.ok };
    };
    return { calls, fn };
}

const drain = async (rounds = 20) => { for (let i = 0; i < rounds; i++) await Promise.resolve(); };

function makeSender(overrides = {}) {
    const clock = makeClock();
    const fetch = makeFetch(overrides.script);
    const diagnostics = [];
    let level = overrides.level ?? 'off';
    const options = {
        endpoint: 'https://example.org/telemetry/v1/events',
        getLevel: () => level,
        fetchFn: fetch.fn,
        setTimeoutFn: clock.setTimeoutFn,
        clearTimeoutFn: clock.clearTimeoutFn,
        setIntervalFn: clock.setIntervalFn,
        clearIntervalFn: clock.clearIntervalFn,
        nowFn: clock.now,
        onDiagnostic: msg => { diagnostics.push(msg); },
        ...overrides.sender,
    };
    const sender = BROKEN ? new AlwaysSendStub(options) : new PowerBrowserTelemetrySender(options);
    return { sender, clock, fetch, diagnostics, setLevel: v => { level = v; } };
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const tests = [
    {
        name: 'off sends nothing (with a same-run on-level control)',
        run: async () => {
            const t = makeSender({ level: 'off', sender: { maxBatchSize: 1, flushIntervalMs: 0 } });
            try {
                t.sender.sendEventData('usage.event', { a: 1 });
                t.sender.sendErrorData(new Error('boom'));
                await drain();
                assert(t.fetch.calls.length === 0, `level off delivered ${t.fetch.calls.length} POST(s), want zero`);
                // The control: the same stub through the same paths at an
                // enabled level MUST record a call, or the zero above proves
                // nothing about the stub.
                t.setLevel('all');
                t.sender.sendEventData('control.event');
                await drain();
                assert(t.fetch.calls.length >= 1, 'on-level control recorded no POST -- the stub is broken, not the sender');
            } finally {
                t.sender.dispose();
            }
        },
    },
    {
        name: 'batch flushes on size',
        run: async () => {
            const t = makeSender({ level: 'all', sender: { maxBatchSize: 3, flushIntervalMs: 0 } });
            try {
                t.sender.sendEventData('one');
                t.sender.sendEventData('two');
                await drain();
                assert(t.fetch.calls.length === 0, `2 queued events flushed early (${t.fetch.calls.length} POST(s))`);
                t.sender.sendEventData('three');
                await drain();
                assert(t.fetch.calls.length === 1, `3 queued events produced ${t.fetch.calls.length} POST(s), want 1`);
                assert(t.fetch.calls[0].body.events.length === 3, `batch carries ${t.fetch.calls[0].body.events.length} event(s), want 3`);
            } finally {
                t.sender.dispose();
            }
        },
    },
    {
        name: 'batch flushes on interval',
        run: async () => {
            const t = makeSender({ level: 'all', sender: { maxBatchSize: 100, flushIntervalMs: 1000 } });
            try {
                t.sender.sendEventData('one');
                await drain();
                assert(t.fetch.calls.length === 0, `event flushed before the interval (${t.fetch.calls.length} POST(s))`);
                t.clock.advance(1000);
                await drain();
                assert(t.fetch.calls.length === 1, `interval elapsed with ${t.fetch.calls.length} POST(s), want 1`);
                t.clock.advance(5000);
                await drain();
                assert(t.fetch.calls.length === 1, `empty queue produced phantom POSTs (${t.fetch.calls.length} total)`);
            } finally {
                t.sender.dispose();
            }
        },
    },
    {
        name: 'retry then drop with a diagnostic',
        run: async () => {
            const t = makeSender({ level: 'error', sender: { maxBatchSize: 1, flushIntervalMs: 0, maxAttempts: 3, baseDelayMs: 100 }, script: [{ ok: false }] });
            try {
                t.sender.sendErrorData(new Error('boom'));
                await drain();
                assert(t.fetch.calls.length === 1, `first try produced ${t.fetch.calls.length} POST(s), want 1`);
                t.clock.advance(100);
                await drain();
                assert(t.fetch.calls.length === 2, `first retry produced ${t.fetch.calls.length} POST(s), want 2`);
                t.clock.advance(200);
                await drain();
                assert(t.fetch.calls.length === 3, `second retry produced ${t.fetch.calls.length} POST(s), want 3`);
                assert(t.diagnostics.some(m => m.includes('dropping 1 event(s) after 3 failed')), `no drop diagnostic, got: ${JSON.stringify(t.diagnostics)}`);
                t.clock.advance(100000);
                await drain();
                assert(t.fetch.calls.length === 3, `dropped batch kept retrying (${t.fetch.calls.length} POST(s))`);
            } finally {
                t.sender.dispose();
            }
        },
    },
    {
        name: 'runtime level change takes effect without restart',
        run: async () => {
            const t = makeSender({ level: 'off', sender: { maxBatchSize: 1, flushIntervalMs: 0 } });
            try {
                t.sender.sendErrorData(new Error('while-off'));
                await drain();
                assert(t.fetch.calls.length === 0, `off delivered ${t.fetch.calls.length} POST(s)`);
                t.setLevel('all');
                t.sender.sendEventData('usage.while-all');
                await drain();
                assert(t.fetch.calls.length === 1, `all delivered ${t.fetch.calls.length} POST(s), want 1`);
                t.setLevel('crash');
                t.sender.sendEventData('usage.while-crash');
                await drain();
                assert(t.fetch.calls.length === 1, `crash admitted a usage event (${t.fetch.calls.length} POST(s))`);
                t.sender.sendErrorData(new Error('while-crash'));
                await drain();
                assert(t.fetch.calls.length === 2, `crash dropped the error path (${t.fetch.calls.length} POST(s), want 2)`);
                t.setLevel('error');
                t.sender.sendEventData('usage.while-error');
                await drain();
                assert(t.fetch.calls.length === 2, `error admitted a usage event (${t.fetch.calls.length} POST(s))`);
                t.sender.sendErrorData(new Error('while-error'));
                await drain();
                assert(t.fetch.calls.length === 3, `error dropped the error path (${t.fetch.calls.length} POST(s), want 3)`);
                t.setLevel('off');
                t.sender.sendErrorData(new Error('while-off-again'));
                t.sender.sendEventData('usage.while-off-again');
                await drain();
                assert(t.fetch.calls.length === 3, `off re-admitted events (${t.fetch.calls.length} POST(s))`);
            } finally {
                t.sender.dispose();
            }
        },
    },
];

let failed = 0;
for (const test of tests) {
    try {
        await test.run();
        console.log(`ok - ${test.name}`);
    } catch (err) {
        failed += 1;
        console.log(`not ok - ${test.name} :: ${err && err.message ? err.message : String(err)}`);
    }
}
if (failed > 0) {
    console.log(`SUITE FAIL -- ${failed}/${tests.length} test(s) red${BROKEN ? ' (always-send stub)' : ''}`);
    process.exit(1);
}
console.log(`SUITE PASS -- ${tests.length}/${tests.length} tests green${BROKEN ? ' (always-send stub)' : ''}`);
