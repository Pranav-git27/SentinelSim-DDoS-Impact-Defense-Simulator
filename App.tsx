
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Activity, 
  Zap, 
  Lock, 
  Server, 
  RefreshCcw, 
  Terminal, 
  Info,
  AlertTriangle,
  Cpu,
  Globe,
  Database,
  BarChart3,
  Trophy,
  Target,
  Clock,
  Play,
  RotateCcw,
  ZapOff,
  UserCheck,
  TrendingUp,
  Skull,
  BookOpen,
  ChevronRight,
  MousePointerClick
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

import { 
  AttackType, 
  Metrics, 
  DefenseState, 
  SimulationLog, 
  AIAnalysisResult,
  AttackOrigin,
  Challenge,
  ChallengeStatus
} from './types';
import { analyzeTraffic } from './services/geminiService';

const MAX_HISTORY = 40;
const SIM_INTERVAL = 1000;
const RAMP_DURATION_MS = 8000;

const MAX_RPS = 50000;
const MAX_RESPONSE_TIME = 5000;

const BASELINE: Metrics = { 
  timestamp: '',
  rps: 150, 
  cpu: 10, 
  memory: 20, 
  responseTime: 45, 
  errorRate: 0.01, 
  bandwidth: 30, 
  ipDiversity: 90,
  efficiency: 100
};

const REGIONS = [
  { name: 'North America', x: 20, y: 35 },
  { name: 'South America', x: 30, y: 70 },
  { name: 'Western Europe', x: 48, y: 30 },
  { name: 'Eastern Europe', x: 55, y: 25 },
  { name: 'East Asia', x: 80, y: 35 },
  { name: 'South Asia', x: 72, y: 55 },
  { name: 'Australia', x: 85, y: 75 },
  { name: 'Africa', x: 52, y: 60 }
];

const CHALLENGES: Challenge[] = [
  {
    id: 'mission-1',
    title: 'Volumetric Flood',
    description: 'A massive UDP flood is saturating your pipes. Use edge protection (CDN) to offload the traffic.',
    attackType: AttackType.VOLUMETRIC,
    duration: 30,
    goalDescription: 'Bandwidth < 1200 & Efficiency > 65%.',
    checkGoal: (m) => m.bandwidth < 1200 && m.efficiency > 65,
    failureMessage: 'Network pipes collapsed or too many legitimate users blocked.'
  },
  {
    id: 'mission-2',
    title: 'HTTP POST Botnet',
    description: 'Sophisticated bots are hitting your API. WAF is essential; CAPTCHA is a powerful but costly backup.',
    attackType: AttackType.APPLICATION,
    duration: 35,
    goalDescription: 'CPU < 70% & Efficiency > 50%.',
    checkGoal: (m) => m.cpu < 70 && m.efficiency > 50,
    failureMessage: 'Server CPU melted or the site became unusable for real users.'
  },
  {
    id: 'mission-3',
    title: 'Slowloris Resource Drain',
    description: 'Connections are being held open indefinitely. Balance the load and manage timeouts.',
    attackType: AttackType.RESOURCE,
    duration: 40,
    goalDescription: 'Resp. Time < 300ms & Error Rate < 15%.',
    checkGoal: (m) => m.responseTime < 300 && m.errorRate < 15,
    failureMessage: 'Connection pool exhausted. No new clients can connect.'
  }
];

interface AttackInfo {
  id: AttackType;
  title: string;
  icon: React.ReactElement;
  description: string;
  symptoms: string;
  bestMitigation: string;
}

interface MitigationInfo {
  id: string;
  title: string;
  description: string;
  cost: string;
  target: string;
  icon?: React.ReactElement;
}

const KNOWLEDGE_BASE = {
  attacks: [
    {
      id: AttackType.VOLUMETRIC,
      title: 'Volumetric Attack',
      icon: <TrendingUp className="text-red-400" />,
      description: 'Massive amounts of traffic designed to saturate the network bandwidth. Usually involves UDP or ICMP floods.',
      symptoms: 'High bandwidth consumption, high network latency, packet loss.',
      bestMitigation: 'CDN Absorption, IP Blocking at Edge.'
    },
    {
      id: AttackType.APPLICATION,
      title: 'Application Layer (Layer 7)',
      icon: <Activity className="text-orange-400" />,
      description: 'Targets specific applications (like web servers) by mimicking legitimate traffic. Often involves HTTP GET or POST floods.',
      symptoms: 'High CPU usage, sudden spike in Error Rates, slow database response.',
      bestMitigation: 'WAF (Web Application Firewall), CAPTCHA.'
    },
    {
      id: AttackType.RESOURCE,
      title: 'Resource Exhaustion',
      icon: <Database className="text-yellow-400" />,
      description: 'Designed to tie up server resources like connection pools or RAM. Slowloris is a classic example.',
      symptoms: 'Extremely high response times, "Service Unavailable" errors despite low bandwidth usage.',
      bestMitigation: 'Load Balancer with tight timeout configurations.'
    },
    {
      id: AttackType.PROTOCOL,
      title: 'Protocol Attack',
      icon: <Zap className="text-purple-400" />,
      description: 'Exploits weaknesses in network protocols (OSI Layers 3/4). SYN Floods are the most common.',
      symptoms: 'CPU spikes, memory depletion, exhaustion of connection table slots.',
      bestMitigation: 'Rate Limiting, Load Balancer.'
    }
  ] as AttackInfo[],
  mitigations: [
    {
      id: 'cdn',
      title: 'CDN Absorption',
      description: 'Offloads static content to globally distributed edge nodes. Absorbs volumetric traffic before it hits the origin.',
      cost: 'Low performance tax. High bandwidth protection.',
      target: AttackType.VOLUMETRIC
    },
    {
      id: 'waf',
      title: 'WAF (Web App Firewall)',
      description: 'Inspects HTTP traffic for malicious patterns. Blocks SQLi, XSS, and bot-like behavior.',
      cost: 'Moderate CPU tax. Best for Layer 7 protection.',
      target: AttackType.APPLICATION
    },
    {
      id: 'captcha',
      title: 'CAPTCHA Triggering',
      description: 'Forces users to solve a challenge. Effectively blocks automated botnets.',
      cost: 'High UX tax. Significant drop in legitimate conversion.',
      target: AttackType.APPLICATION
    },
    {
      id: 'rateLimiting',
      title: 'Rate Limiting',
      description: 'Throttles users who exceed a defined request threshold over time.',
      cost: 'Minimal overhead. Good for baseline protection.',
      target: AttackType.PROTOCOL
    },
    {
      id: 'loadBalancer',
      title: 'Load Balancing',
      description: 'Distributes traffic across multiple servers. Prevents a single node from being overwhelmed.',
      cost: 'Low latency overhead. Protects against resource exhaustion.',
      target: AttackType.RESOURCE
    },
    {
      id: 'ipBlocking',
      title: 'IP Reputation Blocking',
      description: 'Automatically drops packets from known malicious subnets.',
      cost: 'High risk of "False Positives" blocking legit regions.',
      target: 'Multiple'
    }
  ] as MitigationInfo[]
};

export default function App() {
  const [activeAttack, setActiveAttack] = useState<AttackType>(AttackType.NONE);
  const [defenses, setDefenses] = useState<DefenseState>({
    rateLimiting: false, cdn: false, waf: false, captcha: false, loadBalancer: false, ipBlocking: false,
  });
  const [history, setHistory] = useState<Metrics[]>([]);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'charts' | 'missions' | 'info'>('map');
  const [origins, setOrigins] = useState<AttackOrigin[]>([]);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>('IDLE');
  const [timeLeft, setTimeLeft] = useState(0);
  const [rampProgress, setRampProgress] = useState(0);
  const [infoCategory, setInfoCategory] = useState<'attacks' | 'mitigations'>('attacks');
  const [selectedInfoId, setSelectedInfoId] = useState<string | null>(null);
  
  const attackStartTimeRef = useRef<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, level: SimulationLog['level'] = 'INFO') => {
    const newLog: SimulationLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const toggleDefense = (key: keyof DefenseState) => {
    setDefenses(prev => {
      const newState = !prev[key];
      addLog(`${newState ? 'Enabled' : 'Disabled'} mitigation: ${key.replace(/([A-Z])/g, ' $1').trim()}`, newState ? 'SUCCESS' : 'INFO');
      return { ...prev, [key]: newState };
    });
  };

  const manualRestore = useCallback(() => {
    setHistory([]);
    setActiveAttack(AttackType.NONE);
    attackStartTimeRef.current = null;
    setChallengeStatus('IDLE');
    setCurrentChallenge(null);
    setDefenses({ rateLimiting: false, cdn: false, waf: false, captcha: false, loadBalancer: false, ipBlocking: false });
    setAiAnalysis(null);
    setLogs([]);
    setRampProgress(0);
    addLog('SYSTEM REBOOT: All metrics and defenses restored to baseline.', 'SUCCESS');
  }, [addLog]);

  const handleAIAnalysis = async () => {
    if (history.length < 5) return;
    setIsAnalyzing(true);
    const activeDefenseList = Object.entries(defenses).filter(([_, active]) => active).map(([key]) => key.replace(/([A-Z])/g, ' $1').trim());
    try {
      const result = await analyzeTraffic(history, activeAttack, activeDefenseList);
      setAiAnalysis(result);
      addLog('Forensic audit completed by SentinelAI.', 'SUCCESS');
    } catch (error) {
      addLog('Forensic audit failed. Check connectivity.', 'CRITICAL');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAttackSelect = useCallback((type: AttackType) => {
    if (type !== AttackType.NONE) {
      attackStartTimeRef.current = Date.now();
    } else {
      attackStartTimeRef.current = null;
      setRampProgress(0);
    }
    setActiveAttack(type);
    addLog(`Vector identified: ${type}`, type === AttackType.NONE ? 'INFO' : 'WARNING');
  }, [addLog]);

  useEffect(() => {
    const newOrigins: AttackOrigin[] = [];
    REGIONS.slice(0, 4).forEach((reg, i) => {
      newOrigins.push({ id: `legit-${i}`, ...reg, intensity: 0.1, isMalicious: false });
    });
    if (activeAttack !== AttackType.NONE) {
      const count = activeAttack === AttackType.VOLUMETRIC ? 12 : 6;
      const shuffled = [...REGIONS].sort(() => 0.5 - Math.random());
      shuffled.slice(0, count).forEach((reg, i) => {
        newOrigins.push({
          id: `malic-${i}`,
          x: reg.x + (Math.random() * 8 - 4),
          y: reg.y + (Math.random() * 8 - 4),
          name: reg.name,
          intensity: 0.9,
          isMalicious: true
        });
      });
    }
    setOrigins(newOrigins);
  }, [activeAttack]);

  const generateMetrics = useCallback(() => {
    setHistory(prev => {
      const last = prev[prev.length - 1] || BASELINE;
      
      let rps = last.rps + (Math.random() * 10 - 5);
      let mem = last.memory + (Math.random() * 0.5 - 0.25);
      let resTime = last.responseTime + (Math.random() * 2 - 1);
      let errorRate = Math.max(0, last.errorRate + (Math.random() * 0.005 - 0.002));
      let bandwidth = last.bandwidth + (Math.random() * 2 - 1);
      
      const now = Date.now();
      const elapsed = attackStartTimeRef.current ? now - attackStartTimeRef.current : 0;
      const rampFactor = Math.min(1.0, elapsed / RAMP_DURATION_MS);
      setRampProgress(rampFactor * 100);

      // BASE ATTACK ADDITIONS
      if (activeAttack === AttackType.VOLUMETRIC) {
        rps += 10000 * rampFactor; bandwidth += 3200 * rampFactor; resTime += 30 * rampFactor;
      } else if (activeAttack === AttackType.APPLICATION) {
        rps += 3000 * rampFactor; resTime += 150 * rampFactor; errorRate += 15 * rampFactor;
      } else if (activeAttack === AttackType.RESOURCE) {
        resTime += 450 * rampFactor; mem += 40 * rampFactor; errorRate += 30 * rampFactor;
      } else if (activeAttack === AttackType.PROTOCOL) {
        rps += 4500 * rampFactor; mem += 15 * rampFactor;
      }

      // DEFENSE IMPACT ON METRICS (RPS, Bandwidth, etc.)
      let effLoss = 0;
      let mitigationCpuOverhead = 0;

      if (defenses.rateLimiting) {
        effLoss += 3; resTime += 5; mitigationCpuOverhead += 2;
        if (activeAttack === AttackType.VOLUMETRIC || activeAttack === AttackType.APPLICATION) { rps *= 0.35; bandwidth *= 0.55; }
      }
      if (defenses.cdn) {
        effLoss += 1; resTime -= 10;
        if (activeAttack === AttackType.VOLUMETRIC) { bandwidth *= 0.05; rps *= 0.2; }
      }
      if (defenses.waf) {
        effLoss += 8; resTime += 20; mitigationCpuOverhead += 10;
        if (activeAttack === AttackType.APPLICATION) { rps *= 0.15; errorRate *= 0.2; }
      }
      if (defenses.captcha) {
        effLoss += 25; resTime += 40; mitigationCpuOverhead += 5;
        if (activeAttack === AttackType.APPLICATION) { rps *= 0.02; errorRate *= 0.05; }
      }
      if (defenses.loadBalancer) {
        effLoss += 2; resTime += 2; mitigationCpuOverhead += 2;
        if (activeAttack === AttackType.RESOURCE || activeAttack === AttackType.PROTOCOL) { resTime *= 0.3; mem *= 0.4; }
      }
      if (defenses.ipBlocking) {
        effLoss += 15;
        if (activeAttack !== AttackType.NONE) { rps *= 0.5; bandwidth *= 0.5; }
      }

      // DYNAMIC CPU CALCULATION (Target-based drift instead of cumulative addition)
      // 1. Calculate a Target CPU based on current state
      let targetCpu = BASELINE.cpu + (rps / 400); // Scale with RPS
      targetCpu += (mem - BASELINE.memory) * 0.8; // Scale with Memory
      
      // 2. Add specific attack stress that scales with ramp and intensity
      let attackStress = 0;
      if (activeAttack === AttackType.APPLICATION) {
        attackStress = 70 * rampFactor;
        if (defenses.waf) attackStress *= 0.25; // WAF significantly reduces CPU stress of App floods
        if (defenses.captcha) attackStress *= 0.1;
      } else if (activeAttack === AttackType.VOLUMETRIC) {
        attackStress = 10 * rampFactor;
        if (defenses.cdn) attackStress *= 0.2;
      } else if (activeAttack === AttackType.PROTOCOL) {
        attackStress = 45 * rampFactor;
        if (defenses.loadBalancer) attackStress *= 0.4;
      }
      
      targetCpu += attackStress + mitigationCpuOverhead;
      targetCpu = Math.min(100, Math.max(5, targetCpu));

      // 3. Smoothly drift current CPU towards target
      let currentCpu = last.cpu;
      const driftSpeed = activeAttack !== AttackType.NONE ? 0.3 : 0.15; // Faster rise, slower cool down
      currentCpu += (targetCpu - currentCpu) * driftSpeed;

      // Efficiency Calculation
      let efficiency = Math.max(0, 100 - effLoss);
      if (resTime > 500) efficiency -= (resTime - 500) / 20; 
      if (errorRate > 10) efficiency -= (errorRate - 10) * 1.5;

      if (activeAttack === AttackType.NONE) {
        rps = BASELINE.rps + (Math.random() * 20);
        resTime = BASELINE.responseTime + (Math.random() * 5);
        bandwidth = BASELINE.bandwidth + (Math.random() * 5);
        efficiency = Math.max(efficiency, 100 - effLoss);
      }

      rps = Math.min(MAX_RPS, Math.max(0, rps));
      resTime = Math.min(MAX_RESPONSE_TIME, Math.max(10, resTime));

      const newMetric: Metrics = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        rps: Math.round(rps), cpu: Math.round(currentCpu * 10) / 10, memory: Math.round(mem * 10) / 10,
        responseTime: Math.round(resTime), errorRate: Math.round(errorRate * 100) / 100,
        bandwidth: Math.round(bandwidth * 10) / 10, ipDiversity: Math.round(90), efficiency: Math.round(efficiency)
      };

      if (challengeStatus === 'ACTIVE' && currentChallenge && !currentChallenge.checkGoal(newMetric)) {
        if (elapsed > 4500) {
          setChallengeStatus('FAILED');
          addLog(`CRITICAL SYSTEM COLLAPSE: ${currentChallenge.failureMessage}`, 'CRITICAL');
        }
      }
      return [...prev, newMetric].slice(-MAX_HISTORY);
    });
  }, [activeAttack, defenses, challengeStatus, currentChallenge, addLog]);

  useEffect(() => {
    const timer = setInterval(generateMetrics, SIM_INTERVAL);
    return () => clearInterval(timer);
  }, [generateMetrics]);

  useEffect(() => {
    let timer: number;
    if (challengeStatus === 'ACTIVE' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setChallengeStatus('VICTORY');
            addLog(`THREAT NEUTRALIZED: Final forensic cleanup in progress.`, 'SUCCESS');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [challengeStatus, timeLeft, addLog]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const startMission = (challenge: Challenge) => {
    setHistory([]); 
    setDefenses({ rateLimiting: false, cdn: false, waf: false, captcha: false, loadBalancer: false, ipBlocking: false });
    handleAttackSelect(challenge.attackType);
    setCurrentChallenge(challenge);
    setTimeLeft(challenge.duration);
    setChallengeStatus('ACTIVE');
    setViewMode('map');
    addLog(`ENGAGEMENT COMMENCED: ${challenge.title}`, 'INFO');
  };

  const endMissionCleanly = (nextView: 'map' | 'charts' | 'missions' | 'info' = 'missions') => {
    setHistory([]);
    setActiveAttack(AttackType.NONE);
    attackStartTimeRef.current = null;
    setChallengeStatus('IDLE');
    setViewMode(nextView);
    setDefenses({ rateLimiting: false, cdn: false, waf: false, captcha: false, loadBalancer: false, ipBlocking: false });
  };

  const currentMetrics = history[history.length - 1] || BASELINE;

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-6 lg:p-8 gap-6 max-w-[1600px] mx-auto transition-all duration-500 ${currentMetrics.efficiency < 30 ? 'bg-red-950/10' : ''}`}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative">
        {currentMetrics.efficiency < 30 && <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-b-xl pointer-events-none" />}
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-2">
            <Shield className={`w-8 h-8 transition-colors ${currentMetrics.efficiency < 30 ? 'text-red-500' : 'text-cyan-400'}`} />
            <span className="truncate">SENTINEL-X <span className="text-slate-600 font-light hidden sm:inline">OS v2.5</span></span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${currentMetrics.efficiency < 30 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800'}`}>
              {currentMetrics.efficiency < 30 ? 'SYSTEM UNSTABLE' : 'KERNEL SECURE'}
            </span>
            <span className="hidden xs:inline">Tactical Traffic Analysis Interface</span>
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {challengeStatus === 'ACTIVE' && (
            <div className="flex items-center gap-6 px-6 py-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={126} strokeDashoffset={126 - (126 * (timeLeft / (currentChallenge?.duration || 30)))} className="text-indigo-400 transition-all duration-1000" />
                </svg>
                <span className="text-sm font-mono font-bold text-white z-10">{timeLeft}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Active Objective</span>
                <span className="text-xs text-white font-medium">{currentChallenge?.goalDescription}</span>
                <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(timeLeft / (currentChallenge?.duration || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2 text-right">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">System Health</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${currentMetrics.efficiency < 40 ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                <span className={`text-[11px] font-black tracking-tighter ${currentMetrics.efficiency < 40 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {currentMetrics.efficiency < 40 ? 'CRITICAL' : 'OPTIMAL'}
                </span>
              </div>
            </div>
            <button 
              onClick={manualRestore}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-red-900/40 border border-slate-800 hover:border-red-500/50 rounded-lg text-[10px] font-black text-slate-500 hover:text-white transition-all shadow-xl group"
            >
              <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> RESET SYSTEM
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> Vectors
              </h3>
              {rampProgress > 0 && rampProgress < 100 && (
                <span className="text-[9px] font-black text-yellow-500 animate-pulse">Ramping: {Math.round(rampProgress)}%</span>
              )}
            </div>
            {rampProgress > 0 && (
               <div className="h-1.5 w-full bg-slate-800 rounded-full mb-4 overflow-hidden">
                 <div className="h-full bg-yellow-400 transition-all duration-300 shadow-[0_0_8px_rgba(250,204,21,0.5)]" style={{ width: `${rampProgress}%` }} />
               </div>
            )}
            <div className="space-y-2">
              {Object.values(AttackType).map((type) => (
                <button
                  key={type}
                  disabled={challengeStatus === 'ACTIVE'}
                  onClick={() => handleAttackSelect(type)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all border ${
                    activeAttack === type ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-bold' : 'bg-slate-800/30 border-transparent text-slate-500 hover:bg-slate-800 disabled:opacity-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-slate-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" /> Mitigations
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.keys(defenses).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleDefense(key as keyof DefenseState)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs transition-all border ${
                    defenses[key as keyof DefenseState] ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold' : 'bg-slate-800/30 border-transparent text-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate mr-2">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${defenses[key as keyof DefenseState] ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${defenses[key as keyof DefenseState] ? 'left-5' : 'left-1'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleAIAnalysis}
            disabled={isAnalyzing || history.length < 5}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
          >
            {isAnalyzing ? <RefreshCcw className="animate-spin w-5 h-5" /> : <Lock className="w-5 h-5" />} RUN FORENSIC AUDIT
          </button>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-6 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Load (RPS)" value={currentMetrics.rps.toLocaleString()} icon={<Activity />} isDanger={currentMetrics.rps > 20000} />
            <MetricCard label="CPU Stress" value={`${currentMetrics.cpu}%`} icon={<Cpu />} isDanger={currentMetrics.cpu > 75} />
            <MetricCard label="Efficiency" value={`${currentMetrics.efficiency}%`} icon={<UserCheck />} isDanger={currentMetrics.efficiency < 40} />
            <MetricCard label="Latency" value={`${currentMetrics.responseTime}ms`} icon={<Server />} isDanger={currentMetrics.responseTime > 1000} />
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col min-h-[500px] overflow-hidden relative shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <TabButton active={viewMode === 'map'} onClick={() => setViewMode('map')} icon={<Globe size={14} />} label="LIVE MAP" />
                <TabButton active={viewMode === 'charts'} onClick={() => setViewMode('charts')} icon={<BarChart3 size={14} />} label="ANALYTICS" />
                <TabButton active={viewMode === 'missions'} onClick={() => setViewMode('missions')} icon={<Trophy size={14} />} label="MODULES" color="indigo" />
                <TabButton active={viewMode === 'info'} onClick={() => setViewMode('info')} icon={<BookOpen size={14} />} label="ENCYCLOPEDIA" color="emerald" />
              </div>
            </div>

            <div className="flex-grow relative overflow-y-auto">
              {viewMode === 'map' && <div className="absolute inset-0 p-6 flex items-center justify-center"><GlobalThreatMap origins={origins} efficiency={currentMetrics.efficiency} /></div>}
              {viewMode === 'charts' && (
                <div className="p-6 h-full flex flex-col gap-4">
                  <div className="flex-grow min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#475569" fontSize={9} hide={history.length < 5} />
                        <YAxis stroke="#475569" fontSize={9} width={40} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="rps" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRps)" strokeWidth={3} isAnimationActive={false} />
                        <Area type="monotone" dataKey="cpu" stroke="#ef4444" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
                        <Area type="monotone" dataKey="efficiency" stroke="#6366f1" fillOpacity={1} fill="url(#colorEff)" strokeWidth={3} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {viewMode === 'missions' && (
                <div className="p-6 space-y-4">
                  <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4 tracking-tighter"><Target size={24} className="text-indigo-400" /> TACTICAL MISSIONS</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {CHALLENGES.map((challenge) => (
                      <div key={challenge.id} className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:bg-slate-800/60 transition-all border-l-4 border-l-indigo-500 shadow-xl">
                        <div className="flex-grow min-w-0">
                          <h4 className="text-white font-black text-lg group-hover:text-indigo-400 transition-colors">{challenge.title}</h4>
                          <p className="text-sm text-slate-400 mb-3 leading-relaxed">{challenge.description}</p>
                          <div className="flex flex-wrap gap-4 items-center">
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-md text-[10px] font-black text-indigo-400">
                               <Clock size={12} /> {challenge.duration}S
                             </div>
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-md text-[10px] font-black text-emerald-400">
                               <Target size={12} /> {challenge.goalDescription}
                             </div>
                          </div>
                        </div>
                        <button onClick={() => startMission(challenge)} disabled={challengeStatus === 'ACTIVE'} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs flex items-center gap-2 flex-shrink-0 disabled:bg-slate-700 shadow-lg active:scale-95 transition-all">
                          <Play size={14} fill="currentColor" /> ENGAGE
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewMode === 'info' && (
                <div className="p-6 h-full flex flex-col gap-6">
                  <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                    <button onClick={() => {setInfoCategory('attacks'); setSelectedInfoId(null);}} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${infoCategory === 'attacks' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-500 hover:text-slate-300'}`}>ATTACK VECTORS</button>
                    <button onClick={() => {setInfoCategory('mitigations'); setSelectedInfoId(null);}} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${infoCategory === 'mitigations' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}>MITIGATION STRATEGIES</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {(KNOWLEDGE_BASE[infoCategory] as any[]).map((item: any) => (
                        <button key={item.id} onClick={() => setSelectedInfoId(item.id)} className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${selectedInfoId === item.id ? 'bg-slate-800 border-slate-600 shadow-lg' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg">{item.icon || <ShieldAlert size={16} className="text-emerald-400" />}</div>
                            <span className="text-sm font-bold text-slate-200">{item.title}</span>
                          </div>
                          <ChevronRight size={16} className={`text-slate-600 transition-transform ${selectedInfoId === item.id ? 'rotate-90 text-emerald-400' : ''}`} />
                        </button>
                      ))}
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[300px]">
                      {selectedInfoId ? (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                          {(() => {
                            const info = (KNOWLEDGE_BASE[infoCategory] as any[]).find((i: any) => i.id === selectedInfoId);
                            if (!info) return null;
                            return (
                              <div className="space-y-6">
                                <div><h3 className="text-xl font-black text-white mb-2">{info.title}</h3><p className="text-sm text-slate-400 leading-relaxed">{info.description}</p></div>
                                <div className="space-y-4">
                                  {infoCategory === 'attacks' ? (
                                    <><div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"><h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Diagnostic Symptoms</h4><p className="text-xs text-slate-300">{(info as AttackInfo).symptoms}</p></div><div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"><h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Recommended Response</h4><p className="text-xs text-slate-300">{(info as AttackInfo).bestMitigation}</p></div><button onClick={() => {handleAttackSelect(info.id as AttackType); setViewMode('map');}} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"><Zap size={14} /> TRIGGER SIMULATION</button></>
                                  ) : (
                                    <><div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"><h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Cost/Overhead</h4><p className="text-xs text-slate-300">{(info as MitigationInfo).cost}</p></div><div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"><h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Primary Target</h4><p className="text-xs text-slate-300">{(info as MitigationInfo).target}</p></div><button onClick={() => toggleDefense(info.id as keyof DefenseState)} className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${defenses[info.id as keyof DefenseState] ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}><Shield size={14} /> {defenses[info.id as keyof DefenseState] ? 'DEACTIVATE' : 'DEPLOY MITIGATION'}</button></>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (<div className="h-full flex flex-col items-center justify-center text-center opacity-30"><MousePointerClick size={48} className="mb-4 text-slate-500" /><p className="text-xs font-black uppercase tracking-widest text-slate-500">Select an item to view intelligence</p></div>)}
                    </div>
                  </div>
                </div>
              )}
              {challengeStatus === 'VICTORY' && (<div className="absolute inset-0 bg-emerald-950/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300"><div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce"><Trophy size={48} className="text-white" /></div><h2 className="text-4xl font-black text-white mb-2 tracking-tighter">MISSION COMPLETED</h2><p className="text-emerald-200 mb-8 max-w-sm font-medium">Attack vector neutralized. All system parameters have returned to nominal efficiency.</p><button onClick={() => endMissionCleanly('missions')} className="px-12 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black transition-all shadow-2xl active:scale-95">CONTINUE TO NEXT OPS</button></div>)}
              {challengeStatus === 'FAILED' && (<div className="absolute inset-0 bg-red-950/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300"><div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(220,38,38,0.5)]"><Skull size={48} className="text-white" /></div><h2 className="text-4xl font-black text-white mb-2 tracking-tighter">OPERATIONAL FAILURE</h2><p className="text-red-200 mb-8 max-w-sm font-medium">{currentChallenge?.failureMessage}</p><div className="flex gap-4"><button onClick={() => currentChallenge && startMission(currentChallenge)} className="px-10 py-4 bg-white text-red-950 rounded-2xl font-black transition-all hover:bg-red-50 shadow-xl active:scale-95">REATTEMPT</button><button onClick={() => endMissionCleanly('missions')} className="px-10 py-4 bg-red-800 text-white rounded-2xl font-black transition-all hover:bg-red-700 shadow-xl active:scale-95">ABORT MISSION</button></div></div>)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 h-[400px] flex flex-col shadow-2xl">
            <h3 className="text-slate-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-indigo-400" /> AI INTELLIGENCE</h3>
            <div className="flex-grow overflow-y-auto">
              {!aiAnalysis ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600"><Info className="w-10 h-10 opacity-20 mb-4" /><p className="text-[11px] font-medium leading-relaxed uppercase tracking-wider">Awaiting Forensic Audit Data...</p></div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300"><div className="flex items-center justify-between border-b border-slate-800 pb-2"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Index</span><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${aiAnalysis.riskScore === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{aiAnalysis.riskScore}</span></div><p className="text-[11px] text-slate-300 italic leading-relaxed font-medium">"{aiAnalysis.threatDescription}"</p><div className="space-y-2"><h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Strategy</h4>{aiAnalysis.mitigationSteps.map((step, i) => (<div key={i} className="text-[10px] text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex gap-2"><span className="text-indigo-400">0{i+1}.</span> {step}</div>))}</div></div>
              )}
            </div>
          </div>
          <div className="bg-black/60 border border-slate-800 rounded-2xl p-5 h-[400px] flex flex-col shadow-2xl">
            <h3 className="text-slate-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><Terminal className="w-4 h-4 text-emerald-400" /> SYSTEM CONSOLE</h3>
            <div className="flex-grow overflow-y-auto font-mono text-[9px] space-y-2 relative scroll-smooth">{logs.map((log) => (<div key={log.id} className="flex gap-2 leading-tight p-1.5 rounded bg-slate-900/20 border-l-2 border-transparent hover:border-slate-700 transition-all"><span className="text-slate-600 font-bold">[{log.timestamp.split(' ')[0]}]</span><span className={log.level === 'CRITICAL' ? 'text-red-500 font-bold' : log.level === 'SUCCESS' ? 'text-emerald-500 font-bold' : 'text-cyan-400'}>{log.message}</span></div>))}<div ref={logsEndRef} className="h-0" /></div>
          </div>
        </div>
      </div>
      <footer className="mt-auto pt-6 border-t border-slate-800 flex items-center justify-between opacity-40"><p className="text-[10px] text-slate-500 uppercase tracking-[4px] font-black">SENTINEL-X DEFENSE NETWORK</p><p className="text-[10px] text-slate-600 font-mono">ENCRYPTION: AES-256-GCM | SESSION: ACTIVE</p></footer>
    </div>
  );
}

function MetricCard({ label, value, icon, isDanger }: { label: string, value: string, icon: React.ReactElement<any>, isDanger: boolean }) {
  return (
    <div className={`p-4 rounded-2xl flex items-center gap-4 transition-all duration-500 border ${isDanger ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
      <div className={`p-2.5 rounded-xl transition-colors ${isDanger ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{React.cloneElement(icon, { size: 18 })}</div>
      <div className="min-w-0"><p className={`text-[9px] font-black uppercase tracking-widest truncate ${isDanger ? 'text-red-400' : 'text-slate-500'}`}>{label}</p><p className={`text-lg font-black font-mono tabular-nums leading-none mt-1 ${isDanger ? 'text-white' : 'text-slate-200'}`}>{value}</p></div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, color = 'cyan' }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color?: 'cyan' | 'indigo' | 'emerald' }) {
  let activeClass = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
  if (color === 'indigo') activeClass = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
  if (color === 'emerald') activeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  return (<button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${active ? activeClass : 'text-slate-500 border-transparent hover:text-slate-300'}`}>{icon} {label}</button>);
}

function GlobalThreatMap({ origins, efficiency }: { origins: AttackOrigin[], efficiency: number }) {
  const serverX = 50; const serverY = 50;
  const isCritical = efficiency < 30;
  return (
    <div className={`w-full h-full relative overflow-hidden group rounded-2xl transition-all duration-500 ${isCritical ? 'scale-[1.02]' : ''}`}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#475569 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {origins.map((origin) => (
          <g key={origin.id}>
            <path d={`M ${origin.x} ${origin.y} Q ${(origin.x + serverX) / 2} ${(origin.y + serverY) / 2 - 10} ${serverX} ${serverY}`} fill="none" stroke={origin.isMalicious ? '#ef4444' : '#22d3ee'} strokeWidth="0.15" strokeDasharray="1 1" className={`transition-opacity duration-1000 ${origin.isMalicious ? 'opacity-40 animate-[dash_15s_linear_infinite]' : 'opacity-10'}`} />
            <circle r="0.4" fill={origin.isMalicious ? '#ef4444' : '#22d3ee'}><animateMotion dur={origin.isMalicious ? "2s" : "4s"} repeatCount="indefinite" path={`M ${origin.x} ${origin.y} Q ${(origin.x + serverX) / 2} ${(origin.y + serverY) / 2 - 10} ${serverX} ${serverY}`} /></circle>
            <circle cx={origin.x} cy={origin.y} r="0.8" fill={origin.isMalicious ? '#ef4444' : '#22d3ee'} fillOpacity="0.5" className={origin.isMalicious ? 'animate-pulse' : ''} />
          </g>
        ))}
        <circle cx={serverX} cy={serverY} r="3" fill="#0f172a" stroke={isCritical ? '#ef4444' : '#22d3ee'} strokeWidth="0.8" className={isCritical ? 'animate-pulse' : ''} />
        <circle cx={serverX} cy={serverY} r="6" fill="transparent" stroke={isCritical ? '#ef4444' : '#22d3ee'} strokeWidth="0.2" strokeDasharray="1 2" className="animate-[spin_10s_linear_infinite]" />
      </svg>
      <style>{`@keyframes dash { to { stroke-dashoffset: -20; } }`}</style>
    </div>
  );
}
