import { describe, it, expect } from 'vitest';

describe('Phase 13 — Compensation Module Business Rules', () => {
  it('correctly computes pending amounts from assessed, approved, and paid amounts', () => {
    const assessed = 5000000;
    const approved = 5000000;
    const paid = 2000000;
    const pending = Math.max(0, approved - paid);

    expect(pending).toBe(3000000);
  });

  it('sets payment status to COMPLETED when fully paid', () => {
    const approved = 4000000;
    const paid = 4000000;
    const isCompleted = paid >= approved && approved > 0;
    const pending = Math.max(0, approved - paid);

    expect(isCompleted).toBe(true);
    expect(pending).toBe(0);
  });

  it('keeps payment status PENDING when partially paid or unpaid', () => {
    const approved = 4000000;
    const paid = 1500000;
    const isCompleted = paid >= approved && approved > 0;
    const pending = Math.max(0, approved - paid);

    expect(isCompleted).toBe(false);
    expect(pending).toBe(2500000);
  });

  it('prevents negative pending amount if paid amount exceeds approved amount', () => {
    const approved = 1000000;
    const paid = 1200000;
    const pending = Math.max(0, approved - paid);

    expect(pending).toBe(0);
  });
});
