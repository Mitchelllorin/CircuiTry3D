export type Component3DGeometry = {
  type: string;
  label: string;
  description: string;
  geometry: {
    shapes: Array<{
      type: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';
      position: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
      color?: string;
      opacity?: number;
    }>;
    leads: Array<{
      position: [number, number, number];
      length: number;
      radius: number;
      color?: string;
    }>;
  };
};

export const COMPONENT_3D_LIBRARY: Component3DGeometry[] = [
  {
    type: 'resistor',
    label: 'Resistor',
    description: 'Standard axial resistor with color bands',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [0.3, 1.2, 0.3],
          color: '#D4A574',
        },
      ],
      leads: [
        { position: [-0.8, 0, 0], length: 0.5, radius: 0.02, color: '#C0C0C0' },
        { position: [0.8, 0, 0], length: 0.5, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'capacitor',
    label: 'Capacitor (Electrolytic)',
    description: 'Polarized electrolytic capacitor',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [0.4, 0.8, 0.4],
          color: '#2C5F8D',
        },
        {
          type: 'cylinder',
          position: [0, 0.45, 0],
          scale: [0.35, 0.05, 0.35],
          color: '#1A1A1A',
        },
      ],
      leads: [
        { position: [0, -0.5, 0], length: 0.4, radius: 0.02, color: '#C0C0C0' },
        { position: [0, 0.5, 0], length: 0.4, radius: 0.02, color: '#FFD700' },
      ],
    },
  },
  {
    type: 'capacitor-ceramic',
    label: 'Capacitor (Ceramic)',
    description: 'Non-polarized ceramic disc capacitor',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.5, 0.15, 0.5],
          color: '#E8B76C',
        },
      ],
      leads: [
        { position: [0, -0.3, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
        { position: [0, 0.3, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'diode',
    label: 'Diode',
    description: 'Standard rectifier diode with cathode band',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [0.25, 1.0, 0.25],
          color: '#1A1A1A',
        },
        {
          type: 'cylinder',
          position: [0.35, 0, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [0.26, 0.12, 0.26],
          color: '#C0C0C0',
        },
      ],
      leads: [
        { position: [-0.65, 0, 0], length: 0.4, radius: 0.02, color: '#C0C0C0' },
        { position: [0.65, 0, 0], length: 0.4, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'led',
    label: 'LED',
    description: 'Light emitting diode',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0.3, 0],
          rotation: [0, 0, 0],
          scale: [0.35, 0.5, 0.35],
          color: '#FF4444',
          opacity: 0.7,
        },
        {
          type: 'sphere',
          position: [0, 0.6, 0],
          scale: [0.35, 0.25, 0.35],
          color: '#FF4444',
          opacity: 0.7,
        },
      ],
      leads: [
        { position: [-0.15, -0.3, 0], length: 0.5, radius: 0.02, color: '#C0C0C0' },
        { position: [0.15, -0.3, 0], length: 0.5, radius: 0.02, color: '#FFD700' },
      ],
    },
  },
  {
    type: 'transistor-bjt',
    label: 'BJT Transistor (TO-92)',
    description: 'Bipolar junction transistor in TO-92 package',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0.3, 0],
          rotation: [0, 0, 0],
          scale: [0.4, 0.5, 0.2],
          color: '#1A1A1A',
        },
      ],
      leads: [
        { position: [-0.2, -0.3, 0], length: 0.5, radius: 0.02, color: '#C0C0C0' },
        { position: [0, -0.3, 0], length: 0.5, radius: 0.02, color: '#C0C0C0' },
        { position: [0.2, -0.3, 0], length: 0.5, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'transistor-bjt-npn',
    label: 'NPN Transistor (TO-92)',
    description: 'NPN bipolar junction transistor with Collector, Base, Emitter pins',
    geometry: {
      shapes: [
        // Main TO-92 plastic body (half-cylinder shape)
        {
          type: 'cylinder',
          position: [0, 0.32, 0],
          rotation: [0, 0, 0],
          scale: [0.38, 0.52, 0.22],
          color: '#1A1A1A',
        },
        // Flat face of TO-92
        {
          type: 'box',
          position: [0, 0.32, -0.08],
          scale: [0.34, 0.48, 0.04],
          color: '#2A2A2A',
        },
        // Pin 1 indicator dot
        {
          type: 'sphere',
          position: [-0.12, 0.55, 0.1],
          scale: [0.04, 0.02, 0.04],
          color: '#FFFFFF',
        },
        // "NPN" marking simulation (small raised area)
        {
          type: 'box',
          position: [0, 0.45, 0.12],
          scale: [0.15, 0.08, 0.01],
          color: '#3A3A3A',
        },
      ],
      leads: [
        { position: [-0.2, -0.25, 0], length: 0.55, radius: 0.022, color: '#C0C0C0' }, // Emitter
        { position: [0, -0.25, 0], length: 0.55, radius: 0.022, color: '#C0C0C0' },    // Base
        { position: [0.2, -0.25, 0], length: 0.55, radius: 0.022, color: '#C0C0C0' },  // Collector
      ],
    },
  },
  {
    type: 'transistor-bjt-pnp',
    label: 'PNP Transistor (TO-92)',
    description: 'PNP bipolar junction transistor with Emitter, Base, Collector pins',
    geometry: {
      shapes: [
        // Main TO-92 plastic body (half-cylinder shape)
        {
          type: 'cylinder',
          position: [0, 0.32, 0],
          rotation: [0, 0, 0],
          scale: [0.38, 0.52, 0.22],
          color: '#1F1F2A',
        },
        // Flat face of TO-92
        {
          type: 'box',
          position: [0, 0.32, -0.08],
          scale: [0.34, 0.48, 0.04],
          color: '#2A2A3A',
        },
        // Pin 1 indicator dot (red for PNP distinction)
        {
          type: 'sphere',
          position: [-0.12, 0.55, 0.1],
          scale: [0.04, 0.02, 0.04],
          color: '#FF6B6B',
        },
        // "PNP" marking simulation
        {
          type: 'box',
          position: [0, 0.45, 0.12],
          scale: [0.15, 0.08, 0.01],
          color: '#3A3A4A',
        },
      ],
      leads: [
        { position: [-0.2, -0.25, 0], length: 0.55, radius: 0.022, color: '#C0C0C0' }, // Emitter
        { position: [0, -0.25, 0], length: 0.55, radius: 0.022, color: '#C0C0C0' },    // Base
        { position: [0.2, -0.25, 0], length: 0.55, radius: 0.022, color: '#C0C0C0' },  // Collector
      ],
    },
  },
  {
    type: 'darlington-pair',
    label: 'Darlington Pair (TO-220)',
    description: 'Darlington transistor pair for high current gain applications',
    geometry: {
      shapes: [
        // TO-220 plastic body
        {
          type: 'box',
          position: [0, 0.42, 0],
          scale: [0.85, 0.65, 0.32],
          color: '#1A1A1A',
        },
        // Metal heatsink tab
        {
          type: 'box',
          position: [0, 0.88, 0.16],
          scale: [0.9, 0.32, 0.025],
          color: '#A8A8A8',
        },
        // Mounting hole in heatsink
        {
          type: 'cylinder',
          position: [0, 0.95, 0.16],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.1, 0.04, 0.1],
          color: '#4A4A4A',
        },
        // Internal marking (TIP series style)
        {
          type: 'box',
          position: [0, 0.55, 0.17],
          scale: [0.4, 0.2, 0.01],
          color: '#2A2A2A',
        },
        // Dual transistor symbol indicator (two dots)
        {
          type: 'sphere',
          position: [-0.15, 0.35, 0.17],
          scale: [0.05, 0.03, 0.02],
          color: '#4A90D9',
        },
        {
          type: 'sphere',
          position: [0.15, 0.35, 0.17],
          scale: [0.05, 0.03, 0.02],
          color: '#4A90D9',
        },
      ],
      leads: [
        { position: [-0.28, -0.08, 0], length: 0.45, radius: 0.035, color: '#C0C0C0' }, // Base
        { position: [0, -0.08, 0], length: 0.45, radius: 0.035, color: '#C0C0C0' },     // Collector
        { position: [0.28, -0.08, 0], length: 0.45, radius: 0.035, color: '#C0C0C0' },  // Emitter
      ],
    },
  },
  {
    type: 'transistor-mosfet',
    label: 'MOSFET (TO-220)',
    description: 'Power MOSFET in TO-220 package',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.4, 0],
          scale: [0.8, 0.6, 0.3],
          color: '#1A1A1A',
        },
        {
          type: 'box',
          position: [0, 0.85, 0.15],
          scale: [0.85, 0.3, 0.02],
          color: '#8C8C8C',
        },
      ],
      leads: [
        { position: [-0.25, -0.1, 0], length: 0.4, radius: 0.03, color: '#C0C0C0' },
        { position: [0, -0.1, 0], length: 0.4, radius: 0.03, color: '#C0C0C0' },
        { position: [0.25, -0.1, 0], length: 0.4, radius: 0.03, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'inductor',
    label: 'Inductor',
    description: 'Axial inductor coil',
    geometry: {
      shapes: [
        {
          type: 'torus',
          position: [0, 0, 0],
          scale: [0.4, 0.4, 0.15],
          color: '#8B4513',
        },
      ],
      leads: [
        { position: [-0.6, 0, 0], length: 0.4, radius: 0.02, color: '#B87333' },
        { position: [0.6, 0, 0], length: 0.4, radius: 0.02, color: '#B87333' },
      ],
    },
  },
  {
    type: 'battery',
    label: 'Battery',
    description: 'Unbranded AA alkaline cell',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0, 0],
          scale: [0.36, 1.7, 0.36],
          color: '#2B2B2B',
        },
        {
          type: 'cylinder',
          position: [0, 0.5, 0],
          scale: [0.375, 0.6, 0.375],
          color: '#B06A2A',
        },
        {
          type: 'cylinder',
          position: [0, 0.85, 0],
          scale: [0.38, 0.06, 0.38],
          color: '#B9B9B9',
        },
        {
          type: 'cylinder',
          position: [0, 0.91, 0],
          scale: [0.12, 0.1, 0.12],
          color: '#E0E0E0',
        },
        {
          type: 'cylinder',
          position: [0, -0.85, 0],
          scale: [0.38, 0.06, 0.38],
          color: '#A7A7A7',
        },
      ],
      leads: [],
    },
  },
  {
    type: 'ic-dip8',
    label: 'IC (DIP-8)',
    description: '8-pin dual inline package IC',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.15, 0],
          scale: [0.8, 0.25, 0.4],
          color: '#1A1A1A',
        },
      ],
      leads: [
        { position: [-0.45, -0.05, -0.225], length: 0.15, radius: 0.015, color: '#C0C0C0' },
        { position: [-0.45, -0.05, -0.075], length: 0.15, radius: 0.015, color: '#C0C0C0' },
        { position: [-0.45, -0.05, 0.075], length: 0.15, radius: 0.015, color: '#C0C0C0' },
        { position: [-0.45, -0.05, 0.225], length: 0.15, radius: 0.015, color: '#C0C0C0' },
        { position: [0.45, -0.05, 0.225], length: 0.15, radius: 0.015, color: '#C0C0C0' },
        { position: [0.45, -0.05, 0.075], length: 0.15, radius: 0.015, color: '#C0C0C0' },
        { position: [0.45, -0.05, -0.075], length: 0.15, radius: 0.015, color: '#C0C0C0' },
        { position: [0.45, -0.05, -0.225], length: 0.15, radius: 0.015, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'fuse',
    label: 'Fuse',
    description: 'Glass tube fuse',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [0.2, 1.0, 0.2],
          color: '#CCCCCC',
          opacity: 0.6,
        },
      ],
      leads: [
        { position: [-0.6, 0, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
        { position: [0.6, 0, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'potentiometer',
    label: 'Potentiometer',
    description: 'Variable resistor',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0.2, 0],
          rotation: [0, 0, 0],
          scale: [0.5, 0.3, 0.5],
          color: '#1A3A5C',
        },
        {
          type: 'cylinder',
          position: [0, 0.6, 0],
          scale: [0.15, 0.2, 0.15],
          color: '#FFD700',
        },
      ],
      leads: [
        { position: [-0.3, -0.1, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
        { position: [0, -0.1, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
        { position: [0.3, -0.1, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'ac_source',
    label: 'AC Source',
    description: 'Alternating current power source',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0.3, 0],
          rotation: [0, 0, 0],
          scale: [0.55, 0.4, 0.55],
          color: '#4A90D9',
        },
        {
          type: 'torus',
          position: [0, 0.3, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.25, 0.25, 0.08],
          color: '#FFD700',
        },
      ],
      leads: [
        { position: [-0.35, -0.1, 0], length: 0.4, radius: 0.025, color: '#1A1A1A' },
        { position: [0.35, -0.1, 0], length: 0.4, radius: 0.025, color: '#1A1A1A' },
      ],
    },
  },
  {
    type: 'motor',
    label: 'DC Motor',
    description: 'Direct current electric motor',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0.35, 0],
          rotation: [0, 0, 0],
          scale: [0.45, 0.6, 0.45],
          color: '#3D3D3D',
        },
        {
          type: 'cylinder',
          position: [0, 0.75, 0],
          rotation: [0, 0, 0],
          scale: [0.12, 0.25, 0.12],
          color: '#8C8C8C',
        },
        {
          type: 'cylinder',
          position: [0, -0.05, 0],
          rotation: [0, 0, 0],
          scale: [0.48, 0.08, 0.48],
          color: '#5C5C5C',
        },
      ],
      leads: [
        { position: [-0.25, -0.15, 0], length: 0.35, radius: 0.025, color: '#FF4444' },
        { position: [0.25, -0.15, 0], length: 0.35, radius: 0.025, color: '#1A1A1A' },
      ],
    },
  },
  {
    type: 'speaker',
    label: 'Speaker',
    description: 'Audio speaker/buzzer',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0.15, 0],
          rotation: [0, 0, 0],
          scale: [0.5, 0.25, 0.5],
          color: '#2D2D2D',
        },
        {
          type: 'cone',
          position: [0, 0.45, 0],
          rotation: [Math.PI, 0, 0],
          scale: [0.45, 0.35, 0.45],
          color: '#4A4A4A',
        },
        {
          type: 'sphere',
          position: [0, 0.55, 0],
          scale: [0.15, 0.1, 0.15],
          color: '#1A1A1A',
        },
      ],
      leads: [
        { position: [-0.2, -0.15, 0], length: 0.3, radius: 0.02, color: '#FF4444' },
        { position: [0.2, -0.15, 0], length: 0.3, radius: 0.02, color: '#1A1A1A' },
      ],
    },
  },
  {
    type: 'transformer',
    label: 'Transformer',
    description: 'Electromagnetic transformer',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.35, 0],
          scale: [0.8, 0.7, 0.5],
          color: '#4A4A4A',
        },
        {
          type: 'cylinder',
          position: [-0.25, 0.35, 0.28],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.15, 0.08, 0.15],
          color: '#B87333',
        },
        {
          type: 'cylinder',
          position: [0.25, 0.35, 0.28],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.15, 0.08, 0.15],
          color: '#B87333',
        },
      ],
      leads: [
        { position: [-0.3, -0.05, -0.2], length: 0.25, radius: 0.02, color: '#B87333' },
        { position: [-0.3, -0.05, 0.2], length: 0.25, radius: 0.02, color: '#B87333' },
        { position: [0.3, -0.05, -0.2], length: 0.25, radius: 0.02, color: '#B87333' },
        { position: [0.3, -0.05, 0.2], length: 0.25, radius: 0.02, color: '#B87333' },
      ],
    },
  },
  {
    type: 'opamp',
    label: 'Op-Amp (DIP-8)',
    description: 'Operational amplifier IC',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.18, 0],
          scale: [0.9, 0.28, 0.45],
          color: '#1A1A1A',
        },
        {
          type: 'sphere',
          position: [-0.35, 0.33, 0],
          scale: [0.08, 0.04, 0.08],
          color: '#2A2A2A',
        },
      ],
      leads: [
        { position: [-0.5, -0.05, -0.25], length: 0.18, radius: 0.015, color: '#C0C0C0' },
        { position: [-0.5, -0.05, -0.08], length: 0.18, radius: 0.015, color: '#C0C0C0' },
        { position: [-0.5, -0.05, 0.08], length: 0.18, radius: 0.015, color: '#C0C0C0' },
        { position: [-0.5, -0.05, 0.25], length: 0.18, radius: 0.015, color: '#C0C0C0' },
        { position: [0.5, -0.05, 0.25], length: 0.18, radius: 0.015, color: '#C0C0C0' },
        { position: [0.5, -0.05, 0.08], length: 0.18, radius: 0.015, color: '#C0C0C0' },
        { position: [0.5, -0.05, -0.08], length: 0.18, radius: 0.015, color: '#C0C0C0' },
        { position: [0.5, -0.05, -0.25], length: 0.18, radius: 0.015, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'switch',
    label: 'Toggle Switch',
    description: 'Single-pole toggle switch',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.15, 0],
          scale: [0.6, 0.25, 0.35],
          color: '#2D2D2D',
        },
        {
          type: 'cylinder',
          position: [0, 0.4, 0],
          rotation: [0.4, 0, 0],
          scale: [0.08, 0.35, 0.08],
          color: '#8C8C8C',
        },
        {
          type: 'sphere',
          position: [0, 0.62, 0.12],
          scale: [0.1, 0.1, 0.1],
          color: '#FFD700',
        },
      ],
      leads: [
        { position: [-0.2, -0.05, 0], length: 0.25, radius: 0.02, color: '#C0C0C0' },
        { position: [0.2, -0.05, 0], length: 0.25, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'lamp',
    label: 'Incandescent Lamp',
    description: 'Light bulb indicator',
    geometry: {
      shapes: [
        {
          type: 'sphere',
          position: [0, 0.45, 0],
          scale: [0.35, 0.45, 0.35],
          color: '#FFFFEE',
          opacity: 0.85,
        },
        {
          type: 'cylinder',
          position: [0, 0.08, 0],
          rotation: [0, 0, 0],
          scale: [0.22, 0.2, 0.22],
          color: '#8C8C8C',
        },
        {
          type: 'cylinder',
          position: [0, -0.08, 0],
          rotation: [0, 0, 0],
          scale: [0.18, 0.08, 0.18],
          color: '#1A1A1A',
        },
      ],
      leads: [
        { position: [0, -0.2, 0], length: 0.25, radius: 0.025, color: '#C0C0C0' },
        { position: [0, -0.2, 0.15], length: 0.25, radius: 0.015, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'zener-diode',
    label: 'Zener Diode',
    description: 'Voltage regulator zener diode',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [0.22, 0.9, 0.22],
          color: '#1A1A1A',
        },
        {
          type: 'cylinder',
          position: [0.32, 0, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [0.24, 0.1, 0.24],
          color: '#4A90D9',
        },
      ],
      leads: [
        { position: [-0.6, 0, 0], length: 0.35, radius: 0.02, color: '#C0C0C0' },
        { position: [0.6, 0, 0], length: 0.35, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'relay',
    label: 'Relay',
    description: 'Electromagnetic relay switch',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.35, 0],
          scale: [0.7, 0.55, 0.4],
          color: '#2D4A6B',
        },
        {
          type: 'box',
          position: [0, 0.65, 0],
          scale: [0.55, 0.08, 0.32],
          color: '#1A1A1A',
        },
      ],
      leads: [
        { position: [-0.25, -0.05, -0.15], length: 0.2, radius: 0.02, color: '#C0C0C0' },
        { position: [-0.25, -0.05, 0.15], length: 0.2, radius: 0.02, color: '#C0C0C0' },
        { position: [0.25, -0.05, -0.15], length: 0.2, radius: 0.02, color: '#C0C0C0' },
        { position: [0.25, -0.05, 0.15], length: 0.2, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'crystal',
    label: 'Crystal Oscillator',
    description: 'Quartz crystal oscillator',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.2, 0],
          scale: [0.7, 0.35, 0.2],
          color: '#C0C0C0',
        },
        {
          type: 'box',
          position: [0, 0.2, 0],
          scale: [0.6, 0.28, 0.15],
          color: '#4A90D9',
          opacity: 0.7,
        },
      ],
      leads: [
        { position: [-0.25, -0.05, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
        { position: [0.25, -0.05, 0], length: 0.3, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'photodiode',
    label: 'Photodiode',
    description: 'Light sensitive diode',
    geometry: {
      shapes: [
        {
          type: 'cylinder',
          position: [0, 0.25, 0],
          rotation: [0, 0, 0],
          scale: [0.3, 0.4, 0.3],
          color: '#1A1A1A',
        },
        {
          type: 'cylinder',
          position: [0, 0.5, 0],
          rotation: [0, 0, 0],
          scale: [0.28, 0.08, 0.28],
          color: '#2A5A8A',
          opacity: 0.85,
        },
      ],
      leads: [
        { position: [-0.12, -0.1, 0], length: 0.35, radius: 0.02, color: '#C0C0C0' },
        { position: [0.12, -0.1, 0], length: 0.35, radius: 0.02, color: '#FFD700' },
      ],
    },
  },
  {
    type: 'thermistor',
    label: 'Thermistor',
    description: 'Temperature sensitive resistor',
    geometry: {
      shapes: [
        {
          type: 'sphere',
          position: [0, 0.25, 0],
          scale: [0.3, 0.35, 0.3],
          color: '#8B4513',
        },
        {
          type: 'cylinder',
          position: [0, 0.45, 0],
          rotation: [0, 0, 0],
          scale: [0.08, 0.12, 0.08],
          color: '#654321',
        },
      ],
      leads: [
        { position: [-0.12, -0.1, 0], length: 0.35, radius: 0.02, color: '#C0C0C0' },
        { position: [0.12, -0.1, 0], length: 0.35, radius: 0.02, color: '#C0C0C0' },
      ],
    },
  },
  {
    type: 'voltage-regulator',
    label: 'Voltage Regulator (TO-220)',
    description: 'Three-terminal voltage regulator',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0.4, 0],
          scale: [0.75, 0.55, 0.25],
          color: '#1A1A1A',
        },
        {
          type: 'box',
          position: [0, 0.8, 0.12],
          scale: [0.8, 0.25, 0.02],
          color: '#8C8C8C',
        },
        {
          type: 'cylinder',
          position: [0, 0.9, 0.12],
          rotation: [Math.PI / 2, 0, 0],
          scale: [0.08, 0.04, 0.08],
          color: '#4A4A4A',
        },
      ],
      leads: [
        { position: [-0.22, -0.05, 0], length: 0.35, radius: 0.03, color: '#C0C0C0' },
        { position: [0, -0.05, 0], length: 0.35, radius: 0.03, color: '#C0C0C0' },
        { position: [0.22, -0.05, 0], length: 0.35, radius: 0.03, color: '#C0C0C0' },
      ],
    },
  },
];

export function getComponent3D(type: string): Component3DGeometry | undefined {
  return COMPONENT_3D_LIBRARY.find(comp => comp.type === type);
}
