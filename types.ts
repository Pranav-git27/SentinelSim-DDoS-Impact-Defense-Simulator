
export enum AttackType {
  NONE = 'None (Normal Traffic)',
  VOLUMETRIC = 'Volumetric (UDP/ICMP Flood)',
  APPLICATION = 'Application Layer (HTTP GET/POST Flood)',
  RESOURCE = 'Resource Exhaustion (Slowloris)',
  PROTOCOL = 'Protocol Attack (SYN Flood)'
}

export interface Metrics {
  timestamp: string;
  rps: number;
  cpu: number;
  memory: number;
  responseTime: number;
  errorRate: number;
  bandwidth: number;
  ipDiversity: number;
  efficiency: number; // New metric: 0-100 score of how well the system serves legit users
}

export interface DefenseState {
  rateLimiting: boolean;
  cdn: boolean;
  waf: boolean;
  captcha: boolean;
  loadBalancer: boolean;
  ipBlocking: boolean;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  message: string;
}

export interface AIAnalysisResult {
  riskScore: 'Low' | 'Medium' | 'High';
  threatDescription: string;
  mitigationSteps: string[];
  confidence: number;
}

export interface AttackOrigin {
  id: string;
  x: number;
  y: number;
  name: string;
  intensity: number;
  isMalicious: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  attackType: AttackType;
  duration: number; // seconds
  goalDescription: string;
  checkGoal: (metrics: Metrics) => boolean;
  failureMessage: string;
}

export type ChallengeStatus = 'IDLE' | 'ACTIVE' | 'VICTORY' | 'FAILED';
