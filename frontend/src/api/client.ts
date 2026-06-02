import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
})

apiClient.interceptors.response.use((response) => {
  const body = response.data

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    'meta' in body
  ) {
    response.data = body.data
  }

  return response
})

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.error?.message ?? error.response?.data?.message

    if (Array.isArray(message)) {
      return message.join(', ')
    }

    if (typeof message === 'string') {
      return message
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong'
}
