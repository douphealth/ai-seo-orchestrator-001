import React from 'react';
import type { PagePerformance } from '../types';

const ClicksIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M10 3.75a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM10 8.75a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 01.75-.75zM8.25 9.5a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5zM13.25 9.5a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5zM6 10a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 016 10zm3.25-.75a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zM14 10a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5a.75.75 0 01-.75-.75zM.75 6a.75.75 0 000 1.5h18.5a.75.75 0 000-1.5H.75z"/></svg>;
const ImpressionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.18l.88-1.467a1.65 1.65 0 012.298-.88l1.467.88a1.65 1.65 0 01.88 2.298l-.88 1.467a1.65 1.65 0 01-2.298.88l-1.467-.88a1.65 1.65 0 01-.88-2.298l.88-1.467zM19.336 10.59a1.651 1.651 0 010-1.18l-.88-1.467a1.65 1.65 0 00-2.298-.88l-1.467.88a1.65 1.65 0 00-.88 2.298l.88 1.467a1.65 1.65 0 002.298.88l1.467-.88a1.65 1.65 0 00.88-2.298l-.88-1.467z" clipRule="evenodd" /></svg>;
const CtrIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M10 3.5a.75.75 0 01.75.75V10a.75.75 0 01-1.5 0V4.25a.75.75 0 01.75-.75z" /><path d="M4.293 4.293a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06z" /><path d="M9.25 10A.75.75 0 0110 9.25h5.75a.75.75 0 010 1.5H10A.75.75 0 019.25 10z" /><path d="M15.707 4.293a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06l4.5-4.5a.75.75 0 011.06 0z" /></svg>;
const PositionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0v-6.5A.75.75 0 0110 2zM3.843 4.343a.75.75 0 011.06 1.06l-1.06-1.06zM3.843 5.404a.75.75 0 00-1.06-1.06l1.06 1.06zM2 10a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 012 10zM16.157 4.343a.75.75 0 01-1.06 1.06l1.06-1.06zM15.096 5.404a.75.75 0 001.06-1.06l-1.06 1.06zM10 14a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0v-.01A.75.75 0 0110 14z" clipRule="evenodd" /><path d="M3 14a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0v-.01A.75.75 0 013 14zm3 0a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0v-.01A.75.75 0 016 14zm3 0a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0v-.01A.75.75 0 019 14zm3 0a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0v-.01a.75.75 0 011.25-.664l.05.02a.75.75 0 01.664-1.25zM16.25 14.75a.75.75 0 00-1.5 0v.01a.75.75 0 001.5 0v-.01z" /></svg>;

const categoryColors: Record<PagePerformance['recommendations'][0]['category'], string> = {
    'Snippet': 'bg-blue-900/50 text-blue-300',
    'On-Page Content': 'bg-green-900/50 text-green-300',
    'Technical SEO': 'bg-yellow-900/50 text-yellow-300',
    'Off-Page Strategy': 'bg-cyan-900/50 text-cyan-300',
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; colorClass: string }> = ({ icon, label, value, colorClass }) => (
    <div className={`flex-1 p-3 bg-gray-900/50 border ${colorClass.replace('text', 'border')} rounded-lg flex items-center gap-4`}>
        <div className={`p-2 rounded-md bg-gray-950 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
        </div>
    </div>
);

interface PerformanceDisplayProps {
  performance: PagePerformance;
  isGscConnected: boolean;
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = ({ performance, isGscConnected }) => {
    const { summary, recommendations, metrics } = performance;
    const dataSourceText = isGscConnected ? "from Google Search Console" : "(Simulated Data)";

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<ClicksIcon />} label="Clicks" value={metrics.clicks.toLocaleString()} colorClass="text-blue-400" />
                <StatCard icon={<ImpressionsIcon />} label="Impressions" value={metrics.impressions.toLocaleString()} colorClass="text-cyan-400" />
                <StatCard icon={<CtrIcon />} label="CTR" value={`${(metrics.ctr * 100).toFixed(2)}%`} colorClass="text-green-400" />
                <StatCard icon={<PositionIcon />} label="Position" value={metrics.position.toFixed(1)} colorClass="text-yellow-400" />
            </div>
             <p className="text-xs text-center text-gray-500">Performance data last 90 days {dataSourceText}</p>

            <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80">
                <h4 className="font-semibold text-teal-400 mb-2">AI Performance Diagnosis</h4>
                <p className="text-sm text-gray-300 italic mb-4 border-l-2 border-teal-700 pl-3">"{summary}"</p>
                
                <h5 className="font-semibold text-gray-400 text-sm mb-3">Actionable Recommendations:</h5>
                <ul className="space-y-3">
                    {recommendations.map((rec, index) => (
                        <li key={index} className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                           <div className="flex items-center justify-between mb-2">
                               <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColors[rec.category]}`}>{rec.category}</span>
                           </div>
                           <p className="text-sm text-gray-200 mb-2">{rec.action}</p>
                           <p className="text-xs text-gray-400 italic">
                                <strong>Rationale:</strong> {rec.rationale}
                           </p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
