import React from 'react';

interface HeaderProps {
    onMenuClick: () => void;
    showNewAnalysisButton: boolean;
    onNewAnalysisClick: () => void;
    isGscConnected: boolean;
    onConnectClick: () => void;
    isAiConfigured: boolean;
    onAiSettingsClick: () => void;
}

const GscIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12.5C5,8.75 8.36,5.73 12.19,5.73C15.04,5.73 16.56,6.95 17.03,7.39L19.24,5.28C17.58,3.84 15.3,2.73 12.19,2.73C6.77,2.73 2.5,7.24 2.5,12.5C2.5,17.76 6.77,22.27 12.19,22.27C17.6,22.27 21.5,18.33 21.5,12.81C21.5,12.09 21.43,11.59 21.35,11.1V11.1Z" /></svg>
const AiSettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846-.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624L16.5 21.75l-.398-1.126a3.375 3.375 0 00-2.924-2.924l-1.126-.398 1.126-.398a3.375 3.375 0 002.924-2.924l.398-1.126.398 1.126a3.375 3.375 0 002.924 2.924l1.126.398-1.126.398a3.375 3.375 0 00-2.924 2.924z"/></svg>;


export const Header: React.FC<HeaderProps> = ({ onMenuClick, showNewAnalysisButton, onNewAnalysisClick, isGscConnected, onConnectClick, isAiConfigured, onAiSettingsClick }) => {
  return (
    <header className="mb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-teal-400 to-green-400 pb-2">
                Orchestrator AI
            </h1>
             <p className="mt-2 text-lg text-gray-400 max-w-3xl">
                Your strategic partner for dominating organic search.
            </p>
        </div>
        <div className="flex items-center gap-2">
            {isAiConfigured && (
                <button
                    onClick={onAiSettingsClick}
                    className="hidden sm:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-white shadow-lg ring-1 ring-inset ring-gray-700"
                >
                    <AiSettingsIcon />
                    AI Settings
                </button>
            )}
            {!isGscConnected && (
                 <button
                    onClick={onConnectClick}
                    className="hidden sm:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-white shadow-lg ring-1 ring-inset ring-gray-700"
                >
                    <GscIcon />
                    Connect Google
                </button>
            )}
            {showNewAnalysisButton && (
                <button
                    onClick={onNewAnalysisClick}
                    className="hidden sm:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-600/30"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    New Analysis
                </button>
            )}
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                aria-label="Open history panel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </div>
      </div>
    </header>
  );
};