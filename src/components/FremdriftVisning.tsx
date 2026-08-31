import { Link } from "@tanstack/react-router";
import type { ForelaesningsFremdrift, FremdriftTal } from "@/lib/pensum";

function FremdriftLinje({
  label,
  tal,
  tomBesked,
  farve,
}: {
  label: string;
  tal: FremdriftTal;
  tomBesked: string;
  farve: string;
}) {
  if (tal.total === 0) {
    return <p className="text-xs text-ink-soft">{tomBesked}</p>;
  }

  const pct = Math.round((tal.forbi / tal.total) * 100);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span className="font-mono">
          {tal.forbi} / {tal.total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${farve}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Delt mellem Dashboard (hvert fag-kort) og fagsiden — viser fremdrift for
// forelæsninger (spor "LA") og øvelsestimer (spor "XB") som to selvstændige
// linjer, udledt af kalenderen.
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

  return (
    <div className="space-y-3">
      <FremdriftLinje
        label="Forelæsninger"
        tal={fremdrift.forelaesninger}
        tomBesked="Ingen forelæsninger fundet i kalenderen for dette fag"
        farve={farve}
      />
      <FremdriftLinje
        label="Øvelsestimer"
        tal={fremdrift.ovelser}
        tomBesked="Ingen øvelsestimer fundet i kalenderen"
        farve={farve}
      />
    </div>
  );
}
