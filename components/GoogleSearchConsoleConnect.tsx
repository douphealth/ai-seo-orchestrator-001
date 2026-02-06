// components/GoogleSearchConsoleConnect.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GscSite, GscTokenResponse } from '../types';
import { fetchGscSites } from '../services/gscService';

const GSC_CLIENT_ID_STORAGE_KEY = 'orchestrator-ai-gsc-client-id';
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const GOOGLE_SCRIPT_ID = 'google-gsi-script';

declare global {
  interface Window {
    google: any;
    __googleScriptLoaded?: boolean;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Script Loading Utility - Ensures Google GIS is properly loaded
// ─────────────────────────────────────────────────────────────────────────────
const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    // Script tag exists but not loaded yet
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.accounts?.oauth2) {
          reject(new Error('Google script timeout'));
        }
      }, 10000);
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Wait for the API to be fully initialized
      const checkReady = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(checkReady);
          window.__googleScriptLoaded = true;
          resolve();
        }
      }, 50);

      setTimeout(() => {
        clearInterval(checkReady);
        if (!window.google?.accounts?.oauth2) {
          reject(new Error('Google API not initialized after script load'));
        }
      }, 5000);
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Identity Services script'));
    };

    document.head.appendChild(script);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12.5C5,8.75 8.36,5.73 12.19,5.73C15.04,5.73 16.56,6.95 17.03,7.39L19.24,5.28C17.58,3.84 15.3,2.73 12.19,2.73C6.77,2.73 2.5,7.24 2.5,12.5C2.5,17.76 6.77,22.27 12.19,22.27C17.6,22.27 21.5,18.33 21.5,12.81C21.5,12.09 21.43,11.59 21.35,11.1V11.1Z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const LightBulbIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

interface CopyableCodeProps {
  code: string;
  label?: string;
}

const CopyableCode: React.FC<CopyableCodeProps> = ({ code, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-gray-500">{label}</p>}
      <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg border border-gray-700">
        <code className="flex-1 text-sm text-green-400 break-all font-mono">{code}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
          title="Copy to clipboard"
        >
          {copied ? <CheckCircleIcon /> : <ClipboardIcon />}
        </button>
      </div>
    </div>
  );
};

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon, title, description }) => (
  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center">
    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 mb-2">
      {icon}
    </div>
    <h4 className="font-semibold text-gray-200 text-sm">{title}</h4>
    <p className="text-xs text-gray-400 mt-1">{description}</p>
  </div>
);

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }, (_, i) => (
      <div
        key={i}
        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          i + 1 <= currentStep ? 'bg-blue-500 w-8' : 'bg-gray-600'
        }`}
      />
    ))}
  </div>
);

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onReset: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onReset }) => {
  const getErrorInfo = (error: string) => {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('popup') || lowerError.includes('closed')) {
      return {
        title: 'Popup was closed',
        fixes: [
          'The sign-in popup was closed before completing',
          'Click \'Try Again\' to open the popup again',
          'Make sure popup blockers are disabled for this site',
          'Try using a different browser if the issue persists'
        ],
        severity: 'warning' as const
      };
    }

    if (lowerError.includes('origin') || lowerError.includes('redirect') || lowerError.includes('mismatch')) {
      return {
        title: 'Origin Mismatch Error',
        fixes: [
          `Your current URL: ${window.location.origin}`,
          'This EXACT URL must be in "Authorized JavaScript origins" in Google Cloud',
          'Wait 5 minutes after making changes in Google Cloud',
          'Check for trailing slashes - they matter!'
        ],
        severity: 'error' as const
      };
    }

    if (lowerError.includes('invalid_client') || lowerError.includes('client id')) {
      return {
        title: 'Invalid Client ID',
        fixes: [
          'Double-check your Client ID for typos',
          'Make sure there are no extra spaces',
          'It should end with .apps.googleusercontent.com',
          'Try copying it fresh from Google Cloud Console'
        ],
        severity: 'error' as const
      };
    }

    if (lowerError.includes('not ready') || lowerError.includes('not initialized')) {
      return {
        title: 'Google API Not Ready',
        fixes: [
          'The Google sign-in library is still loading',
          'Please wait a moment and try again',
          'If the issue persists, refresh the page'
        ],
        severity: 'warning' as const
      };
    }

    return {
      title: 'Connection Error',
      fixes: [
        'Check your internet connection',
        'Try refreshing the page',
        error
      ],
      severity: 'error' as const
    };
  };

  const errorInfo = getErrorInfo(error);

  return (
    <div className={`p-4 rounded-lg border ${
      errorInfo.severity === 'warning' 
        ? 'bg-yellow-900/20 border-yellow-500/40' 
        : 'bg-red-900/20 border-red-500/40'
    }`}>
      <h4 className={`font-semibold mb-2 ${
        errorInfo.severity === 'warning' ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {errorInfo.title}
      </h4>
      <p className="text-sm text-gray-300 mb-3">Google Sign-In Error: {error}</p>
      <p className="text-xs text-gray-400 mb-2">How to fix:</p>
      <ul className="text-xs text-gray-400 space-y-1 mb-4">
        {errorInfo.fixes.map((fix, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-gray-500">•</span>
            <span>{fix}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
        >
          Reset Configuration
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface GoogleSearchConsoleConnectProps {
  onConnect: (token: GscTokenResponse, sites: GscSite[]) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}

export const GoogleSearchConsoleConnect: React.FC<GoogleSearchConsoleConnectProps> = ({
  onConnect,
  onDisconnect,
  isConnected
}) => {
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [clientId, setClientId] = useState<string>(() => 
    localStorage.getItem(GSC_CLIENT_ID_STORAGE_KEY) || ''
  );
  const [inputClientId, setInputClientId] = useState<string>(clientId);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const clientRef = useRef<any>(null);
  const currentOrigin = window.location.origin;
  const isClientConfigured = !!clientId;

  // ─────────────────────────────────────────────────────────────────────────
  // Load Google Script on mount
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    loadGoogleScript()
      .then(() => {
        if (mounted) {
          setIsScriptLoaded(true);
          console.log('[GSC] Google Identity Services script loaded');
        }
      })
      .catch((err) => {
        console.error('[GSC] Failed to load Google script:', err);
        if (mounted) {
          setError('Failed to load Google sign-in. Please refresh the page.');
        }
      });

    return () => { mounted = false; };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize OAuth Client
  // ─────────────────────────────────────────────────────────────────────────
  const initClient = useCallback(() => {
    if (!clientId || !isScriptLoaded) {
      console.log('[GSC] Cannot init client - missing clientId or script not loaded');
      return;
    }

    if (isInitializing) {
      console.log('[GSC] Already initializing...');
      return;
    }

    setIsInitializing(true);
    const cleanId = clientId.trim();

    console.log('[GSC] Initializing OAuth client...');
    console.log('[GSC] Origin:', currentOrigin);
    console.log('[GSC] Client ID:', cleanId.slice(0, 20) + '...');

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: cleanId,
        scope: GSC_SCOPE,

        // SUCCESS CALLBACK
        callback: async (tokenResponse: GscTokenResponse) => {
          console.log('[GSC] Token response received');

          if (tokenResponse.error) {
            console.error('[GSC] Token error:', tokenResponse.error);
            let userMsg = `Error: ${tokenResponse.error_description || tokenResponse.error}`;

            if (tokenResponse.error === 'popup_closed_by_user') {
              userMsg = 'Login popup was closed before completing sign-in.';
            } else if (tokenResponse.error === 'access_denied') {
              userMsg = 'Permission denied. Please grant access to view Search Console data.';
            }

            setError(userMsg);
            setIsLoading(false);
            return;
          }

          try {
            console.log('[GSC] Fetching GSC sites...');
            const sites = await fetchGscSites(tokenResponse.access_token);
            console.log('[GSC] Successfully fetched', sites.length, 'sites');
            onConnect(tokenResponse, sites);
          } catch (e) {
            console.error('[GSC] Failed to fetch sites:', e);
            setError(e instanceof Error ? e.message : 'Failed to fetch your sites from Search Console.');
          } finally {
            setIsLoading(false);
          }
        },

        // ERROR CALLBACK - Critical for proper error handling!
        error_callback: (error: any) => {
          console.error('[GSC] OAuth error callback:', error);
          setIsLoading(false);

          if (error.type === 'popup_closed') {
            setError('The sign-in popup was closed. Please try again.');
          } else if (error.type === 'popup_failed_to_open') {
            setError('Could not open sign-in popup. Please check your popup blocker settings.');
          } else {
            setError(`Google Sign-In Error: ${error.message || error.type || 'Unknown error'}`);
          }
        }
      });

      clientRef.current = client;
      setError(null);
      console.log('[GSC] OAuth client initialized successfully');

    } catch (e) {
      console.error('[GSC] Failed to initialize OAuth client:', e);
      setError(e instanceof Error ? `OAuth Setup Error: ${e.message}` : 'Failed to initialize OAuth client.');
    } finally {
      setIsInitializing(false);
    }
  }, [clientId, isScriptLoaded, currentOrigin, onConnect, isInitializing]);

  // Initialize client when script is loaded and clientId is set
  useEffect(() => {
    if (isClientConfigured && isScriptLoaded && !clientRef.current) {
      initClient();
    }
  }, [isClientConfigured, isScriptLoaded, initClient]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handle Connect Button Click
  // ─────────────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(() => {
    setError(null);
    setIsLoading(true);

    if (!isScriptLoaded) {
      setError('Google sign-in is still loading. Please wait a moment and try again.');
      setIsLoading(false);
      return;
    }

    if (!clientRef.current) {
      console.log('[GSC] Client not ready, reinitializing...');
      initClient();

      // Wait a bit for initialization then try
      setTimeout(() => {
        if (clientRef.current) {
          console.log('[GSC] Requesting access token...');
          clientRef.current.requestAccessToken({ prompt: 'consent' });
        } else {
          setError('Google client not ready. Please wait a moment and try again.');
          setIsLoading(false);
        }
      }, 500);
      return;
    }

    console.log('[GSC] Requesting access token...');
    clientRef.current.requestAccessToken({ prompt: 'consent' });
  }, [isScriptLoaded, initClient]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handle Client ID Save
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = inputClientId.replace(/\s/g, '').trim();

    if (!trimmedId) {
      setError('Please enter your Client ID.');
      return;
    }

    if (!trimmedId.endsWith('.apps.googleusercontent.com')) {
      setError('Invalid Client ID format. It should end with .apps.googleusercontent.com');
      return;
    }

    localStorage.setItem(GSC_CLIENT_ID_STORAGE_KEY, trimmedId);
    setClientId(trimmedId);
    clientRef.current = null; // Reset client to reinitialize with new ID
    setError(null);
    setSetupStep(3);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handle Reset
  // ─────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setClientId('');
    setInputClientId('');
    localStorage.removeItem(GSC_CLIENT_ID_STORAGE_KEY);
    clientRef.current = null;
    setError(null);
    setSetupStep(1);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render Connected State
  // ─────────────────────────────────────────────────────────────────────────
  if (isConnected) {
    return (
      <div className="text-center animate-fade-in py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-4">
          <CheckCircleIcon />
        </div>
        <h3 className="text-xl font-bold text-green-400 mb-2">Successfully Connected!</h3>
        <p className="text-gray-400 mb-6">
          Your Google Search Console data is now available for analysis.
        </p>
        <button
          onClick={onDisconnect}
          className="px-6 py-2.5 font-semibold text-gray-300 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          Disconnect Account
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render Setup Flow
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 text-blue-400 mb-4">
          <GoogleIcon />
        </div>
        <h2 className="text-xl font-bold text-gray-200">Connect Google Search Console</h2>
        <p className="text-gray-400 mt-1 text-sm">
          Unlock real performance data for more accurate recommendations
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <BenefitCard
          icon={<SparklesIcon />}
          title="Real Data"
          description="Use actual clicks, impressions & rankings"
        />
        <BenefitCard
          icon={<ShieldCheckIcon />}
          title="Secure"
          description="Read-only access, data stays private"
        />
        <BenefitCard
          icon={<LightBulbIcon />}
          title="Better Insights"
          description="AI-powered analysis of your traffic"
        />
      </div>

      {/* Step Indicator */}
      {!isClientConfigured && (
        <StepIndicator currentStep={setupStep} totalSteps={3} />
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6">
          <ErrorDisplay
            error={error}
            onRetry={isClientConfigured ? handleConnect : undefined}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Setup Steps or Connect Button */}
      {!isClientConfigured ? (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/60 overflow-hidden">
          {/* Step 1: Go to Google Cloud */}
          {setupStep === 1 && (
            <div className="p-6 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                Open Google Cloud Console
              </h3>
              <p className="text-gray-400 mb-4">
                First, we need to create credentials in Google Cloud. Don't worry - it's free and only takes a minute!
              </p>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Open Google Cloud Console
                <ExternalLinkIcon />
              </a>

              <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-gray-300 text-sm mb-2">📋 Quick Steps in Google Cloud</h4>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">1.</span>
                    Click <strong className="text-gray-300">+ CREATE CREDENTIALS</strong> at the top
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">2.</span>
                    Select <strong className="text-gray-300">OAuth client ID</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">3.</span>
                    Application type: <strong className="text-green-400">Web application</strong>
                    <span className="text-red-400 text-xs">(NOT Desktop!)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">4.</span>
                    Add your origin (shown below) and click Create
                  </li>
                </ol>
              </div>

              <div className="mt-4">
                <CopyableCode code={currentOrigin} label="Your Authorized JavaScript Origin (copy this exactly)" />
              </div>

              <button
                onClick={() => setSetupStep(2)}
                className="mt-6 w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                I've Created the Credentials →
              </button>
            </div>
          )}

          {/* Step 2: Enter Client ID */}
          {setupStep === 2 && (
            <form onSubmit={handleSaveClientId} className="p-6 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                Paste Your Client ID
              </h3>
              <p className="text-gray-400 mb-4">
                After creating the OAuth credentials, Google shows you a popup with your Client ID. Copy and paste it here:
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium text-gray-400 mb-2">
                    Client ID
                  </label>
                  <input
                    id="clientId"
                    type="text"
                    value={inputClientId}
                    onChange={(e) => setInputClientId(e.target.value.replace(/\s/g, ''))}
                    placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-4 py-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-500 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Save & Continue →
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Client ID Configured - Show Connect Button */
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/60 p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-4">
              <CheckCircleIcon />
              Configuration Saved
            </div>
            <p className="text-sm text-gray-400">
              Client ID: <code className="text-gray-300">...{clientId.slice(-20)}</code>
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={isLoading || !isScriptLoaded}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl hover:from-blue-700 hover:to-teal-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
          >
            {isLoading ? (
              <>
                <SpinnerIcon />
                <span>Waiting for Google Sign-In...</span>
              </>
            ) : !isScriptLoaded ? (
              <>
                <SpinnerIcon />
                <span>Loading Google Sign-In...</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>Connect with Google</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Use a different Client ID
          </button>
        </div>
      )}

      {/* Troubleshooting Section */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
      >
        {showAdvanced ? '▼' : '▶'} Having trouble? See troubleshooting tips
      </button>

      {showAdvanced && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-fade-in">
          <h4 className="font-semibold text-gray-300 mb-3">🔧 Common Issues & Fixes</h4>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-yellow-400">Error 400: redirect_uri_mismatch</p>
              <p className="text-gray-400">
                Your origin URL doesn't match. Make sure{' '}
                <code className="text-green-400">{currentOrigin}</code> is EXACTLY in your authorized origins (no trailing slash).
              </p>
            </div>
            <div>
              <p className="font-medium text-yellow-400">Error: invalid_client</p>
              <p className="text-gray-400">
                Client ID is incorrect. Copy it again from Google Cloud Console and check for extra spaces.
              </p>
            </div>
            <div>
              <p className="font-medium text-yellow-400">Changes not taking effect</p>
              <p className="text-gray-400">
                Google Cloud changes can take up to 5 minutes to propagate. Wait and try again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};