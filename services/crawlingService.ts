
import type { CrawlProgress } from "../types";

const PROXY_PROVIDERS = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`
];

const fetchWithFailover = async (targetUrl: string, signal: AbortSignal, attempt = -1): Promise<Response> => {
    if (attempt === -1) {
        try {
            const response = await fetch(targetUrl, { signal, mode: 'cors' });
            if (response.ok) return response;
        } catch (_) {
            // Direct fetch failed (CORS), fall through to proxy providers
        }
        return fetchWithFailover(targetUrl, signal, 0);
    }

    if (attempt >= PROXY_PROVIDERS.length) {
        throw new Error(`Failed to fetch sitemap at ${targetUrl}. All fetch methods exhausted. Please verify the URL is accessible and returns valid XML.`);
    }

    const proxyUrl = PROXY_PROVIDERS[attempt](targetUrl);

    try {
        const response = await fetch(proxyUrl, { signal });
        if (!response.ok) {
            if (response.status === 403 || response.status === 429 || response.status >= 500) {
                return fetchWithFailover(targetUrl, signal, attempt + 1);
            }
            throw new Error(`Status: ${response.status}`);
        }
        return response;
    } catch (e) {
        if (signal.aborted) throw e;
        return fetchWithFailover(targetUrl, signal, attempt + 1);
    }
}

// Increased concurrency for enterprise-grade speed
const CONCURRENCY_LIMIT = 12;
// Safety limit to prevent browser crashes on massive enterprise sites (100k+ pages)
// We only need a statistically significant sample for the audit.
const MAX_URL_SAMPLE_SIZE = 600; 

/**
 * Crawls a sitemap, handling nested sitemap indexes and reporting progress.
 * Optimized for single-pass parallel processing with Heuristic Prioritization.
 */
export const crawlSitemap = async (initialSitemapUrl: string, onProgress: (progress: CrawlProgress) => void): Promise<Set<string>> => {
    const parser = new DOMParser();
    const allPageUrls = new Set<string>();
    
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes hard timeout

    try {
        const sitemapsToProcess = new Set<string>([initialSitemapUrl]);
        const processedSitemaps = new Set<string>();
        const processingQueue: string[] = [initialSitemapUrl];
        
        let processedCount = 0;
        let activeWorkers = 0;
        
        await new Promise<void>((resolve, reject) => {
            const processNext = async () => {
                // Heuristic Check: Stop if we have enough data for a robust audit
                if (allPageUrls.size >= MAX_URL_SAMPLE_SIZE) {
                    // Drain queue
                    if (activeWorkers === 0) resolve();
                    return;
                }

                if (processingQueue.length === 0 && activeWorkers === 0) {
                    resolve();
                    return;
                }
                
                if (processingQueue.length === 0 || activeWorkers >= CONCURRENCY_LIMIT) {
                    return;
                }

                const sitemapUrl = processingQueue.shift()!;
                if (processedSitemaps.has(sitemapUrl)) {
                    processNext();
                    return;
                }

                activeWorkers++;
                processedSitemaps.add(sitemapUrl);
                
                if (processingQueue.length > 0 && activeWorkers < CONCURRENCY_LIMIT) {
                     processNext();
                }

                try {
                    const response = await fetchWithFailover(sitemapUrl, signal);
                    const text = await response.text();
                    
                    if (signal.aborted) return;

                    const xmlDoc = parser.parseFromString(text, "text/xml");
                    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                        throw new Error("XML Parse Error");
                    }

                    // Check for nested sitemaps
                    const sitemapIndexNodes = xmlDoc.querySelectorAll("sitemap > loc");
                    if (sitemapIndexNodes.length > 0) {
                        const nestedUrls = Array.from(sitemapIndexNodes)
                            .map(node => node.textContent?.trim())
                            .filter(Boolean) as string[];
                        
                        // Smart Sorting: Prioritize "post", "page", "product" sitemaps.
                        // Deprioritize "tag", "author", "date" archives.
                        nestedUrls.sort((a, b) => {
                            const priorityRegex = /post|page|product|service|landing/i;
                            const lowPriorityRegex = /tag|author|archive|date|20\d\d/i;
                            
                            const aScore = (priorityRegex.test(a!) ? 2 : 0) - (lowPriorityRegex.test(a!) ? 2 : 0);
                            const bScore = (priorityRegex.test(b!) ? 2 : 0) - (lowPriorityRegex.test(b!) ? 2 : 0);
                            
                            return bScore - aScore;
                        });

                        nestedUrls.forEach(url => {
                            if (!processedSitemaps.has(url) && !sitemapsToProcess.has(url)) {
                                sitemapsToProcess.add(url);
                                // High priority goes to front of queue, low to back
                                const isHighValue = /post|page|product/i.test(url);
                                if (isHighValue) {
                                    processingQueue.unshift(url);
                                } else {
                                    processingQueue.push(url);
                                }
                            }
                        });
                    } else {
                        // Extract URLs
                        const urlNodes = xmlDoc.querySelectorAll("url > loc");
                        const newUrls = Array.from(urlNodes)
                            .map(node => node.textContent?.trim())
                            .filter(Boolean) as string[];
                        
                        let newCount = 0;
                        newUrls.forEach(url => {
                            if (!allPageUrls.has(url)) {
                                allPageUrls.add(url);
                                newCount++;
                            }
                        });
                        
                        if (newCount > 0) {
                             onProgress({
                                type: 'crawling',
                                count: processedCount + 1,
                                total: sitemapsToProcess.size,
                                currentSitemap: sitemapUrl,
                                pagesFound: allPageUrls.size,
                                lastUrlFound: newUrls[newUrls.length - 1],
                                totalUrls: 0
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Error processing ${sitemapUrl}:`, e);
                } finally {
                    processedCount++;
                    activeWorkers--;
                    onProgress({
                        type: 'crawling',
                        count: processedCount,
                        total: sitemapsToProcess.size,
                        currentSitemap: sitemapUrl,
                        pagesFound: allPageUrls.size
                    });
                    processNext();
                }
            };

            const initialWorkers = Math.min(CONCURRENCY_LIMIT, processingQueue.length);
            for (let i = 0; i < initialWorkers; i++) {
                processNext();
            }
        });

    } finally {
        clearTimeout(timeoutId);
    }
    
    return allPageUrls;
}
