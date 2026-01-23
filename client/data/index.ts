/**
 * Data Exports
 * 
 * This module exports transformed data from CTHRU and CIP sources
 * for use in the frontend application.
 * 
 * Data Sources:
 * - CTHRU: Massachusetts statewide spending data (actual transactions)
 * - CIP: Capital Investment Plan (planned investments)
 * - COMMBUYS: Bid solicitations and procurement data
 * 
 * To refresh data:
 * 1. Run server/cthru_acquisition.py to fetch latest CTHRU data
 * 2. Run server/transform_to_json.py to regenerate JSON files
 */

import { Agency, CIPLineItem, RiskFinding, MonthlyTrend, BidSolicitation, BidHolder } from '../types';

// Import JSON data files
import agenciesData from './agencies.json';
import cipLineItemsData from './cip-line-items.json';
import riskFindingsData from './risk-findings.json';

// Import CTHRU data from individual folder
import monthlyTrendsData from './cthru/monthly-trends.json';
import allTransactionsData from './cthru/transactions.json';
import cthruMetricsData from './cthru/metrics.json';

// Import COMMBUYS data
import bid1Details from './commbuys/BD-26-1060-ITD00-ITD00-124211/bid_details.json';
import bid1Holders from './commbuys/BD-26-1060-ITD00-ITD00-124211/bid_holders.json';
import bid2Details from './commbuys/BD-26-1060-ITD00-ITD00-124242/bid_details.json';
import bid2Holders from './commbuys/BD-26-1060-ITD00-ITD00-124242/bid_holders.json';
import bid3Details from './commbuys/BD-26-1060-ITD00-ITD00-124337/bid_details.json';
import bid3Holders from './commbuys/BD-26-1060-ITD00-ITD00-124337/bid_holders.json';
import bid4Details from './commbuys/S124912-vCurrent/bid_details.json';
import bid4Holders from './commbuys/S124912-vCurrent/bid_holders.json';
import bid5Details from './commbuys/S125606-vCurrent/bid_details.json';
import bid5Holders from './commbuys/S125606-vCurrent/bid_holders.json';

// Export typed data
export const AGENCIES: Agency[] = agenciesData as Agency[];
export const CIP_LINE_ITEMS: CIPLineItem[] = cipLineItemsData as CIPLineItem[];
export const RISK_FINDINGS: RiskFinding[] = riskFindingsData as RiskFinding[];
export const MONTHLY_TRENDS: MonthlyTrend[] = monthlyTrendsData as MonthlyTrend[];
export const ALL_TRANSACTIONS = allTransactionsData;
export const CTHRU_METRICS = cthruMetricsData;

export const BID_SOLICITATIONS: (BidSolicitation & { holders: BidHolder[] })[] = [
  { ...(bid1Details as any), holders: (bid1Holders as any).holders as BidHolder[] },
  { ...(bid2Details as any), holders: (bid2Holders as any).holders as BidHolder[] },
  { ...(bid3Details as any), holders: (bid3Holders as any).holders as BidHolder[] },
  { ...(bid4Details as any), holders: (bid4Holders as any).holders as BidHolder[] },
  { ...(bid5Details as any), holders: (bid5Holders as any).holders as BidHolder[] },
];

// Re-export types for convenience
export type { Agency, CIPLineItem, RiskFinding, MonthlyTrend, BidSolicitation, BidHolder };
