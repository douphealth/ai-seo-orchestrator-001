
import React, { useState, useCallback } from 'react';
import type { AiProvider, SerpInsights } from '../types';

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const AiOverviewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-400 shrink-0"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846-.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624L16.5 21.75l-.398-1.126a3.375 3.375 0 00-2.924-2.924l-1.126-.398 1.126-.398a3.375 3.375 0 002.924-2.924l.398-1.126.398 1.126a3.375 3.375 0 002.924 2.924l1.126.398-1.126.398a3.375 3.375 0 00-2.924 2.924z"/></svg>;
const PaaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400 shrink-0"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.44a.75.75 0 00-1.061-1.061l-2.5 2.5a.75.75 0 000 1.061l2.5 2.5a.75.75 0 001.06-1.06l-1.72-1.72h5.69a.75.75 0 000-1.5h-5.69l1.72-1.72z" clipRule="evenodd" /></svg>;
const RelatedSearchesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-400 shrink-0"><path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" /></svg>;
const LsiKeywordsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-400 shrink-0"><path d="M10 3a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 3zM10 8.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 8.5zM10 14a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 14zM4.22 5.22a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM15.78 6.28a.75.75 0 00-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.28 15.78a.75.75 0 00-1.06-1.06l-1.06 1.06a.75.75 0 101.06 1.06l1.06-1.06zM14.72 14.72a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06z"/></svg>;
const SerpFeaturesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400 shrink-0"><path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM2.872 4.14a.75.75 0 011.06 0l1.062 1.062a.75.75 0 01-1.06 1.06L2.872 5.2a.75.75 0 010-1.06zM15.86 3.08a.75.75 0 011.06 1.06l-1.062 1.062a.75.75 0 01-1.06-1.06L15.86 3.08zM10 17a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 17zM2.872 14.79a.75.75 0 011.06 0l1.062 1.062a.75.75 0 11-1.06 1.06L2.872 15.85a.75.75 0 010-1.06zM15.86 12.87a.75.75 0 011.06 1.06l-1.062 1.062a.75.75 0 01-1.06-1.06L15.86 12.87zM17 10a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0117 10zM1 10a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 011 10z"/></svg>;


interface CopyButtonProps { textToCopy: string; }

const ListCopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    }, [textToCopy]);

    return ( <button onClick={handleCopy} className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200 ${ copied ? 'bg-green-500/20 text-green-300 ring-1 ring-inset ring-green-500/40' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 ring-1 ring-inset ring-gray-600' }`} aria-label="Copy list"> {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied!' : 'Copy List'} </button> );
};

interface SerpInsightsDisplayProps {
  insights: SerpInsights;
  aiProvider: AiProvider;
}

export const SerpInsightsDisplay: React.FC<SerpInsightsDisplayProps> = ({ insights, aiProvider }) => {
    const { targetKeyword, aiOverview, peopleAlsoAsk, relatedSearches, lsiKeywords, serpFeatureAnalysis } = insights;
    
    // Ensure arrays are properly typed arrays using type guards to avoid 'unknown' errors
    const safePaa: string[] = Array.isArray(peopleAlsoAsk) ? peopleAlsoAsk as string[] : [];
    const safeRelated: string[] = Array.isArray(relatedSearches) ? relatedSearches as string[] : [];
    const safeLsi: Record<string, string[]> = lsiKeywords || {};

    const title = aiProvider === 'gemini'
    ? "Live SERP Deconstruction (via Google Search)"
    : "SERP Deconstruction (from Model Knowledge)";
    
    return (
        <div className="mt-4 bg-gray-900/50 p-6 rounded-xl border border-gray-700/60 relative animate-fade-in shadow-2xl space-y-8">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
                <p className="text-blue-300 font-mono bg-gray-800/70 px-2 py-1 rounded-md text-base mt-2 inline-block"> {targetKeyword} </p>
            </div>

            <section>
                <div className="flex items-center gap-3 mb-3"> <div className="p-2 bg-teal-900/50 rounded-lg border border-teal-700/60"><AiOverviewIcon /></div> <h4 className="font-semibold text-lg text-gray-200">AI Overview</h4> </div>
                <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80"> {aiOverview ? <p className="text-base text-gray-300 whitespace-pre-wrap">{aiOverview}</p> : <p className="text-sm text-gray-500 italic">No AI Overview was found in the live SERP for this query.</p>} </div>
            </section>
            
            <section>
                <div className="flex items-center gap-3 mb-3"> <div className="p-2 bg-yellow-900/50 rounded-lg border border-yellow-700/60"><SerpFeaturesIcon /></div> <h4 className="font-semibold text-lg text-gray-200">SERP Feature Analysis</h4> </div>
                <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80"> <p className="text-base text-gray-300">{serpFeatureAnalysis}</p> </div>
            </section>
            
            <section>
                <div className="flex items-center justify-between gap-4 mb-3"> <div className="flex items-center gap-3"> <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700/60"><PaaIcon /></div> <h4 className="font-semibold text-lg text-gray-200">People Also Ask</h4> </div> {safePaa.length > 0 && <ListCopyButton textToCopy={safePaa.join('\n')} />} </div>
                <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80"> {safePaa.length > 0 ? <ul className="space-y-2"> {safePaa.map((question, index) => ( <li key={index} className="text-base text-gray-300 flex items-start"> <span className="mr-3 mt-1 text-blue-400">&#8227;</span> <span>{question}</span> </li> ))} </ul> : <p className="text-sm text-gray-500 italic">No "People Also Ask" section was found.</p>} </div>
            </section>
            
            <section>
                <div className="flex items-center justify-between gap-4 mb-3"> <div className="flex items-center gap-3"> <div className="p-2 bg-teal-900/50 rounded-lg border border-teal-700/60"><LsiKeywordsIcon /></div> <h4 className="font-semibold text-lg text-gray-200">Clustered LSI Keywords</h4> </div> {Object.keys(safeLsi).length > 0 && <ListCopyButton textToCopy={Object.entries(safeLsi).map(([cluster, keywords]) => `${cluster}:\n- ${keywords.join('\n- ')}`).join('\n\n')} />} </div>
                <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80">
                    {Object.keys(safeLsi).length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {Object.entries(safeLsi).map(([cluster, keywords]) => (
                                <div key={cluster}>
                                    <h5 className="font-semibold text-teal-300 mb-2 capitalize">{cluster.replace(/_/g, ' ')}</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {keywords.map((keyword, index) => (
                                            <span key={index} className="text-sm text-teal-200 bg-teal-900/60 px-2.5 py-1 rounded-full font-medium"> {keyword} </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-500 italic">No semantically related keywords were generated.</p>}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between gap-4 mb-3"> <div className="flex items-center gap-3"> <div className="p-2 bg-green-900/50 rounded-lg border border-green-700/60"><RelatedSearchesIcon /></div> <h4 className="font-semibold text-lg text-gray-200">Related Searches</h4> </div> {safeRelated.length > 0 && <ListCopyButton textToCopy={safeRelated.join('\n')} />} </div>
                <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700/80"> {safeRelated.length > 0 ? <div className="flex flex-wrap gap-3"> {safeRelated.map((query, index) => ( <span key={index} className="text-base text-gray-300 bg-gray-800/80 px-3 py-1.5 rounded-full font-medium"> {query} </span> ))} </div> : <p className="text-sm text-gray-500 italic">No "Related Searches" were found.</p>} </div>
            </section>
        </div>
    );
};
