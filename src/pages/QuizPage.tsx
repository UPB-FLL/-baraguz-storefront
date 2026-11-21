import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CAUTION, QUIZ } from '../lib/quiz';
import { productByHandle } from '../lib/store';
import { ProductCard } from '../components/ProductCard';

/** Same questions, scoring and exclusions as the Shopify theme's blend finder. */
export function QuizPage() {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number[][]>(() => QUIZ.map(() => []));
  const done = step >= QUIZ.length;

  const result = useMemo(() => {
    if (!done) return null;
    const score = new Map<string, number>();
    const why = new Map<string, string>();
    const exTags = new Set<string>(); const exProducts = new Set<string>();
    let caution = false;
    QUIZ.forEach((q, qi) => picked[qi].forEach((ai) => {
      const a = q.answers[ai];
      a.products.forEach((h) => { score.set(h, (score.get(h) ?? 0) + 1); if (!why.has(h)) why.set(h, a.label); });
      a.excludeTags.forEach((t) => exTags.add(t.toLowerCase()));
      a.excludeProducts.forEach((h) => exProducts.add(h));
      if (a.caution) caution = true;
    }));
    const ranked = [...score.entries()]
      .filter(([h]) => !exProducts.has(h))
      .map(([h, s]) => ({ product: productByHandle(h), s, why: why.get(h) ?? '' }))
      .filter((x) => x.product && !x.product.tags.some((t) => exTags.has(t.toLowerCase())))
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);
    return { ranked, caution };
  }, [done, picked]);

  const toggle = (qi: number, ai: number) => {
    const q = QUIZ[qi];
    setPicked((p) => {
      const cur = p[qi];
      const next = q.multi ? (cur.includes(ai) ? cur.filter((x) => x !== ai) : cur.length >= q.max ? cur : [...cur, ai]) : [ai];
      return p.map((x, i) => (i === qi ? next : x));
    });
    if (!q.multi) setTimeout(() => setStep(qi + 1), 220);
  };

  return (
    <section className="section">
      <div className="page-width">
        <div className="quiz">
          <p className="eyebrow">5 quick questions · about 60 seconds</p>
          <h1 className="h2">Let’s find your blend</h1>
          <p className="lede">No sign-up needed. Your answers stay on this page.</p>
          <div className="quiz__progress" aria-hidden="true">{QUIZ.map((_, i) => <span key={i} data-done={i <= step} />)}</div>
          {!done ? (
            <div className="quiz__step" data-active="true">
              <p className="quiz__count">Question {step + 1} of {QUIZ.length}</p>
              <h3>{QUIZ[step].question}</h3>
              {QUIZ[step].hint ? <p className="muted" style={{ margin: 0 }}>{QUIZ[step].hint}</p> : null}
              <div className="quiz__answers">
                {QUIZ[step].answers.map((a, ai) => (
                  <button key={a.label} type="button" className="quiz__answer" aria-pressed={picked[step].includes(ai)} onClick={() => toggle(step, ai)}>
                    {a.label}{a.sub ? <span>{a.sub}</span> : null}
                  </button>
                ))}
              </div>
              <div className="quiz__nav">
                <button className="button button--secondary" type="button" hidden={step === 0} onClick={() => setStep(step - 1)}>Back</button>
                <button className="button" type="button" disabled={!picked[step].length} onClick={() => setStep(step + 1)}>{step === QUIZ.length - 1 ? 'See my blends' : 'Next'}</button>
              </div>
            </div>
          ) : (
            <div className="quiz__result" data-active="true">
              <h3>Your matched ritual</h3>
              {result?.caution ? <p className="quiz__caution">{CAUTION}</p> : null}
              {!result?.ranked.length ? <p className="muted">Nothing matched every answer. Try fewer goals, or message our team for a hand choosing.</p> : null}
              <div className="grid" style={{ margin: '18px 0 22px' }}>
                {result?.ranked.map((r) => (
                  <div key={r.product!.handle} style={{ display: 'flex', flexDirection: 'column' }}>
                    <ProductCard product={r.product!} />
                    <p className="quiz__why" style={{ padding: '8px 4px 0' }}>For: {r.why}</p>
                  </div>
                ))}
              </div>
              <div className="quiz__nav">
                <button className="button button--secondary" type="button" onClick={() => { setPicked(QUIZ.map(() => [])); setStep(0); }}>Start again</button>
                <Link className="button" to="/collections/all">Shop all teas</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
