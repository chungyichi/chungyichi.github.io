// Small inline SVG icons for the toy library (no files, no network). Stroke icons on a 24-unit grid, drawn in currentColor.
import { site } from "../site.config.mjs";
import { ownerTitle, type Lang } from "./i18n";

const PATHS = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  block: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  tag: "M20 13l-7 7-9-9V4h7zM8 8h.01",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  arrow: "M7 17L17 7M9 7h8v8",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The icon of a toy owner (`icon` in site.config.mjs toyOwners; a tag when none is set). */
export const ownerIcon = (id: string): IconName => {
  const icon = site.toyOwners.find((o: { id: string }) => o.id === id)?.icon as IconName | undefined;
  return icon && icon in PATHS ? icon : "tag";
};

/** A round badge that says whose a toy is by icon and colour only; the name is in the tooltip and for screen readers. */
export function OwnerBadge({ lang, id }: { lang: Lang; id: string }) {
  if (!id) return null;
  const label = ownerTitle(lang, id);
  return <span className={`badge owner-${id}`} role="img" aria-label={label} title={label}><Icon name={ownerIcon(id)} /></span>;
}

export function WantBadge({ label }: { label: string }) {
  return <span className="badge badge-want" role="img" aria-label={label} title={label}><Icon name="heart" /></span>;
}
