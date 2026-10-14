import { useNavigate } from "react-router-dom";
import ArenaView from "../components/arena/ArenaView";

/**
 * The arena page — the real one.
 *
 * `ArenaView` is the arena the Builder mounts in workspace mode, and this is
 * the same thing on its own route: the hand-built 3D bench with the supply
 * faceplate, the switch you throw to run a test, live current through every
 * part, per-part readout tiles, and the console (ArenaDashboard) carrying the
 * W.I.R.E. totals and the two supply faders.
 *
 * The "workspace" variant, not "page": the page variant puts ArenaOverlay's
 * topbar across the top of the screen, which the fixed mode bar already owns.
 * This variant is built for a shell with a nav in it — ArenaQuickBar measures
 * the nav's real bottom edge and offsets itself below it — so it is the one
 * that composes with the mode bar instead of fighting it.
 *
 * What used to be here was a stripped-down ArenaScene: a bare grid with no
 * switch, no current and no dashboards, which is why the arena looked empty.
 */
export default function Arena() {
  const navigate = useNavigate();

  return (
    <ArenaView
      variant="workspace"
      onNavigateBack={() => navigate("/app")}
      onOpenBuilder={() => navigate("/app")}
    />
  );
}