import React from 'react';
import type { PartialResults } from '../types/pipeline';


const CheckBadgeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const LightningBoltIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
);

const DocumentSearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);


interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, colorClass }) => (
  <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${colorClass} bg-opacity-20`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

interface InsightCardProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  colorClass: string;
  subContent?: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ title, content, icon, colorClass, subContent }) => (
  <div className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-5 border border-gray-700/50 animate-fade-in`}>
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20 shrink-0`}>
        {icon}
      </div>
      <div>
        <h4 className={`font-semibold ${colorClass}`}>{title}</h4>
        <p className="text-gray-300 mt-1">{content}</p>
        {subContent && (
          <p className="text-sm text-gray-500 mt-2 italic">{subContent}</p>
        )}
      </div>
    </div>
  </div>
);


interface ProgressiveResultsPanelProps {
  results: PartialResults;
}

export const ProgressiveResultsPanel: React.FC<ProgressiveResultsPanelProps> = ({ results }) => {
  const hasAnyResults = Object.keys(results).length > 0 && (
    results.urlsDiscovered ||
    results.sitewideAnalysis ||
    results.seoAnalysis
  );

  if (!hasAnyResults) return null;

  return (
    <div className="mt-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <CheckBadgeIcon />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-400">Early Insights Available</h3>
          <p className="text-sm text-gray-400">Results are appearing as analysis completes</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {results.urlsDiscovered !== undefined && (
          <StatCard
            icon={<DocumentSearchIcon />}
            label="URLs Discovered"
            value={results.urlsDiscovered}
            colorClass="text-blue-400"
          />
        )}
        {results.urlsAnalyzed !== undefined && (
          <StatCard
            icon={<SparklesIcon />}
            label="URLs Analyzed"
            value={results.urlsAnalyzed}
            colorClass="text-teal-400"
          />
        )}
        {results.seoAnalysis?.pageActions && (
          <StatCard
            icon={<LightningBoltIcon />}
            label="High-Priority Pages"
            value={results.seoAnalysis.pageActions.filter(p => p.priority === 'high').length}
            colorClass="text-orange-400"
          />
        )}
        {results.seoAnalysis?.keywords && (
          <StatCard
            icon={<SparklesIcon />}
            label="Keyword Opportunities"
            value={results.seoAnalysis.keywords.length}
            colorClass="text-cyan-400"
          />
        )}
      </div>

      {/* Strategic Mission */}
      {results.sitewideAnalysis?.strategicRoadmap?.missionStatement && (
        <InsightCard
          title="Strategic Mission Identified"
          content={results.sitewideAnalysis.strategicRoadmap.missionStatement}
          icon={<SparklesIcon />}
          colorClass="text-teal-400"
        />
      )}

      {/* Technical Health */}
      {results.sitewideAnalysis?.technicalHealth && (
        <div className="flex items-center gap-4 p-4 bg-gray-800/60 rounded-xl border border-gray-700/50">
          <div className={`p-3 rounded-lg ${
            results.sitewideAnalysis.technicalHealth.status === 'good' 
              ? 'bg-green-500/20 text-green-400' 
              : results.sitewideAnalysis.technicalHealth.status === 'needs_improvement'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-400">Technical Health Status</p>
            <p className={`text-lg font-semibold capitalize ${
              results.sitewideAnalysis.technicalHealth.status === 'good' 
                ? 'text-green-400' 
                : results.sitewideAnalysis.technicalHealth.status === 'needs_improvement'
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}>
              {results.sitewideAnalysis.technicalHealth.status.replace('_', ' ')}
            </p>
          </div>
        </div>
      )}

      {/* Content Gap Preview */}
      {results.sitewideAnalysis?.contentGaps && results.sitewideAnalysis.contentGaps.length > 0 && (
        <div className="bg-gradient-to-r from-teal-900/30 to-blue-900/30 rounded-xl p-5 border border-teal-500/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h4 className="font-semibold text-teal-300">Top Content Gap Identified</h4>
              <p className="text-lg text-gray-200 mt-1">{results.sitewideAnalysis.contentGaps[0].topic}</p>
              <p className="text-sm text-gray-400 mt-2">{results.sitewideAnalysis.contentGaps[0].rationale}</p>
              {results.sitewideAnalysis.contentGaps[0].competitorSource && (
                <p className="text-xs text-gray-500 mt-2">
                  Found via competitor analysis: {results.sitewideAnalysis.contentGaps[0].competitorSource}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Win Preview */}
      {results.seoAnalysis?.pageActions && results.seoAnalysis.pageActions.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h4 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <LightningBoltIcon />
            Quick Win Opportunity
          </h4>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <a 
              href={results.seoAnalysis.pageActions[0].url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm font-mono break-all"
            >
              {results.seoAnalysis.pageActions[0].url}
            </a>
            {results.seoAnalysis.pageActions[0].rewriteDetails?.reason && (
              <p className="text-sm text-gray-400 mt-2">
                {results.seoAnalysis.pageActions[0].rewriteDetails.reason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
