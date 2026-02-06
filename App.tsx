import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { ErrorMessage } from './components/ErrorMessage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HistoryPanel } from './components/HistoryPanel';
import { CrawlingAnimation } from './components/CrawlingAnimation';
import { GuidedAnalysisWizard, type WizardSubmitData } from './components/GuidedAnalysisWizard';
import { Modal } from './components/Modal';
import { GoogleSearchConsoleConnect } from './components/GoogleSearchConsoleConnect';
import { AiConfiguration } from './components/AiConfiguration';
import { ActionPlanDashboard } from './components/ActionPlanDashboard';
import { AnalysisPipelineView } from './components/AnalysisPipelineView';
import { ProgressiveResultsPanel } from './components/ProgressiveResultsPanel';
import {
  generateSitewideAudit,
  generateSeoAnalysis,
  generateExecutiveSummary,
} from './services/aiService';
import { rankUrls } from './utils/seoScoring';
import { crawlSitemap } from './services/crawlingService';
import { createActionPlan } from './services/actionPlanService';
import { cacheService } from './services/cacheService';
import type {
  HistoricalAnalysis,
  CrawlProgress,
  GscSite,
  GscTokenResponse,
  AiConfig,
} from './types';
import type { PipelineStage, ActivityLogEntry, PartialResults } from './types/pipeline';
import { PIPELINE_STAGE_DEFINITIONS } from './types/pipeline';

const HISTORY_STORAGE_KEY = 'orchestrator-ai-history';
const AI_CONFIG_STORAGE_KEY = 'orchestrator-ai-config';
const MAX_URLS_FOR_ANALYSIS = 100;

type AppState = 'idle' | 'loading' | 'results' | 'error' | 'configure_ai';
type LoadingPhase = 'crawling' | 'analyzing';

const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<HistoricalAnalysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('crawling');
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null);

  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(
    PIPELINE_STAGE_DEFINITIONS.map(s => ({ ...s, status: 'pending' as const, progress: 0 }))
  );
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [partialResults, setPartialResults] = useState<PartialResults>({});
  const [analysisStartTime, setAnalysisStartTime] = useState<number>(Date.now());

  const [gscToken, setGscToken] = useState<GscTokenResponse | null>(null);
  const [gscSites, setGscSites] = useState<GscSite[]>([]);
  const [isGscModalOpen, setIsGscModalOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const isGscConnected = useMemo(() => !!gscToken, [gscToken]);

  const analysisToDisplay = useMemo(() => {
    if (!selectedAnalysisId) return null;
    return analysisHistory.find(h => h.id === selectedAnalysisId) ?? null;
  }, [selectedAnalysisId, analysisHistory]);

  const updateStage = useCallback((stageId: string, updates: Partial<PipelineStage>) => {
    setPipelineStages(prev => prev.map(s =>
      s.id === stageId ? { ...s, ...updates } : s
    ));
  }, []);

  const addLog = useCallback((message: string, type: ActivityLogEntry['type'] = 'info', stage?: string) => {
    setActivityLog(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type,
      stage
    }]);
  }, []);

  const resetPipeline = useCallback(() => {
    setPipelineStages(PIPELINE_STAGE_DEFINITIONS.map(s => ({ ...s, status: 'pending' as const, progress: 0 })));
    setActivityLog([]);
    setPartialResults({});
    setAnalysisStartTime(Date.now());
  }, []);

  const updateAnalysisInHistory = useCallback((id: string, updatedAnalysis: Partial<HistoricalAnalysis>) => {
    setAnalysisHistory(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, ...updatedAnalysis } : h);
      try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated)); } catch (e) { console.warn('Failed to persist history:', e); }
      return updated;
    });
  }, []);

  const handleToggleTaskComplete = useCallback((actionItemId: string) => {
    if (!analysisToDisplay || !analysisToDisplay.actionPlan) return;
    const newActionPlan = analysisToDisplay.actionPlan.map(day => ({
      ...day,
      actions: day.actions.map(action =>
        action.id === actionItemId ? { ...action, completed: !action.completed } : action
      ),
    }));
    updateAnalysisInHistory(analysisToDisplay.id, { actionPlan: newActionPlan });
  }, [analysisToDisplay, updateAnalysisInHistory]);

  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
      if (storedConfig) {
        setAiConfig(JSON.parse(storedConfig));
      } else {
        setAppState('configure_ai');
      }
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        const history = JSON.parse(storedHistory) as HistoricalAnalysis[];
        setAnalysisHistory(history);
        if (history.length > 0 && storedConfig) {
          setSelectedAnalysisId(history[0].id);
          setAppState('results');
        }
      }
    } catch (e) {
      console.error('Failed to parse from localStorage', e);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
      setAppState('configure_ai');
    }
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setSelectedAnalysisId(null);
    setAppState(aiConfig ? 'idle' : 'configure_ai');
    setError(null);
    resetPipeline();
  }, [aiConfig, resetPipeline]);

  const handleAiConfigChange = useCallback((config: AiConfig) => {
    setAiConfig(config);
    try { localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config)); } catch (e) { console.warn('Failed to persist config:', e); }
    setAppState('idle');
  }, []);

  const handleAiSettingsChange = useCallback(() => {
    setAiConfig(null);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
    setAppState('configure_ai');
  }, []);

  const handleCancelAnalysis = useCallback(() => {
    setIsCancelling(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    addLog('Analysis cancelled by user', 'warning');
    setPipelineStages(prev => prev.map(s =>
      s.status === 'running' ? { ...s, status: 'error' as const } : s
    ));
    setAppState('idle');
    setIsCancelling(false);
    resetPipeline();
  }, [addLog, resetPipeline]);

  const handleSubmit = useCallback(async (data: WizardSubmitData) => {
    if (!data.sitemapUrl) {
      setError('Please enter your sitemap.xml URL.');
      setAppState('error');
      return;
    }
    if (!aiConfig) {
      setError('AI Provider is not configured.');
      setAppState('configure_ai');
      return;
    }

    let initialSitemapUrl: URL;
    try {
      initialSitemapUrl = new URL(data.sitemapUrl);
    } catch (_) {
      setError('Please enter a valid sitemap URL (e.g., https://example.com/sitemap.xml).');
      setAppState('error');
      return;
    }

    const competitorUrls = data.competitorSitemaps.split('\n').map(u => u.trim()).filter(Boolean);

    abortControllerRef.current = new AbortController();
    setAppState('loading');
    setLoadingPhase('crawling');
    setError(null);
    setSelectedAnalysisId(null);
    setCrawlProgress(null);
    resetPipeline();
    setAnalysisStartTime(Date.now());

    try {
      addLog('Starting sitemap discovery...', 'info', 'crawl');
      updateStage('crawl', {
        status: 'running',
        startTime: Date.now(),
        currentTask: 'Initializing parallel crawler...'
      });

      const allPageUrls = await crawlSitemap(initialSitemapUrl.toString(), (progress: CrawlProgress) => {
        requestAnimationFrame(() => {
          setCrawlProgress(progress);
          const progressPercent = progress.total > 0 ? (progress.count / progress.total) * 100 : 0;
          updateStage('crawl', {
            progress: progressPercent,
            itemsProcessed: progress.count,
            totalItems: progress.total,
            currentTask: `Processing ${progress.currentSitemap || 'sitemap'}...`
          });
        });
      });

      updateStage('crawl', { status: 'complete', progress: 100, endTime: Date.now() });
      addLog(`Discovered ${allPageUrls.size} URLs`, 'success', 'crawl');
      setPartialResults(prev => ({ ...prev, urlsDiscovered: allPageUrls.size }));

      const urlsFromSitemap = Array.from(allPageUrls);
      if (urlsFromSitemap.length === 0) {
        throw new Error('Crawl complete, but no URLs were found. Your sitemap might be empty or in a format that could not be parsed.');
      }

      setLoadingPhase('analyzing');
      setCrawlProgress(null);

      addLog('Checking for cached analysis...', 'info');
      const cachedAnalysis = await cacheService.getAnalysis(data.url, urlsFromSitemap);

      if (cachedAnalysis) {
        addLog('Cache hit! Using cached analysis...', 'success');

        ['rank', 'competitor', 'technical', 'content'].forEach(stageId => {
          updateStage(stageId, { status: 'complete', progress: 100, endTime: Date.now() });
        });

        setPartialResults({
          urlsDiscovered: urlsFromSitemap.length,
          sitewideAnalysis: cachedAnalysis.sitewide,
          seoAnalysis: cachedAnalysis.seo,
        });

        addLog('Generating fresh action plan from cache...', 'ai', 'actionplan');
        updateStage('actionplan', { status: 'running', startTime: Date.now(), currentTask: 'Creating implementation roadmap...' });

        const actionPlan = await createActionPlan(aiConfig, cachedAnalysis.sitewide, cachedAnalysis.seo, (msg) => {
          updateStage('actionplan', { currentTask: msg });
          addLog(msg, 'ai', 'actionplan');
        });

        updateStage('actionplan', { status: 'complete', progress: 100, endTime: Date.now() });
        addLog('Action plan generated', 'success', 'actionplan');
        setPartialResults(prev => ({ ...prev, actionPlan }));

        addLog('Synthesizing executive summary...', 'ai', 'summary');
        updateStage('summary', { status: 'running', startTime: Date.now(), currentTask: 'Creating 80/20 analysis...' });

        const executiveSummary = await generateExecutiveSummary(aiConfig, cachedAnalysis.sitewide, cachedAnalysis.seo);

        updateStage('summary', { status: 'complete', progress: 100, endTime: Date.now() });
        addLog('Executive summary complete', 'success', 'summary');
        setPartialResults(prev => ({ ...prev, executiveSummary }));

        const newAnalysis: HistoricalAnalysis = {
          id: new Date().toISOString(),
          date: new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          sitemapUrl: data.url,
          competitorSitemaps: competitorUrls,
          sitewideAnalysis: cachedAnalysis.sitewide,
          analysis: cachedAnalysis.seo,
          sources: [],
          analysisType: data.analysisType,
          location: data.targetLocation,
          actionPlan: actionPlan,
          executiveSummary: executiveSummary,
        };

        const updatedHistory = [newAnalysis, ...analysisHistory].slice(0, 10);
        setAnalysisHistory(updatedHistory);
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory)); } catch (e) { console.warn('Failed to persist history:', e); }
        setSelectedAnalysisId(newAnalysis.id);
        setAppState('results');
        return;
      }

      addLog('No valid cache found, running full analysis...', 'info');

      addLog('Prioritizing URLs by SEO value...', 'info', 'rank');
      updateStage('rank', { status: 'running', startTime: Date.now(), currentTask: 'Scoring URL importance...' });

      const rankedUrls = rankUrls(urlsFromSitemap);
      const inputUrls = rankedUrls.slice(0, MAX_URLS_FOR_ANALYSIS);

      updateStage('rank', { status: 'complete', progress: 100, endTime: Date.now() });
      addLog(`Ranked ${rankedUrls.length} URLs, analyzing top ${inputUrls.length}`, 'success', 'rank');
      setPartialResults(prev => ({ ...prev, urlsAnalyzed: inputUrls.length }));

      addLog('Starting parallel AI analysis engines...', 'ai');

      updateStage('competitor', { status: 'running', startTime: Date.now(), currentTask: 'Analyzing competitor sitemaps...' });
      updateStage('technical', { status: 'running', startTime: Date.now(), currentTask: 'Auditing technical health...' });
      updateStage('content', { status: 'running', startTime: Date.now(), currentTask: 'Evaluating content quality...' });

      const [sitewideAnalysis, { analysis, sources }] = await Promise.all([
        generateSitewideAudit(
          aiConfig,
          inputUrls,
          competitorUrls,
          data.analysisType,
          data.targetLocation,
          (msg) => {
            if (msg.toLowerCase().includes('competitor')) {
              updateStage('competitor', { currentTask: msg });
              addLog(msg, 'ai', 'competitor');
            } else {
              updateStage('technical', { currentTask: msg });
              addLog(msg, 'ai', 'technical');
            }
          }
        ),
        generateSeoAnalysis(
          aiConfig,
          inputUrls,
          data.analysisType,
          data.targetLocation,
          [],
          (msg) => {
            updateStage('content', { currentTask: msg });
            addLog(msg, 'ai', 'content');
          }
        )
      ]);

      updateStage('competitor', { status: 'complete', progress: 100, endTime: Date.now() });
      updateStage('technical', { status: 'complete', progress: 100, endTime: Date.now() });
      updateStage('content', { status: 'complete', progress: 100, endTime: Date.now() });
      addLog('Sitewide audit complete', 'success', 'technical');
      addLog('Content analysis complete', 'success', 'content');

      setPartialResults(prev => ({
        ...prev,
        sitewideAnalysis,
        seoAnalysis: analysis
      }));

      addLog('Caching analysis for future use...', 'info');
      await cacheService.setAnalysis(data.url, urlsFromSitemap, sitewideAnalysis, analysis);

      addLog('Generating implementation roadmap...', 'ai', 'actionplan');
      updateStage('actionplan', {
        status: 'running',
        startTime: Date.now(),
        currentTask: 'Creating daily action items...'
      });

      const actionPlan = await createActionPlan(aiConfig, sitewideAnalysis, analysis, (msg) => {
        updateStage('actionplan', { currentTask: msg });
        addLog(msg, 'ai', 'actionplan');
      });

      updateStage('actionplan', { status: 'complete', progress: 100, endTime: Date.now() });
      addLog('Action plan generated successfully', 'success', 'actionplan');
      setPartialResults(prev => ({ ...prev, actionPlan }));

      addLog('Synthesizing executive summary...', 'ai', 'summary');
      updateStage('summary', {
        status: 'running',
        startTime: Date.now(),
        currentTask: 'Generating 80/20 analysis...'
      });

      const executiveSummary = await generateExecutiveSummary(aiConfig, sitewideAnalysis, analysis);

      updateStage('summary', { status: 'complete', progress: 100, endTime: Date.now() });
      addLog('Executive summary complete', 'success', 'summary');
      setPartialResults(prev => ({ ...prev, executiveSummary }));

      addLog('Analysis complete! Building final report...', 'success');

      const newAnalysis: HistoricalAnalysis = {
        id: new Date().toISOString(),
        date: new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        sitemapUrl: data.url,
        competitorSitemaps: competitorUrls,
        sitewideAnalysis: sitewideAnalysis,
        analysis: analysis,
        sources: sources,
        analysisType: data.analysisType,
        location: data.targetLocation,
        actionPlan: actionPlan,
        executiveSummary: executiveSummary,
      };

      const updatedHistory = [newAnalysis, ...analysisHistory].slice(0, 10);
      setAnalysisHistory(updatedHistory);
      try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory)); } catch (e) { console.warn('Failed to persist history:', e); }

      setSelectedAnalysisId(newAnalysis.id);
      setAppState('results');

    } catch (e) {
      if (isCancelling) return;
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      addLog(`Analysis failed: ${errorMessage}`, 'error');
      setPipelineStages(prev => prev.map(s =>
        s.status === 'running' ? { ...s, status: 'error' as const } : s
      ));
      setAppState('error');
    }
  }, [aiConfig, analysisHistory, updateStage, addLog, resetPipeline, isCancelling]);

  const handleGscConnect = useCallback((token: GscTokenResponse, sites: GscSite[]) => {
    setGscToken(token);
    setGscSites(sites);
    setIsGscModalOpen(false);
  }, []);

  const handleGscDisconnect = useCallback(() => {
    setGscToken(null);
    setGscSites([]);
  }, []);

  const renderContent = () => {
    switch (appState) {
      case 'configure_ai':
        return (
          <div className="max-w-3xl mx-auto mt-10">
            <AiConfiguration onConfigured={handleAiConfigChange} currentConfig={aiConfig} />
          </div>
        );

      case 'loading':
        if (loadingPhase === 'crawling' && crawlProgress) {
          return (
            <div className="relative">
              <CrawlingAnimation progress={crawlProgress} />
              <div className="text-center mt-6">
                <button
                  onClick={handleCancelAnalysis}
                  className="px-5 py-2 text-sm font-semibold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Cancel Analysis
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="mt-8 space-y-6 animate-fade-in">
            <AnalysisPipelineView
              stages={pipelineStages}
              activityLog={activityLog}
              startTime={analysisStartTime}
            />
            <ProgressiveResultsPanel results={partialResults} />
            <div className="text-center">
              <button
                onClick={handleCancelAnalysis}
                className="px-5 py-2 text-sm font-semibold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Cancel Analysis
              </button>
            </div>
          </div>
        );

      case 'results':
        if (analysisToDisplay && aiConfig) {
          return (
            <div className="mt-8 animate-fade-in">
              <ActionPlanDashboard
                analysis={analysisToDisplay}
                onToggleTaskComplete={handleToggleTaskComplete}
                aiConfig={aiConfig}
                isGscConnected={isGscConnected}
                onConnectGscClick={() => setIsGscModalOpen(true)}
                gscToken={gscToken}
              />
            </div>
          );
        }
        handleNewAnalysis();
        return (
          <GuidedAnalysisWizard
            isLoading={false}
            onSubmit={handleSubmit}
            gscSites={gscSites}
            isGscConnected={isGscConnected}
            isAiConfigured={!!aiConfig}
            aiConfig={aiConfig}
            onAiSettingsClick={handleAiSettingsChange}
          />
        );

      case 'error':
        return (
          <div className="mt-8 animate-fade-in">
            {error && <ErrorMessage message={error} />}
            <div className="mt-6">
              <AnalysisPipelineView
                stages={pipelineStages}
                activityLog={activityLog}
                startTime={analysisStartTime}
              />
            </div>
            {Object.keys(partialResults).length > 0 && (
              <div className="mt-6">
                <ProgressiveResultsPanel results={partialResults} />
              </div>
            )}
            <div className="text-center mt-8">
              <button
                onClick={handleNewAnalysis}
                className="text-sm font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-600/30"
              >
                Start New Analysis
              </button>
            </div>
          </div>
        );

      case 'idle':
      default:
        return (
          <GuidedAnalysisWizard
            isLoading={false}
            onSubmit={handleSubmit}
            gscSites={gscSites}
            isGscConnected={isGscConnected}
            isAiConfigured={!!aiConfig}
            aiConfig={aiConfig}
            onAiSettingsClick={handleAiSettingsChange}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 text-gray-300 font-sans">
        {isGscModalOpen && (
          <Modal title="Connect Google Search Console" onClose={() => setIsGscModalOpen(false)}>
            <GoogleSearchConsoleConnect
              onConnect={handleGscConnect}
              onDisconnect={handleGscDisconnect}
              isConnected={isGscConnected}
            />
          </Modal>
        )}

        <div className="flex">
          <HistoryPanel
            history={analysisHistory}
            selectedId={selectedAnalysisId}
            isOpen={isHistoryPanelOpen}
            onClose={() => setIsHistoryPanelOpen(false)}
            onSelect={(id) => {
              if (aiConfig) {
                setSelectedAnalysisId(id);
                setAppState('results');
                setError(null);
                setIsHistoryPanelOpen(false);
              } else {
                setAppState('configure_ai');
              }
            }}
            onClear={() => {
              setAnalysisHistory([]);
              setSelectedAnalysisId(null);
              localStorage.removeItem(HISTORY_STORAGE_KEY);
              cacheService.clearCache('*');
              handleGscDisconnect();
              handleNewAnalysis();
            }}
          />

          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto" style={{ height: '100vh' }}>
            <div className="max-w-7xl mx-auto">
              <Header
                onMenuClick={() => setIsHistoryPanelOpen(true)}
                showNewAnalysisButton={appState === 'results'}
                onNewAnalysisClick={handleNewAnalysis}
                isGscConnected={isGscConnected}
                onConnectClick={() => setIsGscModalOpen(true)}
                isAiConfigured={!!aiConfig}
                onAiSettingsClick={handleAiSettingsChange}
              />
              <main>{renderContent()}</main>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
