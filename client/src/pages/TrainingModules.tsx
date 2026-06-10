import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, ExternalLink, Trash2, RefreshCw,
  Globe, FileText, Calendar, Hash, Cloud, Play,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function TrainingModules() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: modules, refetch, isLoading } = trpc.trainingModule.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const deleteMutation = trpc.trainingModule.delete.useMutation({
    onSuccess: () => { toast.success("Course removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleLaunch = (mod: any) => {
    navigate(`/training/${mod.id}`);
  };

  const canAdmin = user?.role === "admin" || user?.role === "ultra_admin" || user?.role === "super_admin";

  return (

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Training Modules</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            New courses appear on refresh. Click any course to launch it.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {modules?.length ?? 0} course{modules?.length !== 1 ? "s" : ""} available
          </p>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-xs h-8">
            <RefreshCw size={12} className="mr-1" /> Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoading && (!modules || modules.length === 0) && (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">No Training Courses Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Courses are auto-discovered from S3. Make sure your course folders are uploaded under the <code className="bg-muted px-1 rounded">courses/</code> prefix in your S3 bucket.
            </p>
          </div>
        )}

        {!isLoading && modules && modules.length > 0 && (
          <>
            <div className="bg-muted/30 border border-border rounded-lg px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Cloud size={12} />
              New courses appear on refresh.
            </div>
            <div className="grid gap-4">
              {modules.map((mod: any) => {
                const isGlobal = mod.orgId === null;
                return (
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
                            {isGlobal && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                                auto-discovered
                              </Badge>
                            )}
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                          >
                            <Play size={12} />
                            Launch
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
                );
              })}
            </div>
          </>
        )}
      </div>

  );
}
