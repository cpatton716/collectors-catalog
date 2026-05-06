import { computeSnipingExtension } from "../snipingProtection";

// Fixed reference time for deterministic tests
const NOW = new Date("2026-05-06T12:00:00.000Z");

function endTimeMinutesFromNow(minutes: number): string {
  return new Date(NOW.getTime() + minutes * 60 * 1000).toISOString();
}

describe("computeSnipingExtension", () => {
  it("returns undefined when bid arrives more than 5 min before end (outside window)", () => {
    const result = computeSnipingExtension(
      { end_time: endTimeMinutesFromNow(10) },
      NOW,
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when auction has already ended", () => {
    const result = computeSnipingExtension(
      { end_time: endTimeMinutesFromNow(-5) },
      NOW,
    );
    expect(result).toBeUndefined();
  });

  it("extends by 5 min when bid arrives in the final 5 min", () => {
    const endTime = endTimeMinutesFromNow(2);
    const result = computeSnipingExtension({ end_time: endTime }, NOW);
    expect(result).toBeDefined();
    // New end should be original end + 5 minutes
    const expected = new Date(new Date(endTime).getTime() + 5 * 60 * 1000).toISOString();
    expect(result).toBe(expected);
  });

  it("extends to the cap (6h past original) and no further", () => {
    // Original end was 6 hours ago; the auction has been extended back into
    // the present (an aggressive sniping war). Next bid should NOT extend
    // because we're already at the cap.
    const originalEnd = endTimeMinutesFromNow(-6 * 60); // 6h before now
    const currentEnd = endTimeMinutesFromNow(2); // 2 min from now (extended into present)
    const result = computeSnipingExtension(
      { end_time: currentEnd, original_end_time: originalEnd },
      NOW,
    );
    // Cap = originalEnd + 6h = now exactly. currentEnd is past that, so the
    // proposed extension would push past the cap. The clamp should result in
    // newEndMs <= endMs, which means no extension.
    expect(result).toBeUndefined();
  });

  it("clamps to cap on the last extension before runaway", () => {
    // Original end = 5h57m ago. Current end = 1 min from now (after multiple
    // extensions). Cap = original + 6h = 3 min from now. Proposed = 6 min from
    // now. Clamped to cap = 3 min from now (extends by 2 min, less than full 5).
    const originalEnd = new Date(NOW.getTime() - (5 * 60 + 57) * 60 * 1000).toISOString();
    const currentEnd = endTimeMinutesFromNow(1);
    const result = computeSnipingExtension(
      { end_time: currentEnd, original_end_time: originalEnd },
      NOW,
    );
    expect(result).toBeDefined();
    // Should be the cap, not the full +5 min extension
    const capMs = new Date(originalEnd).getTime() + 6 * 60 * 60 * 1000;
    expect(new Date(result!).getTime()).toBe(capMs);
  });

  it("treats null original_end_time as 'never extended' — uses current end as anchor for cap", () => {
    const endTime = endTimeMinutesFromNow(2);
    const result = computeSnipingExtension(
      { end_time: endTime, original_end_time: null },
      NOW,
    );
    expect(result).toBeDefined();
    // First extension: cap = endTime + 6h, newEnd = endTime + 5 min, well under cap
    const expected = new Date(new Date(endTime).getTime() + 5 * 60 * 1000).toISOString();
    expect(result).toBe(expected);
  });

  it("triggers exactly at the 5-min boundary", () => {
    // Bid arriving exactly 5 min before end should still trigger (boundary is inclusive)
    const endTime = endTimeMinutesFromNow(5);
    const result = computeSnipingExtension({ end_time: endTime }, NOW);
    expect(result).toBeDefined();
  });
});
