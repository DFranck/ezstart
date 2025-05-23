// utils/fetchJson.ts
export async function fetchWrapper<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let errorMsg = 'Unknown error';
    try {
      const data = await res.json();
      errorMsg = data?.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}
