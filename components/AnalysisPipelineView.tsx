import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { PipelineStage, ActivityLogEntry } from '../types/pipeline';

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const SpinnerIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const ErrorIconSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const AIIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const PulsingDot: React.FC = () => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
  </span>
);

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-gray-700/50" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#progressGradient)" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-500 ease-out" />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

const STATUS_CONFIG = {
  pending: { bg: 'bg-gray-800/40', border: 'border-gray-700/40', iconBg: 'bg-gray-700', iconColor: 'text-gray-500' },
  running: { bg: 'bg-blue-900/20', border: 'border-blue-500/50', iconBg: 'bg-blue-500', iconColor: 'text-white' },
  complete: { bg: 'bg-green-900/20', border: 'border-green-500/40', iconBg: 'bg-green-500', iconColor: 'text-white' },
  error: { bg: 'bg-red-900/20', border: 'border-red-500/40', iconBg: 'bg-red-500', iconColor: 'text-white' },
  skipped: { bg: 'bg-gray-800/30', border: 'border-gray-600/40', iconBg: 'bg-gray-600', iconColor: 'text-gray-400' },
} as const;

interface StageCardProps {
  stage: PipelineStage;
  index: number;
  isActive: boolean;
}

const StageCard: React.FC<StageCardProps> = ({ stage, index, isActive }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (stage.status === 'running' && stage.startTime) {
      const interval = setInterval(() => setElapsedTime(Date.now() - stage.startTime!), 1000);
      return () => clearInterval(interval);
    }
    if (stage.status === 'complete' && stage.startTime && stage.endTime) {
      setElapsedTime(stage.endTime - stage.startTime);
    }
  }, [stage.status, stage.startTime, stage.endTime]);

  const config = STATUS_CONFIG[stage.status];

  return (
    <div className={`rounded-xl border transition-all duration-300 ${config.bg} ${config.border} ${isActive ? 'ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg} ${config.iconColor}`}>
            {stage.status === 'running' ? <SpinnerIcon className="w-5 h-5" /> :
             stage.status === 'complete' ? <CheckIcon className="w-5 h-5" /> :
             stage.status === 'error' ? <ErrorIconSvg className="w-5 h-5" /> :
             <span className="text-sm font-bold">{index + 1}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`font-semibold ${
                stage.status === 'running' ? 'text-blue-300' :
                stage.status === 'complete' ? 'text-green-300' :
                stage.status === 'error' ? 'text-red-300' :
                'text-gray-400'
              }`}>{stage.name}</h4>
              {(stage.status === 'running' || stage.status === 'complete') && (
                <span className={`text-xs font-mono ${stage.status === 'complete' ? 'text-green-400' : 'text-gray-400'}`}>
                  {stage.status === 'complete' && 'Done '}
                  {formatDuration(elapsedTime)}
                </span>
              )}
            </div>
            {stage.status === 'running' && stage.currentTask && (
              <div className="mt-2 flex items-center gap-2">
                <PulsingDot />
                <p className="text-sm text-gray-400 truncate animate-pulse">{stage.currentTask}</p>
              </div>
            )}
            {stage.itemsProcessed !== undefined && stage.totalItems !== undefined && stage.totalItems > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {stage.itemsProcessed.toLocaleString()} / {stage.totalItems.toLocaleString()} items
              </div>
            )}
            {stage.status === 'running' && (
              <div className="mt-3 w-full bg-gray-700/30 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-300" style={{ width: `${stage.progress}%`, boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityLog: React.FC<{ entries: ActivityLogEntry[] }> = ({ entries }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries]);

  const getEntryStyles = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'success': return { icon: <CheckIcon className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-400/10' };
      case 'warning': return { icon: <ErrorIconSvg className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
      case 'error': return { icon: <ErrorIconSvg className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-400/10' };
      case 'ai': return { icon: <AIIcon className="w-4 h-4" />, color: 'text-teal-400', bg: 'bg-teal-400/10' };
      default: return { icon: <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />, color: 'text-blue-400', bg: '' };
    }
  };

  return (
    <div ref={logRef} className="h-48 overflow-y-auto bg-gray-950/50 rounded-lg border border-gray-800 p-3 font-mono text-xs space-y-1">
      {entries.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-600">Initializing analysis engine...</div>
      ) : entries.map((entry, i) => {
        const styles = getEntryStyles(entry.type);
        return (
          <div key={i} className={`flex items-start gap-2 py-1 px-2 rounded ${styles.bg} animate-fade-in`}>
            <span className="text-gray-600 shrink-0">{formatTime(entry.timestamp)}</span>
            <span className={`shrink-0 mt-0.5 ${styles.color}`}>{styles.icon}</span>
            <span className={`${styles.color} break-words`}>{entry.message}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-2 py-1">
        <span className="text-gray-600 animate-pulse">|</span>
      </div>
    </div>
  );
};

interface AnalysisPipelineViewProps {
  stages: PipelineStage[];
  activityLog: ActivityLogEntry[];
  startTime: number;
}

export const AnalysisPipelineView: React.FC<AnalysisPipelineViewProps> = ({ stages, activityLog, startTime }) => {
  const [totalElapsed, setTotalElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTotalElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const overallProgress = useMemo(() => stages.reduce((acc, s) => acc + s.progress, 0) / stages.length, [stages]);
  const completedCount = useMemo(() => stages.filter(s => s.status === 'complete').length, [stages]);
  const runningStage = useMemo(() => stages.find(s => s.status === 'running'), [stages]);

  const estimatedRemaining = useMemo(() => {
    if (overallProgress <= 0) return null;
    const estimated = (totalElapsed / overallProgress) * (100 - overallProgress);
    return Math.max(0, Math.round(estimated / 1000));
  }, [overallProgress, totalElapsed]);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl animate-fade-in">
      <div className="bg-gradient-to-r from-blue-900/30 to-teal-900/30 border-b border-gray-800 p-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <CircularProgress percentage={overallProgress} />
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold text-gray-200">Analysis in Progress</h2>
              <p className="text-gray-400 mt-1">{runningStage?.description || 'Initializing...'}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-500">Stage {completedCount + 1} of {stages.length}</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-500">Elapsed: {formatDuration(totalElapsed)}</span>
                {estimatedRemaining !== null && estimatedRemaining > 0 && (
                  <>
                    <span className="text-gray-600">|</span>
                    <span className="text-teal-400">~{formatDuration(estimatedRemaining * 1000)} remaining</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-xl">
            <AIIcon className="w-6 h-6 text-teal-400 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-teal-300">AI Engine Active</p>
              <p className="text-xs text-teal-400/70">Processing your data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Pipeline Stages
            </h3>
            {stages.map((stage, index) => (
              <StageCard key={stage.id} stage={stage} index={index} isActive={stage.status === 'running'} />
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Live Activity Feed
            </h3>
            <ActivityLog entries={activityLog} />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{stages.filter(s => s.status === 'complete').length}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-teal-400">{runningStage?.itemsProcessed?.toLocaleString() || '--'}</p>
                <p className="text-xs text-gray-500">Items Processed</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-300">{activityLog.filter(e => e.type === 'ai').length}</p>
                <p className="text-xs text-gray-500">AI Operations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
