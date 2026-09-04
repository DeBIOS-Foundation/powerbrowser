// The TelemetryLogger over the batching sender (04-03, TEL-01/TEL-02).
//
// THIN BY DESIGN. Level gating lives in the sender (per event, live
// read), so this class only translates the logger shape onto it: usage
// onto the usage path, BOTH error forms onto the error path. The string
// form of logError deliberately does NOT ride sendEventData -- that path
// is usage-gated (`all` only), and an error reported at level `error`
// must still be delivered. Nothing here throws: a logger that throws
// into instrumented code is worse than a dropped event.

import { injectable, inject } from '@theia/core/shared/inversify';
import { TelemetryLogger } from '@theia/core/lib/common/telemetry';
import { PowerBrowserTelemetrySender } from './telemetry-sender';

@injectable()
export class PowerBrowserTelemetryLogger implements TelemetryLogger {
    readonly options = undefined;

    constructor(
        @inject(PowerBrowserTelemetrySender) readonly sender: PowerBrowserTelemetrySender,
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logUsage(eventName: string, data?: Record<string, any>): void {
        try {
            this.sender.sendEventData(eventName, data);
        } catch {
            // Never a throw out of a telemetry path.
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logError(eventNameOrException: string | Error, data?: Record<string, any>): void {
        try {
            this.sender.sendErrorData(eventNameOrException, data);
        } catch {
            // Never a throw out of a telemetry path.
        }
    }

    dispose(): void {
        try {
            this.sender.dispose();
        } catch {
            // Never a throw out of a telemetry path.
        }
    }
}
