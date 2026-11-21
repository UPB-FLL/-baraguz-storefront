import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { displayName, parseCsv, ratingSummary, reviewsFromJudgeMe } from '../shared/reviews';

const csv = readFileSync(new URL('./fixtures/judgeme-sample.csv', import.meta.url), 'utf8');

describe('Judge.me import', () => {
  it('parses quoted fields, doubled quotes and newlines', () => {
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(5);
    expect(rows[1][1]).toContain('"no bitterness"');
    expect(rows[3][1]).toBe('Fictional review\nover two lines.');
  });
  it('keeps published reviews with a product, never an email or IP', () => {
    const { reviews, skipped } = reviewsFromJudgeMe(csv);
    expect(reviews).toHaveLength(2);
    expect(skipped).toBe(2);
    const text = JSON.stringify(reviews);
    expect(text).not.toMatch(/@example\.test|203\.0\.113|198\.51|192\.0\.2/);
    expect(reviews[0]).toMatchObject({ productHandle: 'baraguz-slimt-day-booster-28-day-detox', rating: 5, author: 'Jordan T.', date: '2026-09-02', verified: true, reply: 'Thank you, Jordan!', photos: ['https://example.test/a.jpg'] });
    expect(reviews[1].author).toBe('Verified customer');
  });
  it('shortens surnames and averages ratings', () => {
    expect(displayName('Ana María López')).toBe('Ana L.');
    expect(displayName('Sam')).toBe('Sam');
    expect(ratingSummary([{ rating: 5 }, { rating: 4 }, { rating: 4 }] as never)).toEqual({ average: 4.3, count: 3 });
    expect(ratingSummary([])).toEqual({ average: 0, count: 0 });
  });
});
