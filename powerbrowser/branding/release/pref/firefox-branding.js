/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// BRAND-04 (D-83..D-88): every pref that gates an unattended callout to a
// host not in powerbrowser/endpoint-allowlist.json's `hosts` array. Every key
// here that appears in the allowlist's `prefs` array must match its
// `expect` value exactly -- scripts/verify-endpoints.sh layer 1 asserts
// this on the installed, unpreprocessed copy of this file
// (branding-common.mozbuild:13-15 hardcodes the filename).
//
// Prefs stay UNLOCKED (plain pref(), never the locking variant) so the
// developer can flip them while debugging -- D-84. No autoconfig.js / .cfg
// pair exists anywhere under powerbrowser/ (D-84 rejects that mechanism
// explicitly).

pref("startup.homepage_override_url", "");
pref("startup.homepage_welcome_url", "");
pref("startup.homepage_welcome_url.additional", "");

// The Mozilla update-wizard URLs must not be carried forward from the
// unofficial/ template (both pointed at nightly.mozilla.org).
pref("app.update.url.manual", "");
pref("app.update.url.details", "");

// --- D-86: GMP manager -- Widevine stays working, no Mozilla host involved ---
// Blanked so the GMP manager never contacts aus5.mozilla.org for a plugin
// manifest. Widevine's own CDM fetch (widevinecdm.json's fileUrl,
// edgedl.me.gvt1.com) does not depend on this pref, and
// media.gmp-manager.allowLocalSources is deliberately left at its default
// (true) -- it is a fallback flag, not an unattended-callout gate.
pref("media.gmp-manager.url", "");
// media.gmp-widevinecdm.enabled is intentionally NOT set here (D-86): it
// routes to a handler that never fetches, and already defaults true on
// Linux.

// --- D-87: OpenH264 -- the one genuinely unattended download at startup ---
pref("media.gmp-gmpopenh264.enabled", false);

// --- D-84/D-87: system-addon update callout, killed before the URL is read ---
pref("extensions.systemAddon.update.enabled", false);
pref("extensions.systemAddon.update.url", "");

// --- Telemetry / health-report / data-submission: defence in depth. The
// health-report subsystem itself is compiled out (MOZ_SERVICES_HEALTHREPORT
// = False, D-84), but these prefs are set anyway so a reader of this file
// sees the intent stated even if a future rebuild ever restored the flag. ---
pref("toolkit.telemetry.unified", false);
pref("toolkit.telemetry.server", "");
pref("datareporting.healthreport.uploadEnabled", false);
pref("datareporting.policy.dataSubmissionEnabled", false);

// --- Captive portal: browser/app/profile/firefox.js:1375 re-enables this
// after toolkit's own all.js:3255 default of false -- our branding file
// loads last (JS_PREFERENCE_FILES, branding-common.mozbuild) so this wins. ---
pref("network.captive-portal-service.enabled", false);
pref("captivedetect.canonicalURL", "");

// --- Normandy/Shield: MOZ_NORMANDY is compiled out (D-84), so these prefs
// are moot at runtime, but disabled anyway so the intent is stated in the
// one place a reader would look. ---
pref("app.normandy.enabled", false);
pref("app.shield.optoutstudies.enabled", false);

// --- Pocket / Discover feed / sponsored New Tab content ---
pref("browser.newtabpage.activity-stream.discoverystream.enabled", false);
pref("browser.newtabpage.activity-stream.showSponsored", false);
pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
pref("browser.topsites.contile.enabled", false);

// --- Region-lookup and Web Push server URLs (both resolve
// location.services.mozilla.com / push.services.mozilla.com respectively,
// which powerbrowser/endpoint-allowlist.json disposition `deny` -- neither
// URL is essential to this phase's scope, no Theia-side feature depends on
// them yet). The GEOLOCATION and PUSH *APIs themselves*
// (geo.enabled/geo.provider.network.url, dom.push.enabled) are deliberately
// left untouched: both fire only on an explicit site request, never at
// unattended startup, and disabling the API surface would remove real
// browser capability this phase has no reason to take away. ---
pref("browser.region.network.url", "");
pref("dom.push.serverURL", "");

// --- AMO (services.addons.mozilla.org): discovered only once the layer-3
// observation window was corrected from 20s to 35s (see verify-endpoints.sh)
// -- Firefox's general periodic AddonManager update-check timer
// (toolkit/components/timermanager/UpdateTimerManager.sys.mjs,
// app.update.timerFirstInterval defaults to 30000ms) does not fire inside a
// 20-second capture, so 03-02's original session never observed it. The
// master switch stops every AddonRepository network call (langpack
// matching, addon search/discovery, browser-mappings) in one pref; the
// individual URLs are blanked too, belt-and-braces. ---
pref("extensions.getAddons.cache.enabled", false);
pref("extensions.getAddons.get.url", "");
pref("extensions.getAddons.langpacks.url", "");
pref("extensions.getAddons.discovery.api_url", "");
pref("extensions.getAddons.browserMappings.url", "");
pref("extensions.addonAbuseReport.url", "");

// --- NetworkConnectivityService: the actual source of the cloudflare-dns.com
// / example.org / ipv4only.arpa hosts observed by 03-02's real layer-3
// capture. These are NOT network.trr.mode (which already defaults to 0/off
// in this build, per modules/libpref/init/StaticPrefList.yaml -- TRR is not
// active) -- they come from NetworkConnectivityService.cpp's own DNSv4/DNSv6/
// DNS_HTTPS domain probes (network.connectivity-service.DNSv4.domain =
// "example.org", .DNS_HTTPS.domain = "cloudflare-dns.com") and its hardcoded
// ipv4only.arpa NAT64-prefix check (netwerk/base/NetworkConnectivityService.cpp:400).
// Turned off at the single master switch: no DRM/security-parity rationale
// applies (unlike Remote Settings/Safe Browsing), so per D-85 this
// unattended, non-Mozilla-host-producing background prober is disabled
// rather than waived. ---
pref("network.connectivity-service.enabled", false);

// --- BRAND-04 ledger entry 5 fix (2026-08-29): Gecko speculatively
// DNS-prefetches link targets rendered by the Theia frontend --
// network.dns.disablePrefetch defaults false
// (modules/libpref/init/StaticPrefList.yaml:15308) and
// network.dns.disablePrefetchFromHTTPS also defaults false (:15161), so
// the origin scheme is irrelevant. Root cause traced to
// theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx:13's
// POWERBROWSER_REPO_URL link to github.com. Disabled rather than removing
// the link -- the link is a real, wanted affordance, and an explicit
// click is a user request this pref does not block, only the
// speculative prefetch. github.com stays a `deny` entry in
// endpoint-allowlist.json so a regression fails the check. ---
pref("network.dns.disablePrefetch", true);

// --- BRAND-04 ledger entry 5 fix (2026-08-29): media.gmp-gmpopenh264.enabled
// (above) does not stop the periodic auto-update task from resolving
// ciscobinary.openh264.org. GMPProvider.findUpdates()
// (toolkit/mozapps/extensions/internal/GMPProvider.sys.mjs:380-451) runs
// on the general periodic AddonManager update timer regardless of
// .enabled -- that pref only feeds GMPUtils.isPluginHidden/userDisabled,
// and permissions (GMPProvider.sys.mjs:299-307) grants PERM_CAN_UPGRADE
// unconditionally for a non-EME plugin like OpenH264. The real gate is
// AddonManager.shouldAutoUpdate() (AddonManager.sys.mjs:4577-4598), which
// falls through to this.autoUpdateDefault whenever the addon's own
// applyBackgroundUpdates getter reports AUTOUPDATE_DEFAULT rather than an
// explicit ENABLE/DISABLE -- and it always does here, because that getter
// (GMPProvider.sys.mjs:347-358) gates on GMPPrefs.isSet(), which calls
// Services.prefs.prefHasUserValue() and is therefore permanently false for
// any value this default-branch pref file sets (media.gmp-gmpopenh264.
// autoupdate cannot be closed from here at all -- confirmed live: setting
// it false via this file had zero effect on the resolution). This global
// switch is the one lever that IS a plain default-branch-readable bool
// pref. Confirmed safe for Widevine: its own findUpdates() never reaches
// this fallback at all -- media.eme.enabled defaults false on Linux
// (StaticPrefList.yaml:12162-12175), so GMPProvider.appDisabled is true
// for the EME plugin, and shouldAutoUpdate() returns false at the
// PERM_CAN_UPGRADE check (line 4588) before applyBackgroundUpdates is
// even read; a real EME/DRM request instead drives checkForUpdates() ->
// simpleCheckAndInstall() (GMPProvider.sys.mjs:557-574), a separate call
// path gated by its own media.gmp-widevinecdm.enabled default (true),
// untouched by this pref. Traced live: with this pref at its stock true,
// findUpdates() ran checkForAddons() ->
// downloadLocalConfig(chrome://global/content/gmp-sources/openh264.json)
// -> installAddon(), genuinely downloading and extracting the OpenH264
// zip from ciscobinary.openh264.org; with it false, that call never ran.
// media.gmp-gmpopenh264.enabled stays false too -- still correct, still
// wanted, just not sufficient alone. ---
pref("extensions.update.autoUpdateDefault", false);

// Number of usages of the web console.
// If this is less than 5, then pasting code into the web console is disabled
pref("devtools.selfxss.count", 5);
