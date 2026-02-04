import type { DriveStep } from "driver.js";

/**
 * Spotlight tour steps for the PRISM FinOps Intelligence interface.
 * Each step highlights a key UI element using driver.js.
 */
export const spotlightTourSteps: DriveStep[] = [
  {
    element: "#prism-topbar",
    popover: {
      title: "Welcome to PRISM FinOps Intelligence",
      description:
        "Your AI-powered financial operations platform for the Commonwealth of Massachusetts, powered by Snowflake Intelligence.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#si-sidebar",
    popover: {
      title: "Topics",
      description:
        "Walk through 4 data stories: spending analysis, anomaly investigation, budget forecasting, and cross-source intelligence.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#si-agent-pill",
    popover: {
      title: "PRISM Semantic Model",
      description:
        "Connected to the PRISM_EOTSS_FINOPS semantic model — 7 tables across 4 data sources (CIW, CIP, Commbuys, CTHR).",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#si-search-input",
    popover: {
      title: "Natural Language Queries",
      description:
        "Ask any question in plain English. Snowflake Intelligence translates it to SQL and returns verified results.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#si-chat-area",
    popover: {
      title: "Intelligence Responses",
      description:
        "Answers include data tables, SQL provenance (click 'Show SQL'), verified query badges, and actionable insights.",
      side: "left",
      align: "center",
    },
  },
  {
    element: "#si-chips",
    popover: {
      title: "Quick-Start Questions",
      description:
        "Each scenario includes pre-built questions. Click any chip to instantly run that query.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#si-governance",
    popover: {
      title: "Governance Controls",
      description:
        "Every query is governed by the DULA agreement (AGR-EOTSS-POC-001) — row-level security, audit trails, and trust state workflows.",
      side: "right",
      align: "end",
    },
  },
];

/**
 * Pathfinder contextual page guides.
 */
export const pageGuides: Record<string, { title: string; steps: string[] }> = {
  intelligence: {
    title: "Intelligence Guide",
    steps: [
      "Select a topic from the sidebar to load pre-built conversations.",
      "Review the data tables and insights in each response.",
      "Click 'Show SQL' to see the verified query behind each answer.",
      "Type your own question or click a suggestion chip at the bottom.",
      "Use arrow keys to quickly cycle through topics.",
    ],
  },
};
