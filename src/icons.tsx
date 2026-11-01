// Small inline SVG icons for the toy library (no files, no network). Stroke icons on a 24-unit grid, drawn in currentColor.
import { ownerTitle, ownerIconName, type Lang } from "./i18n";

const PATHS = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  block: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  tag: "M20 13l-7 7-9-9V4h7zM8 8h.01",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  arrow: "M7 17L17 7M9 7h8v8",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The icon of an owner (`icon` in site.config.mjs grid.owners; a tag when none is set). */
export const ownerIcon = (id: string): IconName => {
  const icon = ownerIconName(id) as IconName | undefined;
  return icon && icon in PATHS ? icon : "tag";
};

/** A round badge that says whose a toy is (or who reads a book) by icon and colour only; the name is in the tooltip and for screen readers. */
export function OwnerBadge({ lang, id, section }: { lang: Lang; id: string; section?: string }) {
  if (!id) return null;
  const label = ownerTitle(lang, id, section);
  return <span className={`badge owner-${id}`} role="img" aria-label={label} title={label}><Icon name={ownerIcon(id)} /></span>;
}

export function WantBadge({ label }: { label: string }) {
  return <span className="badge badge-want" role="img" aria-label={label} title={label}><Icon name="heart" /></span>;
}

/** The GitHub mark (Octicons "mark-github", 16-unit grid, filled) for the link in the header. */
export function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="1.35rem" height="1.35rem" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
