export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  intervalMs = 500
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await wait(intervalMs);
      }
    }
  }
  throw lastError;
};

export const mask = (value: string, showLast = 4): string => {
  if (value.length <= showLast) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - showLast)}${value.slice(-showLast)}`;
};
