/**
 * MicroDrillTracking — Personnel tracking view for Micro Training Drills.
 *
 * Shows all drill assignments with completion status, dates, and
 * the ability to view drill results and completion confirmations.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, Filter, Calendar, Clock, CheckCircle2, Loader2,
  AlertTriangle, Play, RotateCcw, UserCheck, ChevronDown,
  ChevronUp, Users, BookOpen, BarChart3, Target,
} from "lucide-react";

export default function MicroDrillTracking() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedAssignment, setExpandedAssignment] = useState<number | null>(null);

  const assignmentsQuery = trpc.microDrill.listMyAssignments.useQuery(undefined, {
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  const statsQuery = trpc.microDrill.getStats.useQuery();

  const assignments = assignmentsQuery.data ?? [];

  // Filter assignments
  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = !searchQuery ||
      (a.assignedToName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.drillTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.drillCategory?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Status counts
  const totalCount = assignments.length;
  const completedCount = assignments.filter(a => a.status === "completed").length;
  const pendingCount = assignments.filter(a => a.status === "pending").length;
  const inProgressCount = assignments.filter(a => a.status === "in_progress").length;

  return (

      <div className="container max-w-6xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Drill Assignment Tracking</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track drill assignments, completion status, and personnel progress.
            </p>
          </div>
          <Button onClick={() => navigate("/micro-drills")}>
            <Target className="h-4 w-4 mr-2" /> Assign New Drill
          </Button>
        </div>

        {/* Stats Cards */}
        {statsQuery.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Assigned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, drill, or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {["all", "pending", "in_progress", "completed", "expired"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => assignmentsQuery.refetch()}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {/* Assignments List */}
        {assignmentsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No drill assignments found</p>
            <p className="text-sm mt-1">
              {assignments.length === 0
                ? "Assign a drill to get started."
                : "Try adjusting your search or filters."}
            </p>
            {assignments.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={() => navigate("/micro-drills")}>
                <Target className="h-4 w-4 mr-2" /> Assign a Drill
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map(a => (
              <Card key={a.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.assignedToName || "Unnamed"}</span>
                        <Badge className={`text-xs ${
                          a.status === "completed" ? "bg-green-100 text-green-700" :
                          a.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          a.status === "expired" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {a.status?.replace("_", " ")}
                        </Badge>
                        {a.completedByName && a.status === "completed" && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed by {a.completedByName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.drillTitle} · {a.drillCategory}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Assigned: {new Date(a.assignedDate).toLocaleDateString()}
                        </span>
                        {a.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {a.completedAt && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed: {new Date(a.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {a.status === "completed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/micro-drills/run/${a.id}`)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Redo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/micro-drills/run/${a.id}`)}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" /> Start
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedAssignment(
                          expandedAssignment === a.id ? null : a.id
                        )}
                      >
                        {expandedAssignment === a.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAssignment === a.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-muted-foreground">Assigned By:</span>
                          <p>User #{a.assignedByUserId}</p>
                        </div>
                        {a.assignedToEmail && (
                          <div>
                            <span className="font-semibold text-muted-foreground">Email:</span>
                            <p>{a.assignedToEmail}</p>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-muted-foreground">Drill ID:</span>
                          <p>#{a.drillId}</p>
                        </div>
                      </div>

                      {a.step1Choice && (
                        <div className="rounded-lg bg-slate-50 border p-3 space-y-2">
                          <p className="text-xs font-semibold">Completed Choices</p>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium">Step 1:</span> {a.step1Choice === "A" ? "Option A" : "Option B"}</p>
                            {a.step2Choices && typeof a.step2Choices === 'string' && (
                              <p>
                                <span className="font-medium">Actions Selected:</span>{" "}
                                {JSON.parse(a.step2Choices as string).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

  );
}