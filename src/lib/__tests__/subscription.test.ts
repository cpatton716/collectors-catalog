import {
  GUEST_SCAN_LIMIT,
  FREE_MONTHLY_SCAN_LIMIT,
  SCAN_PACK_AMOUNT,
} from '../subscription';

// ============================================================================
// Subscription Constants Tests
// ============================================================================

describe('Subscription Constants', () => {
  it('GUEST_SCAN_LIMIT is 5', () => {
    expect(GUEST_SCAN_LIMIT).toBe(5);
  });

  it('FREE_MONTHLY_SCAN_LIMIT is 10', () => {
    expect(FREE_MONTHLY_SCAN_LIMIT).toBe(10);
  });

  it('SCAN_PACK_AMOUNT is 10', () => {
    expect(SCAN_PACK_AMOUNT).toBe(10);
  });

  it('free users get double the guest scans per month', () => {
    expect(FREE_MONTHLY_SCAN_LIMIT).toBe(GUEST_SCAN_LIMIT * 2);
  });

  it('scan pack gives same amount as free monthly limit', () => {
    expect(SCAN_PACK_AMOUNT).toBe(FREE_MONTHLY_SCAN_LIMIT);
  });
});
