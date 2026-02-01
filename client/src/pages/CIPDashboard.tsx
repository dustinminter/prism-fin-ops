import { useState } from "react";
import { trpc } from "@/lib/trpc";
import PrismLayout from "@/components/PrismLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Pause,
} from "lucide-react";

const POLICY_COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#a371f7", "#8b949e"];

const STATUS_CONFIG = {
  planned: { icon: Clock, color: "#8b949e", label: "Planned" },
  in_progress: { icon: TrendingUp, color: "#58a6ff", label: "In Progress" },
  completed: { icon: CheckCircle2, color: "#3fb950", label: "Completed" },
  cancelled: { icon: XCircle, color: "#f85149", label: "Cancelled" },
  deferred: { icon: Pause, color: "#d29922", label: "Deferred" },
};

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatVariance(variance: number): string {
  const prefix = variance >= 0 ? "+" : "";
  return `${prefix}${formatCurrency(variance)}`;
}

export default function CIPDashboard() {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>("all");
  const [selectedPolicyArea, setSelectedPolicyArea] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: summary, isLoading: summaryLoading } = trpc.prism.getCIPSummary.useQuery();
  const { data: programs, isLoading: programsLoading } = trpc.prism.getCIPPrograms.useQuery();
  const { data: lineItems, isLoading: lineItemsLoading } = trpc.prism.getCIPLineItems.useQuery({
    fiscalYear: selectedFiscalYear !== "all" ? parseInt(selectedFiscalYear) : undefined,
    policyArea: selectedPolicyArea !== "all" ? selectedPolicyArea : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
  });

  const isLoading = summaryLoading || programsLoading || lineItemsLoading;

  // Calculate execution rate
  const executionRate = summary ? (summary.totalActualSpend / summary.total5YearPlanned) * 100 : 0;

  // Get unique policy areas for filter
  const policyAreas = programs
    ? Array.from(new Set(programs.map((p) => p.policyArea))).filter(Boolean)
    : [];

  return (
    <PrismLayout title="Capital Investment Plan">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              FY2026-2030 planned investments vs. actual execution
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-[#161b22] border-[#30363d]">
              <Calendar className="w-3 h-3 mr-1" />
              5-Year Plan
            </Badge>
          </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#8b949e]">Total 5-Year Planned</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32 bg-[#21262d]" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(summary?.total5YearPlanned || 0)}
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-[#8b949e]">
                  <FileText className="w-3 h-3" />
                  {summary?.totalPrograms || 0} programs
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#8b949e]">Actual Spend to Date</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32 bg-[#21262d]" />
            ) : (
              <>
                <div className="text-2xl font-bold text-[#58a6ff]">
                  {formatCurrency(summary?.totalActualSpend || 0)}
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-[#8b949e]">
                  <Building2 className="w-3 h-3" />
                  {summary?.totalLineItems || 0} line items
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#8b949e]">Variance</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32 bg-[#21262d]" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${
                    (summary?.varianceAmount || 0) >= 0 ? "text-[#3fb950]" : "text-[#d29922]"
                  }`}
                >
                  {formatVariance(summary?.varianceAmount || 0)}
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-[#8b949e]">
                  {(summary?.variancePct || 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-[#3fb950]" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-[#d29922]" />
                  )}
                  {Math.abs(summary?.variancePct || 0).toFixed(1)}% from plan
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#8b949e]">Execution Rate</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32 bg-[#21262d]" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {executionRate.toFixed(1)}%
                </div>
                <Progress
                  value={Math.min(executionRate, 100)}
                  className="h-2 mt-2 bg-[#21262d]"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planned vs Actual by Fiscal Year */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Planned vs Actual by Fiscal Year</CardTitle>
            <CardDescription className="text-[#8b949e]">
              5-year capital investment execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-[300px] w-full bg-[#21262d]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary?.byFiscalYear || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis
                    dataKey="fiscalYear"
                    stroke="#8b949e"
                    tickFormatter={(fy) => `FY${fy}`}
                  />
                  <YAxis stroke="#8b949e" tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(fy) => `FY${fy}`}
                  />
                  <Legend />
                  <Bar dataKey="planned" name="Planned" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#3fb950" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By Policy Area */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Investment by Policy Area</CardTitle>
            <CardDescription className="text-[#8b949e]">
              Distribution across policy domains
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-[300px] w-full bg-[#21262d]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={summary?.byPolicyArea || []}
                    dataKey="planned"
                    nameKey="policyArea"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ policyArea, percent }) =>
                      `${policyArea}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "#8b949e" }}
                  >
                    {(summary?.byPolicyArea || []).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={POLICY_COLORS[index % POLICY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Programs and Line Items Tabs */}
      <Tabs defaultValue="programs" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-[#21262d]">
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="line-items">Line Items</TabsTrigger>
          </TabsList>

          {/* Filters for Line Items */}
          <div className="flex items-center gap-2">
            <Select value={selectedFiscalYear} onValueChange={setSelectedFiscalYear}>
              <SelectTrigger className="w-[120px] bg-[#21262d] border-[#30363d]">
                <SelectValue placeholder="Fiscal Year" />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-[#30363d]">
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2026">FY2026</SelectItem>
                <SelectItem value="2027">FY2027</SelectItem>
                <SelectItem value="2028">FY2028</SelectItem>
                <SelectItem value="2029">FY2029</SelectItem>
                <SelectItem value="2030">FY2030</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPolicyArea} onValueChange={setSelectedPolicyArea}>
              <SelectTrigger className="w-[150px] bg-[#21262d] border-[#30363d]">
                <SelectValue placeholder="Policy Area" />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-[#30363d]">
                <SelectItem value="all">All Areas</SelectItem>
                {policyAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px] bg-[#21262d] border-[#30363d]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-[#30363d]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Programs Tab */}
        <TabsContent value="programs">
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardContent className="pt-6">
              {programsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full bg-[#21262d]" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#30363d] hover:bg-transparent">
                      <TableHead className="text-[#8b949e]">Program</TableHead>
                      <TableHead className="text-[#8b949e]">Policy Area</TableHead>
                      <TableHead className="text-[#8b949e] text-right">5-Year Plan</TableHead>
                      <TableHead className="text-[#8b949e] text-right">Actual Spend</TableHead>
                      <TableHead className="text-[#8b949e] text-right">Execution</TableHead>
                      <TableHead className="text-[#8b949e] text-right">Line Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(programs || []).map((program) => {
                      const execRate =
                        program.total5YearPlan > 0
                          ? (program.totalActualSpend / program.total5YearPlan) * 100
                          : 0;
                      return (
                        <TableRow
                          key={program.programId}
                          className="border-[#30363d] hover:bg-[#21262d]/50"
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">
                                {program.programName}
                              </div>
                              <div className="text-sm text-[#8b949e] truncate max-w-[300px]">
                                {program.programDescription}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-[#21262d] border-[#30363d]">
                              {program.policyArea}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground">
                            {formatCurrency(program.total5YearPlan)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[#58a6ff]">
                            {formatCurrency(program.totalActualSpend)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress
                                value={Math.min(execRate, 100)}
                                className="h-2 w-16 bg-[#21262d]"
                              />
                              <span className="text-sm text-[#8b949e] w-12">
                                {execRate.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-[#8b949e]">
                            {program.lineItemCount}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Line Items Tab */}
        <TabsContent value="line-items">
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardContent className="pt-6">
              {lineItemsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-[#21262d]" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#30363d] hover:bg-transparent">
                      <TableHead className="text-[#8b949e]">Project</TableHead>
                      <TableHead className="text-[#8b949e]">Program</TableHead>
                      <TableHead className="text-[#8b949e]">FY</TableHead>
                      <TableHead className="text-[#8b949e]">Status</TableHead>
                      <TableHead className="text-[#8b949e] text-right">Planned</TableHead>
                      <TableHead className="text-[#8b949e] text-right">Actual</TableHead>
                      <TableHead className="text-[#8b949e] text-right">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(lineItems || []).map((item) => {
                      const StatusIcon =
                        STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
                      const statusColor =
                        STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]?.color ||
                        "#8b949e";
                      const statusLabel =
                        STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]?.label ||
                        item.status;

                      return (
                        <TableRow
                          key={item.lineItemId}
                          className="border-[#30363d] hover:bg-[#21262d]/50"
                        >
                          <TableCell>
                            <div className="max-w-[200px]">
                              <div className="font-medium text-foreground truncate">
                                {item.projectName}
                              </div>
                              <div className="text-xs text-[#8b949e]">{item.capitalAgency}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#8b949e] text-sm">
                            {item.programName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-[#21262d] border-[#30363d]">
                              {item.fiscalYearLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <StatusIcon
                                className="w-3.5 h-3.5"
                                style={{ color: statusColor }}
                              />
                              <span className="text-sm" style={{ color: statusColor }}>
                                {statusLabel}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground">
                            {formatCurrency(item.plannedAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[#58a6ff]">
                            {formatCurrency(item.actualAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className={`font-mono ${
                                item.varianceAmount >= 0 ? "text-[#3fb950]" : "text-[#f85149]"
                              }`}
                            >
                              {item.varianceAmount >= 0 ? "+" : ""}
                              {item.variancePct.toFixed(1)}%
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PrismLayout>
  );
}
