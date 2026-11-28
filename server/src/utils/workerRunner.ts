export interface WorkerStatus {
  name: string;
  isRunning: boolean;
  runCount: number;
  successCount: number;
  errorCount: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastDurationMs: number | null;
  lastProcessedCount: number | null;
  lastError: string | null;
}

export type WorkerRunResult =
  | { skipped: true; reason: 'already_running' }
  | { skipped: false; processed: number; durationMs: number; error?: string };

export class WorkerRegistry {
  private workers = new Map<string, WorkerStatus>();

  private ensureWorker(name: string): WorkerStatus {
    let status = this.workers.get(name);
    if (!status) {
      status = {
        name,
        isRunning: false,
        runCount: 0,
        successCount: 0,
        errorCount: 0,
        lastRunAt: null,
        lastSuccessAt: null,
        lastDurationMs: null,
        lastProcessedCount: null,
        lastError: null,
      };
      this.workers.set(name, status);
    }
    return status;
  }

  /**
   * Executes a background job with mutual-exclusion locking (prevents overlap)
   * and structured runtime telemetry.
   */
  async run(name: string, job: () => Promise<number | void>): Promise<WorkerRunResult> {
    const status = this.ensureWorker(name);

    if (status.isRunning) {
      return { skipped: true, reason: 'already_running' };
    }

    status.isRunning = true;
    status.runCount += 1;
    status.lastRunAt = new Date().toISOString();
    const start = Date.now();

    try {
      const processed = (await job()) ?? 0;
      const durationMs = Date.now() - start;

      status.successCount += 1;
      status.lastSuccessAt = new Date().toISOString();
      status.lastDurationMs = durationMs;
      status.lastProcessedCount = typeof processed === 'number' ? processed : 0;
      status.lastError = null;

      return { skipped: false, processed: status.lastProcessedCount, durationMs };
    } catch (error: any) {
      const durationMs = Date.now() - start;
      status.errorCount += 1;
      status.lastDurationMs = durationMs;
      status.lastError = error?.message ?? String(error);

      return { skipped: false, processed: 0, durationMs, error: status.lastError || 'Unknown error' };
    } finally {
      status.isRunning = false;
    }
  }

  /**
   * Returns snapshot of all registered background workers and their health telemetry.
   */
  getStatus(): Record<string, WorkerStatus> {
    const snapshot: Record<string, WorkerStatus> = {};
    for (const [name, status] of this.workers.entries()) {
      snapshot[name] = { ...status };
    }
    return snapshot;
  }

  /**
   * Clears telemetry state (intended for test isolation).
   */
  clear(): void {
    this.workers.clear();
  }
}

export const workerRegistry = new WorkerRegistry();
