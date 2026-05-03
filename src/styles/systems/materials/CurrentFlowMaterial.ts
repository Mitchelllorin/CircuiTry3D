import * as THREE from 'three';

/* ============================================================
   CREATE CURRENT FLOW MATERIAL
   ============================================================ */
export function createCurrentFlowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,

    uniforms: {
      uTime: { value: 0 },

      // WIRE values
      uI: { value: 0 },   // current
      uE: { value: 0 },   // voltage
      uR: { value: 0 },   // resistance
      uW: { value: 0 },   // power

      // catalog stress factors
      uLoad: { value: 0 }, // I / I_max
      uHeat: { value: 0 }, // W / W_max
      uTemp: { value: 0 }, // T_est / T_max

      // wire-specific properties
      uConductivity: { value: 1.0 }, // copper = 1.0, aluminum = ~0.61
      uInsulation: { value: 0.0 },   // 0 = bare, 1 = THHN, etc.
    },

    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,

    fragmentShader: `
      uniform float uTime;

      uniform float uI;
      uniform float uE;
      uniform float uR;
      uniform float uW;

      uniform float uLoad;
      uniform float uHeat;
      uniform float uTemp;

      uniform float uConductivity;
      uniform float uInsulation;

      varying vec2 vUv;

      vec3 energyColor(float eNorm) {
        vec3 low   = vec3(1.0, 0.2, 0.0);
        vec3 mid   = vec3(1.0, 1.0, 0.0);
        vec3 high  = vec3(1.0, 1.0, 1.0);
        vec3 ultra = vec3(0.4, 0.7, 1.0);

        vec3 c = mix(low, mid, eNorm);
        c = mix(c, high, pow(eNorm, 2.0));
        c = mix(c, ultra, pow(eNorm, 4.0));
        return c;
      }

      void main() {
        float speed = mix(0.1, 3.0, uI);
        float flow = vUv.x + uTime * speed;

        float eNorm = clamp(uE, 0.0, 1.0);
        vec3 baseColor = energyColor(eNorm);

        float jitter = sin(flow * 25.0 + uR * 15.0) * (uR * 0.25);

        float brightness =
            0.25 +
            uLoad * 0.6 +
            uHeat * 0.4 +
            jitter;

        float tempGlow = clamp(uTemp - 0.7, 0.0, 1.0);
        vec3 tempTint = mix(vec3(1.0), vec3(1.0, 0.3, 0.0), tempGlow);

        float insulationGlow = uInsulation * uHeat * 0.5;

        vec3 color = baseColor * tempTint * (brightness + insulationGlow);

        float radial = smoothstep(1.0, 0.3, abs(vUv.y - 0.5) * 2.0);
        color *= radial;

        gl_FragColor = vec4(color, radial);
      }
    `,
  });
}

/* ============================================================
   APPLY MATERIAL TO A WIRE MESH
   ============================================================ */
export function applyCurrentFlowToWire(wireMesh: THREE.Mesh) {
  const mat = createCurrentFlowMaterial();
  wireMesh.material = mat;
  return mat;
}

/* ============================================================
   UPDATE MATERIAL EACH FRAME
   ============================================================ */
export function updateCurrentFlowMaterial(
  mat: THREE.ShaderMaterial,
  live: any,
  catalog: any,
  time: number
) {
  const I = live.I;
  const E = live.E;
  const R = live.R;
  const W = live.W;

  const I_max = catalog.maxCurrent;
  const W_max = catalog.maxPower;
  const T_max = catalog.maxTemp;

  const estimatedTemp = (W / W_max) * T_max;

  mat.uniforms.uTime.value = time;

  mat.uniforms.uI.value = I / I_max;
  mat.uniforms.uE.value = E / catalog.maxVolt;
  mat.uniforms.uR.value = R / catalog.maxRes;
  mat.uniforms.uW.value = W / W_max;

  mat.uniforms.uLoad.value = I / I_max;
  mat.uniforms.uHeat.value = W / W_max;
  mat.uniforms.uTemp.value = estimatedTemp / T_max;

  mat.uniforms.uConductivity.value = catalog.conductivity;
  mat.uniforms.uInsulation.value = catalog.insulationFactor;
}
