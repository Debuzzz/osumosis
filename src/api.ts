export async function api<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? undefined
      : {
          method,
          headers: { "Content-Type": "application/json", "X-osumosis": "1" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
  return data;
}
