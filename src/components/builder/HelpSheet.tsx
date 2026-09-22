import { useEffect, useRef } from "react";

export type HelpSheetSection = "overview" | "shortcuts" | "about";

interface HelpSheetProps {
  isOpen: boolean;
  /** Where to land when it opens. "overview" is the top. */
  section: HelpSheetSection;
  onClose: () => void;
}

/**
 * Help — one sheet, written from what the app does today.
 *
 * It replaced six views of text (a help centre, W.I.R.E., schematic, table
 * method, shortcuts, about) that had drifted from the app: shortcuts that did
 * nothing, a "press ?" that was never wired, a version number nobody shipped.
 * Every line here was checked against the code when it was written, so when a
 * control changes, change its line here in the same commit.
 *
 * It does not teach the tour. The first-run tutorial (CT3D-TUTORIAL-1/2) is
 * protected and has exactly one way back in — Learn → Take the Tour — and this
 * sheet points there rather than becoming a second door.
 *
 * Transient: summoned by the Help button, gone on ✕, Escape (useHelpModal) or a
 * tap outside the card. So it is solid, not glass.
 */

type SiblingApp = { name: string; line: string; href?: string; current?: boolean };

// The family, in the one order used everywhere. Linked to each app's own site,
// never a store listing. Apps without a site yet are listed, not linked.
const FAMILY: SiblingApp[] = [
  { name: "CircuiTry3D", line: "Circuits in 3D, and what happens when they fail.", current: true },
  { name: "ThePrints3D", line: "Drawing sets turned into a 3D building, layer by layer.", href: "https://theprints3d.com" },
  { name: "AutoMotive3D", line: "An engine you can take apart.", href: "https://automotive3d.ca" },
  { name: "AnyBody3D", line: "The human body, in 3D." },
  { name: "TheCell3D", line: "A cell you can take apart." },
  { name: "ThePyramids3D", line: "The pyramids, taken apart course by course." },
  { name: "AnyPlanet3D", line: "A planet you can take apart, core to sky." },
  { name: "LearnIT3D", line: "Trade courses — Electrical Foundations, HVAC Apprentice Prep." },
];

const SHORTCUTS: Array<[string, string]> = [
  ["W", "Wire mode on / off"],
  ["T", "Rotate mode on / off"],
  ["J", "Add a junction"],
  ["B · R · L · S", "Add a battery · resistor · LED · switch"],
  ["Delete", "Remove the selected part"],
  ["Esc", "Leave the current tool"],
  ["F", "Fit the circuit to the screen"],
  ["H", "Reset the view"],
  ["G", "Grid on / off"],
  ["C", "Clear the board (Ctrl+Z brings it back)"],
  ["Space", "Show / hide the menu bar"],
  ["Ctrl+Z", "Undo"],
  ["Ctrl+Y · Ctrl+Shift+Z", "Redo"],
  ["Ctrl+C · Ctrl+V", "Copy · paste the selected part"],
  ["Ctrl+S · Ctrl+O", "Save · open a circuit"],
  ["Ctrl+N", "New circuit"],
];

export function HelpSheet({ isOpen, section, onClose }: HelpSheetProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Land on the section that was asked for, every time it opens.
  useEffect(() => {
    if (!isOpen) return;
    const body = bodyRef.current;
    if (!body) return;
    if (section === "overview") {
      body.scrollTop = 0;
      return;
    }
    body.querySelector<HTMLElement>(`#help-${section}`)?.scrollIntoView({ block: "start" });
  }, [isOpen, section]);

  return (
    <div
      className={`ws-sheet help-sheet${isOpen ? " ws-sheet--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-sheet-title"
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <div className="ws-sheet__card" onClick={(event) => event.stopPropagation()}>
        <header className="ws-sheet__head">
          <h2 className="ws-sheet__title" id="help-sheet-title">Help</h2>
          <button type="button" className="ws-sheet__close" onClick={onClose} aria-label="Close help">
            ✕
          </button>
        </header>

        <div className="ws-sheet__body" ref={bodyRef}>
          <p className="help-sheet__lead">
            Want the walkthrough again? <strong>Learn → Take the Tour</strong>.
          </p>

          <section className="help-sheet__section" id="help-build">
            <h3>Build a circuit</h3>
            <ol>
              <li>Tap <strong>LIBRARY</strong> on the left edge. Tap a part to bring it to the middle, then tap it again to pick it up.</li>
              <li>Tap the board where you want it.</li>
              <li>Tap <strong>WIRE</strong>. Tap one terminal, then another — that's a wire. Keep going until the loop is closed back to the battery.</li>
              <li>Tap <strong>WIRE</strong> again when you're done.</li>
            </ol>
            <p>
              A terminal takes more than one wire. That's how you build a parallel circuit: run a
              wire from the same battery terminal to each branch.
            </p>
            <p>The readout across the top comes alive the moment current can flow.</p>
          </section>

          <section className="help-sheet__section" id="help-fix">
            <h3>Change or undo</h3>
            <ul>
              <li><strong>Undo</strong> takes back the last thing you did.</li>
              <li>Drag a part to move it. Its wires follow.</li>
              <li>Press and hold a part to edit its values, re-wire it, rotate it, or delete it.</li>
              <li>Press and hold a wire to delete it, drop a junction on it, or change how it routes.</li>
              <li>
                <strong>⊞</strong> beside Help opens the rest of the tools: Clear, Rotate, Redo, Open,
                Save, Measure. Clear empties the board — Undo brings it back.
              </li>
            </ul>
          </section>

          <section className="help-sheet__section" id="help-read">
            <h3>Read it — W.I.R.E.</h3>
            <dl className="help-sheet__wire">
              <div><dt className="help-sheet__w">W</dt><dd>Watts — power</dd></div>
              <div><dt className="help-sheet__i">I</dt><dd>Amps — current</dd></div>
              <div><dt className="help-sheet__r">R</dt><dd>Ohms — resistance</dd></div>
              <div><dt className="help-sheet__e">E</dt><dd>Volts — voltage</dd></div>
            </dl>
            <p>The top readout is the whole circuit.</p>
            <p>
              The tag button on the right edge cycles the nameplates on every part: off, then names
              and values, then live readings.
            </p>
            <p>The <strong>Wire Guide</strong> tab walks through the W.I.R.E. method in full.</p>
          </section>

          <section className="help-sheet__section" id="help-look">
            <h3>Look around</h3>
            <ul>
              <li>Drag to orbit. Pinch to zoom. Drag with two fingers to pan.</li>
              <li><strong>⊡</strong> on the right edge fits the circuit to the screen.</li>
              <li>
                <strong>Explode</strong> — the button at the bottom of the right edge. Slide it up
                and every part lifts off the board, leads stretched down to the wires, so you can see
                what connects to what. <strong>Assemble</strong> puts it back.
              </li>
            </ul>
          </section>

          <section className="help-sheet__section" id="help-shortcuts">
            <h3>Keyboard</h3>
            <table className="help-sheet__keys">
              <tbody>
                {SHORTCUTS.map(([keys, what]) => (
                  <tr key={keys}>
                    <th scope="row"><kbd>{keys}</kbd></th>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="help-sheet__section" id="help-about">
            <h3>About</h3>
            <p>
              CircuiTry3D — build electric circuits in 3D and see what happens when they fail, from the
              wire down to the atom.
            </p>
            <p>
              Online at <a href="https://circuitry3d.app" target="_blank" rel="noopener noreferrer">circuitry3d.app</a>.
              Questions or problems: <a href="mailto:info@circuitry3d.app">info@circuitry3d.app</a>.
            </p>
            <h4>More from the 3D family</h4>
            <ul className="help-sheet__family">
              {FAMILY.map((app) => (
                <li key={app.name}>
                  {app.href && !app.current ? (
                    <a href={app.href} target="_blank" rel="noopener noreferrer">{app.name}</a>
                  ) : (
                    <span className="help-sheet__family-name">{app.name}</span>
                  )}
                  <span className="help-sheet__family-line">
                    {app.line}
                    {app.current ? " You're here." : !app.href ? " Coming." : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
