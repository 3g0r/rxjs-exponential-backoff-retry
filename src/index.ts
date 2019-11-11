import {Observable, Subscription} from 'rxjs';

/**
 * @description
 * Exponential backoff configuration
 */
export type Config = {
  /**
   * Starting delay before first retry attempt in milliseconds.
   *
   * Defaults to 1000.
   *
   * Example: if `baseMs` is 100, then retries will be attempted in 100ms,
   * 200ms, 400ms etc.
   */
  baseMs?: number;
  /**
   * Maximum delay between attempts in milliseconds.
   *
   * Defaults to 30 seconds.
   *
   * Example: if `baseMs` is 1000 and `maxDelayMs` is 3000, then retries will be
   * attempted in 1000ms, 2000ms, 3000ms, 3000ms etc.
   */
  maxDelayMs?: number;
  /**
   * Maximum for the total number of attempts.
   *
   * Defaults to Infinity.
   */
  maxAttempts?: number;
  /**
   * Called after each failed attempt before setting delay timer.
   */
  onError?(event: {error: any; attempt: number; delayMs: number}): void;
};

/**
 * @description
 * Start retry loop after parent observable throws error.
 * Delay will be increase and randomize with jitter before every iteration.
 * If parent observable passed success, then accumulated delay will be reset, and have not influence on next produced item.
 * @argument {Config} config - backoff configuration
 * @returns {Observable}
 */
export const exponentialBackoffRetry = (config: Config) => <T>(
  observable: Observable<T>,
): Observable<T> => {
  const {
    maxAttempts = Infinity,
    baseMs = 1000,
    maxDelayMs = 30 * 1000,
    onError,
  } = config;

  return new Observable<T>(subscriber => {
    let subscription: Subscription | null = null;
    let attempt = 0;
    let timeout: NodeJS.Timer | null = null;

    const stopTimeout = () => {
      if (timeout != null) {
        clearTimeout(timeout);
      }
      timeout = null;
    };

    const doTry = () => {
      subscription = observable.subscribe({
        next: value => {
          if (subscriber.closed) {
            return;
          }
          attempt = 0;
          subscriber.next(value);
        },
        complete: () => {
          if (subscriber.closed) {
            return;
          }
          subscriber.complete();
        },
        error: error => {
          if (subscriber.closed) {
            return;
          }
          stopTimeout();
          if (attempt > maxAttempts) {
            return subscriber.error(error);
          }

          // Spread out retries with jitter
          // https://www.awsarchitectureblog.com/2015/03/backoff.html
          const jitter = Math.round(Math.random() * baseMs);
          const backoff = Math.pow(2, attempt) * baseMs;
          const delayMs = jitter + Math.min(backoff, maxDelayMs);

          try {
            if (onError) {
              onError({error, attempt, delayMs});
            }

            attempt++;
            timeout = setTimeout(doTry, delayMs);
          } catch (err) {
            return subscriber.error(err);
          }
        },
      });
    };
    doTry();
    return () => {
      subscriber.complete();
      if (subscription) {
        subscription.unsubscribe();
      }

      stopTimeout();
    };
  });
};
