import {
  getGuestScansRemaining,
  hasRedeemedBonusScans,
} from '../useGuestScans';

// ============================================================================
// getGuestScansRemaining Tests
// ============================================================================

describe('getGuestScansRemaining', () => {
  beforeEach(() => {
    (localStorage.getItem as jest.Mock).mockClear();
  });

  it('returns 5 when no scans have been used', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    expect(getGuestScansRemaining()).toBe(5);
  });

  it('returns correct remaining when some scans used', () => {
    (localStorage.getItem as jest.Mock)
      .mockReturnValueOnce('3') // scan count
      .mockReturnValueOnce(null); // bonus scans
    expect(getGuestScansRemaining()).toBe(2);
  });

  it('returns 0 when at limit', () => {
    (localStorage.getItem as jest.Mock)
      .mockReturnValueOnce('5') // scan count
      .mockReturnValueOnce(null); // bonus scans
    expect(getGuestScansRemaining()).toBe(0);
  });

  it('returns 0 when over limit', () => {
    (localStorage.getItem as jest.Mock)
      .mockReturnValueOnce('10') // scan count
      .mockReturnValueOnce(null); // bonus scans
    expect(getGuestScansRemaining()).toBe(0);
  });

  it('includes bonus scans in calculation', () => {
    (localStorage.getItem as jest.Mock)
      .mockReturnValueOnce('5') // scan count - at original limit
      .mockReturnValueOnce('5'); // bonus scans - 5 extra
    expect(getGuestScansRemaining()).toBe(5); // 5 bonus remaining
  });

  it('handles bonus scans with partial usage', () => {
    (localStorage.getItem as jest.Mock)
      .mockReturnValueOnce('7') // scan count - 7 used
      .mockReturnValueOnce('5'); // bonus scans - total limit is now 10
    expect(getGuestScansRemaining()).toBe(3); // 10 - 7 = 3
  });
});

// ============================================================================
// hasRedeemedBonusScans Tests
// ============================================================================

describe('hasRedeemedBonusScans', () => {
  beforeEach(() => {
    (localStorage.getItem as jest.Mock).mockClear();
  });

  it('returns false when no bonus scans redeemed', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    expect(hasRedeemedBonusScans()).toBe(false);
  });

  it('returns false for zero bonus scans', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('0');
    expect(hasRedeemedBonusScans()).toBe(false);
  });

  it('returns true when bonus scans have been redeemed', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('5');
    expect(hasRedeemedBonusScans()).toBe(true);
  });
});
