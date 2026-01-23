export interface Agency {
  id: string;
  name: string;
  cipPlanned: number;
  consumed: number;
  variance: number;              // planned - consumed
  consumptionRate: number;       // consumed / planned (0-1)
  riskLevel: 'Low' | 'Watch' | 'High' | 'Critical';
  trend: 'up' | 'down' | 'flat';
  topDrivers: string[];
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  vendor: string;
  appropriationName: string;
  objectClass: string;
  objectCode?: string;
  cabinetSecretariat?: string;
  department?: string;
  appropriationType?: string;
  fund?: string;
  fundCode?: string;
  zipCode?: string;
  fiscalPeriod?: number;
}

export interface CIPLineItem {
  id: string;
  program: string;
  agencyId: string;
  planned: number;
  consumed: number;
  variance: number;              // planned - consumed
  consumptionRate: number;       // consumed / planned (0-1)
  fiscalYear: string;            // "FY25", "FY26"
  category: 'IT' | 'Facilities' | 'Infrastructure' | 'Grants' | 'Equipment';
  transactions?: Transaction[];
}

export interface RiskFinding {
  id: string;
  title: string;
  agencyId: string;
  severity: 'Critical' | 'High' | 'Watch';
  varianceDelta: number;         // Absolute variance amount
  driver: string;
  createdDate: string;
  status: 'New' | 'Reviewing' | 'Mitigated' | 'Accepted Risk';
  owner: string;
  description: string;
  recommendedSteps: string[];
}

export interface MonthlyTrend {
  month: string;
  plannedBurn: number;
  actualBurn: number;
  variance: number;              // Cumulative planned - actual
}

export type TimeRange = 'FYTD' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Month';

export interface FilterState {
  fiscalYear: string;
  timeRange: TimeRange;
  selectedAgencyId: string | 'ALL';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citedData?: Record<string, string | number>;
}

export interface BidSolicitation {
  bid_number: string;
  scraped_at: string;
  source_url: string;
  header: {
    bid_number: string;
    description: string;
    opening_date: string;
    purchaser: string;
    organization: string;
    department: string;
    location: string;
    fiscal_year: string;
    type_code: string;
    allow_electronic_quote: string;
    alternate_id: string;
    required_date: string;
    info_contact: string;
    bid_type: string;
    informal_bid_flag: string;
    purchase_method: string;
    sbpp_eligible: string;
  };
  items: Array<{
    item_number: number;
    description: string;
  }>;
  attachments: Array<{
    filename: string;
    local_path: string;
    download_status: string;
    href: string;
  }>;
  contact_info: {
    phone: string;
    name?: string;
  };
}

export interface BidHolder {
  company_name: string;
  contact_person: string;
  address: {
    lines: string[];
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  email: string;
}
