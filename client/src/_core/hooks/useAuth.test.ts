import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { TRPCClientError } from "@trpc/client";

// Mock dependencies
vi.mock("@/const", () => ({
  getLoginUrl: () => "#",
}));

// Create mock utils outside
const mockSetData = vi.fn();
const mockInvalidate = vi.fn();
const mockUtils = {
  auth: {
    me: {
      setData: mockSetData,
      invalidate: mockInvalidate,
    },
  },
};

vi.mock("@/lib/trpc", () => {
  const mockUseQuery = vi.fn();
  const mockUseMutation = vi.fn();

  return {
    trpc: {
      auth: {
        me: {
          useQuery: mockUseQuery,
        },
        logout: {
          useMutation: mockUseMutation,
        },
      },
      useUtils: () => mockUtils,
    },
  };
});

// Get mocked functions
import { trpc } from "@/lib/trpc";

describe("useAuth", () => {
  const mockUseQuery = vi.mocked(trpc.auth.me.useQuery);
  const mockUseMutation = vi.mocked(trpc.auth.logout.useMutation);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete (window as any).location;
    (window as any).location = { pathname: "/", href: "/" };
  });

  it("should return authenticated state when user is logged in", () => {
    const mockUser = { id: "user-123", name: "Test User", email: "test@example.com" };

    mockUseQuery.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should return unauthenticated state when user is null", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("should show loading state when query is loading", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should show loading state when logout is pending", () => {
    mockUseQuery.mockReturnValue({
      data: { id: "user-123" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
  });

  it("should handle query errors", () => {
    const mockError = new Error("Failed to fetch user");

    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.error).toBe(mockError);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should persist user info to localStorage", () => {
    const mockUser = { id: "user-123", name: "Test User" };

    mockUseQuery.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    renderHook(() => useAuth());

    const stored = localStorage.getItem("prism-user-info");
    expect(stored).toBe(JSON.stringify(mockUser));
  });

  it("should provide refresh function", () => {
    const mockRefetch = vi.fn();

    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.refresh).toBeDefined();
    expect(typeof result.current.refresh).toBe("function");
  });

  it("should execute logout successfully", async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

    mockUseQuery.mockReturnValue({
      data: { id: "user-123" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    await result.current.logout();

    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockSetData).toHaveBeenCalledWith(undefined, null);
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it("should handle UNAUTHORIZED error during logout silently", async () => {
    const unauthorizedError = new TRPCClientError("Unauthorized", {
      result: { error: { data: { code: "UNAUTHORIZED" } } },
    } as any);

    const mockMutateAsync = vi.fn().mockRejectedValue(unauthorizedError);

    mockUseQuery.mockReturnValue({
      data: { id: "user-123" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    // Should not throw
    await expect(result.current.logout()).resolves.toBeUndefined();

    // Should still clear state
    expect(mockSetData).toHaveBeenCalledWith(undefined, null);
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it("should throw other errors during logout", async () => {
    const networkError = new Error("Network failure");
    const mockMutateAsync = vi.fn().mockRejectedValue(networkError);

    mockUseQuery.mockReturnValue({
      data: { id: "user-123" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    await expect(result.current.logout()).rejects.toThrow("Network failure");

    // Should still clear state in finally block
    expect(mockSetData).toHaveBeenCalledWith(undefined, null);
    expect(mockInvalidate).toHaveBeenCalled();
  });

});
