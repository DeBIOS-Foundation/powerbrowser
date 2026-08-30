import { injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { SOURCERER_ENV } from './sourcerer-env';

// SIDE-04 (05-01-PLAN.md Task 1): dies-with-the-browser watchdog. Armed only
// when the supervisor's spawn environment carries SOURCERER_SUPERVISED=1
// (see TheiaService.sys.mjs's _spawnAndGate environment object) -- without
// this gate, stdin EOF also fires for `yarn start`, `scripts/smoke-theia.sh`
// and verify-phase-04.sh's own start_backend (stdin redirected from
// /dev/null), all three of which would otherwise self-terminate on launch.
//
// Subprocess.sys.mjs creates the child's stdin as a pipe unconditionally on
// unix (05-RESEARCH.md Pattern 3) -- when the parent (this browser process)
// dies by any means, including SIGKILL, the pipe's write end closes and this
// process observes EOF on its own stdin. Re-signals SIGTERM rather than
// calling process.exit() so Theia's own BackendApplication SIGTERM handler
// runs gracefulShutdown() and every @preDestroy hook first.
const SUPERVISED_ENV_VAR = 'SOURCERER_SUPERVISED';

@injectable()
export class SourcererParentWatchdogContribution implements BackendApplicationContribution {

    protected terminated = false;

    initialize(): void {
        // SOURCERER_ENV, never process.env: sourcerer-env.ts captured and
        // scrubbed this at module load, unconditionally, so a nested backend
        // launched from a Sourcerer terminal cannot inherit the marker and
        // arm a watchdog nobody supervises. process.env no longer carries it
        // by the time this runs.
        if (SOURCERER_ENV[SUPERVISED_ENV_VAR] !== '1') {
            // Unsupervised launch (yarn start, smoke-theia.sh,
            // verify-phase-04.sh's start_backend): stay inert. Stdin may be
            // closed, redirected from /dev/null, or otherwise EOF'd for
            // reasons that have nothing to do with the parent dying.
            return;
        }

        process.stdin.resume();
        process.stdin.on('end', () => this.selfTerminate('stdin end'));
        process.stdin.on('close', () => this.selfTerminate('stdin close'));
        process.stdin.on('error', err => this.selfTerminate(`stdin error: ${err.message}`));
    }

    protected selfTerminate(reason: string): void {
        if (this.terminated) {
            return;
        }
        this.terminated = true;
        process.stderr.write(
            `SourcererParentWatchdogContribution: parent stdin closed (${reason}) -- signalling self with SIGTERM.\n`
        );
        process.kill(process.pid, 'SIGTERM');
    }
}
