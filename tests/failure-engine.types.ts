// Type stubs for the FailureEngine module loaded from plain JS
export interface FailureModeData {
  name: string;
  visual: string;
  physicalDescription: string;
  trigger: (metrics: Record<string, number>, props?: Record<string, any>) => boolean;
  severity: (metrics: Record<string, number>, props?: Record<string, any>) => number;
}

export interface FailureProfile {
  modes: Record<string, FailureModeData>;
}

export interface ComponentProfile {
  defaultProperties: Record<string, any>;
}

export interface FailureResult {
  failed: boolean;
  severity: number;
  family: string | null;
  mode: FailureModeData | null;
  description: string | null;
  name: string | null;
  visual: string | null;
}

export interface FailureEngineExport {
  COMPONENT_FAMILY_MAP: Record<string, string>;
  COMPONENT_PROFILES: Record<string, ComponentProfile>;
  COMPONENT_FAILURE_PROFILES: Record<string, FailureProfile>;
  resolveComponentFamily: (rawType: string, props?: Record<string, any>) => string;
  detectFailure: (component: any, metrics: any) => FailureResult;
  registerComponentType: (type: string, spec: any) => void;
  registerFailureProfile: (type: string, modes: Record<string, any>) => void;
}
