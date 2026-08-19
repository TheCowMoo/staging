/**
 * MicroDrillAdmin — Admin dashboard for selecting, assigning, and managing micro-training drills.
 *
 * Features:
 *   - Browse drills by category
 *   - Select a specific drill from a dropdown
 *   - Assign to personnel (name/email)
 *   - Set assignment date and completion due date
 *   - Random drill generator
 *   - View assignment stats and tracking
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Shuffle, UserCheck, Calendar, Clock, Target, ChevronDown,
  CheckCircle2, Loader2, AlertTriangle, Play, RotateCcw,
  Plus, Users, BookOpen,
} from "lucide-react";
import type { MicroDrillScenario } from "../../../shared/microDrillsData";

// ─── Categories with exact labels and scenario counts ──────────────────────
const CATEGORY_LIST = [
  { num: 1, label: "Active Shooter — Real or Perceived", desc: "8 scenarios (IDs 1-8)" },
  { num: 2, label: "Edged Weapon / Knife Attack", desc: "6 scenarios" },
  { num: 3, label: "Physical Assault / Hands-On Violence", desc: "7 scenarios" },
  { num: 4, label: "Verbal Threats and Intimidation", desc: "7 scenarios" },
  { num: 5, label: "Suspicious Persons and Behavior", desc: "6 scenarios" },
  { num: 6, label: "Bomb Threat / Suspicious Package", desc: "5 scenarios" },
  { num: 7, label: "Workplace Violence — Domestic Spillover", desc: "5 scenarios" },
  { num: 8, label: "Mental Health Crisis / Erratic Behavior", desc: "5 scenarios" },
  { num: 9, label: "Terrorism / Large-Scale Threat", desc: "3 scenarios" },
  { num: 10, label: "Vehicle as a Weapon", desc: "3 scenarios" },
  { num: 11, label: "Multiple Simultaneous Threats", desc: "4 scenarios" },
  { num: 12, label: "Off-Site Employee Scenarios", desc: "3 scenarios" },
  { num: 13, label: "Repeat / Escalating Behavior", desc: "2 scenarios" },
  { num: 14, label: "Defend as Primary Response", desc: "6 scenarios (IDs 65-70)" },
];

export default function MicroDrillAdmin() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("assign");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDrillId, setSelectedDrillId] = useState<number | null>(null);
  const [selectedDrill, setSelectedDrill] = useState<MicroDrillScenario | null>(null);

  // Assignment form
  const [assigneeName, setAssigneeName] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Bulk assignment
  const [bulkNames, setBulkNames] = useState("");

  // Random drill state
  const [randomDrill, setRandomDrill] = useState<MicroDrillScenario | null>(null);

  // Queries
  const drillsQuery = trpc.microDrill.listDrills.useQuery();
  const randomDrillQuery = trpc.microDrill.getRandomDrill.useQuery(
    { categoryNumber: selectedCategory ? parseInt(selectedCategory) : undefined },
    { enabled: false }
  );
  const assignMutation = trpc.microDrill.assign.useMutation({
    onSuccess: () => {
      toast.success("Drill assigned successfully");
      setAssigneeName("");
      setAssigneeEmail("");
      setDueDate("");
      assignmentsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const assignBulkMutation = trpc.microDrill.assignBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`Drill assigned to ${data.count} personnel`);
      setBulkNames("");
      assignmentsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const assignmentsQuery = trpc.microDrill.listMyAssignments.useQuery();
  const statsQuery = trpc.microDrill.getStats.useQuery();

  const drills = drillsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];

  // Filter drills by selected category
  const filteredDrills = selectedCategory
    ? drills.filter(d => d.categoryNumber === parseInt(selectedCategory))
    : drills;

  // Get selected drill details
  useEffect(() => {
    if (selectedDrillId) {
      const d = drills.find(d => d.id === selectedDrillId);
      setSelectedDrill(d ?? null);
    }
  }, [selectedDrillId, drills]);

  // Handle random drill
  const handleRandomDrill = async () => {
    const catNum = selectedCategory ? parseInt(selectedCategory) : undefined;
    try {
      const result = await randomDrillQuery.refetch();
      if (result.data) {
        setRandomDrill(result.data);
        setSelectedDrill(result.data);
        setSelectedDrillId(result.data.id);
      }
    } catch {
      let local = drills;
      if (catNum) local = local.filter(d => d.categoryNumber === catNum);
      if (local.length === 0) local = drills;
      const pick = local[Math.floor(Math.random() * local.length)];
      setRandomDrill(pick);
      setSelectedDrill(pick);
      setSelectedDrillId(pick.id);
    }
    toast.success("Random drill selected!");
  };

  // Handle assign
  const handleAssign = () => {
    if (!selectedDrill) {
      toast.error("Please select a drill first");
      return;
    }
    if (!assigneeName && !assigneeEmail) {
      toast.error("Please enter a name or email for the person");
      return;
    }

    assignMutation.mutate({
      drillId: selectedDrill.id,
      drillCategory: selectedDrill.category,
      drillTitle: selectedDrill.title,
      assignedToName: assigneeName || undefined,
      assignedToEmail: assigneeEmail || undefined,
      dueDate: dueDate || undefined,
    });
  };

  // Handle bulk assign
  const handleBulkAssign = () => {
    if (!selectedDrill) {
      toast.error("Please select a drill first");
      return;
    }
    const names = bulkNames.split("\n").map(n => n.trim()).filter(Boolean);
    if (names.length === 0) {
      toast.error("Please enter at least one name");
      return;
    }

    assignBulkMutation.mutate({
      drillId: selectedDrill.id,
      drillCategory: selectedDrill.category,
      drillTitle: selectedDrill.title,
      assignments: names.map(name => ({ assignedToName: name })),
      dueDate: dueDate || undefined,
    });
  };

  return (

      <div className="container max-w-5xl py-8 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Micro Training Drills</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assign quick scenario-based drills (2-3 min each) to your team for emergency preparedness training.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/micro-drills/tracking")}>
            <UserCheck className="h-4 w-4 mr-2" /> View All Assignments
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assign">
              <Target className="h-4 w-4 mr-2" /> Select & Assign
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <Users className="h-4 w-4 mr-2" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BookOpen className="h-4 w-4 mr-2" /> Stats
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: Select & Assign ─────────────────────────────────────── */}
          <TabsContent value="assign" className="space-y-6">
            {/* Step 1: Choose Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Choose a Category</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select the type of emergency scenario you want to train for.
                </p>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => { setSelectedCategory(val); setSelectedDrillId(null); setSelectedDrill(null); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">All Categories</span>
                        <span className="text-xs text-muted-foreground">({drills.length} drills)</span>
                      </div>
                    </SelectItem>
                    {CATEGORY_LIST.map(cat => {
                      const count = drills.filter(d => d.categoryNumber === cat.num).length;
                      return (
                        <SelectItem key={cat.num} value={String(cat.num)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cat.label}</span>
                            <span className="text-xs text-muted-foreground">— {count} scenarios</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Step 2: Select Drill - Dropdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">2. Select a Drill</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose from the scenarios below or pick one at random.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRandomDrill}>
                    <Shuffle className="h-3.5 w-3.5 mr-1.5" /> Random Drill
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredDrills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No drills found for this category.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Select
                      value={selectedDrillId?.toString() ?? ""}
                      onValueChange={(val) => {
                        setSelectedDrillId(parseInt(val));
                        const d = drills.find(d => d.id === parseInt(val));
                        setSelectedDrill(d ?? null);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a drill scenario..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {filteredDrills.map(drill => (
                          <SelectItem key={drill.id} value={drill.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{drill.title}</span>
                              <span className="text-xs text-muted-foreground">— {drill.category}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Quick scenario list for browsing */}
                    <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg">
                      {filteredDrills.map(drill => (
                        <button
                          key={drill.id}
                          onClick={() => { setSelectedDrillId(drill.id); setSelectedDrill(drill); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-all border-b last:border-b-0 ${
                            selectedDrillId === drill.id
                              ? "bg-primary/5 text-primary font-medium"
                              : "hover:bg-accent/30"
                          }`}
                        >
                          <span>{drill.title}</span>
                          <span className="text-xs text-muted-foreground ml-2">— {drill.scenario.slice(0, 100)}…</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Drill Preview */}
            {selectedDrill && (
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      {selectedDrill.title}: {selectedDrill.category}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedDrillId(null); setSelectedDrill(null); }}
                    >
                      Change
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-slate-50 border px-3 py-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Scenario</p>
                    <p className="text-sm">{selectedDrill.scenario}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border px-2 py-1.5">
                      <span className="font-semibold">Option A: </span>
                      {selectedDrill.step1A.label}
                    </div>
                    <div className="rounded border px-2 py-1.5">
                      <span className="font-semibold">Option B: </span>
                      {selectedDrill.step1B.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Assign */}
            {selectedDrill && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">3. Assign to Personnel</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Send this drill to one person or multiple people at once.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="single">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="single">Single Person</TabsTrigger>
                      <TabsTrigger value="bulk">Multiple People</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="space-y-3 pt-4">
                      <div className="grid gap-3">
                        <div>
                          <Label>Name</Label>
                          <Input
                            placeholder="e.g. John Smith"
                            value={assigneeName}
                            onChange={e => setAssigneeName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Email (optional)</Label>
                          <Input
                            placeholder="e.g. john@example.com"
                            type="email"
                            value={assigneeEmail}
                            onChange={e => setAssigneeEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Due Date (optional)</Label>
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleAssign}
                        disabled={assignMutation.isPending}
                      >
                        {assignMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning…</>
                        ) : (
                          <><UserCheck className="h-4 w-4 mr-2" /> Assign Drill</>
                        )}
                      </Button>
                    </TabsContent>

                    <TabsContent value="bulk" className="space-y-3 pt-4">
                      <div>
                        <Label>Enter names (one per line)</Label>
                        <textarea
                          className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          placeholder={`Jane Doe\nBob Smith\nAlice Johnson`}
                          value={bulkNames}
                          onChange={e => setBulkNames(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Due Date (optional)</Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleBulkAssign}
                        disabled={assignBulkMutation.isPending}
                      >
                        {assignBulkMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning…</>
                        ) : (
                          <><Plus className="h-4 w-4 mr-2" /> Assign to All</>
                        )}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Random Drill Display */}
            {randomDrill && selectedDrillId === randomDrill.id && (
              <Card className="border-2 border-amber-300 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                    <Shuffle className="h-4 w-4" /> Randomly Selected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-900">{randomDrill.scenario}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── TAB 2: Tracking ────────────────────────────────────────────── */}
          <TabsContent value="tracking" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Assigned Drills</h2>
              <Button variant="outline" size="sm" onClick={() => assignmentsQuery.refetch()}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No assignments yet</p>
                <p className="text-sm mt-1">Assign a drill to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <Card key={a.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{a.assignedToName || "Unnamed"}</span>
                            <Badge className={`text-xs ${
                              a.status === "completed" ? "bg-green-100 text-green-700" :
                              a.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                              a.status === "expired" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {a.status?.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.drillTitle} · {a.drillCategory}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── TAB 3: Stats ────────────────────────────────────────────────── */}
          <TabsContent value="stats" className="space-y-4">
            {statsQuery.data ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{statsQuery.data.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Assigned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-green-600">{statsQuery.data.completed}</p>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-amber-600">{statsQuery.data.pending}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pending</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{statsQuery.data.completionRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Completion Rate</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Loading stats…</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

  );
}