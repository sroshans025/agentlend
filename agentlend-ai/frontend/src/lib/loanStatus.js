function normalizeLoanStatus(status) {
  const raw = String(status || '').toUpperCase();

  // Backward compatibility for older API payloads.
  if (raw === 'REJECTED') return 'DEFAULTED';
  if (raw === 'APPROVED') return 'ACTIVE';

  return raw;
}

export function isDefaultedLoan(status) {
  return normalizeLoanStatus(status) === 'DEFAULTED';
}

export function isActiveLoan(status) {
  const normalized = normalizeLoanStatus(status);
  return normalized === 'ACTIVE' || normalized === 'PENDING';
}

export function isOutstandingLoan(status) {
  const normalized = normalizeLoanStatus(status);
  return normalized === 'ACTIVE' || normalized === 'PENDING';
}

export function toLoanDecisionLabel(status) {
  const normalized = normalizeLoanStatus(status);

  if (normalized === 'DEFAULTED') return 'Rejected';
  if (normalized === 'ACTIVE' || normalized === 'REPAID') return 'Approved';
  return 'Pending';
}

export function toLoanStatusLabel(status) {
  return normalizeLoanStatus(status);
}
