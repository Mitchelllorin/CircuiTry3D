# Component Placement Protocol

This document is the **authoritative specification** for how CircuiTry3D handles placing a component onto the canvas when an existing wire is nearby. It defines the rules, the decision tree, the user-facing feedback, and the invariants that every future implementation must respect.

---

## 1. Problem Statement

When a user drags a component from the library and releases it near an existing wire, several outcomes are conceivable:

- The component lands beside the wire and is not connected (manual wiring required later).
- The wire is automatically split and the component is inserted in series.
- The component's terminals are highlighted and the user is prompted to wire manually.
- The wire is split at the drop point into two branches without the component being wired at all.

Without a clearly defined standard, each of these outcomes could occur inconsistently. This document defines exactly which outcome must occur for each class of component and under which conditions, ensuring a predictable and learnable interaction.

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **Drop point** | The world-space position of a component's center when the user releases the drag gesture. |
| **Snap radius** | `WIRE_PLACEMENT_SNAP_RADIUS = 1.4` world units — the maximum distance from the drop point to a wire that qualifies as "near". |
| **In-series insertion** | Removing the original wire and replacing it with two new wires that pass through the component, so current must flow through the component. |
| **Wire split** | Replacing one wire with two wires that meet at a shared junction node, without inserting a component into the path. |
| **Terminal highlight** | Scaling up a terminal mesh to 1.5× and coloring it yellow to draw the user's attention to unconnected pins. |
| **2-terminal component** | Any component with exactly two connection terminals (positive/negative, left/right). Examples: resistor, LED, battery, switch, diode, capacitor, inductor, fuse, relay. |
| **Multi-terminal component** | Any component with three or more terminals. Examples: BJT (collector/base/emitter), MOSFET (gate/drain/source), potentiometer (terminal1/wiper/terminal2), op-amp, voltage divider. |
| **Junction node** | A special entity whose sole purpose is to be a branch point on a wire; it has a single logical terminal (`center`). |

---

## 3. Decision Tree

When the user **releases** a component (drops it), the following checks run **in order**:

```
1. Does the dropped entity already have ≥ 1 connection?
   └─ YES → Skip all auto-connection logic. Entity is already wired.
   └─ NO  → Continue to step 2.

2. Is there a wire within WIRE_PLACEMENT_SNAP_RADIUS of the drop point?
   └─ NO  → Entity is placed freely. No auto-connection. User wires manually.
   └─ YES → Identify the nearest wire. Continue to step 3.

3. What type of entity was dropped?
   ├─ Junction node     → SPLIT (Section 4.1)
   ├─ 2-terminal comp.  → AUTO-INSERT IN SERIES (Section 4.2)
   └─ Multi-terminal    → HIGHLIGHT & PROMPT (Section 4.3)
```

> **Rule:** Auto-connection is only attempted on first placement (zero existing connections). A component that already has even one wire attached is never auto-spliced.

---

## 4. Outcomes

### 4.1 Junction Placed on Wire — SPLIT

**When:** The dropped entity is a junction node and lands within snap radius of a wire.

**What happens:**
1. The original wire is removed.
2. Two new wires are created:
   - Wire A: `originalWire.startObj` (start side) → junction (`center`)
   - Wire B: junction (`center`) → `originalWire.endObj` (end side)
3. The junction is now live in the circuit topology as a branch node.
4. The user may now draw additional wires from the junction to create parallel paths.

**Why:** A junction's only purpose is branching. Splitting is unambiguous; there is no "wrong terminal" to connect.

**User feedback:** The wire visually splits; no toast message is needed because the split is fully automatic and self-evident.

---

### 4.2 2-Terminal Component Placed on Wire — AUTO-INSERT IN SERIES

**When:** The dropped entity has exactly two connection terminals and lands within snap radius of a wire.

**What happens:**
1. The original wire is removed.
2. Two new wires are created:
   - Wire A: `originalWire.startObj` (start side) → component terminal 0
   - Wire B: component terminal 1 → `originalWire.endObj` (end side)
3. Both new wires call `wire.addToConnections()` to register bidirectional references on both their endpoints.
4. Circuit analysis (`analyzeCircuit()` + `updateCircuitInfo()`) runs immediately.

**Why:** For a 2-terminal component there is exactly one way to insert it in series — across the broken wire. No ambiguity exists. The user benefit (instant live circuit) outweighs the risk of an unintended placement; the undo stack can reverse it.

**User feedback toast:** `"⚡ {ComponentLabel} auto-wired into circuit in series — connections lit!"`

**Terminal highlighting:** Both terminals briefly glow to confirm the connection was made.

> **Polarity note:** Terminal 0 connects to the wire's original *start* side and terminal 1 to the *end* side. For components where polarity matters (diodes, LEDs, batteries), the user must verify orientation and rotate if needed. The protocol does not attempt to infer intended polarity from wire current direction.

---

### 4.3 Multi-Terminal Component Placed on Wire — HIGHLIGHT & PROMPT

**When:** The dropped entity has three or more terminals and lands within snap radius of a wire.

**What happens:**
1. The wire is **not** modified. No auto-connection is made.
2. All terminals of the dropped component scale to 1.5× their normal size and turn yellow.
3. A `scheduleNodeDim()` timer (6 seconds) resets the terminal highlight automatically.

**Why:** For 3+ terminal components there is no unambiguous mapping from wire endpoints to component terminals. Forcing an arbitrary connection would likely produce the wrong circuit topology. Manual wiring in Wire Mode is required.

**User feedback toast:** `"⚡ {ComponentLabel} placed near wire — nodes lit! Switch to ⚡ Wire mode to connect each terminal manually."`

**Expected follow-up user action:**
1. Tap the Wire Mode button (⚡).
2. Tap a glowing terminal on the component.
3. Tap the target terminal on the wire endpoint or another component.
4. Repeat for each terminal.

---

## 5. Out-of-Range Drop (No Wire Nearby)

**When:** The drop point is more than `WIRE_PLACEMENT_SNAP_RADIUS` from every wire.

**What happens:** The component is placed at the snapped grid position and has no connections. The user must enter Wire Mode and manually route wires to/from the component's terminals.

**User feedback toast:** `"⚡ {ComponentType} added — drag to grid position, tap to place"` (shown at add time, not drop time).

---

## 6. Constants

These constants are defined in `public/legacy.html` and must be updated there to change snap behavior:

| Constant | Value | Description |
|----------|-------|-------------|
| `WIRE_PLACEMENT_SNAP_RADIUS` | `1.4` (world units) | Maximum distance from drop point to a wire to trigger auto-connection logic. |
| `WIRE_SPLIT_ENDPOINT_TOLERANCE` | `0.3` (world units) | Minimum distance from a wire endpoint before a split is allowed, preventing zero-length wire segments. |

---

## 7. Functions Implementing This Protocol

| Function | Location | Purpose |
|----------|----------|---------|
| `handleRelease()` | `public/legacy.html` | Entry point — called on pointer-up; snaps to grid, then calls `handleWirePlacementProcedure`. |
| `handleWirePlacementProcedure(entity)` | `public/legacy.html` | Runs the full decision tree (Sections 3–5). |
| `findWireNearWorldPosition(pos, radius)` | `public/legacy.html` | Returns the nearest wire and closest point within `radius`, or `null`. |
| `tryAutoInsertComponentOnWire(comp, wire)` | `public/legacy.html` | Implements Section 4.2 — removes wire, creates two replacement wires in series. |
| `splitWireWithJunction(wire, point, opts)` | `public/legacy.html` | Implements Section 4.1 — splits wire at point, optionally reusing an existing junction. |
| `lightUpConnectionNodes(entity)` | `public/legacy.html` | Implements the terminal highlight used in Section 4.3. |
| `scheduleNodeDim(entity, delayMs)` | `public/legacy.html` | Resets highlight after `delayMs` (default 6000 ms). |

---

## 8. Invariants

These conditions must hold after any placement operation completes:

1. **No zero-length wires.** A wire segment from point A to point A must never be created. `WIRE_SPLIT_ENDPOINT_TOLERANCE` enforces a minimum split distance.
2. **Bidirectional references.** Every wire must be registered in `component.connections[]` on both its `startObj` and `endObj`.
3. **No dangling original wire.** When `tryAutoInsertComponentOnWire` runs, the original wire must be fully removed from the `wires[]` array and de-registered from both its endpoint components before the two replacement wires are added.
4. **Circuit analysis runs after every auto-connection.** `analyzeCircuit()` and `updateCircuitInfo()` must be called after any auto-insert or split to keep the simulation state current.
5. **Undo-able.** All topology changes (wire removal, wire creation, connection registration) must be recorded on the undo stack so the user can reverse an unwanted auto-connection with a single undo action.

---

## 9. Summary Table

| Entity Type | Within Snap Radius? | Already Wired? | Outcome |
|-------------|---------------------|----------------|---------|
| Junction | Yes | No | Wire splits at junction (Section 4.1) |
| 2-terminal component | Yes | No | Component inserted in series (Section 4.2) |
| Multi-terminal component | Yes | No | Terminals highlighted; manual wiring required (Section 4.3) |
| Any component | No | No | Free placement; no auto-connection (Section 5) |
| Any component | Yes | Yes (≥1 conn.) | No auto-connection; entity is already wired (Section 3) |

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04 | Initial specification documenting the existing protocol as the defined standard |
