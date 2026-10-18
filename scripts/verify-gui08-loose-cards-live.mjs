#!/usr/bin/env node
// scripts/verify-gui08-loose-cards-live.mjs -- PAN-07 (Phase 21): the live DOM
// half that gui08-canvas-geometry holds out. On a fresh profile with zero
// groups, ungrouped tabs are .pb-org-card.is-loose cards on the Organising
// canvas beside the "No tab groups" panel, never under it; no element carries
// a pb-org-tray class; ArrowRight moves focus between loose cards with one
// tab stop; and after a group is created the loose cards stay on the canvas.
//
// Full tier only: the built binary, a Theia build and a headless browser.
// Like the other ng-a-live rows it has no --self-test. Three in-run probe
// controls stand in for one: each plants a page fault (renderLoose stubbed,
// moveCardFocus stubbed, a tray element appended) and requires the same probe
// that passed to go red, so every probe is shown able to fail.
//
// PB_GUI08_LOOSE_SHOT=<path> writes a screenshot of the zero-group canvas.

import { writeFileSync } from 'node:fs';
import { newProfile, runCheck, withShell } from './lib/ng-a-live.mjs';

const NAME = 'gui08-loose-cards-live';
const KEYS_OF = ['a', 'b', 'c'].map(s => `terminal:gui08-loose-${s}`);

// The probes, shared by the real assertions and the probe controls, so a
// control proves the very code that passed can fail. No backticks inside.
const PROBES = `
    const canvas = () => document.querySelector('.pb-org-canvas');
    const loose = () => Array.from(canvas().querySelectorAll('.pb-org-card.is-loose'));
    const visibleLoose = () => loose().filter(c => !c.hidden);
    const cardFor = key => canvas().querySelector(':scope > .pb-org-card.is-loose[data-u="' + CSS.escape(key) + '"]');
    const trayProbe = () => ({
        tray: document.querySelectorAll('[class*="pb-org-tray"]').length,
        cards: document.querySelectorAll('[class*="pb-org-card"]').length,
    });
    const arrowProbe = () => {
        const cards = visibleLoose();
        const first = cards.find(c => c.tabIndex === 0);
        if (!first) return { error: 'no visible loose card has tabIndex 0 (' + cards.length + ' visible)' };
        first.focus();
        const focused = document.activeElement === first;
        first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        const now = document.activeElement;
        return {
            visible: cards.length,
            focused,
            moved: now !== first && cards.includes(now),
            stops: visibleLoose().filter(c => c.tabIndex === 0).length,
            firstKey: first.dataset.u,
            nowKey: now && now.dataset ? now.dataset.u || now.className : String(now),
        };
    };
    // Visible loose cards not wholly inside the canvas host's box: clipped or scrolled off.
    const outside = () => {
        const h = document.querySelector('.pb-org-canvas-host').getBoundingClientRect();
        return visibleLoose().map(c => ({ key: c.dataset.u, b: c.getBoundingClientRect() }))
            .filter(({ b }) => b.left < h.left || b.top < h.top || b.right > h.right || b.bottom > h.bottom)
            .map(({ key, b }) => ({ key, rect: [b.left, b.top, b.right, b.bottom], host: [h.left, h.top, h.right, h.bottom] }));
    };
    const rect = el => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; };
    const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    // Visible loose cards that overlap any canvas element matching sel.
    const overlapping = sel => {
        const others = Array.from(canvas().querySelectorAll(sel)).map(rect);
        return visibleLoose().map(c => ({ key: c.dataset.u, rect: rect(c) })).filter(({ rect: b }) => others.some(o => hits(b, o)));
    };
    // Visible loose cards not wholly on the .pb-org-canvas placement surface.
    const offCanvas = () => {
        const k = rect(canvas());
        return visibleLoose().map(c => ({ key: c.dataset.u, rect: rect(c) }))
            .filter(({ rect: b }) => b.left < k.left || b.top < k.top || b.right > k.right || b.bottom > k.bottom);
    };
    const settle = async test => { for (let i = 0; i < 40 && !test(); i++) await A.sleep(125); };
`;

await runCheck(`verify-${NAME}`, async ({ expect, failures }) => {
    const detail = line => console.log(`${NAME}: ${line}`);
    const profile = newProfile('gui08loose');
    await withShell(profile, async ({ run, screenshot }) => {
        // (a) zero groups, (b) no tray, (c) keyboard.
        const zero = await run(`
            ${PROBES}
            let org = await A.organising();
            const groupsBefore = A.model().listGroups().length;
            if (groupsBefore !== 0) return { groupsBefore };
            const main = { widgetOptions: { area: 'main' } };
            const widgets = [];
            for (const key of ${JSON.stringify(KEYS_OF)}) widgets.push(await A.open(key, main));
            await A.sleep(1500);
            org = await A.organising();
            const keys = [];
            for (const w of widgets) keys.push(await A.cardKey(w));
            org = await A.organising();
            await settle(() => keys.every(k => cardFor(k)));
            const empty = canvas().querySelector('.pb-org-empty');
            const emptyRect = empty ? rect(empty) : null;
            const overlaps = overlapping('.pb-org-empty');
            return {
                groupsBefore,
                keys,
                missing: keys.filter(k => !cardFor(k)),
                empty: !!empty,
                emptyRect,
                looseDom: loose().length,
                looseModel: A.model().listUngrouped().length,
                overlaps,
                outside: outside(),
                flat: [empty].concat(visibleLoose()).filter(el => el && !(el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0)).map(el => el.dataset.u || el.className),
                tray: trayProbe(),
                arrow: arrowProbe(),
            };
        `);
        if (zero.groupsBefore !== 0) {
            failures.push(`a fresh profile starts with ${zero.groupsBefore} group(s), want 0, so the zero-group canvas cannot be seen`);
            return;
        }
        expect(zero.missing.length === 0, `zero groups: no .pb-org-canvas > .pb-org-card.is-loose card for ${zero.missing.join(', ')} (keys ${zero.keys.join(', ')})`);
        expect(zero.empty, 'zero groups: the "No tab groups" panel (.pb-org-empty) is not on the canvas');
        expect(zero.looseDom === zero.looseModel, `zero groups: ${zero.looseDom} loose card(s) on the canvas, but the model has ${zero.looseModel} ungrouped tab(s)`);
        expect(zero.flat.length === 0, `zero groups: element(s) with no laid-out area, so the overlap probe cannot see them: ${zero.flat.join(', ')}`);
        expect(zero.overlaps.length === 0, `zero groups: loose card(s) overlap the "No tab groups" panel ${JSON.stringify(zero.emptyRect)}: ${JSON.stringify(zero.overlaps)}`);
        expect(zero.outside.length === 0, `zero groups: loose card(s) not wholly inside the canvas host, so they are clipped: ${JSON.stringify(zero.outside)}`);
        detail(`zero groups: ${zero.keys.length} terminal tabs are loose cards beside the empty panel (no overlap, all inside the canvas host); DOM loose ${zero.looseDom} = model ungrouped ${zero.looseModel}`);
        expect(zero.tray.cards > 0, 'no tray: the positive control found no pb-org-card element, so the query did not run in the Theia document');
        expect(zero.tray.tray === 0, `no tray: ${zero.tray.tray} element(s) carry a pb-org-tray class`);
        detail(`no tray: 0 pb-org-tray elements beside ${zero.tray.cards} pb-org-card elements`);
        const a = zero.arrow;
        if (a.error) {
            failures.push(`keyboard: ${a.error}`);
        } else {
            expect(a.focused, `keyboard: focusing the tabbable loose card ${a.firstKey} did not make it document.activeElement`);
            expect(a.moved, `keyboard: ArrowRight on ${a.firstKey} left focus on ${a.nowKey}, not another loose card (if the synthetic keydown never reached the card listener, this probe cannot see the keyboard path)`);
            expect(a.stops === 1, `keyboard: ${a.stops} visible loose cards have tabIndex 0 after ArrowRight, want exactly 1`);
            detail(`keyboard: ArrowRight moved focus ${a.firstKey} -> ${a.nowKey} across ${a.visible} visible loose cards, ${a.stops} tab stop`);
        }

        if (process.env.PB_GUI08_LOOSE_SHOT) {
            writeFileSync(process.env.PB_GUI08_LOOSE_SHOT, await screenshot());
            detail(`screenshot of the zero-group canvas: ${process.env.PB_GUI08_LOOSE_SHOT}`);
        }

        // (a2) a short host (a bottom panel open, a small window): the bottom
        // line would run through the in-flow panel, so it must start below it
        // and stay on the canvas, which grows and lets the host scroll.
        const short = await run(`
            ${PROBES}
            const org = await A.organising();
            const host = document.querySelector('.pb-org-canvas-host');
            const saved = host.getAttribute('style');
            try {
                host.style.flex = 'none';
                host.style.boxSizing = 'border-box';
                host.style.height = '300px';
                org.render();
                const out = { hostH: host.clientHeight, visible: visibleLoose().length, overlaps: overlapping('.pb-org-empty'), offCanvas: offCanvas() };
                // Control: the bottom line alone (minTop dropped) must overlap
                // the panel here, or 300px is not short enough to test anything.
                const real = Object.getPrototypeOf(org).renderLoose;
                org.renderLoose = function () { return real.call(this); };
                org.render();
                out.control = overlapping('.pb-org-empty').length;
                return out;
            } finally {
                delete org.renderLoose;
                if (saved === null) host.removeAttribute('style'); else host.setAttribute('style', saved);
                org.render();
            }
        `);
        expect(short.hostH <= 300 && short.visible > 0, `short host: the probe did not get a short host with loose cards (host ${short.hostH}px, ${short.visible} visible loose cards)`);
        expect(short.overlaps.length === 0, `short host (${short.hostH}px): loose card(s) overlap the "No tab groups" panel: ${JSON.stringify(short.overlaps)}`);
        expect(short.offCanvas.length === 0, `short host (${short.hostH}px): loose card(s) not wholly on the canvas: ${JSON.stringify(short.offCanvas)}`);
        expect(short.control > 0, `short host: probe control (line not clamped below the panel) did not overlap the panel, so ${short.hostH}px does not exercise the clamp`);
        detail(`short host: at ${short.hostH}px the ${short.visible} loose cards sit below the empty panel and on the canvas`);

        // (d) probe controls, each restored afterwards.
        const probes = await run(`
            ${PROBES}
            const org = await A.organising();
            const out = {};
            org.renderLoose = function () {};
            org.render();
            out.renderLoose = loose().length;
            delete org.renderLoose;
            org.render();
            out.restoredLoose = loose().length;
            org.moveCardFocus = function () {};
            out.moveCardFocus = arrowProbe();
            delete org.moveCardFocus;
            org.render();
            const planted = document.createElement('div');
            planted.className = 'pb-org-tray';
            org.canvasRoot.append(planted);
            out.tray = trayProbe().tray;
            planted.remove();
            out.trayAfter = trayProbe().tray;
            return out;
        `);
        const controls = [
            ['renderLoose stubbed', probes.renderLoose === 0, `loose count read ${probes.renderLoose}`],
            ['moveCardFocus stubbed', !probes.moveCardFocus.error && probes.moveCardFocus.focused && !probes.moveCardFocus.moved,
                JSON.stringify(probes.moveCardFocus)],
            ['tray element appended', probes.tray === 1, `tray probe read ${probes.tray}`],
        ];
        for (const [name, red, seen] of controls) {
            expect(red, `probe control ${name} did not go red -- the probe cannot see that fault (${seen})`);
        }
        expect(probes.restoredLoose === zero.looseModel && probes.trayAfter === 0,
            `probe controls were not restored: ${probes.restoredLoose} loose card(s), ${probes.trayAfter} tray element(s) afterwards`);

        // (e) one group.
        const one = await run(`
            ${PROBES}
            await A.model().createGroup(A.actor(), { x: 40, y: 40 });
            await A.sleep(1000);
            await A.organising();
            const keys = ${JSON.stringify(zero.keys)};
            await settle(() => canvas().querySelectorAll('.pb-org-box').length === 1);
            return {
                boxes: canvas().querySelectorAll('.pb-org-box').length,
                empty: !!canvas().querySelector('.pb-org-empty'),
                missing: keys.filter(k => !cardFor(k)),
                outside: outside(),
            };
        `);
        expect(one.boxes === 1, `one group: ${one.boxes} .pb-org-box element(s) on the canvas, want 1`);
        expect(!one.empty, 'one group: the "No tab groups" panel is still on the canvas');
        expect(one.missing.length === 0, `one group: no loose card for ${one.missing.join(', ')}`);
        expect(one.outside.length === 0, `one group: loose card(s) not wholly inside the canvas host, so they are clipped: ${JSON.stringify(one.outside)}`);
        detail(`one group: 1 box, no empty panel, ${zero.keys.length - one.missing.length} loose cards still on the canvas, all inside the canvas host`);
        if (controls.every(([, red]) => red)) {
            detail('probe controls: 3 planted page faults each turned their probe red');
        }
    });
});
