import { useEffect, useRef, useState } from "react";
import type { TipOrFact } from "../data/circuitTipsFacts";

// ── Per-tip deeper-dive article content ────────────────────────────────────

interface StoryContent {
  heading: string;
  body: string;
}

const STORY_CONTENT: Record<string, StoryContent> = {
  "kcl-1": {
    heading: "Why KCL Is the Backbone of Node Analysis",
    body: "Kirchhoff's Current Law (KCL) expresses charge conservation at every node. Because electrons cannot pile up at a junction, the sum of currents flowing in must equal the sum flowing out. Engineers use this to write a system of equations at each node, then solve for unknown voltages — a method called nodal analysis. Try placing a junction in Build mode and watching how CircuiTry3D visualises current splitting at each branch.",
  },
  "kvl-1": {
    heading: "Tracing Loops With Kirchhoff's Voltage Law",
    body: "KVL states that energy is conserved around any closed loop. When you walk around a loop adding up voltage rises (across sources) and drops (across resistors), the total is always zero. This is the foundation of mesh analysis. In CircuiTry3D's Worksheet panel you can step through KVL loops one at a time using the W.I.R.E. colour system.",
  },
  "ohm-1": {
    heading: "Ohm's Law: The Universal Starting Point",
    body: "Georg Ohm published V = I × R in 1827 after careful experiments with copper wire. Today it remains the first equation every electrician and engineer reaches for. The law assumes linear, resistive components at a constant temperature. In CircuiTry3D's Practice mode, every W.I.R.E. problem is ultimately built on this single relationship — know any two values and the third falls straight out.",
  },
  "ohm-2": {
    heading: "The Ohm's Law Triangle Visual Aid",
    body: "Cover the quantity you want to find — Voltage (V), Current (I), or Resistance (R) — and the triangle shows you what to do with the other two. Cover V? Multiply I × R. Cover I? Divide V ÷ R. Cover R? Divide V ÷ I. This mental shortcut eliminates rearrangement errors when working quickly. You'll find this triangle referenced throughout the W.I.R.E. worksheets in Practice mode.",
  },
  "series-1": {
    heading: "How Series Circuits Distribute Voltage",
    body: "In a series circuit, a single current path connects all components end-to-end. Because there is only one path, the same current flows everywhere. Voltage, however, shares itself proportionally across each component according to its resistance — bigger resistors grab more volts. This is KVL in action: the source voltage equals the sum of all individual drops.",
  },
  "series-2": {
    heading: "Adding Resistances in Series",
    body: "Series resistors combine by simple addition because each one extends the same single current path. If you have three 10 Ω resistors in series, the circuit 'sees' a single 30 Ω load. This is the principle behind precision voltage dividers and adjustable current limiters. In Build mode, try chaining resistors and watch the current reading halve as you double the total resistance.",
  },
  "series-3": {
    heading: "From Christmas Lights to Modern LEDs",
    body: "Old incandescent strings wired every bulb in series so a single open filament killed the whole string — a debugging nightmare. Modern LED strings use parallel branches or include shunt resistors so one dead LED no longer breaks the chain. This real-world evolution perfectly illustrates why circuit topology matters. CircuiTry3D's Arena lets you simulate both configurations side by side.",
  },
  "parallel-1": {
    heading: "Equal Voltage, Divided Current",
    body: "Parallel branches connect tip-to-tip and tail-to-tail, creating multiple current paths between the same two nodes. Because both terminals of every branch share the same two nodes, all branches sit at the same voltage. Current from the source splits, with more flowing through low-resistance branches. This is how your home wiring works — every outlet sees the full mains voltage.",
  },
  "parallel-2": {
    heading: "The Product-Over-Sum Shortcut",
    body: "For exactly two parallel resistors, the equivalent resistance is (R₁ × R₂) ÷ (R₁ + R₂). This derivation comes directly from combining the two reciprocals in 1/R_eq = 1/R₁ + 1/R₂ and simplifying. Memorising this shortcut saves time on quick estimates and exam problems. For three or more resistors use the full reciprocal formula or the 'conductance sum' method.",
  },
  "parallel-3": {
    heading: "Why Parallel Lowers Resistance",
    body: "Each new parallel branch opens an additional current path, reducing the opposition to overall current flow. Mathematically, adding conductances (G = 1/R) is equivalent to adding current capacity. Even a very high-resistance branch contributes a little extra conductance, so the equivalent resistance always falls below the smallest branch. This is why plugging more appliances in parallel draws more current from the source.",
  },
  "power-1": {
    heading: "Power: The Rate of Energy Conversion",
    body: "Power is the rate at which electrical energy is converted — to heat, light, motion, or radio waves. At 60 W and 120 V a bulb draws 0.5 A, matching P = V × I exactly. That same 60 W across a 12 V automotive circuit would draw 5 A — five times the current. Always check both power and current ratings when selecting components in Build mode.",
  },
  "power-2": {
    heading: "Three Faces of the Power Formula",
    body: "P = V × I is the primary form, but substituting Ohm's Law yields P = I² × R (useful when resistance and current are known) and P = V² ÷ R (useful when voltage and resistance are known). Engineers choose the form that avoids an unknown. In the W.I.R.E. Worksheet the 'W' (Watts) column is always solved last, using whichever two of V, I, or R have already been filled in.",
  },
  "resistor-1": {
    heading: "A Century of Color Codes",
    body: "The IEC standardised resistor colour bands in the 1950s so technicians worldwide could identify values without a meter in poor lighting conditions. Each colour maps to a digit (0–9) or a multiplier, and a final band gives tolerance. Modern SMD resistors instead print a three- or four-digit code. CircuiTry3D's Practice mode includes a colour-code drill and the Wire Library panel holds a full reference table.",
  },
  "resistor-2": {
    heading: "Reading a 4-Band Resistor Correctly",
    body: "The tolerance band (gold = ±5%, silver = ±10%) is always wider and always oriented to the right. With that anchor in place, bands one and two give the two significant digits, band three is the multiplier (number of zeros). A Brown-Black-Red-Gold resistor reads as 1-0 × 100 = 1,000 Ω ±5%. Practice mode has an interactive resistor drill where you can test this skill until it becomes automatic.",
  },
  "cap-1": {
    heading: "Capacitors: Instant-Release Energy Storage",
    body: "A capacitor stores energy in the electric field between two conducting plates separated by an insulator. Because the energy can be released almost instantly (limited mainly by internal resistance), capacitors excel at supplying short bursts of high current — camera flashes, airbag triggers, and audio crossover networks all rely on this. The energy stored is E = ½CV² where C is capacitance in farads.",
  },
  "cap-2": {
    heading: "Why Series Capacitors Reduce Total Capacitance",
    body: "Putting capacitors in series effectively increases the plate separation of the equivalent device, which reduces capacitance. The reciprocal rule (1/C_eq = 1/C₁ + 1/C₂ + …) mirrors that for parallel resistors. Conversely, capacitors in parallel add directly just like series resistors. This counter-intuitive symmetry between resistors and capacitors trips up students — keep the table: parallel R adds, parallel C also adds; series R adds, series C does not.",
  },
  "inductor-1": {
    heading: "Inductors and Their Opposition to Change",
    body: "An inductor is a coil of wire that stores energy in its magnetic field when current flows through it. By Lenz's Law, the induced voltage always opposes the change that created it — so an inductor resists rapid current changes. This makes inductors invaluable in power-supply filters (smoothing out ripple), radio-frequency chokes, and DC-DC converters. The energy stored is E = ½LI² where L is inductance in henries.",
  },
  "ground-1": {
    heading: "Ground: Your Measurement Reference",
    body: "Voltage is always a difference between two points — it is never absolute. 'Ground' is the zero-volt reference node to which all other voltages in a circuit are measured. In household wiring, earth ground also provides a safety path for fault currents. In battery-powered designs, ground is typically the negative terminal. CircuiTry3D shows ground symbols automatically and highlights floating nodes — always connect a ground before running the simulator.",
  },
  "ac-1": {
    heading: "Why AC Rules Power Distribution",
    body: "Nikola Tesla championed AC in the 'War of Currents' because transformers allow AC voltage to be stepped up for efficient long-distance transmission and stepped back down for safe household use. The 60 Hz US standard was chosen partly to avoid visible flicker in early incandescent lamps. Today, AC powers virtually all grid-connected devices, while DC dominates electronics and batteries.",
  },
  "dc-1": {
    heading: "DC: The Language of Electronics",
    body: "Inside every laptop, phone, and microcontroller, circuits run on DC rails — typically 5 V, 3.3 V, or 1.8 V. Power supplies and chargers convert AC from the wall to regulated DC. Edison's early DC grids were eventually outpaced by AC for transmission, but DC has made a strong comeback in high-voltage DC (HVDC) transmission lines and electric vehicle charging.",
  },
  "short-1": {
    heading: "Short Circuits and Why Fuses Exist",
    body: "A short circuit connects two nodes of different potential through near-zero resistance, causing current to rise until limited only by internal resistance and lead inductance. This can release enormous energy in milliseconds, potentially causing fires or explosions. Fuses and circuit breakers interrupt the path before damage spreads. CircuiTry3D's FUSE™ engine simulates thermal runaway in real time — add a fuse to your circuit and watch it protect the rest of the design.",
  },
  "wire-1": {
    heading: "The W.I.R.E. Framework at a Glance",
    body: "W.I.R.E. stands for Watts (Power), Current (I), Resistance (R), and voltage (E, from EMF). The four quantities are linked by Ohm's Law and the power formulas: know any two and you can derive all four. CircuiTry3D colours each quantity — blue for Watts, orange for Current, green for Resistance, red for Voltage — so students can visually identify the role of every value in a table or schematic.",
  },
  "real-1": {
    heading: "Household Wiring: Why Everything Is Parallel",
    body: "If your home outlets were wired in series, switching off one lamp would kill every other appliance in the chain. Parallel wiring ensures each outlet sits at full mains voltage independently, and a fault in one branch doesn't affect others. The downside is that every extra appliance draws more total current from the panel — which is why circuit breakers are sized to protect the wiring, not the appliances.",
  },
  "real-2": {
    heading: "Bioelectricity: Nature's Series Batteries",
    body: "Electric eels (Electrophorus electricus) generate high voltage by stacking hundreds of electrocyte cells in series — biologically equivalent to batteries. Each cell produces about 0.15 V; 4,000 cells in series yields 600 V. Current flows through the water and their prey, delivering a stunning shock. This is Kirchhoff's voltage law operating at the cellular level.",
  },
  "real-3": {
    heading: "Lightning: Capacitor Discharge on a Grand Scale",
    body: "Storm clouds accumulate charge through ice-crystal collisions, building up a colossal electric potential between cloud and ground. When the electric field exceeds the breakdown strength of air (~3 MV/m), the air ionises and a conducting plasma channel forms — a lightning bolt. The discharge lasts only microseconds but peaks at tens of kiloamperes. The resulting thunder is the shockwave from rapidly heated, expanding air.",
  },
  "trick-1": {
    heading: "Extreme Value Testing: Fast Circuit Sanity Checks",
    body: "Before solving a circuit analytically, replace each resistor with a short (0 Ω) or open (∞ Ω) and mentally trace what happens to voltages and currents. If the behaviour at the extremes matches your intuition, your circuit topology is likely correct. If it doesn't, there's a wiring error. This technique catches blunders in seconds and is especially powerful during live troubleshooting.",
  },
  "trick-2": {
    heading: "Binary Search Debugging",
    body: "Rather than probing every component sequentially, measure the midpoint of a suspected fault region. If voltage is correct at the midpoint, the fault is in the second half; if wrong, it's in the first half. Repeat, halving the search space each time. For a 16-component chain, binary search finds any fault in four measurements — a 4× speedup over linear probing. CircuiTry3D's Troubleshoot mode is designed around this methodology.",
  },
  "trick-3": {
    heading: "Label Nodes First, Write Equations Second",
    body: "Before writing a single KVL equation, annotate every node in the schematic with a voltage label (V₁, V₂, …) and define a ground reference. This forces you to define polarity conventions up front and makes every equation self-consistent. Skipping this step is the most common cause of sign errors in mesh and nodal analysis. CircuiTry3D's schematic overlay auto-labels nodes to support exactly this workflow.",
  },
  "trick-4": {
    heading: "Thévenin Equivalent: Shrink Any Network to Two Components",
    body: "Thévenin's theorem says any linear two-terminal network, no matter how complex, can be replaced by a single voltage source (V_th) in series with a single resistor (R_th). Finding V_th and R_th requires only an open-circuit voltage measurement and a short-circuit current measurement (or resistance with sources zeroed). This reduction is invaluable when analysing how different loads interact with a complex source network.",
  },
  "trick-5": {
    heading: "Superposition: Divide and Conquer",
    body: "When a circuit has multiple independent sources, superposition lets you kill all but one, solve the simplified circuit, and repeat for each source. The total response is the algebraic sum of all individual responses. This transforms a hard multi-source problem into several simple single-source problems. Remember: to 'kill' a voltage source, replace it with a short; to 'kill' a current source, replace it with an open.",
  },
  "trick-6": {
    heading: "Redrawing Schematics for Clarity",
    body: "Complex schematics often hide symmetry because components are placed for physical convenience rather than analytical clarity. Redrawing with all wires horizontal or vertical, and nodes aligned in a grid, frequently reveals that a 'complicated' network is actually a simple series-parallel combination. CircuiTry3D's auto-arrange feature uses Manhattan-routing to straighten diagrams — try pressing the grid button to see the symmetry emerge.",
  },
  "trick-7": {
    heading: "Voltage Dividers: Setting Any Voltage",
    body: "V_out = V_in × R₂ / (R₁ + R₂) is arguably the most-used formula after Ohm's Law. It underlies sensor interfaces, reference voltage generators, bias networks for transistors, and audio volume controls. The formula assumes no load current is drawn at V_out; add a buffer amplifier when driving a low-impedance load. In CircuiTry3D's Build mode, a voltage divider template is available in the component quick-add menu.",
  },
};

// ── Pre-canned Q&A logic ─────────────────────────────────────────────────────

function getAnswer(question: string, entry: TipOrFact): string {
  const q = question.toLowerCase();

  if (q.includes("formula") || q.includes("equation") || q.includes("math") || q.includes("calculate")) {
    return "For the maths, head to the W.I.R.E. Worksheet in Practice mode — it walks you through the formulas step by step and colour-codes each quantity so you can see how the values interact.";
  }
  if (q.includes("example") || q.includes("demo") || q.includes("show me") || q.includes("simulate")) {
    return "The Arena tab is your best bet for live simulation — drop in some components, set values, and watch the readings update in real time. You can also load pre-built demo circuits from the Arena's library.";
  }
  if (q.includes("practice") || q.includes("exercise") || q.includes("problem") || q.includes("quiz")) {
    return "Practice mode has graded W.I.R.E. problems organised by topic — series, parallel, power, and more. Each problem gives step-by-step hints if you get stuck.";
  }
  if (q.includes("build") || q.includes("circuit") || q.includes("create") || q.includes("make")) {
    return "Open Build mode (🔧) and drag components from the left panel onto the 3D workspace. Connect them with wires, then hit the play button to watch current flow through your design in real time.";
  }
  if (q.includes("why") || q.includes("reason") || q.includes("explain")) {
    return `${entry.text} The underlying reason connects back to conservation laws — charge and energy are always conserved, and Ohm's Law and Kirchhoff's Laws are direct consequences of that.`;
  }
  if (q.includes("real") || q.includes("everyday") || q.includes("application") || q.includes("use")) {
    return "Real-world applications are everywhere — household wiring, phone chargers, LED strips, motor controllers, and audio amplifiers all rely on these exact principles. CircuiTry3D's component library models the real-world behaviour of each part so your simulations reflect genuine physics.";
  }
  if (q.includes("help") || q.includes("stuck") || q.includes("confused") || q.includes("don't understand")) {
    return "No worries! Open the Guides panel (📚 Help) for a topic-by-topic tutorial, or load a Troubleshoot scenario to practise debugging with guided hints. You can also revisit the Practice mode worksheets at any time.";
  }
  if (q.includes("tip") || q.includes("trick") || q.includes("shortcut") || q.includes("fast")) {
    return "For pro shortcuts, check the Tricks section in the tips bar — use the → arrow to cycle through until you hit a 🔧 Trick badge. The Wire Library panel also holds a full formula reference for quick lookups.";
  }

  return `Great question! ${entry.text} Keep exploring in Build mode — hands-on experimentation is the fastest way to build intuition. Tap → for more tips, or open Practice mode for guided exercises.`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

interface AskAboutTipProps {
  entry: TipOrFact;
  onClose: () => void;
}

export function AskAboutTip({ entry, onClose }: AskAboutTipProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const msgIdRef = useRef(0);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const story = STORY_CONTENT[entry.id] ?? {
    heading: "Dig Deeper",
    body: "This concept is a cornerstone of circuit theory. Try building a circuit in Build mode or working through a Practice problem to see it in action.",
  };

  const badgeLabel =
    entry.kind === "tip" ? "💡 Tip" : entry.kind === "trick" ? "🔧 Trick" : "⚡ Fact";
  const cardIcon =
    entry.kind === "tip" ? "💡" : entry.kind === "trick" ? "🔧" : "⚡";

  const sendMessage = () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;
    setInputValue("");
    setMessages((prev) => [...prev, { id: ++msgIdRef.current, role: "user", text }]);
    setIsTyping(true);
    const delay = 700 + Math.random() * 500;
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: ++msgIdRef.current, role: "assistant", text: getAnswer(text, entry) },
      ]);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div
      className="ask-about-tip__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Ask about circuit concept"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
      tabIndex={-1}
    >
      <div
        ref={sheetRef}
        className="ask-about-tip__sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          className="ask-about-tip__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* Scrollable article body */}
        <div className="ask-about-tip__scroll">
          {/* Concept card header */}
          <div className={`ask-about-tip__card ask-about-tip__card--${entry.kind}`}>
            <span className="ask-about-tip__card-icon" aria-hidden="true">
              {cardIcon}
            </span>
            <span className={`ask-about-tip__badge ask-about-tip__badge--${entry.kind}`}>
              {badgeLabel}
            </span>
          </div>

          {/* Primary tip text — rendered as bold article lead */}
          <p className="ask-about-tip__lead">{entry.text}</p>

          {/* Deeper-dive section */}
          <h3 className="ask-about-tip__section-heading">{story.heading}</h3>
          <p className="ask-about-tip__section-body">{story.body}</p>

          {/* Chat thread */}
          {messages.length > 0 && (
            <div className="ask-about-tip__thread" aria-live="polite">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ask-about-tip__msg ask-about-tip__msg--${msg.role}`}
                >
                  {msg.role === "assistant" && (
                    <span className="ask-about-tip__msg-icon" aria-hidden="true">
                      ⚡
                    </span>
                  )}
                  <span className="ask-about-tip__msg-text">{msg.text}</span>
                </div>
              ))}
              {isTyping && (
                <div className="ask-about-tip__msg ask-about-tip__msg--assistant">
                  <span className="ask-about-tip__msg-icon" aria-hidden="true">
                    ⚡
                  </span>
                  <span className="ask-about-tip__typing" aria-label="Thinking">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* "Ask me" input bar */}
        <div className="ask-about-tip__input-bar">
          <input
            ref={inputRef}
            type="text"
            className="ask-about-tip__input"
            placeholder="Ask me about this circuit concept"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Ask a question about this circuit concept"
            autoComplete="off"
          />
          <button
            type="button"
            className="ask-about-tip__send"
            onClick={sendMessage}
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

export default AskAboutTip;
