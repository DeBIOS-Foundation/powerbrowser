#!/usr/bin/env node
// scripts/verify-pan04-undo-close-group-live.mjs -- PAN-04 (Phase 22): a
// closed group waits UNDO_CLOSE_MS on GroupModel, can be restored, and is then
// closed for good through the unchanged chrome-side closeGroupRows. It proves,
// on the built binary, driving the model API directly:
//   (a) closeGroup hides G1 and hands activity to G2, and writes nothing: the
//       widgets stay, the rows keep closed_at null and group_id G1, and the
//       reader still lists G1;
//   (b) mode switches inside the window end nothing and close no tab (R1);
//   (c) undoCloseGroup restores G1 at its index with its title, bounds, card
//       order and activity, and the store is unchanged;
//   (d) closed again, G1 is still pending 3 s before the deadline, then the
//       timer commits it: widgets and pages gone, rows closed with group_id
//       null, the group row deleted and G2 active in the store;
//   (e) during a window, in Browsing and in Coding, the strip paints none of
//       G1's tabs, each G1 dock-bar tab carries pb-group-closing and computes
//       display none, and no bar's current title is a G1 widget (A3);
//   (f) a quit inside G4's window closes it for good: after a relaunch on the
//       same profile the reader lists no G4, /q1 and /q2 are not open, their
//       rows are closed and the model has no card for them (A4).
//
// UNDO_CLOSE_MS is read from group-model.ts at check time, never typed here.
//
// Full tier only: the built binary, a Theia build and a headless browser.
// Like the other ng-a-live rows it has no --self-test. In-run probe controls
// stand in for one: each plants a page fault (undoCloseGroup stubbed to a
// no-op, commitClose stubbed to a no-op, isClosingKey stubbed to false) and
// requires the probe that passed to go red, so every probe is shown able to fail.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, newProfile, runCheck, show, sleep, tabsOf, waitUntil, withShell, withShellQuit } from './lib/ng-a-live.mjs';

const NAME = 'pan04-undo-close-group-live';
const MODEL_REL = 'theia/extensions/modes/src/browser/group-model.ts';

// Shared by the real assertions and the probe controls. No backticks inside.
const PROBES = `
    const S = window.__pan04 = window.__pan04 || {};
    const m = A.model();
    const keyOf = w => m.keyOf(w);
    const settle = async (test, n) => { for (let i = 0; i < (n || 40) && !test(); i++) await A.sleep(125); return !!test(); };
    const alive = ws => ws.filter(w => A.mainWidgets().includes(w)).length;
    const snap = id => {
        const g = m.listGroups().find(x => x.id === id);
        return g ? { index: m.listGroups().indexOf(g), title: g.title, x: g.x, y: g.y, w: g.w, h: g.h, keys: m.getTabs(id).map(t => t.uri) } : null;
    };
    // The restore probe: the group is back, equal to its snapshot, and not pending.
    const restored = (id, before) => {
        const now = snap(id);
        return !!now && !m.isClosing(id) && JSON.stringify(now) === JSON.stringify(before);
    };
    // The commit probe: no longer pending, and every member widget is gone.
    const committed = (id, ws) => !m.isClosing(id) && alive(ws) === 0;
    const storeGroups = async () => (await A.reader().listGroups()).map(g => ({ id: g.id, is_active: g.is_active }));
    const labelOf = w => w.title.label || w.id;
    const current = () => { const t = A.shell().mainPanel.currentTitle; return t ? t.owner : undefined; };
    const strip = () => A.get('TabStripWidget');
    const painted = () => Array.from(document.querySelectorAll('.pb-tab-strip .pb-tab:not(.pb-tab-stack)')).map(e => e.getAttribute('title'));
    // Every main-area bar, read for the given widgets: shown, unclassed, current, or in no bar at all.
    const bars = ws => {
        const out = { shown: [], unclassed: [], current: [], missing: [] };
        const seen = new Set();
        for (const bar of Array.from(A.shell().mainPanel.tabBars())) {
            bar.titles.forEach((t, i) => {
                if (!ws.includes(t.owner)) return;
                seen.add(t.owner);
                const el = bar.contentNode.children[i];
                if (!el || !el.classList.contains('pb-group-closing')) out.unclassed.push(labelOf(t.owner));
                if (el && getComputedStyle(el).display !== 'none') out.shown.push(labelOf(t.owner));
            });
            if (bar.currentTitle && ws.includes(bar.currentTitle.owner)) out.current.push(labelOf(bar.currentTitle.owner));
        }
        out.missing = ws.filter(w => !seen.has(w)).map(labelOf);
        return out;
    };
    const hiddenEverywhere = ws => { const b = bars(ws); return !b.shown.length && !b.unclassed.length && !b.current.length && !b.missing.length; };
`;

await runCheck(`verify-${NAME}`, async ({ pages, expect, failures }) => {
    const detail = line => console.log(`${NAME}: ${line}`);
    const match = /^export const UNDO_CLOSE_MS = (\d+);/m.exec(readFileSync(join(REPO_ROOT, MODEL_REL), 'utf8'));
    if (!match) {
        failures.push(`broken instrument: no 'export const UNDO_CLOSE_MS = <n>;' in ${MODEL_REL}`);
        return;
    }
    const UNDO = Number(match[1]);
    const profile = newProfile('pan04');
    const qUrls = [pages.url('/q1'), pages.url('/q2')];
    const urls = { a: pages.url('/a'), c: pages.url('/c'), s: pages.url('/s'), p: pages.url('/p') };
    const rowsOf = keys => tabsOf(profile).filter(r => keys.includes(r.uri));

    const first = await withShellQuit(profile, async ({ run, topLevelContexts, screenshot }) => {
        // Setup: /a, /c and a terminal in G1; /s in G2; /p in G3 for the probe controls; G1 active.
        const opened = await run(`
            ${PROBES}
            await A.get('ModeService').activateMode('browsing');
            await settle(() => m.isLoaded, 160);
            const urls = ${JSON.stringify(urls)};
            for (const name of Object.keys(urls)) S[name] = await A.open(urls[name]);
            S.t = await A.open('terminal:pan04-t', { widgetOptions: { area: 'main' } });
            const keys = Object.fromEntries(['a', 'c', 's', 'p', 't'].map(n => [n, keyOf(S[n])]));
            return { keys };
        `);
        const keys = opened.keys;
        const web = [keys.a, keys.c, keys.s, keys.p];
        if (!await waitUntil(() => rowsOf(web).length === web.length, 15000)) {
            failures.push(`setup: not every web tab has a row within 15 s: ${show(tabsOf(profile))}`);
            return;
        }
        const setup = await run(`
            ${PROBES}
            const keys = ${JSON.stringify(keys)};
            await settle(() => Object.values(keys).every(k => m.listUngrouped().some(t => t.uri === k)), 80);
            const g1 = await m.createGroup(A.actor(), { x: 40, y: 40 });
            for (const k of [keys.a, keys.c, keys.t]) await m.moveCard(A.actor(), k, g1.id);
            const g2 = await m.createGroup(A.actor(), { x: 480, y: 40 });
            await m.moveCard(A.actor(), keys.s, g2.id);
            const g3 = await m.createGroup(A.actor(), { x: 40, y: 400 });
            await m.moveCard(A.actor(), keys.p, g3.id);
            await m.setActiveGroup(A.actor(), g1.id);
            S.g1 = g1.id; S.g2 = g2.id; S.g3 = g3.id;
            S.w1 = [S.a, S.c, S.t];
            return { g1: g1.id, g2: g2.id, g3: g3.id, members: m.getTabs(g1.id).map(t => t.uri), active: m.getActiveGroupId() };
        `);
        const { g1, g2, g3 } = setup;
        if (setup.members.length !== 3 || setup.active !== g1) {
            failures.push(`setup: G1 holds [${setup.members.join(', ')}] and the active group is ${setup.active}, want 3 members and G1 ${g1}`);
            return;
        }
        const g1Keys = [keys.a, keys.c];
        if (!await waitUntil(() => rowsOf(g1Keys).every(r => r.group_id === g1), 10000)) {
            failures.push(`setup: G1's web rows never carried group_id ${g1}: ${show(rowsOf(g1Keys))}`);
            return;
        }

        // (a) closeGroup: hidden at once, nothing written.
        const a = await run(`
            ${PROBES}
            S.before = snap(S.g1);
            const closed = await m.closeGroup(A.actor(), S.g1);
            return {
                closed,
                pending: m.isClosing(S.g1),
                listed: m.listGroups().some(g => g.id === S.g1),
                active: m.getActiveGroupId(),
                alive: alive(S.w1),
                store: await storeGroups(),
            };
        `);
        if (process.env.PB_PAN04_SHOT) {
            writeFileSync(process.env.PB_PAN04_SHOT, await screenshot());
        }
        const aRows = rowsOf(g1Keys);
        expect(a.closed && a.closed.count === 3, `(a) closeGroup returned ${JSON.stringify(a.closed)}, want a count of 3`);
        expect(a.pending, '(a) G1 is not pending after closeGroup');
        expect(!a.listed, '(a) listGroups() still lists G1 during its undo window');
        expect(a.active === g2, `(a) the active group is ${a.active}, want G2 ${g2}`);
        expect(a.alive === 3, `(a) ${a.alive} of G1's 3 widgets are in the main panel at the click, want 3: the click closed tabs`);
        expect(aRows.length === 2 && aRows.every(r => r.closed_at == null && r.group_id === g1), `(a) the click wrote the rows: ${show(aRows)}`);
        expect(a.store.some(g => g.id === g1), `(a) the reader no longer lists G1 at the click: ${JSON.stringify(a.store)}`);
        detail(`(a) closeGroup(G1): pending ${a.pending}, listGroups lacks G1, active G2, ${a.alive} widgets alive; rows ${show(aRows)}; the reader still lists G1`);

        // (b) mode switches inside the window end nothing.
        const b = await run(`
            ${PROBES}
            const seen = [];
            for (const mode of ['coding', 'organising', 'browsing']) {
                await A.get('ModeService').activateMode(mode);
                await settle(() => document.body.dataset.pbMode === mode);
                seen.push({ mode: document.body.dataset.pbMode, pending: m.isClosing(S.g1), alive: alive(S.w1) });
            }
            return seen;
        `);
        for (const step of b) {
            expect(step.pending && step.alive === 3, `(b) after switching to ${step.mode}: pending ${step.pending}, ${step.alive} of 3 widgets alive`);
        }
        detail(`(b) ${b.map(s => `${s.mode}: pending ${s.pending}, ${s.alive} alive`).join('; ')}`);

        // (c) undo restores everything and writes nothing.
        const c = await run(`
            ${PROBES}
            const group = m.undoCloseGroup(S.g1);
            return {
                returned: !!group,
                restored: restored(S.g1, S.before),
                before: S.before,
                now: snap(S.g1),
                active: m.getActiveGroupId(),
                store: await storeGroups(),
            };
        `);
        const cRows = rowsOf(g1Keys);
        expect(c.returned && c.restored, `(c) undoCloseGroup did not restore G1: before ${JSON.stringify(c.before)}, now ${JSON.stringify(c.now)}`);
        expect(c.active === g1, `(c) after undo the active group is ${c.active}, want G1 ${g1}`);
        expect(cRows.every(r => r.closed_at == null && r.group_id === g1), `(c) the undo changed the rows: ${show(cRows)}`);
        expect(c.store.some(g => g.id === g1 && g.is_active === 1), `(c) the store's G1 is not the active group: ${JSON.stringify(c.store)}`);
        detail(`(c) undoCloseGroup(G1): index ${c.now && c.now.index}, title, x, y, w, h and card order [${c.now && c.now.keys.join(', ')}] equal; G1 active; store unchanged`);

        // (e) every tab bar during a window, Browsing then Coding, with /a current at the close.
        const e = await run(`
            ${PROBES}
            A.shell().activateWidget(S.a.id);
            const wasCurrent = await settle(() => current() === S.a);
            await m.closeGroup(A.actor(), S.g1);
            const labels = S.w1.map(labelOf);
            const look = async mode => {
                await A.get('ModeService').activateMode(mode);
                await settle(() => document.body.dataset.pbMode === mode);
                const ok = await settle(() => hiddenEverywhere(S.w1) && (mode !== 'browsing' || !painted().some(l => labels.includes(l))));
                return { mode, ok, bars: bars(S.w1), painted: mode === 'browsing' ? painted().filter(l => labels.includes(l)) : [], current: current() ? labelOf(current()) : null };
            };
            const browsing = await look('browsing');
            const coding = await look('coding');
            await A.get('ModeService').activateMode('browsing');
            await settle(() => document.body.dataset.pbMode === 'browsing');
            // P3: with isClosingKey stubbed to false the strip must paint a G1 tab.
            let p3;
            try {
                m.isClosingKey = () => false;
                strip().update();
                p3 = await settle(() => painted().some(l => labels.includes(l)));
            } finally {
                delete m.isClosingKey;
                strip().update();
            }
            const p3Restored = await settle(() => !painted().some(l => labels.includes(l)));
            const pending = m.isClosing(S.g1);
            m.undoCloseGroup(S.g1);
            return { wasCurrent, labels, browsing, coding, p3, p3Restored, pending, back: restored(S.g1, S.before), active: m.getActiveGroupId() };
        `);
        expect(e.wasCurrent, '(e) setup: /a never became the current tab, so the steering is untested');
        expect(e.pending, '(e) G1 left its undo window before the checks finished, so they prove nothing');
        for (const look of [e.browsing, e.coding]) {
            expect(look.ok, `(e) in ${look.mode} a G1 tab shows: dock bars ${JSON.stringify(look.bars)}, strip [${look.painted.join(' | ')}]`);
        }
        expect(e.back && e.active === g1, `(e) the undo after the checks did not restore G1 as the active group (active ${e.active})`);
        detail(`(e) Browsing, /a current at the close: the strip paints none of [${e.labels.join(' | ')}]; each G1 dock tab has pb-group-closing and display none; no bar's current title is a G1 widget (current: ${e.browsing.current})`);
        detail(`(e) Coding: each G1 dock tab has pb-group-closing and display none; no bar's current title is a G1 widget (current: ${e.coding.current})`);

        // (d) the timer, not the click, commits. Waits run node-side: one
        // page evaluation is bounded by the BiDi request timeout.
        const d0 = await run(`
            ${PROBES}
            await m.closeGroup(A.actor(), S.g1);
            const entry = m.listClosing().find(x => x.group.id === S.g1);
            return { now: Date.now(), deadline: entry ? entry.deadline : null };
        `);
        if (d0.deadline === null) {
            failures.push('(d) the second closeGroup(G1) opened no undo window (listClosing lacks G1)');
            return;
        }
        const t0 = d0.deadline - UNDO;
        await sleep(Math.max(0, t0 + UNDO - 3000 - Date.now()));
        const early = await run(`${PROBES} return { at: Date.now() - ${t0}, pending: m.isClosing(S.g1), alive: alive(S.w1) };`);
        const done = await waitUntil(() => run(`${PROBES} return committed(S.g1, S.w1) ? Date.now() - ${t0} : 0;`), UNDO + 10000, 125);
        const d = { early, done: !!done, at: done || Date.now() - t0 };
        const late = await run(`${PROBES} return { pending: m.isClosing(S.g1), alive: alive(S.w1) };`);
        expect(d.early.pending && d.early.alive === 3, `(d) at ${d.early.at} ms (deadline minus 3 s): pending ${d.early.pending}, ${d.early.alive} of 3 widgets alive -- the close did not wait for the timer`);
        expect(d.done, `(d) ${d.at} ms after the close: pending ${late.pending}, ${late.alive} of 3 widgets alive -- the timer never committed`);
        detail(`(d) at ${d.early.at} ms (UNDO_CLOSE_MS ${UNDO} minus 3 s): still pending, ${d.early.alive} widgets alive`);
        const pagesGone = await waitUntil(async () => {
            const live = (await topLevelContexts()).map(x => x.url);
            return [urls.a, urls.c].every(u => !live.includes(u));
        }, 10000);
        expect(pagesGone, `(d) a page of G1 is still a browsing context: ${JSON.stringify((await topLevelContexts()).map(x => x.url))}`);
        const dRows = await waitUntil(() => {
            const rows = rowsOf(g1Keys);
            return rows.length === 2 && rows.every(r => r.closed_at != null && r.group_id == null) ? rows : undefined;
        }, 10000);
        expect(dRows, `(d) G1's rows are not closed with group_id null: ${show(rowsOf(g1Keys))}`);
        const dStore = await waitUntil(async () => {
            const store = await run(`${PROBES} return storeGroups();`);
            return !store.some(g => g.id === g1) && store.some(g => g.id === g2 && g.is_active === 1) ? store : undefined;
        }, 10000);
        expect(dStore, `(d) the reader still lists G1 or G2 is not active: ${JSON.stringify(await run(`${PROBES} return storeGroups();`))}`);
        detail(`(d) committed at ${d.at} ms: widgets gone, pages gone, rows ${show(rowsOf(g1Keys))}; the reader lists ${JSON.stringify(dStore)}`);

        // Probe controls, each restored afterwards.
        const p1 = await run(`
            ${PROBES}
            S.w3 = [S.p];
            S.before3 = snap(S.g3);
            await m.closeGroup(A.actor(), S.g3);
            let red;
            try {
                m.undoCloseGroup = () => undefined;
                m.undoCloseGroup(S.g3);
                red = !restored(S.g3, S.before3);
            } finally {
                delete m.undoCloseGroup;
            }
            m.undoCloseGroup(S.g3);
            return { red, back: restored(S.g3, S.before3) };
        `);
        await run(`
            ${PROBES}
            m.commitClose = async () => undefined;
            await m.closeGroup(A.actor(), S.g3);
        `);
        let p2;
        try {
            await sleep(UNDO + 2000);
            p2 = { red: await run(`${PROBES} return !committed(S.g3, S.w3);`) };
        } finally {
            await run(`${PROBES} delete m.commitClose;`);
        }
        p2.done = await run(`
            ${PROBES}
            await m.commitAllClosing(A.actor());
            return settle(() => committed(S.g3, S.w3), 80);
        `);
        const controls = [
            ['undoCloseGroup stubbed to a no-op', p1.red],
            ['commitClose stubbed to a no-op', p2.red],
        ];
        for (const [name, red] of controls) {
            expect(red, `probe control ${name} did not go red -- the probe cannot see that fault`);
        }
        expect(p1.back, 'probe control undoCloseGroup was not restored: the real undo did not bring G3 back');
        expect(p2.done, 'probe control commitClose was not restored: commitAllClosing did not commit G3');
        expect(e.p3, 'probe control isClosingKey stubbed to false did not go red -- the probe cannot see that fault');
        expect(e.p3Restored, 'probe control isClosingKey was not restored: the strip still paints a G1 tab');

        // (f) set up G4 with /q1 and /q2, close it, and quit inside its window.
        const f0 = await run(`
            ${PROBES}
            const q = ${JSON.stringify(qUrls)};
            S.q = [];
            for (const u of q) S.q.push(await A.open(u));
            return S.q.map(keyOf);
        `);
        if (!await waitUntil(() => rowsOf(f0).length === 2, 15000)) {
            failures.push(`(f) setup: /q1 and /q2 have no rows within 15 s: ${show(tabsOf(profile))}`);
            return undefined;
        }
        const f1 = await run(`
            ${PROBES}
            const keys = ${JSON.stringify(f0)};
            await settle(() => keys.every(k => m.listUngrouped().some(t => t.uri === k)), 80);
            const g4 = await m.createGroup(A.actor(), { x: 480, y: 400 });
            for (const k of keys) await m.moveCard(A.actor(), k, g4.id);
            S.g4 = g4.id;
            return { g4: g4.id, members: m.getTabs(g4.id).map(t => t.uri) };
        `);
        if (!await waitUntil(() => rowsOf(f0).every(r => r.group_id === f1.g4), 10000)) {
            failures.push(`(f) setup: /q1 and /q2 never joined G4 ${f1.g4} in the store: ${show(rowsOf(f0))}`);
            return undefined;
        }
        const f2 = await run(`
            ${PROBES}
            await m.closeGroup(A.actor(), S.g4);
            const entry = m.listClosing().find(x => x.group.id === S.g4);
            return { deadline: entry ? entry.deadline : null, now: Date.now() };
        `);
        if (f2.deadline === null || f2.deadline - Date.now() < 3000) {
            failures.push(`(f) the quit cannot start inside G4's window: deadline ${f2.deadline}, now ${Date.now()}`);
            return undefined;
        }
        return { g4: f1.g4, keys: f0, quitAt: Date.now(), deadline: f2.deadline, sUrl: urls.s };
    });
    if (!first || failures.length) {
        return;
    }
    const exitedAt = Date.now();
    detail(`(f) quit started ${first.deadline - first.quitAt} ms before G4's deadline; the browser exited ${exitedAt - first.quitAt} ms after the quit started`);

    // (f) relaunch on the same profile: nothing of G4 comes back.
    await withShell(profile, async ({ run, topLevelContexts }) => {
        const f = await run(`
            ${PROBES}
            await settle(() => m.isLoaded, 160);
            // The restore ran: G2's /s, open at the quit, is back.
            const restoredS = await settle(() => A.webTabs().some(w => w.url === ${JSON.stringify(first.sUrl)}), 160);
            await A.sleep(1500);
            const keys = ${JSON.stringify(first.keys)};
            const q = ${JSON.stringify(qUrls)};
            return {
                restoredS,
                reader: (await A.reader().listGroups()).map(g => ({ id: g.id, title: g.title, is_active: g.is_active })),
                open: A.webTabs().filter(w => keys.includes(w.rowKey) || q.includes(w.url)).map(w => w.url),
                loose: m.listUngrouped().filter(t => keys.includes(t.uri)).map(t => t.uri),
                carded: m.listGroups().flatMap(g => m.getTabs(g.id)).filter(t => keys.includes(t.uri)).map(t => t.uri),
                groups: m.listGroups().map(g => g.id),
            };
        `);
        const live = (await topLevelContexts()).map(x => x.url);
        const qRows = rowsOf(first.keys);
        expect(f.restoredS, '(f) after the relaunch the session restore never reopened /s, so the absence of /q1 and /q2 proves nothing');
        expect(!f.reader.some(g => g.id === first.g4), `(f) after the relaunch the reader lists G4: ${JSON.stringify(f.reader)}`);
        expect(!f.groups.includes(first.g4), `(f) after the relaunch the model shows G4 as a box: [${f.groups.join(', ')}]`);
        expect(!f.open.length && !qUrls.some(u => live.includes(u)), `(f) a G4 tab came back after the relaunch: web tabs [${f.open.join(', ')}], contexts ${JSON.stringify(live)}`);
        expect(qRows.length === 2 && qRows.every(r => r.closed_at != null && r.group_id == null), `(f) G4's rows are not closed with group_id null: ${show(qRows)}`);
        expect(!f.loose.length && !f.carded.length, `(f) the model has cards for G4's tabs: loose [${f.loose.join(', ')}], grouped [${f.carded.join(', ')}]`);
        detail(`(f) relaunch: /s restored; the reader lists ${JSON.stringify(f.reader)} (no G4 ${first.g4}); no web tab on /q1 or /q2; rows ${show(qRows)}; no loose or grouped card for them`);
    });
    if (!failures.length) {
        detail('probe controls: 3 planted page faults each turned their probe red');
    }
});
