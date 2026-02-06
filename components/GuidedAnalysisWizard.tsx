
import React, { useState, useCallback } from 'react';
import type { AnalysisType, GscSite, AiProvider, AiConfig } from '../types';
import { AiConfiguration } from './AiConfiguration';
import { discoverCompetitors } from '../services/aiService';

export interface WizardSubmitData {
  url: string; // This is the GSC Site URL or manually entered site
  sitemapUrl: string;
  competitorSitemaps: string;
  analysisType: AnalysisType;
  targetLocation: string;
}

interface GuidedAnalysisWizardProps {
  isLoading: boolean;
  onSubmit: (data: WizardSubmitData) => void;
  gscSites: GscSite[];
  isGscConnected: boolean;
  isAiConfigured: boolean;
  aiConfig: AiConfig | null;
  onAiSettingsClick: () => void;
}

const Step: React.FC<{ currentStep: number; stepNumber: number; title: string; children: React.ReactNode }> = ({ currentStep, stepNumber, title, children }) => {
    const isActive = currentStep === stepNumber;
    if (!isActive) return null;
    return (
        <div className="animate-fade-in">
            <h3 className="text-xl font-bold text-gray-200 text-center">{title}</h3>
            <div className="mt-6">
                {children}
            </div>
        </div>
    );
}

const ProgressIndicator: React.FC<{ currentStep: number, totalSteps: number }> = ({ currentStep, totalSteps }) => {
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    return (
        <div className="w-full bg-gray-700/50 rounded-full h-2 mb-8">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
        </div>
    )
}

export const GuidedAnalysisWizard: React.FC<GuidedAnalysisWizardProps> = ({ isLoading, onSubmit, gscSites, isGscConnected, isAiConfigured, aiConfig, onAiSettingsClick }) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<WizardSubmitData>({
        url: '',
        sitemapUrl: '',
        competitorSitemaps: '',
        analysisType: 'global',
        targetLocation: ''
    });
    const [isFindingCompetitors, setIsFindingCompetitors] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSiteSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const siteUrl = e.target.value;
        if (!siteUrl) return;
        const siteUrlWithSlash = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
        setData(prev => ({
            ...prev,
            url: siteUrl,
            sitemapUrl: `${siteUrlWithSlash}sitemap.xml`
        }));
    };

    const handleAnalysisTypeChange = (type: AnalysisType) => {
        setData(prev => ({...prev, analysisType: type}));
    }

    const handleNext = useCallback(async () => {
        if (step === 1 && !data.url) return;
        if (step === 1 && !data.sitemapUrl) return;
        if (step === 3 && data.analysisType === 'local' && !data.targetLocation) return;
        setStep(s => s + 1);
    }, [step, data]);
    
    const handleBack = () => setStep(s => s - 1);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(data);
    };

    const handleFindCompetitors = async () => {
        if (!aiConfig || aiConfig.provider !== 'gemini' || !data.url) return;
        
        setIsFindingCompetitors(true);
        setData(prev => ({...prev, competitorSitemaps: 'Finding competitors automatically...'}));
        
        try {
            const sitemaps = await discoverCompetitors(aiConfig, data.url);
            if (sitemaps.length > 0) {
                setData(prev => ({...prev, competitorSitemaps: sitemaps.join('\n')}));
            } else {
                setData(prev => ({...prev, competitorSitemaps: '# No automatic competitors found. You can add some manually.'}));
            }
        } catch(e) {
            console.error("Failed to discover competitors:", e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setData(prev => ({...prev, competitorSitemaps: `# Error finding competitors: ${errorMessage}`}));
        } finally {
            setIsFindingCompetitors(false);
        }
    };

    const totalSteps = 4;
    const isLaunchDisabled = isLoading || !isAiConfigured;

    return (
        <div className="mt-8 md:mt-16 animate-fade-in text-gray-300">
            <div className="text-center">
                 <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-green-400 pb-2">
                    Start Your Analysis
                </h2>
                <p className="mt-4 max-w-3xl mx-auto text-base md:text-lg text-gray-400">
                    Transform raw numbers into a high-impact, AI-driven action plan to dominate organic search.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="mt-12 bg-gray-900/50 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-700/60 max-w-3xl mx-auto">
                <ProgressIndicator currentStep={step} totalSteps={totalSteps} />

                <Step currentStep={step} stepNumber={1} title="Enter Your Website & Sitemap">
                     <p className="text-center text-sm text-gray-400 mb-4">Choose a connected GSC property or enter your website URL manually.</p>
                     
                     {isGscConnected && gscSites.length > 0 ? (
                         <div>
                            <label htmlFor="gsc-site" className="block text-sm font-medium text-gray-400 mb-1">GSC Property</label>
                            <select 
                                id="gsc-site"
                                value={data.url} 
                                onChange={handleSiteSelection}
                                required
                                className="w-full pl-4 pr-10 py-3 bg-gray-800/80 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200"
                            >
                                <option value="" disabled>Select a property...</option>
                                {gscSites.map(site => (
                                    <option key={site.siteUrl} value={site.siteUrl}>{site.siteUrl}</option>
                                ))}
                            </select>
                         </div>
                     ) : (
                         <div>
                            <label htmlFor="url" className="block text-sm font-medium text-gray-400 mb-1">Primary Website URL</label>
                            <input id="url" name="url" type="url" value={data.url} onChange={handleChange} required placeholder="https://your-website.com" className="w-full px-4 py-3 bg-gray-800/80 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-500" />
                        </div>
                     )}


                     {(data.url || !isGscConnected) && (
                        <div className="mt-4 animate-fade-in">
                            <label htmlFor="sitemapUrl" className="block text-sm font-medium text-gray-400 mb-1">Sitemap URL</label>
                            <div className="relative">
                                <svg aria-hidden="true" className="absolute w-5 h-5 text-gray-500 left-4 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                                <input id="sitemapUrl" name="sitemapUrl" type="url" value={data.sitemapUrl} onChange={handleChange} required placeholder="https://your-website.com/sitemap.xml" className="w-full pl-12 pr-4 py-3 bg-gray-800/80 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-500" />
                            </div>
                            {isGscConnected && (
                                <p className="text-xs text-gray-500 mt-2">We've guessed your sitemap location based on your selected property. Please correct it if it's different.</p>
                            )}
                        </div>
                     )}
                </Step>

                <Step currentStep={step} stepNumber={2} title="Add Competitor Sitemaps (Optional)">
                    <p className="text-center text-sm text-gray-400 mb-4">Provide competitor sitemaps (one per line) to enable powerful content gap analysis.</p>
                    
                    <div className="mb-4 text-center">
                        <button 
                            type="button" 
                            onClick={handleFindCompetitors} 
                            disabled={!aiConfig || aiConfig.provider !== 'gemini' || isFindingCompetitors}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isFindingCompetitors ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" /></svg>
                            )}
                            {isFindingCompetitors ? 'Searching...' : 'Find Competitors Automatically'}
                        </button>
                        {(!aiConfig || aiConfig.provider !== 'gemini') && (
                            <p className="text-xs text-gray-500 mt-2">
                                Automatic competitor discovery requires the <strong className="text-gray-400">Gemini</strong> provider for live Google Search.
                            </p>
                        )}
                    </div>
                    
                    <label htmlFor="competitorSitemaps" className="sr-only">Competitor Sitemaps</label>
                    <textarea 
                        id="competitorSitemaps" 
                        name="competitorSitemaps" 
                        value={data.competitorSitemaps} 
                        onChange={handleChange} 
                        readOnly={isFindingCompetitors}
                        placeholder="https://competitor1.com/sitemap.xml&#10;https://competitor2.com/sitemap.xml" 
                        className="w-full px-4 py-3 bg-gray-800/80 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-500 h-28 resize-y disabled:opacity-70"
                        disabled={isFindingCompetitors}
                    />
                </Step>
                
                <Step currentStep={step} stepNumber={3} title="Define Analysis Scope">
                     <p className="text-center text-sm text-gray-400 mb-4">Choose whether you're targeting a global audience or a specific local market.</p>
                     <div className="p-2 bg-gray-800 rounded-lg flex max-w-sm mx-auto">
                        <button type="button" onClick={() => handleAnalysisTypeChange('global')} className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-colors ${data.analysisType === 'global' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Global</button>
                        <button type="button" onClick={() => handleAnalysisTypeChange('local')} className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-colors ${data.analysisType === 'local' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>Local</button>
                     </div>
                     {data.analysisType === 'local' && (
                         <div className="mt-4 animate-fade-in">
                            <label htmlFor="targetLocation" className="sr-only">Target Location</label>
                             <div className="relative max-w-sm mx-auto">
                               <svg aria-hidden="true" className="absolute w-5 h-5 text-gray-500 left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.69 18a.75.75 0 01.75-.75 8.25 8.25 0 000-16.5.75.75 0 01-1.5 0 9.75 9.75 0 019.75 9.75c0 5.385-4.365 9.75-9.75 9.75z" clipRule="evenodd" /><path fillRule="evenodd" d="M6 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zm.75-2.25a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" clipRule="evenodd" /></svg>
                               <input id="targetLocation" name="targetLocation" type="text" value={data.targetLocation} onChange={handleChange} required={data.analysisType === 'local'} placeholder="e.g., Rome, Italy" className="w-full pl-10 pr-3 py-2 bg-gray-800/80 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-500" />
                            </div>
                         </div>
                     )}
                </Step>

                <Step currentStep={step} stepNumber={4} title="Ready to Orchestrate?">
                     <p className="text-center text-sm text-gray-400 mb-6">Review your configuration below. When you're ready, launch the analysis.</p>
                     <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-gray-700/70">
                        <p className="text-sm text-gray-400"><strong>Website URL:</strong> <span className="text-gray-200 font-mono break-all">{data.url || 'Not set'}</span></p>
                        <p className="text-sm text-gray-400"><strong>Sitemap:</strong> <span className="text-gray-200 font-mono break-all">{data.sitemapUrl || 'Not set'}</span></p>
                        <p className="text-sm text-gray-400"><strong>Competitors:</strong> <span className="text-gray-200 font-mono">{data.competitorSitemaps.split('\n').filter(Boolean).length}</span></p>
                        <p className="text-sm text-gray-400"><strong>Analysis Type:</strong> <span className="text-gray-200 capitalize">{data.analysisType}</span></p>
                        {data.analysisType === 'local' && <p className="text-sm text-gray-400"><strong>Location:</strong> <span className="text-gray-200">{data.targetLocation || 'Not set'}</span></p>}
                     </div>
                </Step>

                <div className="mt-8 pt-6 border-t border-gray-800 flex justify-between items-center">
                    <button type="button" onClick={handleBack} disabled={step === 1 || isLoading} className="px-6 py-2 font-semibold text-gray-300 rounded-lg hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Back</button>
                    {step < totalSteps ? (
                        <button type="button" onClick={handleNext} disabled={isLoading || isFindingCompetitors || (step === 1 && (!data.url || !data.sitemapUrl))} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                    ) : (
                        <button type="submit" disabled={isLaunchDisabled} className="px-8 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200">
                             {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing...
                                </>
                             ) : (
                                'Launch Analysis'
                             )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};
