import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { TraceRail, type TraceEvent } from '@/components/TraceRail';

const CONTROL_TOWER_IMG =
  'https://images.unsplash.com/photo-1710970251113-348e39b9c382?fm=jpg&q=70&w=2400&auto=format&fit=crop';

const EXAMPLE_EVENTS: TraceEvent[] = [
  {
    id: 1,
    time: 'Jul 9 · 9:02 AM',
    title: 'LinkedIn: "Your application was sent to Anchor Systems"',
    tone: 'steel',
  },
  {
    id: 2,
    time: 'Jul 9 · 9:04 AM',
    title: 'Workable receipt: "Thanks for applying to Platform Engineer at Anchor Systems"',
    tone: 'steel',
  },
  {
    id: 3,
    time: 'Jul 9 · 9:04 AM',
    title: 'Matched as one application',
    detail: 'Same normalized company, two minutes apart — well inside the dedup window.',
    tone: 'amber',
  },
  {
    id: 4,
    time: 'Jul 9 · 9:04 AM',
    title: 'Confidence 0.91 — auto-confirmed',
    detail: 'Clears the 0.75 threshold, so it counts toward the total without you touching it.',
    tone: 'teal',
  },
];

const MECHANISM_CARDS = [
  {
    title: 'What counts toward your total',
    body: 'Only auto-confirmed and human-confirmed records reach the dashboard number. Anything ambiguous waits in a queue instead of quietly inflating the count.',
  },
  {
    title: 'What happens to the uncertain ones',
    body: 'Extractions under 75% confidence sit in the review queue next to the exact email that produced them, so you decide from the evidence, not a black box.',
  },
  {
    title: 'What you can trace',
    body: 'Every company name on the list traces back to a specific Gmail message. Open it and you see exactly what the extractor read to get there.',
  },
];

export const LandingPage = () => (
  <div className="min-h-screen bg-ink">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-10">
      <div className="flex items-center gap-2">
        <span className="h-4 w-px bg-teal" aria-hidden="true" />
        <span className="font-display text-sm font-semibold tracking-[0.2em] text-white">
          DISPATCH
        </span>
      </div>
      <nav className="flex items-center gap-6">
        <a href="#mechanism" className="hidden font-body text-sm text-steel hover:text-mist sm:inline">
          How it works
        </a>
        <Link to="/connect" className="font-body text-sm text-mist hover:text-white">
          Sign in
        </Link>
      </nav>
    </header>

    <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-10 lg:pt-16">
      <div>
        <p className="font-data text-xs uppercase tracking-[0.2em] text-steel">
          Gmail-native · single account
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] text-white sm:text-5xl">
          LinkedIn will tell you what it wants you to hear. Your inbox has the receipts.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-mist">
          Dispatch reads the confirmation and rejection emails already sitting in your Gmail,
          works out which ones are the same application wearing a different subject line, and
          attaches a confidence score to every one of its own guesses — so the number on your
          dashboard is something you can defend, not a vanity metric.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link to="/connect">
            <Button variant="primary">Connect your Gmail</Button>
          </Link>
          <a href="#mechanism">
            <Button variant="secondary">See how the matching works</Button>
          </a>
        </div>
        <p className="mt-4 font-data text-xs text-steel">
          Read-only Gmail access. Nothing is sent, nothing is deleted.
        </p>
      </div>

      <Reveal>
        <div className="rounded-xl border border-ink-line bg-ink-raised p-6">
          <p className="mb-5 font-data text-[0.65rem] uppercase tracking-[0.2em] text-steel">
            Illustrative example — not your data
          </p>
          <TraceRail events={EXAMPLE_EVENTS} />
        </div>
      </Reveal>
    </section>

    <section id="mechanism" className="relative overflow-hidden border-y border-ink-line">
      <div className="absolute inset-0">
        <img
          src={CONTROL_TOWER_IMG}
          alt=""
          className="h-full w-full object-cover opacity-[0.14] mix-blend-luminosity"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-ink/85" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
        <Reveal>
          <h2 className="max-w-2xl font-display text-2xl font-semibold text-white sm:text-3xl">
            Three things Dispatch decides on every email, before it ever touches your dashboard.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {MECHANISM_CARDS.map((card) => (
            <Reveal key={card.title}>
              <div className="h-full rounded-lg border border-ink-line bg-ink-raised/80 p-5 backdrop-blur-sm">
                <h3 className="font-display text-lg text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-10">
      <Reveal className="mx-auto max-w-xl">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          Connect the account you actually apply from.
        </h2>
        <p className="mt-4 text-base text-mist">
          One Gmail inbox, one dashboard. Sign in with Google, grant read-only access, and Dispatch
          takes it from there.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/connect">
            <Button variant="primary">Connect your Gmail</Button>
          </Link>
        </div>
      </Reveal>
    </section>

    <footer className="border-t border-ink-line px-4 py-8 text-center sm:px-6 lg:px-10">
      <p className="font-data text-xs text-steel">
        Dispatch is a personal tool. It reads Gmail; it never posts, deletes, or sends anything.
      </p>
    </footer>
  </div>
);
