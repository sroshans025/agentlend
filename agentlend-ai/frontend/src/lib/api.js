const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request(path, options = {}) {
  const { timeoutMs = 60000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
      },
      ...fetchOptions,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const detail = isJson && payload?.detail ? payload.detail : response.statusText;
      throw new Error(detail || 'Request failed');
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchHealth() {
  return request('/health');
}

export async function requestLoan({ walletAddress, loanAmount, loanDuration }) {
  try {
    return await request('/loan/request', {
      method: 'POST',
      timeoutMs: 90000,
      body: JSON.stringify({
        wallet_address: walletAddress,
        loan_amount: loanAmount,
        loan_duration: loanDuration,
      }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Backend analysis is taking too long. Please try again.');
    }
    throw error;
  }
}

export async function fetchDecisionLogs({ skip = 0, limit = 100 } = {}) {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  return request(`/decision-logs/?${params.toString()}`);
}

export async function fetchDecisionLogsByWallet(walletAddress) {
  return request(`/decision-logs/${walletAddress}`);
}

export async function fetchLoans({ skip = 0, limit = 100 } = {}) {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  return request(`/admin/loans?${params.toString()}`);
}

export async function fetchLoanById(loanId) {
  return request(`/loan/${loanId}`);
}

export async function fetchUsers() {
  return request('/admin/users');
}

export async function fetchTreasuryBalance() {
  return request('/admin/treasury');
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
