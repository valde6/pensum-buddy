import { Link } from "@tanstack/react-router";
import type { ForelaesningsFremdrift } from "@/lib/pensum";

// Delt mellem Dashboard (hvert fag-kort) og fagsiden — viser "Dine
// forelæsninger"-tælleren udledt af kalenderen, i tre tilstande.
export function FremdriftVisning({
  fremdrift,
  isLoading,
  farve = "bg-steel",
}: {
  fremdrift: ForelaesningsFremdrift | undefined;
  isLoading: boolean;
  farve?: string;
}) {
  if (isLoading) {
    return <p className="text-xs text-ink-soft">Indlæser fremdrift…</p>;
  }

  if (!fremdrift || !fremdrift.tilknyttet) {
    return (
      <p className="text-xs text-ink-soft">
        <Link
          to="/kalender"
          className="font-medium text-steel underline-offset-4 hover:underline"
        >
          Forbind din kalender
        </Link>{" "}
        for at se fremdrift
      </p>
    );
  }

  if (fremdrift.total === 0) {
    return (
      <p className="text-xs text-ink-soft">
        Ingen forelæsninger fundet i kalenderen for dette fag
      </p>
    );
  }

  const pct = Math.round((fremdrift.forbi / fremdrift.total) * 100);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
        <span>Dine forelæsninger</span>
        <span className="font-mono">
          {fremdrift.forbi} / {fremdrift.total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${farve}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
