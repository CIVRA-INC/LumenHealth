import type { ConsentRecord } from "@lumen/types";

type Props = {
  consents: ConsentRecord[];
  onRevoke: (consentId: string) => void;
  revoking: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  data_processing: "Data processing",
  sharing: "Data sharing",
  research: "Research",
  communications: "Communications",
};

export function ConsentList({ consents, onRevoke, revoking }: Props) {
  if (consents.length === 0) {
    return <p className="consentEmpty">No consent records found.</p>;
  }

  return (
    <ul className="consentList" data-testid="consent-list">
      {consents.map((c) => (
        <li key={c.id} className="consentItem" data-testid={`consent-${c.id}`}>
          <div className="consentItemMeta">
            <strong>{TYPE_LABEL[c.type] ?? c.type}</strong>
            <span className={`consentBadge consentBadge--${c.status}`}>
              {c.status}
            </span>
          </div>
          <p className="consentItemScope">{c.scope.join(", ")}</p>
          <p className="consentItemDate">
            Granted: {new Date(c.grantedAt).toLocaleDateString()}
            {c.revokedAt
              ? ` · Revoked: ${new Date(c.revokedAt).toLocaleDateString()}`
              : ""}
          </p>
          {c.status === "active" ? (
            <button
              type="button"
              className="primary consentRevokeButton"
              onClick={() => onRevoke(c.id)}
              disabled={revoking === c.id}
            >
              {revoking === c.id ? "Revoking..." : "Revoke"}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
