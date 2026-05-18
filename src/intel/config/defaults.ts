export interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  navigationTimeoutMs: number;
  actionBudget: number;
  roleProfiles: string[];
  allowExternalSubdomains: boolean;
  headless: boolean;
}

export const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  maxPages: 150,
  maxDepth: 5,
  navigationTimeoutMs: 15000,
  actionBudget: 700,
  roleProfiles: ['anonymous'],
  allowExternalSubdomains: false,
  headless: true,
};
