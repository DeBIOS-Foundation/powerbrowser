#!/usr/bin/env node
// scripts/verify-ng-068-crash-extra-part.mjs -- NG-068 (wave E): the crash collector accepts
// Gecko's single `extra` annotation part. Starts the REAL collector process on a loopback
// port and posts multipart bodies in the shape Gecko's crash reporter sends; the extra
// part's name, filename and MIME type are read from
// upstream/toolkit/crashreporter/client/app/src/net/report.rs at check time.
//   1. Gecko's shape: annotations arrive in one JSON part; only allowlisted keys are stored.
//   2. A malformed extra part: the report is still accepted; nothing from it is stored.
//   3. Regression: one form field per annotation still works.
// Tier: quick (loopback only). Marker: quick.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { ANNOTATION_ALLOWLIST } from './crash-collector.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng068-crash-extra-part';
const REPORT_RS = join(REPO_ROOT, 'upstream/toolkit/crashreporter/client/app/src/net/report.rs');
const failures = [];

function geckoExtraShape() {
    if (!existsSync(REPORT_RS)) throw new Error(`broken instrument: ${REPORT_RS} is absent -- run scripts/fetch-upstream.sh`);
    const m = /name:\s*"extra",[\s\S]*?filename:\s*Some\("([^"]+)"\),\s*mime_type:\s*Some\("([^"]+)"\)/.exec(readFileSync(REPORT_RS, 'utf8'));
    if (!m) throw new Error('broken instrument: report.rs no longer declares an `extra` MimePart with filename and mime_type');
    return { filename: m[1], mime: m[2] };
}

function multipart(parts) {
    const boundary = `----ng068${randomBytes(8).toString('hex')}`;
    const chunks = [];
    for (const p of parts) {
        chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"${p.filename ? `; filename="${p.filename}"` : ''}\r\n${p.mime ? `Content-Type: ${p.mime}\r\n` : ''}\r\n`));
        chunks.push(Buffer.isBuffer(p.data) ? p.data : Buffer.from(p.data));
        chunks.push(Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    return { body: Buffer.concat(chunks), type: `multipart/form-data; boundary=${boundary}` };
}

const freePort = () => new Promise(res => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });

async function main() {
    const shape = geckoExtraShape();
    const store = mkdtempSync(join(tmpdir(), 'ng068-store-'));
    const port = await freePort();
    const child = spawn(process.execPath, [join(REPO_ROOT, 'scripts/crash-collector.mjs'), '--port', String(port), '--store', store], { stdio: ['ignore', 'pipe', 'pipe'] });
    try {
        await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('the collector did not report listening within 15 s')), 15000);
            child.stdout.on('data', d => { if (String(d).includes('listening at')) { clearTimeout(t); resolve(); } });
            child.on('exit', c => reject(new Error(`the collector exited (${c})`)));
        });
        const post = async parts => {
            const { body, type } = multipart(parts);
            const res = await fetch(`http://127.0.0.1:${port}/submit`, { method: 'POST', headers: { 'Content-Type': type }, body });
            return { status: res.status, text: await res.text() };
        };
        const stored = (label, res, expected) => {
            const id = /^CrashID=(.+)$/.exec(res.text.trim())?.[1];
            if (res.status !== 200 || !id) { failures.push(`${label}: answered ${res.status} ${res.text.trim()}`); return; }
            const record = JSON.parse(readFileSync(join(store, `${id}.json`), 'utf8'));
            if (!isDeepStrictEqual(record.annotations, expected)) failures.push(`${label}: stored ${JSON.stringify(record.annotations)}, expected ${JSON.stringify(expected)}`);
        };
        const dump = { name: 'upload_file_minidump', filename: 'ng068.dmp', mime: 'application/octet-stream', data: randomBytes(512) };
        const extra = { ProductName: 'ng068-product', Version: '1.2.3', BuildID: '20260925000000', ReleaseChannel: 'default', NotAllowlisted: 'must-not-be-stored', URL: 'https://example.org/private' };
        stored('gecko extra part', await post([{ name: 'extra', filename: shape.filename, mime: shape.mime, data: JSON.stringify(extra) }, dump]),
            Object.fromEntries(Object.entries(extra).filter(([k]) => ANNOTATION_ALLOWLIST.includes(k))));
        stored('malformed extra part', await post([{ name: 'extra', filename: shape.filename, mime: shape.mime, data: '{not json' }, dump]), {});
        stored('per-part annotation', await post([{ name: 'ProductName', data: 'ng068-per-part' }, dump]), { ProductName: 'ng068-per-part' });
    } finally {
        child.kill('SIGTERM');
        rmSync(store, { recursive: true, force: true });
    }
}

try { await main(); } catch (err) { failures.push(err.message); }
if (failures.length) {
    console.error(`${NAME}: FAIL -- ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`${NAME}: PASS -- Gecko's extra part is read through the allowlist; malformed extra keeps the report`);
