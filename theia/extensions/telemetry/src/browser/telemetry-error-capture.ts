// NG-067: uncaught frontend errors and unhandled rejections reach the telemetry logger.
// The sender applies the level: off drops, crash/error/all admit error events. The payload
// is the event name plus the message (capped), the script's base name, line and column --
// never a stack, because stacks carry file paths.
import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PowerBrowserTelemetryLogger } from './telemetry-logger';

export const UNCAUGHT_ERROR_EVENT = 'frontend.uncaught-error';
export const UNHANDLED_REJECTION_EVENT = 'frontend.unhandled-rejection';

function messageOf(value: unknown): string {
    return (value instanceof Error ? value.message : String(value)).slice(0, 500);
}

function baseName(url: unknown): string {
    return typeof url === 'string' ? (url.split(/[?#]/)[0].split('/').pop() ?? '') : '';
}

@injectable()
export class TelemetryErrorCapture implements FrontendApplicationContribution {
    @inject(PowerBrowserTelemetryLogger)
    protected readonly logger: PowerBrowserTelemetryLogger;

    protected readonly onError = (event: ErrorEvent): void => {
        this.logger.logError(UNCAUGHT_ERROR_EVENT, {
            message: messageOf(event.error ?? event.message),
            source: baseName(event.filename),
            line: event.lineno,
            column: event.colno,
        });
    };

    protected readonly onRejection = (event: PromiseRejectionEvent): void => {
        this.logger.logError(UNHANDLED_REJECTION_EVENT, { message: messageOf(event.reason) });
    };

    onStart(): void {
        window.addEventListener('error', this.onError);
        window.addEventListener('unhandledrejection', this.onRejection);
    }

    onStop(): void {
        window.removeEventListener('error', this.onError);
        window.removeEventListener('unhandledrejection', this.onRejection);
    }
}
