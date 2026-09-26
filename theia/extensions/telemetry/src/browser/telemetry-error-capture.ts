// NG-067: uncaught frontend errors and unhandled rejections reach the telemetry logger.
// The sender applies the level: off drops, crash/error/all admit error events. The payload
// is the event name plus the error's type (constructor name), the script's base name, line
// and column -- no message text and no stack, because both carry file paths and URLs.
// telemetry-error-report.ts shapes the payload and skips repeats; this class only wires it.
import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PowerBrowserTelemetryLogger } from './telemetry-logger';
import { ErrorReporter } from './telemetry-error-report';

@injectable()
export class TelemetryErrorCapture implements FrontendApplicationContribution {
    @inject(PowerBrowserTelemetryLogger)
    protected readonly logger: PowerBrowserTelemetryLogger;

    protected reporter: ErrorReporter | undefined;

    onStart(): void {
        this.reporter = new ErrorReporter(this.logger);
        window.addEventListener('error', this.reporter.onError);
        window.addEventListener('unhandledrejection', this.reporter.onRejection);
    }

    onStop(): void {
        if (this.reporter === undefined) return;
        window.removeEventListener('error', this.reporter.onError);
        window.removeEventListener('unhandledrejection', this.reporter.onRejection);
    }
}
