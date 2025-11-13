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
    description: '9V battery',
    geometry: {
      shapes: [
        {
          type: 'box',
          position: [0, 0, 0],
          scale: [0.5, 1.0, 0.3],
          color: '#2C5F8D',
        },
        {
          type: 'cylinder',
          position: [0, 0.55, 0.1],
          scale: [0.1, 0.15, 0.1],
          color: '#FFD700',
        },
        {
          type: 'cylinder',
          position: [0, 0.55, -0.1],
          scale: [0.1, 0.15, 0.1],
          color: '#C0C0C0',
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
];

export function getComponent3D(type: string): Component3DGeometry | undefined {
  return COMPONENT_3D_LIBRARY.find(comp => comp.type === type);
}
