export async function parseJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error('INVALID_JSON')
  }
}
