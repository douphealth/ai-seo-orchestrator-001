import type { SitewideAnalysis, SeoAnalysisResult, ExecutiveSummary, DailyActionPlan } from '../types';

export type PipelineStageStatus = 'pending' | 'running' | 'complete' | 'error' | 'skipped';

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: PipelineStageStatus;
  progress: number;
  itemsProcessed?: number;
  totalItems?: number;
  currentTask?: string;
  startTime?: number;
  endTime?: number;
}

export interface ActivityLogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  stage?: string;
}

export interface PartialResults {
  sitewideAnalysis?: SitewideAnalysis;
  seoAnalysis?: SeoAnalysisResult;
  executiveSummary?: ExecutiveSummary;
  actionPlan?: DailyActionPlan[];
  urlsDiscovered?: number;
  urlsAnalyzed?: number;
}

export const PIPELINE_STAGE_DEFINITIONS: Omit<PipelineStage, 'status' | 'progress'>[] = [
  {
    id: 'crawl',
    name: 'Sitemap Discovery',
    description: 'Crawling sitemaps in parallel to extract all page URLs'
  },
  {
    id: 'rank',
    name: 'URL Prioritization',
    description: 'Scoring and ranking URLs by strategic SEO value'
  },
  {
    id: 'competitor',
    name: 'Competitor Intelligence',
    description: 'Analyzing competitor content gaps and strategies'
  },
  {
    id: 'technical',
    name: 'Technical Health Scan',
    description: 'Auditing site architecture, speed, and crawlability'
  },
  {
    id: 'content',
    name: 'Content Analysis',
    description: 'Evaluating on-page SEO factors and content quality'
  },
  {
    id: 'actionplan',
    name: 'Action Plan Generation',
    description: 'Creating prioritized implementation roadmap'
  },
  {
    id: 'summary',
    name: 'Executive Synthesis',
    description: 'Generating 80/20 executive summary with top priorities'
  },
];
