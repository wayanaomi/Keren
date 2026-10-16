import Link from "next/link";
import { KerenLogo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Discover opportunities",
    description:
      "Explore grants, tenders, funding programmes and business opportunities relevant to your organisation.",
  },
  {
    number: "02",
    title: "Understand your fit",
    description:
      "See how each opportunity aligns with your organisation and identify requirements that still need attention.",
  },
  {
    number: "03",
    title: "Prepare with confidence",
    description:
      "Organise your information, prepare application drafts and keep track of what needs to be completed.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="relative z-10 border-b border-line bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Keren home">
            <KerenLogo showDescriptor />
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-3 sm:gap-5"
          >
            <Link
              href="/login"
              className="text-sm font-semibold text-ink transition hover:text-ember"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className={buttonClasses("primary", "sm")}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate -mt-px overflow-hidden bg-cream">
        <div
          className="relative flex min-h-[600px] w-full items-center bg-ink bg-cover bg-[center_45%] sm:min-h-[650px] lg:min-h-[720px]"
          style={{ backgroundImage: "url('/images/keren-hero.png')" }}
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/65 to-black/15" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-cream via-cream/5 to-transparent" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 via-transparent to-transparent" />

          <div className="mx-auto w-full max-w-7xl px-6 pb-28 pt-20 sm:px-8 sm:pb-32 lg:px-12 lg:pt-24">
            <div className="max-w-3xl">
              

              <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Your next big opportunity starts{" "}
                <span className="text-orange">with Keren.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                Find funding and business opportunities that fit your
                organisation. Understand the requirements, prepare stronger
                applications and manage the journey in one place.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className={`${buttonClasses("primary", "lg")} inline-flex items-center justify-center gap-3`}
                >
                  Create your free account
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/50 bg-black/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/40"
                >
                  Sign in to Keren
                </Link>
              </div>

              <p className="mt-5 text-xs leading-5 text-white/75">
                Start with a free account. You stay in control of every
                application.
              </p>
            </div>
          </div>

          <div className="absolute bottom-8 right-6 hidden items-center gap-2 text-xs text-white/80 md:flex lg:right-12">
            <span className="h-px w-8 bg-orange" />
            Discover. Qualify. Prepare. Apply.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ember">
              A clearer way forward
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Less guesswork.
              <br />
              More informed decisions.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-stone md:justify-self-end md:text-lg">
            Finding an opportunity is only the beginning. Keren helps you
            understand whether it fits, what you need to prepare and how to
            keep your application moving.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="group rounded-xl border border-line bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-orange/50 hover:shadow-lg sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-widest text-ember">
                  {step.number}
                </span>
                <span
                  aria-hidden="true"
                  className="text-2xl text-orange transition-transform group-hover:translate-x-1"
                >
                  ↗
                </span>
              </div>
              <h3 className="mt-8 text-xl font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-stone">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-8 sm:py-20 md:grid-cols-2 md:items-center lg:px-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ember">
              Built around your organisation
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Every opportunity deserves a closer look.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-stone">
              Compare requirements with your organisation&apos;s information,
              identify gaps before you apply, and keep important application
              details organised.
            </p>
            <Link
              href="/register"
              className={`${buttonClasses("primary", "lg")} mt-7 inline-flex items-center gap-3`}
            >
              Get started with Keren
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-cream p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone">
              Your opportunity workflow
            </p>
            <div className="mt-6 space-y-0">
              {[
                ["Discover", "Find relevant opportunities"],
                ["Match", "Understand your eligibility"],
                ["Prepare", "Organise information and drafts"],
                ["Apply", "Review and submit when ready"],
                ["Track", "Keep progress in one place"],
              ].map(([title, description], index) => (
                <div key={title} className="flex gap-4 pb-5 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-tint text-sm font-bold text-ember">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {index < 4 && (
                      <span className="mt-2 min-h-5 w-px flex-1 bg-line" />
                    )}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-5 text-stone">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-8 rounded-2xl bg-ink px-6 py-10 sm:px-10 sm:py-14 md:flex-row md:items-center lg:px-16">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">
              Your next step
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Make your next opportunity count.
            </h2>
            <p className="mt-4 leading-7 text-white/65">
              Bring your organisation&apos;s goals into focus and start building
              a more organised approach to opportunities.
            </p>
          </div>
          <Link
            href="/register"
            className={`${buttonClasses("primary", "lg")} inline-flex shrink-0 items-center gap-3`}
          >
            Create free account
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-stone sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>Keren · A Chopute product</span>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/login" className="transition hover:text-ink">
              Log in
            </Link>
            <Link href="/register" className="transition hover:text-ink">
              Get started
            </Link>
            <span>keren.chopute.com</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
