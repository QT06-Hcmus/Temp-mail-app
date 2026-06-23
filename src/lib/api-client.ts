interface RetryConfig {
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {}
): Promise<Response> {
  const { maxRetries = 3, timeout = 10000, retryDelay = 1000 } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === maxRetries) {
        return response;
      }

      // Retryable status code — wait and retry
      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`Request to ${url} timed out after ${timeout}ms`);
      } else if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error(`Request to ${url} failed: ${String(error)}`);
      }

      if (attempt === maxRetries) {
        break;
      }

      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error(`Request to ${url} failed after ${maxRetries + 1} attempts`);
}
