/** Extract a human-readable message from an API / network error. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const apiError = error.response?.data?.error;
  if (apiError) {
    if (apiError.code === 'VALIDATION_ERROR' && apiError.details?.length) {
      return apiError.details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join('. ');
    }
    return apiError.message ?? fallback;
  }
  if (error.code === 'ECONNABORTED') return 'The request timed out.';
  if (error.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
  return fallback;
}

/** Map API validation details to { field: message } for inline form errors. */
export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.filter((d) => d.field).map((d) => [d.field, d.message]));
}

export const isStatus = (error, status) => error?.response?.status === status;
