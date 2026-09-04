// The telemetry.telemetryLevel preference (04-03, TEL-01).
//
// THE PLAN'S "REAL PREFERENCE", CONTRIBUTED HERE. @theia/core 1.74.1
// ships only the TelemetryLogger/TelemetrySender interfaces and no
// telemetryLevel preference at all (the off/crash/error/all enum the
// plan cites is VS Code's); nothing else in this tree contributes a
// `telemetry.*` preference either, so this namespace is free. Contributing
// it from @powerbrowser/telemetry is composition, not a core patch: the
// sender reads the live value per event, so a runtime change takes effect
// without restart, and the manifest level (powerbrowserTelemetry fragment)
// stays the default for users who never touch the setting --
// PreferenceService.get(name, manifestDefault) in the frontend module.
//
// The contribution default agrees with the manifest default (`off`), so
// the two agree even before the module wires them together.

import { interfaces } from '@theia/core/shared/inversify';
import {
    createPreferenceProxy,
    PreferenceContribution,
    PreferenceProxy,
    PreferenceSchema,
    PreferenceService,
} from '@theia/core/lib/common/preferences';
import { TELEMETRY_LEVELS } from './telemetry-sender';

export const TELEMETRY_LEVEL_PREFERENCE = 'telemetry.telemetryLevel';

export const TelemetryPreferenceSchema: PreferenceSchema = {
    properties: {
        [TELEMETRY_LEVEL_PREFERENCE]: {
            type: 'string',
            enum: [...TELEMETRY_LEVELS],
            enumDescriptions: [
                'Send nothing. No telemetry event leaves the application.',
                'Send error telemetry only (uncaught errors). Usage events are dropped.',
                'Send error telemetry only (uncaught errors). Usage events are dropped.',
                'Send usage and error telemetry to the configured endpoint.',
            ],
            default: 'off',
            description: 'How much usage and error telemetry Power Browser sends to the configured endpoint.',
        },
    },
};

export interface TelemetryConfiguration {
    [TELEMETRY_LEVEL_PREFERENCE]: string;
}

export const TelemetryPreferenceContribution = Symbol('TelemetryPreferenceContribution');
export const TelemetryPreferences = Symbol('TelemetryPreferences');
export type TelemetryPreferences = PreferenceProxy<TelemetryConfiguration>;

export function createTelemetryPreferences(preferences: PreferenceService, schema: PreferenceSchema = TelemetryPreferenceSchema): TelemetryPreferences {
    return createPreferenceProxy(preferences, schema);
}

export function bindTelemetryPreferences(bind: interfaces.Bind): void {
    bind(TelemetryPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        const contribution = ctx.container.get<PreferenceContribution>(TelemetryPreferenceContribution);
        return createTelemetryPreferences(preferences, contribution.schema);
    }).inSingletonScope();
    bind(TelemetryPreferenceContribution).toConstantValue({ schema: TelemetryPreferenceSchema });
    bind(PreferenceContribution).toService(TelemetryPreferenceContribution);
}
