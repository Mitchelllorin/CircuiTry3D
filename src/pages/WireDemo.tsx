import React, { useState } from 'react';
import { WireDrawer } from '../ui/wire-drawer';
import type { Wire } from '../model/wire';
import type { Node } from '../model/node';
import { createNode } from '../model/node';
import '../styles/junction.css';

const WireSystemDemo: React.FC = () => {
  const [wires, setWires] = useState<Wire[]>([]);
  const [nodes, setNodes] = useState<Node[]>(() => {
    // Create some component pins for demonstration
    return [
      createNode('componentPin', { x: 100, y: 100 }, 'pin1'),
      createNode('componentPin', { x: 300, y: 100 }, 'pin2'),
      createNode('componentPin', { x: 100, y: 300 }, 'pin3'),
      createNode('componentPin', { x: 300, y: 300 }, 'pin4'),
    ];
  });

  const handleClear = () => {
    setWires([]);
    setNodes(nodes.filter(n => n.type === 'componentPin'));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      background: '#0f172a',
      minHeight: '100vh',
      color: '#fff'
    }}>
      <h1 style={{ marginBottom: '10px' }}>Wire System Demo</h1>
      <p style={{ marginBottom: '20px', maxWidth: '600px', textAlign: 'center' }}>
        Draw wires between pins by clicking and dragging. Wires automatically create junctions when crossing.
        Green dots are component pins, red dots are junctions, gray dots are free wire anchors.
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleClear}
          style={{
            padding: '10px 20px',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Clear Wires
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #fff'
          }} />
          <span>Component Pin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ef4444',
            border: '2px solid #fff'
          }} />
          <span>Junction</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#94a3b8',
            border: '2px solid #fff'
          }} />
          <span>Wire Anchor</span>
        </div>
      </div>

      <div style={{
        background: '#1e293b',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}>
        <WireDrawer
          width={600}
          height={600}
          wires={wires}
          nodes={nodes}
          onWiresChange={setWires}
          onNodesChange={setNodes}
        />
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#1e293b',
        borderRadius: '8px',
        maxWidth: '600px',
        fontSize: '14px'
      }}>
        <h3 style={{ marginTop: 0 }}>Statistics:</h3>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Total Wires: {wires.length}</li>
          <li>Total Nodes: {nodes.length}</li>
          <li>Component Pins: {nodes.filter(n => n.type === 'componentPin').length}</li>
          <li>Junctions: {nodes.filter(n => n.type === 'junction').length}</li>
          <li>Wire Anchors: {nodes.filter(n => n.type === 'wireAnchor').length}</li>
        </ul>
      </div>
    </div>
  );
};

export default WireSystemDemo;
