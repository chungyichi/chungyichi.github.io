// The equipment block (裝備欄) of the home page: one sheet per person (data: `gear` in site.config.mjs, rules: src/gear.mjs). The tab 裝備 has two views: the overview
// (default: the word cloud of src/WordCloud.tsx with an ASCII stick figure, src/gearfigure.mjs, in the middle and the equipment names orbiting it) and the slots (the
// 18-slot character sheet). The second tab 閱歷 has the reading summary and the achievements (src/achievements.mjs). ONE shared <dialog> shows an item as a card, whichever
// view it was tapped in. All pictures are the site's own; the art is plain CSS, SVG and text.
// The page is static HTML; src/gear-client.ts (only loaded where [data-gear] is) opens the dialog, switches the tabs and views 
import { t, ownerShort, type Lang } from "./i18n";
import type { GearSet, GearSlotData, GearProfile, AchievementState, QuestLog } from "./types";
import { SLOTS, slotName, rarityName, dialogData, overviewWords, OVERVIEW_TUNE } from "./gear.mjs";
import { figureOf } from "./gearfigure.mjs";
import { CloudHost } from "./WordCloud";
import { progressText, questSummary } from "./achievements.mjs";
import { BookTile, TagList, postHref } from "./cards";
import { Icon, ownerIcon } from "./icons";
import { TOYS_SECTION } from "./toys.mjs";

/** The picture of a slot: the item's card / thumbnail, else (a game) its title on a tile in the owner's colour, else a tag icon. */
function ItemPic({ section, title, pic, owner }: { section: string; title: string; pic: string; owner: string }) {
  if (pic) return <img src={pic} alt="" width={480} height={480} loading="lazy" decoding="async" />;
  if (section !== TOYS_SECTION) return <BookTile title={title} author="" owner={owner} />;
  return <span className="no-thumb" aria-hidden="true"><Icon name="tag" /></span>;
}

/** One square slot of the sheet. Filled: a button (rarity border and glow) that carries the item as JSON for the dialog; empty: a dim dashed placeholder. */
function Slot({ lang, owner, d }: { lang: Lang; owner: string; d: GearSlotData }) {
  const s = t[lang], name = slotName(lang, d.slot);
  if (!d.item) return <li className="slot-cell"><span className="slot slot-empty" role="img" aria-label={s.gearSlotEmpty(name)}><span aria-hidden="true">{name}</span></span></li>;
  const data = dialogData(lang, d, postHref(lang, d.item.section, d.item.slug));
  return (
    <li className="slot-cell">
      <button type="button" className={`slot rarity-${d.rarity}`} data-slot data-slot-id={d.slot} data-item={JSON.stringify(data)} aria-haspopup="dialog" aria-label={s.gearSlotLabel(name, d.item.title, rarityName(lang, d.rarity))}>
        <ItemPic section={d.item.section} title={d.item.title} pic={d.item.pic} owner={owner} />
      </button>
    </li>
  );
}

/** "Lv.12 · Top Master": the level and the title, whichever is set ("" when neither). */
const levelLine = (lang: Lang, p: GearProfile) => [p.level > 0 ? t[lang].gearLevel(p.level) : "", p.title].filter(Boolean).join(" · ");

/** Name, level and title, mood: under the figure of the overview and in the avatar of the slot sheet. */
function Facts({ lang, set }: { lang: Lang; set: GearSet }) {
  const name = ownerShort(lang, set.owner, TOYS_SECTION), p = set.profile;
  return (
    <>
      <h3 className="gear-name">{name}</h3>
      {levelLine(lang, p) && <p className="gear-level">{levelLine(lang, p)}</p>}
      {(p.mood.text || p.mood.icon) && <p className="gear-mood">{p.mood.icon && <span aria-hidden="true">{p.mood.icon} </span>}{p.mood.text}</p>}
    </>
  );
}

/** The centre of the slot sheet: the same moving ASCII figure as in the overview (the cloud with no words), then the facts. */
function Avatar({ lang, set }: { lang: Lang; set: GearSet }) {
  return (
    <div className={`gear-avatar owner-${set.owner}`}>
      <CloudHost lang={lang} owner={set.owner} words={[]} summary={t[lang].gearOverview(ownerShort(lang, set.owner, TOYS_SECTION))} center={figureOf(set.owner)} centerFx={set.owner === "brother" ? "shark" : "frames"} />
      <Facts lang={lang} set={set} />
    </div>
  );
}

/**
 * The overview of a person: the word cloud (a sphere) with the stick figure in the middle and the words orbiting it, the facts under it. `mode` "items": the equipped
 * things (a word opens the shared dialog of its slot; its link to the item page works without JavaScript); "title": title, level, mood and the unlocked achievements (plain words).
 * Nothing to orbit: the figure alone with a line saying so.
 */
function Overview({ lang, set, mode }: { lang: Lang; set: GearSet; mode: "items" | "title" }) {
  const s = t[lang], art = figureOf(set.owner), words = overviewWords(set, mode, { href: (it: { section: string; slug: string }) => postHref(lang, it.section, it.slug), level: s.gearLevel });
  return (
    <div className={`gear-overview owner-${set.owner}`}>
      {words.length > 0
        ? <CloudHost lang={lang} owner={set.owner} words={words} summary={s.gearOverview(ownerShort(lang, set.owner, TOYS_SECTION))} center={art} centerFx={set.owner === "brother" ? "shark" : "frames"} tune={OVERVIEW_TUNE} />
        : <div className="gear-lonely"><pre className="wc-center" aria-hidden="true">{art}</pre><p>{mode === "title" ? s.gearNoTitle : s.gearNone}</p></div>}
      <Facts lang={lang} set={set} />
    </div>
  );
}

/** One achievement: unlocked ones first (gold border), locked ones dim with their progress. */
function AchCard({ lang, a }: { lang: Lang; a: AchievementState }) {
  const s = t[lang];
  return (
    <li className={`ach-card ${a.unlocked ? "ach-on" : "ach-off"}`}>
      <div className="ach-head">
        <h4>{a.name}</h4>
        <span className="ach-progress" aria-label={`${a.progress}/${a.min}`}>{progressText(a)}</span>
      </div>
      <p className="ach-desc">{a.desc}</p>
      <p className="ach-state"><span aria-hidden="true">{a.unlocked ? "★ " : "○ "}</span>{a.unlocked ? `${s.achUnlocked} · ${s.achGrants(a.title)}` : s.achLocked}</p>
    </li>
  );
}

/** The 閱歷 tab of a sheet: the one-line summary (books done) and the achievement shelf. */
function LogPanel({ lang, set }: { lang: Lang; set: GearSet }) {
  const s = t[lang], { log, achievements } = set;
  const shelf = [...achievements.filter((a) => a.unlocked), ...achievements.filter((a) => !a.unlocked)];
  return (
    <div className="gear-panel gear-log" role="tabpanel" aria-labelledby="gear-tab-log" data-panel="log" hidden>
      <p className="gear-summary">{questSummary(lang, log)}</p>
      {shelf.length > 0 && (
        <section aria-label={s.achTitle}>
          <h3 className="gear-sub">{s.achTitle}<span className="count">{achievements.filter((a) => a.unlocked).length} / {achievements.length}</span></h3>
          <ul className="ach-list">{shelf.map((a) => <AchCard key={a.id} lang={lang} a={a} />)}</ul>
        </section>
      )}
    </div>
  );
}

/** One person's sheet: tab 裝備 (the overview, or the slots: left column, the avatar, right column, the two hands under them; every sheet has the same slots; the other view is `hidden`
 *  until the switch is used) and tab 閱歷 (hidden until its tab is chosen). */
export function GearSheet({ lang, set, mode }: { lang: Lang; set: GearSet; mode: "items" | "title" }) {
  const col = (area: string) => <ul className={`slots slots-${area}`}>{set.slots.filter((d) => SLOTS.find((x) => x.id === d.slot)?.area === area).map((d) => <Slot key={d.slot} lang={lang} owner={set.owner} d={d} />)}</ul>;
  return (
    <div className="gear-sheet" role="group" aria-label={t[lang].gearSheet(ownerShort(lang, set.owner, TOYS_SECTION))}>
      <div className="gear-panel" role="tabpanel" aria-labelledby="gear-tab-gear" data-panel="gear">
        <div data-view="overview"><Overview lang={lang} set={set} mode={mode} /></div>
        <div data-view="slots" hidden>
          <div className="gear-body">
            {col("left")}
            <Avatar lang={lang} set={set} />
            {col("right")}
          </div>
          {col("bottom")}
        </div>
      </div>
      <LogPanel lang={lang} set={set} />
    </div>
  );
}

/** The switch 總覽 | 格子 for the whole block (above the carousel, only on the tab 裝備; remembered only in the page). Hidden until the script is running: without it only the overview exists. */
export function GearViews({ lang }: { lang: Lang }) {
  const s = t[lang];
  return (
    <div className="gear-views" role="group" aria-label={s.gearViews} data-gear-only hidden>
      <button type="button" data-view-btn="overview" aria-pressed="true">{s.gearViewOverview}</button>
      <button type="button" data-view-btn="slots" aria-pressed="false">{s.gearViewSlots}</button>
    </div>
  );
}

/** The tabs 裝備 | 閱歷 for the whole block (one bar above the carousel; the choice applies to every person's sheet). Hidden until the script is running. */
export function GearTabs({ lang }: { lang: Lang }) {
  const s = t[lang];
  return (
    <div className="gear-tabs" role="tablist" aria-label={s.gearTabs} hidden>
      <button type="button" role="tab" id="gear-tab-gear" data-tab="gear" aria-selected="true">{s.gearTabGear}</button>
      <button type="button" role="tab" id="gear-tab-log" data-tab="log" aria-selected="false" tabIndex={-1}>{s.gearTabLog}</button>
    </div>
  );
}

/** The ONE dialog of the block, empty: src/gear-client.ts fills it from the clicked slot's data-item and opens it with showModal() (Esc, focus trap and focus return are the browser's). */
export function GearDialog({ lang }: { lang: Lang }) {
  const s = t[lang];
  return (
    <dialog id="gear-dialog" className="gear-dialog" aria-labelledby="gear-dialog-title" data-open={s.gearOpenItem}>
      <div className="gear-card">
        <button type="button" className="gear-close" data-close aria-label={s.gearClose}><span aria-hidden="true">×</span></button>
        <div className="gear-card-pic" data-f="picbox" hidden><img data-f="pic" alt="" width={480} height={480} /></div>
        <div className="gear-card-body">
          <h3 id="gear-dialog-title" className="gear-card-title" data-f="title" />
          <p className="gear-card-meta"><span className="gear-rarity" data-f="rarity" /><span aria-hidden="true"> · </span><span data-f="slot" /></p>
          <p className="gear-card-sum" data-f="summary" />
          <ul className="gear-card-tags" data-f="tags" />
          <p className="gear-card-date" data-f="date" />
          <a className="gear-card-link" data-f="link" href="#" />
        </div>
      </div>
    </dialog>
  );
}
