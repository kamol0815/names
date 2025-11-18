import { getClickRedirectLink } from './click-redirect-link.generator';

/**
 * Click bir martalik to'lov linkini token orqali yaratadi.
 * Masked URL mavjud bo'lmasa, to'g'ridan-to'g'ri Click havolasini qaytaradi.
 */
export function generateClickOnetimeLink(
  userId: string,
  planId: string,
  amount: number,
): string {
  const normalizedAmount = normalizeAmount(amount);

  return getClickRedirectLink({
    amount: normalizedAmount,
    planId,
    userId,
  });
}

function normalizeAmount(amount: number): number {
  const parsed = Math.floor(Number(amount));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Invalid Click amount');
  }

  return parsed;
}
