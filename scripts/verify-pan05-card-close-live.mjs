#!/usr/bin/env node
// scripts/verify-pan05-card-close-live.mjs -- PAN-05 (Phase 22): a Panorama
// card closes its own tab, from its x or the Delete key, exactly as the strip's
// x does (22-UI-SPEC A8, A9). It proves, on the built binary, in the Organising
// canvas:
//   (a) a click on /a's card x disposes its widget, its page leaves the
//       top-level contexts, its row is closed, and G's other cards and G itself
//       are untouched; after a reload the card is still gone;
//   (b) a press on /c's x with a 10 px move starts no card drag, and a double
//       click on it opens nothing and switches no mode;
//   (c) Delete on the focused terminal card closes the terminal, and focus
//       moves to the next card in the scope;
//   (d) a dirty file editor's x opens Theia's save prompt; Cancel keeps the
//       card, the editor and its unsaved text, and the file is unchanged;
//   (e) a card whose tab is not open closes by marking its row closed: it is
//       gone after a reload and no widget opened;
//   (f) G2, emptied by (e), stays and shows the empty-group hint; no close
//       wrote a membership, order or dissolve mutation;
//   (g) each card scope has exactly one tab stop and every card x has
//       tabIndex -1; a focused card shows its x.
//
// Auto-save is switched off on the in-memory SaveableService for step (d):
// with the browser default (afterDelay) Theia's own close saves a dirty editor
// instead of prompting, which loses nothing but shows no prompt to cancel.
//
// Full tier only: the built binary, a Theia build and a headless browser.
// Like the other ng-a-live rows it has no --self-test. In-run probe controls
// stand in for one: each plants a page fault (every card x made tabbable, the
// closeTab write swallowed for a second not-open card) and requires the probe
// that passed to go red, so every probe is shown able to fail.
//
// PB_PAN05_SHOT=<path> writes a screenshot with a card focused, showing its x.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newProfile, runCheck, show, tabsOf, waitUntil, withShell } from './lib/ng-a-live.mjs';

const NAME = 'pan05-card-close-live';
const GONE = ['terminal:pan05-gone', 'terminal:pan05-gone2'];
const MEMBERSHIP_KINDS = ['setTabGroup', 'setGroupOrder', 'dissolveGroup', 'closeGroup'];

// Shared by the real assertions and the probe controls. No backticks inside.
const PROBES = `
    const S = window.__pan05 = window.__pan05 || {};
    const m = A.model();
    const keyOf = w => m.keyOf(w);
    const settle = async (test, n) => { for (let i = 0; i < (n || 40) && !test(); i++) await A.sleep(125); return !!test(); };
    const alive = w => !!w && !w.isDisposed && A.mainWidgets().includes(w);
    const at = id => '[data-g="' + CSS.escape(id) + '"]';
    const canvas = () => document.querySelector('.pb-org-canvas');
    const cardOf = key => canvas().querySelector('.pb-org-card[data-u="' + CSS.escape(key) + '"]');
    const xOf = key => { const c = cardOf(key); return c ? c.querySelector('.pb-org-card-close') : null; };
    const keysOf = id => m.getTabs(id).map(t => t.uri);
    // The tab-stop probe: every card scope on the canvas with its tabIndex-0 count, and every x.
    const stops = () => {
        const scopes = Array.from(canvas().querySelectorAll('.pb-org-box-cards'))
            .filter(s => s.querySelector('.pb-org-card'))
            .map(s => ({ name: s.closest('.pb-org-box').dataset.g, els: Array.from(s.querySelectorAll('*')) }));
        const loose = Array.from(canvas().children).filter(c => c.matches('.pb-org-card.is-loose') && !c.hidden);
        if (loose.length) scopes.push({ name: 'loose', els: loose.flatMap(c => [c].concat(Array.from(c.querySelectorAll('*')))) });
        const xs = Array.from(document.querySelectorAll('.pb-org-card-close'));
        return {
            scopes: scopes.map(s => ({ name: s.name, stops: s.els.filter(e => e.tabIndex === 0).length })),
            xs: xs.length,
            tabbableX: xs.filter(x => x.tabIndex !== -1).length,
        };
    };
    const stopsOk = r => r.scopes.length > 0 && r.scopes.every(s => s.stops === 1) && r.xs > 0 && r.tabbableX === 0;
    // Mutation kinds the model sends while a close runs (the spy is installed once).
    const actor = A.actor();
    if (!S.spied) {
        S.kinds = [];
        const real = actor.mutate;
        actor.mutate = function (msg) { S.kinds.push(msg && msg.kind); return real.call(this, msg); };
        S.spied = true;
    }
`;

await runCheck(`verify-${NAME}`, async ({ pages, expect, failures }) => {
    const detail = line => console.log(`${NAME}: ${line}`);
    const profile = newProfile('pan05');
    const dir = mkdtempSync(join(tmpdir(), 'pan05-'));
    const file = join(dir, 'pan05.txt');
    const CLEAN = 'pan05 clean\n';
    writeFileSync(file, CLEAN);
    const urls = { a: pages.url('/a'), c: pages.url('/c'), l: pages.url('/l') };
    const rowOf = key => tabsOf(profile).find(r => r.uri === key);
    try {
        await withShell(profile, async ({ run, topLevelContexts, screenshot }) => {
            // Setup: G holds /a, /c, a terminal and a file editor; G2 is empty; /l is loose.
            const keys = await run(`
                ${PROBES}
                await A.get('ModeService').activateMode('browsing');
                await settle(() => m.isLoaded, 160);
                const urls = ${JSON.stringify(urls)};
                for (const n of Object.keys(urls)) S[n] = await A.open(urls[n]);
                const main = { widgetOptions: { area: 'main' } };
                S.t = await A.open('terminal:pan05-t', main);
                S.e = await A.open(${JSON.stringify(`file://${file}`)}, main);
                S.k = Object.fromEntries(['a', 'c', 'l', 't', 'e'].map(n => [n, keyOf(S[n])]));
                return S.k;
            `);
            const web = [keys.a, keys.c, keys.l];
            if (!await waitUntil(() => web.every(rowOf), 15000)) {
                failures.push(`setup: not every web tab has a row within 15 s: ${show(tabsOf(profile))}`);
                return;
            }
            const setup = await run(`
                ${PROBES}
                await settle(() => Object.values(S.k).every(k => m.listUngrouped().some(t => t.uri === k)), 80);
                const g = await m.createGroup(A.actor(), { x: 40, y: 40 });
                for (const k of [S.k.a, S.k.c, S.k.t, S.k.e]) await m.moveCard(A.actor(), k, g.id);
                const g2 = await m.createGroup(A.actor(), { x: 520, y: 40 });
                S.g = g.id; S.g2 = g2.id;
                const org = await A.organising();
                org.showCanvasView();
                const drawn = await settle(() => keysOf(S.g).every(k => xOf(k)));
                return { g: g.id, g2: g2.id, members: keysOf(S.g), drawn };
            `);
            const want = [keys.a, keys.c, keys.t, keys.e];
            if (JSON.stringify(setup.members) !== JSON.stringify(want) || !setup.drawn) {
                failures.push(`setup: G holds [${setup.members.join(', ')}], want [${want.join(', ')}]; every card drawn with its x: ${setup.drawn}`);
                return;
            }
            const membershipWrites = [];

            // (a) the x on /a's card.
            const a = await run(`
                ${PROBES}
                S.kinds.length = 0;
                const groups = m.listGroups().map(g => g.id);
                xOf(S.k.a).click();
                const disposed = await settle(() => S.a.isDisposed);
                await A.sleep(300);
                return {
                    disposed,
                    card: !!cardOf(S.k.a),
                    members: keysOf(S.g),
                    others: [S.c, S.t, S.e].every(alive),
                    groups: m.listGroups().map(g => g.id).join() === groups.join(),
                    dialog: !!document.querySelector('.dialogOverlay'),
                    kinds: S.kinds.slice(),
                };
            `);
            membershipWrites.push(...a.kinds.filter(k => MEMBERSHIP_KINDS.includes(k)));
            const aClosed = await waitUntil(() => rowOf(keys.a)?.closed_at != null, 10000);
            const aPage = await waitUntil(async () => !(await topLevelContexts()).some(x => x.url === urls.a), 10000);
            const aAfter = await run(`
                ${PROBES}
                await A.organising();
                return { card: !!cardOf(S.k.a), model: m.listGroups().some(g => keysOf(g.id).includes(S.k.a)) || m.listUngrouped().some(t => t.uri === S.k.a) };
            `);
            expect(a.disposed, '(a) clicking /a\'s card x did not dispose its widget');
            expect(!a.dialog, '(a) clicking /a\'s card x opened a dialog');
            expect(!a.card, '(a) /a\'s card is still on the canvas after its x');
            expect(JSON.stringify(a.members) === JSON.stringify([keys.c, keys.t, keys.e]) && a.others && a.groups, `(a) G's other cards or the groups changed: members [${a.members.join(', ')}], others alive ${a.others}, groups unchanged ${a.groups}`);
            expect(aClosed, `(a) /a's row is not closed: ${show([rowOf(keys.a)].filter(Boolean))}`);
            expect(aPage, '(a) /a\'s page is still a top-level context');
            expect(!aAfter.card && !aAfter.model, `(a) after a reload /a has a card again: DOM ${aAfter.card}, model ${aAfter.model}`);
            detail(`(a) x on /a: widget disposed, no dialog, page gone, row ${show([rowOf(keys.a)])}; G is [${a.members.join(', ')}] with every widget alive; after a reload no card`);

            // (b) a press with a move, and a double click, on /c's x.
            const b = await run(`
                ${PROBES}
                const x = xOf(S.k.c);
                const r = x.getBoundingClientRect();
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                const ev = (type, dx) => new PointerEvent(type, { bubbles: true, cancelable: true, clientX: cx + dx, clientY: cy, pointerId: 7, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true });
                const index = keysOf(S.g).indexOf(S.k.c);
                x.dispatchEvent(ev('pointerdown', 0));
                window.dispatchEvent(ev('pointermove', 5));
                window.dispatchEvent(ev('pointermove', 10));
                await A.sleep(150);
                const during = { ghost: !!document.querySelector('.pb-org-card-ghost'), dragging: !!document.querySelector('.pb-org-card.is-dragging') };
                window.dispatchEvent(ev('pointerup', 10));
                await A.sleep(300);
                const after = { index: keysOf(S.g).indexOf(S.k.c), alive: alive(S.c), ghost: !!document.querySelector('.pb-org-card-ghost') };
                const current = A.shell().currentWidget;
                const mode = document.body.dataset.pbMode;
                xOf(S.k.c).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
                await A.sleep(1500);
                return { index, during, after, sameCurrent: A.shell().currentWidget === current, mode, modeNow: document.body.dataset.pbMode, alive: alive(S.c) };
            `);
            expect(!b.during.ghost && !b.during.dragging && !b.after.ghost, `(b) a press on the x with a 10 px move started a card drag: during ${JSON.stringify(b.during)}, after ${JSON.stringify(b.after)}`);
            expect(b.after.index === b.index && b.after.alive, `(b) after the press /c is at index ${b.after.index} (was ${b.index}), alive ${b.after.alive}`);
            expect(b.sameCurrent && b.modeNow === b.mode && b.alive, `(b) a double click on the x changed the current widget (${!b.sameCurrent}) or the mode (${b.mode} -> ${b.modeNow}), or closed /c`);
            detail(`(b) x on /c: a press and 10 px move made no ghost and no drag, /c stays at index ${b.after.index}; a double click left the current widget and the ${b.modeNow} mode unchanged`);

            // (c) Delete on the focused terminal card.
            const c = await run(`
                ${PROBES}
                S.kinds.length = 0;
                const card = cardOf(S.k.t);
                const scope = Array.from(card.closest('.pb-org-box-cards').querySelectorAll('.pb-org-card')).filter(x => !x.hidden).map(x => x.dataset.u);
                const i = scope.indexOf(S.k.t);
                const next = scope[i + 1] !== undefined ? scope[i + 1] : scope[i - 1];
                card.focus();
                card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
                const disposed = await settle(() => S.t.isDisposed);
                const focused = await settle(() => !!document.activeElement && document.activeElement.dataset.u === next);
                const el = document.activeElement;
                return { scope, next, disposed, focused, now: el ? (el.dataset.u || el.className) : null, card: !!cardOf(S.k.t), kinds: S.kinds.slice() };
            `);
            membershipWrites.push(...c.kinds.filter(k => MEMBERSHIP_KINDS.includes(k)));
            expect(c.disposed && !c.card, `(c) Delete on the focused terminal card did not close it: disposed ${c.disposed}, card ${c.card}`);
            expect(c.focused, `(c) after Delete focus is on ${c.now}, want the next card in the scope ${c.next} (scope [${c.scope.join(', ')}])`);
            detail(`(c) Delete on the focused terminal card: disposed, focus on ${c.now} (next in [${c.scope.join(', ')}])`);

            // (d) a dirty editor prompts; Cancel keeps everything.
            const d = await run(`
                ${PROBES}
                const saveables = A.get('SaveableService');
                S.autoSaveWas = saveables.autoSave;
                saveables.autoSave = 'off';
                const doc = S.e.editor && S.e.editor.document;
                const text = doc && doc.textEditorModel;
                if (!text) return { setup: 'no text model on the editor: widget ' + (S.e && S.e.constructor && S.e.constructor.name) + ', editor ' + typeof (S.e && S.e.editor) + ', document ' + typeof doc };
                text.setValue('pan05 dirty\\n');
                const dirty = await settle(() => !!S.e.saveable && S.e.saveable.dirty);
                xOf(S.k.e).click();
                const dialog = await settle(() => !!document.querySelector('.dialogOverlay'));
                const overlay = document.querySelector('.dialogOverlay');
                const title = overlay ? (overlay.querySelector('.dialogTitle') || overlay).textContent.trim() : null;
                const cancel = overlay ? Array.from(overlay.querySelectorAll('.dialogControl button')).find(x => x.textContent.trim() === 'Cancel') : undefined;
                if (cancel) cancel.click();
                const shut = await settle(() => !document.querySelector('.dialogOverlay'));
                await A.sleep(500);
                return { autoSave: S.autoSaveWas, dirty, dialog, title, cancelled: !!cancel, shut, alive: alive(S.e), card: !!cardOf(S.k.e), member: keysOf(S.g).includes(S.k.e), stillDirty: !!S.e.saveable && S.e.saveable.dirty };
            `);
            const onDisk = readFileSync(file, 'utf8');
            await run(`
                ${PROBES}
                await S.e.closeWithoutSaving();
                A.get('SaveableService').autoSave = S.autoSaveWas;
            `);
            if (d.setup || !d.dirty) {
                failures.push(`(d) setup: ${d.setup || 'the editor never became dirty'}, so the save prompt cannot be reached`);
            } else {
                expect(d.dialog && d.cancelled, `(d) the dirty editor's card x opened no save prompt with Cancel (dialog ${d.dialog}, title ${JSON.stringify(d.title)}): the close discards unsaved changes`);
                expect(d.shut, '(d) the save prompt did not close on Cancel');
                expect(d.alive && d.card && d.member && d.stillDirty, `(d) after Cancel: editor alive ${d.alive}, card ${d.card}, in G ${d.member}, still dirty ${d.stillDirty}`);
                expect(onDisk === CLEAN, `(d) the file changed on disk after Cancel: ${JSON.stringify(onDisk)}`);
            }
            detail(`(d) dirty editor (auto-save was ${d.autoSave}, set off): x opened ${JSON.stringify(d.title)}; Cancel kept the card, the editor and its unsaved text, the file unchanged`);

            // (e) a not-open card closes by marking its row closed.
            const e = await run(`
                ${PROBES}
                const gone = ${JSON.stringify(GONE)};
                const writes = [];
                for (const uri of gone) {
                    writes.push(await A.mutate({ kind: 'trackTab', uri, url: '', title: uri === gone[0] ? 'pan05 gone' : 'pan05 gone two' }));
                    writes.push(await A.mutate({ kind: 'setTabGroup', uri, groupId: S.g2 }));
                }
                await A.organising();
                const drawn = await settle(() => gone.every(k => xOf(k)));
                const card = m.getTabs(S.g2).find(t => t.uri === gone[0]);
                S.kinds.length = 0;
                xOf(gone[0]).click();
                const left = await settle(() => !cardOf(gone[0]));
                return { writes: writes.filter(w => !w.ok).map(w => w.message), drawn, open: card ? card.open : 'missing', left, kinds: S.kinds.slice() };
            `);
            if (e.writes.length || !e.drawn) {
                failures.push(`(e) setup: the not-open rows were not drawn in G2 (${e.drawn}): ${e.writes.join('; ')}`);
                return;
            }
            membershipWrites.push(...e.kinds.filter(k => MEMBERSHIP_KINDS.includes(k)));
            const eClosed = await waitUntil(() => rowOf(GONE[0])?.closed_at != null, 10000);
            // The probe (e): after a reload the card is absent and no widget opened for it.
            const PROBE_E = key => `
                ${PROBES}
                await A.organising();
                await A.sleep(300);
                return { card: !!cardOf(${JSON.stringify(key)}), model: keysOf(S.g2).includes(${JSON.stringify(key)}), widget: A.mainWidgets().some(w => keyOf(w) === ${JSON.stringify(key)}) };
            `;
            const eAfter = await run(PROBE_E(GONE[0]));
            expect(e.open === false, `(e) the not-open card has open ${JSON.stringify(e.open)}, want false`);
            expect(e.left, '(e) the not-open card is still on the canvas after its x');
            expect(eClosed, `(e) the not-open card's row is not closed: ${show([rowOf(GONE[0])].filter(Boolean))}`);
            expect(!eAfter.card && !eAfter.model && !eAfter.widget, `(e) after a reload the not-open card is back or opened: ${JSON.stringify(eAfter)}`);
            detail(`(e) not-open card (open ${e.open}): x marked its row closed ${show([rowOf(GONE[0])])}; after a reload no card and no widget`);

            // Probe control P2: swallow the closeTab write for the second not-open card.
            const p2 = await run(`
                ${PROBES}
                const key = ${JSON.stringify(GONE[1])};
                const real = actor.mutate;
                try {
                    actor.mutate = function (msg) {
                        if (msg && msg.kind === 'closeTab' && msg.uri === key) return Promise.resolve(undefined);
                        return real.call(this, msg);
                    };
                    xOf(key).click();
                    await settle(() => !cardOf(key));
                } finally {
                    actor.mutate = real;
                }
                return true;
            `);
            const p2After = await run(PROBE_E(GONE[1]));
            const p2Red = p2 && (p2After.card || p2After.model);
            const p2Done = await run(`
                ${PROBES}
                const key = ${JSON.stringify(GONE[1])};
                S.kinds.length = 0;
                if (xOf(key)) xOf(key).click();
                return { left: await settle(() => !cardOf(key)), kinds: S.kinds.slice() };
            `);
            membershipWrites.push(...p2Done.kinds.filter(k => MEMBERSHIP_KINDS.includes(k)));
            const p2Closed = await waitUntil(() => rowOf(GONE[1])?.closed_at != null, 10000);
            expect(p2Red, `probe control closeTab swallowed did not go red -- the probe cannot see that fault (${JSON.stringify(p2After)})`);
            expect(p2Done.left && p2Closed, 'probe control closeTab swallowed was not restored: the second not-open card did not close for real');

            // (f) G2, emptied by its cards' x, stays with the empty hint.
            const f = await run(`
                ${PROBES}
                await A.organising();
                return { listed: m.listGroups().some(g => g.id === S.g2), tabs: m.getTabs(S.g2).length, hint: !!canvas().querySelector('.pb-org-box' + at(S.g2) + ' .pb-org-box-empty') };
            `);
            expect(f.listed && f.tabs === 0 && f.hint, `(f) G2 after its last card's x: listed ${f.listed}, ${f.tabs} cards, empty hint ${f.hint}`);
            expect(!membershipWrites.length, `(f) a card close wrote membership: ${membershipWrites.join(', ')}`);
            detail(`(f) G2 emptied by the x: still listed, 0 cards, shows the empty-group hint; the closes wrote no ${MEMBERSHIP_KINDS.join('/')} mutation`);

            // (g) one tab stop per scope; every x is tabIndex -1. P1 makes every x tabbable.
            const g = await run(`
                ${PROBES}
                const org = await A.organising();
                const real = stops();
                let planted;
                try {
                    for (const x of document.querySelectorAll('.pb-org-card-close')) x.tabIndex = 0;
                    planted = stops();
                } finally {
                    org.render();
                }
                const restored = stops();
                const card = cardOf(S.k.c);
                card.focus();
                await A.sleep(400);
                const shown = getComputedStyle(xOf(S.k.c)).opacity;
                return { real, ok: stopsOk(real), red: !stopsOk(planted), restored: stopsOk(restored), shown };
            `);
            expect(g.ok, `(g) tab stops: ${JSON.stringify(g.real)}, want exactly one per scope and every x at tabIndex -1`);
            expect(g.shown === '1', `(g) the focused card's x has opacity ${g.shown}, want 1`);
            expect(g.red, 'probe control every x tabbable did not go red -- the probe cannot see that fault');
            expect(g.restored, 'probe control every x tabbable was not restored: a re-render left a tabbable x');
            if (process.env.PB_PAN05_SHOT) {
                writeFileSync(process.env.PB_PAN05_SHOT, await screenshot());
            }
            detail(`(g) tab stops ${g.real.scopes.map(s => `${s.name === 'loose' ? 'loose' : 'group'} ${s.stops}`).join(', ')}; ${g.real.xs} card x, ${g.real.tabbableX} tabbable; the focused card shows its x (opacity ${g.shown})`);
        });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    if (!failures.length) {
        detail('probe controls: 2 planted page faults each turned their probe red');
    }
});
