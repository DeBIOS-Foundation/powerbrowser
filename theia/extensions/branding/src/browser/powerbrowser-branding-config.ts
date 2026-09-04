import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';

// GEN-05 (04-04): the runtime read-site shape for every branding display
// value after the name. The welcome widget, the about dialog and the
// favicon contribution all read through here -- one synchronous
// try/catch read with narrowing, never a fetch -- with the compiled
// values as boot fallbacks at each site (the tree must boot where the
// provider is unset). A value that is not a non-empty string resolves to
// undefined: an empty value is a value nobody stated, and rendering it
// would paint a blank where the fallback belongs.
export interface PowerBrowserBrandingConfig {
    welcomeText?: unknown;
    aboutText?: unknown;
    repoUrl?: unknown;
    markSvg?: unknown;
    legalNotices?: unknown;
}

export interface PowerBrowserBranding {
    welcomeText: string | undefined;
    aboutText: string | undefined;
    repoUrl: string | undefined;
    markSvg: string | undefined;
    legalNotices: string[] | undefined;
}

function textOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
}

// GEN-05 legal-notice shape carried over (06-04): an array of non-empty
// strings. Anything else -- a missing key, a bare string, an empty array,
// an element that is not a non-empty string -- resolves to undefined and
// the call site falls back to its compiled notices. Never throws: a
// channel read that throws takes the whole widget down with it.
function stringArrayOrUndefined(value: unknown): string[] | undefined {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    if (!value.every((entry): entry is string => typeof entry === 'string' && entry !== '')) return undefined;
    return [...value];
}

// GEN-05 (04-01) read-site shape carried over: synchronous read,
// try/catch with an undefined-bearing fallback (an empty value or an
// unset provider falls back at the call site, never here).
export function readBrandingConfig(): PowerBrowserBranding {
    try {
        const raw = FrontendApplicationConfigProvider.get()['powerbrowserBranding'] as PowerBrowserBrandingConfig | undefined;
        return {
            welcomeText: textOrUndefined(raw?.welcomeText),
            aboutText: textOrUndefined(raw?.aboutText),
            repoUrl: textOrUndefined(raw?.repoUrl),
            markSvg: textOrUndefined(raw?.markSvg),
            legalNotices: stringArrayOrUndefined(raw?.legalNotices),
        };
    } catch {
        return { welcomeText: undefined, aboutText: undefined, repoUrl: undefined, markSvg: undefined, legalNotices: undefined };
    }
}
