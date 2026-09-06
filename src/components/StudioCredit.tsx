/**
 * The website link plus the studio credit. The addresses themselves live in
 * constants/urls.ts; this is how they are shown.
 *
 * Inside the Play/APK build there is no URL bar, so a user who wants the
 * website has no way to find it — this is that way. It doubles as the studio
 * credit: the two sibling sites are the same maker, not sponsors, so they read
 * as one quiet "from the makers of" line rather than a second call to action.
 *
 * Containerless by house rule: no card, no border, no fill. Just the links,
 * the separator dots, and enough text-shadow to sit over anything.
 */

import {
  APP_SITE_LABEL,
  APP_SITE_URL,
  DESKTOP_APP_URL,
  PLAY_STORE_URL,
  STUDIO_SITES,
} from "../constants/urls";
import "../styles/studio-credit.css";

type StudioCreditProps = {
  className?: string;
};

export default function StudioCredit({ className }: StudioCreditProps) {
  const classes = ["studio-credit", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {/* Website and store, side by side — the two things someone means by
          "where do I find this". Every other Play link in the app is behind a
          condition (demo mode, or a purchase flow), so without this one there
          is no plain way to reach the listing from inside the app.

          The address is introduced by what it is FOR. The same app runs in a
          desktop browser, which is where a 3D circuit is actually comfortable
          to build — big screen, a mouse — and someone holding a phone has no
          way to guess that from a bare domain. It also stays written out as
          plain readable text on purpose: you cannot click a link on your phone
          onto your computer, you retype it, so the address has to be legible
          rather than hidden behind a word. */}
      <p className="studio-credit__links">
        <span className="studio-credit__lead">Use it on a computer at </span>
        <a
          className="studio-credit__site"
          href={DESKTOP_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {APP_SITE_LABEL}
        </a>
        <span className="studio-credit__sep" aria-hidden="true">
          {" · "}
        </span>
        <a
          className="studio-credit__site"
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Play
        </a>
      </p>
      <p className="studio-credit__makers">
        <span className="studio-credit__lead">From the makers of </span>
        {STUDIO_SITES.map((site, index) => (
          <span key={site.href}>
            {index > 0 && (
              <span className="studio-credit__sep" aria-hidden="true">
                {" · "}
              </span>
            )}
            <a
              className="studio-credit__link"
              href={site.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {site.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
