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

import { APP_SITE_LABEL, APP_SITE_URL, STUDIO_SITES } from "../constants/urls";
import "../styles/studio-credit.css";

type StudioCreditProps = {
  className?: string;
};

export default function StudioCredit({ className }: StudioCreditProps) {
  const classes = ["studio-credit", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <a
        className="studio-credit__site"
        href={APP_SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        {APP_SITE_LABEL}
      </a>
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
