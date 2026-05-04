import React from 'react';

const keyframes = `
@keyframes flow {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

export default function CurrentFlowAnimation({ width = 200, height = 10 }) {
  return (
    <>
      <style>{keyframes}</style>
      <div
        style={{
          width,
          height,
          overflow: 'hidden',
          backgroundColor: '#222',
          borderRadius: 4,
          background: 'linear-gradient(90deg, #222, #00eaff, #222)',
          backgroundSize: '200% 100%',
          animation: 'flow 1.2s linear infinite',
          opacity: 0.9,
        }}
      />
    </>
  );
}
