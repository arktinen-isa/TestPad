type ApiErr = {
  response?: { data?: { message?: string; error?: string; details?: { message: string }[] } }
}

export function getApiError(err: unknown, fallback: string): string {
  const data = (err as ApiErr)?.response?.data
  return data?.message || data?.error || data?.details?.[0]?.message || fallback
}
