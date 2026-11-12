import { t, type Lang } from "./i18n";
import type { MyGame, MyGamesPage } from "./types";
import { LOOK_INIT } from "./mygames.mjs";

/** A tiny pixel joystick for the retro banner (decorative; the modern look hides it). Colours come from the --mg-px-* tokens in src/styles/mygames.css. */
function PixelJoystick() {
  return (
    <svg className="mg-px" viewBox="0 0 12 12" width="24" height="24" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <rect className="mg-px-ball" x="4" y="0" width="4" height="4" />
      <rect className="mg-px-shine" x="5" y="1" width="1" height="1" />
      <rect className="mg-px-stick" x="5" y="4" width="2" height="4" />
      <rect className="mg-px-base" x="1" y="8" width="10" height="3" />
      <rect className="mg-px-button" x="2" y="9" width="2" height="1" />
      <rect className="mg-px-edge" x="1" y="11" width="10" height="1" />
    </svg>
  );
}

/** One game: cover, name, one paragraph, the facts, and the play button (a disabled button while the game is not public). */
function GameCard({ lang, game }: { lang: Lang; game: MyGame }) {
  const s = t[lang];
  const open = Boolean(game.href);
  return (
    <article className="mg-game" id={`game-${game.id}`} data-open={open ? "" : undefined}>
      <div className="mg-pic">
        {game.picture && <img src={game.picture} alt={s.gameShot(game.title)} width={1280} height={720} loading="lazy" decoding="async" />}
        {!open && <span className="mg-soon-band" aria-hidden="true"><span>{game.status}</span></span>}
      </div>
      <div className="mg-body">
        {game.kicker && <p className="mg-kicker">{game.kicker}</p>}
        <h2>{game.title}</h2>
        <p className="mg-blurb">{game.blurb}</p>
        <dl className="mg-facts">
          {game.platform && <><dt>{s.platformLabel}</dt><dd>{game.platform}</dd></>}
          {game.status && <><dt>{s.gameStatus}</dt><dd>{game.status}</dd></>}
          {game.updated && <><dt>{s.gameUpdated}</dt><dd><time dateTime={game.updated}>{game.updated}</time></dd></>}
        </dl>
        <p className="mg-actions">
          {open
            ? <a className="mg-play" href={game.href}><span aria-hidden="true">▶</span>{game.cta}</a>
            : <button type="button" className="mg-play" disabled>{game.cta}</button>}
        </p>
      </div>
    </article>
  );
}

/**
 * The games I make myself. One markup, two looks: modern (the default, the site's clean cards) and retro (a tribute to the personal download sites
 * of the late 90s: a table frame, a left category column, 最新更新, bevel buttons, a decorative counter). The retro look is the class mygames-retro on
 * this container only (src/styles/mygames.css); the header, menu, footer, theme and season are not touched. The 懷舊 / 現代 switch needs JavaScript
 * (src/mygames-client.ts); without it the page is the modern look. The inline script restores a saved retro choice before the first paint.
 */
export function MyGames({ lang, page }: { lang: Lang; page: MyGamesPage }) {
  const s = t[lang];
  return (
    <div className="mygames" id="mygames" data-mygames>
      <script dangerouslySetInnerHTML={{ __html: LOOK_INIT }} />
      <header className="mg-head">
        <div className="mg-title-row">
          <h1><PixelJoystick />{page.title}</h1>
          <div className="mg-look" role="group" aria-label={s.lookLabel} data-look-toggle hidden>
            <button type="button" data-look="retro" aria-pressed="false">{s.lookRetro}</button>
            <button type="button" data-look="modern" aria-pressed="true">{s.lookModern}</button>
          </div>
        </div>
        {page.intro && <p className="mg-intro">{page.intro}</p>}
        <p className="mg-marquee" aria-hidden="true"><span>{s.mgWelcome}</span></p>
      </header>
      <div className="mg-layout">
        <aside className="mg-side">
          <nav aria-label={s.mgCategories}>
            <h2>{s.mgCategories}</h2>
            <ul>
              <li><a href="#mg-games">{s.mgAll}</a></li>
              {page.games.map((game) => <li key={game.id}><a href={`#game-${game.id}`}>{game.title}</a></li>)}
            </ul>
          </nav>
          <div className="mg-counter" aria-hidden="true">
            <span>{s.mgCounterBefore}</span>
            <span className="mg-digits">000000</span>
            {s.mgCounterAfter && <span>{s.mgCounterAfter}</span>}
            <small>{s.mgCounterNote}</small>
          </div>
        </aside>
        <div className="mg-main">
          {page.news.length > 0 && (
            <section className="mg-news" aria-labelledby="mg-news-title">
              <h2 id="mg-news-title">{s.mgNews}</h2>
              <ul>
                {page.news.map((item, i) => (
                  <li key={item.id}>
                    <time dateTime={item.date}>{item.date}</time> <a href={`#game-${item.id}`}>{item.text}</a>
                    {i === 0 && <span className="mg-new" aria-hidden="true">NEW</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="mg-games" id="mg-games">
            {page.games.map((game) => <GameCard key={game.id} lang={lang} game={game} />)}
          </div>
          <p className="mg-top"><a href="#mygames">▲ {s.mgTop}</a></p>
        </div>
      </div>
    </div>
  );
}
