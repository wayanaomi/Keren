import type { Founder } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { addFounderAction, removeFounderAction } from "./actions";

export function FoundersSection({ founders }: { founders: Founder[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone">Founder / team</h2>

      {founders.length === 0 ? (
        <EmptyState title="No team members yet" body="Add founders so Keren can reference their experience in applications." />
      ) : (
        <ul className="mb-5 space-y-3">
          {founders.map((f) => (
            <li key={f.id} className="flex items-start justify-between rounded-md border border-line p-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {f.name} {f.role && <span className="font-normal text-stone">· {f.role}</span>}
                </p>
                {f.bio && <p className="mt-1 text-xs text-stone">{f.bio}</p>}
              </div>
              <form action={removeFounderAction.bind(null, f.id)}>
                <Button variant="ghost" size="sm" type="submit">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addFounderAction} className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="founder-name">Name</Label>
          <Input id="founder-name" name="name" required />
        </div>
        <div>
          <Label htmlFor="founder-role">Role</Label>
          <Input id="founder-role" name="role" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="founder-experience">Experience</Label>
          <Input id="founder-experience" name="experience" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="founder-linkedin">LinkedIn URL</Label>
          <Input id="founder-linkedin" name="linkedinUrl" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="founder-bio">Bio</Label>
          <Textarea id="founder-bio" name="bio" />
        </div>
        <div className="col-span-2">
          <Button type="submit" variant="secondary" size="sm">
            Add team member
          </Button>
        </div>
      </form>
    </Card>
  );
}
