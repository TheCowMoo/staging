import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, ExternalLink, Plus, Trash2, RefreshCw,
  Globe, FileText, Calendar, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TrainingModules() {
  const { user } = useAuth();
  const { data: memberships = [] } = trpc.org.myMemberships.useQuery();
  const orgId = memberships[0]?.orgId ?? 0;
  const [showRegister, setShowRegister] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [launchPath, setLaunchPath] = useState("story.html");
  const [storagePrefix, setStoragePrefix] = useState("");

  const { data: modules, refetch, isLoading } = trpc.trainingModule.list.useQuery(
    { orgId: orgId ?? 0 },
    { enabled: !!orgId }
  );

  const registerMutation = trpc.trainingModule.register.useMutation({
    onSuccess: () => {
      toast.success("Course registered successfully");
      setCourseTitle("");
      setLaunchPath("story.html");
      setStoragePrefix("");
      setShowRegister(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.trainingModule.delete.useMutation({
    onSuccess: () => { toast.success("Course removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleRegister = () => {
    if (!courseTitle.trim()) { toast.error("Please enter a course title"); return; }
    if (!launchPath.trim()) { toast.error("Please enter a launch path"); return; }
    if (!orgId) { toast.error("No organization selected"); return; }

    registerMutation.mutate({
      orgId,
      courseTitle: courseTitle.trim(),
      launchPath: launchPath.trim(),
      storagePrefix: storagePrefix.trim() || undefined,
    });
  };

  const launchMutation = trpc.trainingModule.getLaunchUrl.useMutation();

  const handleLaunch = (mod: any) => {
    launchMutation.mutate(
      { id: mod.id },
      {
        onSuccess: (data) => window.open(data.url, "_blank", "noopener,noreferrer"),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const canAdmin = user?.role === "admin" || user?.role === "ultra_admin" || user?.role === "super_admin";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Training Modules</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Access your Articulate Storyline training courses. Click any course to launch it in a new tab.
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {modules?.length ?? 0} course{modules?.length !== 1 ? "s" : ""} available
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-xs h-8">
              <RefreshCw size={12} className="mr-1" /> Refresh
            </Button>
            {canAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowRegister(!showRegister)} className="text-xs h-8">
                <Plus size={12} className="mr-1" /> Register Course
              </Button>
            )}
          </div>
        </div>

        {/* Register existing S3 course form */}
        {showRegister && canAdmin && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus size={14} /> Register Existing S3 Course
            </h2>
            <p className="text-xs text-muted-foreground">
              Add a course that's already on your S3 bucket so it appears in the listing below.
            </p>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Course Title</label>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g. Active Threat Response"
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">S3 Storage Prefix</label>
              <Input
                value={storagePrefix}
                onChange={(e) => setStoragePrefix(e.target.value)}
                placeholder="e.g. courses/Active Threat Response 5_24_26"
                className="text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                The folder path on S3 where the course files are stored.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Launch File</label>
              <Input
                value={launchPath}
                onChange={(e) => setLaunchPath(e.target.value)}
                placeholder="story.html"
                className="text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Relative path to the main HTML file (usually <code className="bg-muted px-1 rounded">story.html</code> for Articulate).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                size="sm"
              >
                {registerMutation.isPending ? "Registering..." : "Register Course"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowRegister(false); setCourseTitle(""); setLaunchPath("story.html"); setStoragePrefix(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!modules || modules.length === 0) && (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">No Training Modules Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload an Articulate Storyline course via the admin panel, or use the "Register Course" button above to add an existing S3 course.
            </p>
          </div>
        )}

        {/* Course listing */}
        {!isLoading && modules && modules.length > 0 && (
          <div className="grid gap-4">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={16} className="text-primary flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {mod.courseTitle}
                        </h3>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          {mod.playerType?.replace(/_/g, " ") || "Articulate"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        {mod.storagePrefix && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Globe size={10} />
                            <code className="bg-muted/50 px-1 rounded text-[10px]">{mod.storagePrefix}</code>
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <FileText size={10} />
                          {mod.launchPath}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(mod.createdAt).toLocaleDateString()}
                        </span>
                        {mod.sourceFileName && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Hash size={10} />
                            {mod.sourceFileName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleLaunch(mod)}
                        disabled={launchMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <ExternalLink size={12} />
                        {launchMutation.isPending ? "Loading..." : "Launch"}
                      </button>
                      {canAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remove "${mod.courseTitle}"?`)) {
                              deleteMutation.mutate({ id: mod.id });
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={11} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
