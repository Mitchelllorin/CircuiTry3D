// src/schematic/currentFlowSingleton.ts

let globalFlowSystem: any = null;

export function setGlobalFlowSystem(system: any) {
  globalFlowSystem = system;
}

export function getGlobalFlowSystem() {
  return globalFlowSystem;
}
