/**
 * Founding-tester emails that receive lifetime all-access membership
 * automatically upon sign-in or account creation.
 */
const LIFETIME_TESTER_EMAILS: ReadonlySet<string> = new Set([
  "cvmr23@gmail.com",
  "ericawindram@gmail.com",
  "fnooski89@gmail.com",
  "kannacure@gmail.com",
  "kianamcknight1996@gmail.com",
  "kianaraynemcknight@gmail.com",
  "lvandeburgt82@gmail.com",
  "mitchelllorinmcknight@gmail.com",
  "partyattyrones17@gmail.com",
  "roxannemcknight10@gmail.com",
  "tristianmcknight2009@gmail.com",
  "vandeburgtchristine@gmail.com",
  "dingus7801@gmail.com",
  "jengauthier4200@gmail.com",
  "kimiprostar@gmail.com",
  "leighcopak511@gmail.com",
  "merelyme11@gmail.com",
  "wellness.kiana@gmail.com",
  "adamssara50@gmail.com",
  "alexanderlaughlin00788@gmail.com",
  "ambervantschip@gmail.com",
  "bduncan072461@gmail.com",
  "circuitry3d@gmail.com",
  "circuitry3dsim@gmail.com",
]);

/** Returns true if the given email belongs to a founding-tester. */
export function isLifetimeTester(email: string): boolean {
  return LIFETIME_TESTER_EMAILS.has(email.trim().toLowerCase());
}
