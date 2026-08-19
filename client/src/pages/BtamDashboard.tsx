import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  User,
  FileText,
  ChevronRight,
  Lock,
} from "lucide-react";

const CONCERN_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-green-700 dark:text-green-300", bg: "bg-green-100 dark:bg-green-900/30" },
  moderate: { label: "Moderate", color: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  elevated: { label: "Elevated", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-900/30" },
  high: { label: "High", color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-900/30" },
  critical: { label: "Critical", color: "text-red-900 dark:text-red-200", bg: "bg-red-200 dark:bg-red-900/40" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30" },
  monitoring: { label: "Monitoring", color: "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30" },
  intervention: { label: "Intervention", color: "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30" },
  closed: { label: "Closed", color: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800" },
  referred: { label: "Referred", color: "text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/30" },
};

type BtamCase = {
  id: number;
  caseNumber: string;
  status: string;
  concernLevel: string;
  violenceType: string | null;
  assignedAssessor: number | null;
  createdBy: number;
  linkedIncidentId: number | null;
  confidentialityFlag: boolean;
  createdAt: Date;
  updatedAt: Date;
  orgId: number;
};

export default function BtamDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [concernFilter, setConcernFilter] = useState<string>("all");

  const { data: cases, isLoading } = trpc.btam.listCases.useQuery();

  const isAdmin = user?.role === "admin";

  const filtered = ((cases ?? []) as BtamCase[]).filter((c: BtamCase) => {
    const matchSearch =
      !search ||
      c.caseNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchConcern = concernFilter === "all" || c.concernLevel === concernFilter;
    return matchSearch && matchStatus && matchConcern;
  });

  const openCount = ((cases ?? []) as BtamCase[]).filter((c: BtamCase) => c.status === "open").length;
  const highCount = ((cases ?? []) as BtamCase[]).filter(
    (c: BtamCase) => c.concernLevel === "high" || c.concernLevel === "imminent"
  ).length;
  const interventionCount = ((cases ?? []) as BtamCase[]).filter(
    (c: BtamCase) => c.status === "escalated"
  ).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Shield className="w-6 h-6 text-indigo-700 dark:text-indigo-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">
              Behavioral Threat Assessment
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Confidential — Authorized Personnel Only
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300">
            <Lock className="w-3 h-3" />
            <span>Restricted Access</span>
          </div>
        </div>
        {isAdmin && (
          <Link href="/btam/new" className="mt-4 inline-block">
            <Button className="gap-2 bg-indigo-700 hover:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
              New Referral
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wide">
              Open Cases
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-foreground">{openCount}</p>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wide">
              High / Critical
            </span>
          </div>
          <p className="text-3xl font-bold text-red-700 dark:text-red-400">{highCount}</p>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wide">
              In Intervention
            </span>
          </div>
          <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">{interventionCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-muted-foreground" />
          <Input
            placeholder="Search case number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={concernFilter} onValueChange={setConcernFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Concern Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Concern Levels</SelectItem>
            {Object.entries(CONCERN_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Case List */}
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 dark:text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>Loading cases...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No cases found</p>
            <p className="text-sm mt-1">
              {cases?.length === 0
                ? "No referrals have been submitted yet."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-muted-foreground">
                  Case #
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-muted-foreground">
                  Concern Level
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-muted-foreground">
                  Violence Type
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-muted-foreground">
                  Opened
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-muted-foreground">
                  Last Updated
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: BtamCase) => {
                const concern = c.concernLevel
                  ? CONCERN_CONFIG[c.concernLevel]
                  : null;
                const status = STATUS_CONFIG[c.status] ?? {
                  label: c.status,
                  color: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
                };
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 dark:border-border hover:bg-slate-50 dark:hover:bg-muted transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 dark:text-muted-foreground" />
                        <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                          {c.caseNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${status.color} border-0`}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {concern ? (
                        <Badge
                          className={`text-xs ${concern.bg} ${concern.color} border-0`}
                        >
                          {concern.label}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 dark:text-muted-foreground text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-700 dark:text-foreground/80">
                        {c.violenceType?.replace(/_/g, " ") ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-muted-foreground">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/btam/${c.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confidentiality Notice */}
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg flex items-start gap-2">
        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Confidentiality Notice:</strong> All BTAM case information is
          strictly confidential and protected under applicable privacy laws. Access
          is limited to authorized TAT members. Unauthorized disclosure is
          prohibited.
        </p>
      </div>
    </div>
  );
}