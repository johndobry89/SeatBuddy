export async function sendRuntime(message: unknown): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      chrome.runtime.sendMessage(message),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Browser timeout')), 4000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
