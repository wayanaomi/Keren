import Link from "next/link";
import { KerenLogo } from "@/components/brand/logo";
import { Spark } from "@/components/brand/marks";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <main className="flex-1 bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <KerenLogo showDescriptor />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-ink">
            Log in
          </Link>
          <Link href="/register" className={buttonClasses("primary", "sm")}>
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-ink md:text-5xl">
            Turn opportunities into <span className="text-orange">capital.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-stone">
            Find the opportunity. Know your fit. Build the application. Keren matches your
            organization to grants, tenders and funding you actually qualify for.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/register" className={buttonClasses("primary", "lg")}>
              Create free account
            </Link>
            <Link href="/login" className={buttonClasses("secondary", "lg")}>
              Log in
            </Link>
          </div>
          <p className="mt-6 text-xs text-stone">No credit card required. Free plan available.</p>
        </div>

        <OpportunityCardPreview />
      </section>

      <section className="border-t border-line bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-10 text-center text-sm font-semibold uppercase tracking-wide text-stone">
            Discover → Qualify → Apply
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Pillar
              step="01"
              title="Discover"
              body="Structured, verified opportunities in one place — grants, tenders, RFPs, accelerators and more."
            />
            <Pillar
              step="02"
              title="Qualify"
              body="Explainable matching shows exactly why you fit, what's missing, and what could block you."
            />
            <Pillar
              step="03"
              title="Apply"
              body="Drafts grounded in your verified profile, a compliance check, and a pipeline to track it all."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-stone">
          <span>Keren · A Chopute product</span>
          <span>keren.chopute.com</span>
        </div>
      </footer>
    </main>
  );
}

function Pillar({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="border-l-2 border-orange pl-4">
      <span className="text-xs font-semibold text-orange">{step}</span>
      <h3 className="mt-1 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-stone">{body}</p>
    </div>
  );
}

function OpportunityCardPreview() {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ember">Grant</span>
        <Badge tone="verified">Verified</Badge>
      </div>
      <h3 className="mt-2 text-lg font-bold text-ink">African Innovation Grant</h3>
      <p className="text-2xl font-extrabold text-ink">$50,000</p>
      <p className="text-sm text-stone">Climate Technology · Nigeria · Ghana · Kenya</p>
      <p className="mt-1 text-sm font-semibold text-ink">Deadline: 24 October 2026</p>

      <div className="mt-4 flex items-center gap-2 rounded-md bg-orange-tint px-3 py-2.5">
        <Spark />
        <div>
          <p className="text-sm font-bold text-ink">92% match</p>
          <p className="text-xs text-stone">Country, sector, stage and funding fit</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-ink">
        <li>✓ Country eligible</li>
        <li>✓ Sector eligible</li>
        <li className="text-warn">⚠ Requires 2 years operating history</li>
      </ul>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1">
          Start application
        </Button>
        <Button size="sm" variant="secondary">
          Save
        </Button>
      </div>
    </div>
  );
}
