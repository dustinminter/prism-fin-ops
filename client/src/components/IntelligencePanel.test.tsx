import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IntelligencePanel from "./IntelligencePanel";
import type { IntelligenceContext } from "./IntelligencePanel";

// Mock dependencies
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user", name: "Test User" },
    isAuthenticated: true,
    loading: false,
  })),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    prism: {
      chatWithIntelligence: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        })),
      },
      generateExecutiveNarrative: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        })),
      },
      executeNaturalLanguageQuery: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        })),
      },
    },
  },
}));

import { trpc } from "@/lib/trpc";
const mockUseMutation = vi.mocked(trpc.prism.chatWithIntelligence.useMutation);

vi.mock("@/const", () => ({
  getLoginUrl: () => "#",
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock chart components to avoid rendering issues in tests
vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div />,
}));

vi.mock("./DataSourceDiagram", () => ({
  default: () => <div data-testid="data-source-diagram">Data Source Diagram</div>,
}));

import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

describe("IntelligencePanel", () => {
  const mockContext: IntelligenceContext = {
    page: "Dashboard",
    agencyCode: "DOD",
    agencyName: "Department of Defense",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      const { container } = render(<IntelligencePanel context={mockContext} />);
      expect(container).toBeTruthy();
    });

    it("should render PRISM Intelligence heading", () => {
      render(<IntelligencePanel context={mockContext} />);
      const headings = screen.getAllByText(/PRISM Intelligence/i);
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should accept context prop", () => {
      const { rerender } = render(<IntelligencePanel context={{ page: "Dashboard" }} />);
      expect(screen.getAllByText(/PRISM Intelligence/i).length).toBeGreaterThan(0);

      rerender(<IntelligencePanel context={{ page: "Anomaly Detection" }} />);
      expect(screen.getAllByText(/PRISM Intelligence/i).length).toBeGreaterThan(0);
    });

    it("should render tabs interface", () => {
      render(<IntelligencePanel context={mockContext} />);
      // The component should have tab controls
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  describe("Authentication", () => {
    it("should render when user is authenticated", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: 1,
          openId: "test-user-openid",
          name: "Test User",
          email: "test@example.com",
          role: "user" as const,
        },
        isAuthenticated: true,
        loading: false,
        error: null,
        refresh: vi.fn(),
        logout: vi.fn(),
      });

      render(<IntelligencePanel context={mockContext} />);
      expect(screen.getAllByText(/PRISM Intelligence/i).length).toBeGreaterThan(0);
    });

    it("should handle unauthenticated state", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        refresh: vi.fn(),
        logout: vi.fn(),
      });

      render(<IntelligencePanel context={mockContext} />);
      // Component should still render but with different UI
      expect(screen.getAllByText(/PRISM Intelligence/i).length).toBeGreaterThan(0);
    });
  });

  describe("Props", () => {
    it("should accept optional onContextChange callback", () => {
      const mockCallback = vi.fn();
      render(<IntelligencePanel context={mockContext} onContextChange={mockCallback} />);
      expect(screen.getAllByText(/PRISM Intelligence/i).length).toBeGreaterThan(0);
    });

    it("should handle different page contexts", () => {
      const contexts = ["Dashboard", "Anomaly Detection", "Executive Reports"];

      contexts.forEach((page) => {
        const { unmount } = render(<IntelligencePanel context={{ page }} />);
        expect(screen.getAllByText(/PRISM Intelligence/i).length).toBeGreaterThan(0);
        unmount();
      });
    });
  });
});
