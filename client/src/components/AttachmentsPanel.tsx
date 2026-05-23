import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Upload, Trash2, Sparkles, FileText, Image, MapPin, X, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "floor_plan", label: "Floor Plan", icon: MapPin, color: "bg-blue-100 text-blue-800" },
  { value: "exterior_photo", label: "Exterior Photo", icon: Image, color: "bg-green-100 text-green-800" },
  { value: "interior_photo", label: "Interior Photo", icon: Image, color: "bg-purple-100 text-purple-800" },
  { value: "document", label: "Document", icon: FileText, color: "bg-orange-100 text-orange-800" },
  { value: "other", label: "Other", icon: FileText, color: "bg-slate-100 text-slate-700" },
] as const;

type CategoryValue = typeof CATEGORIES[number]["value"];

interface Props {
  auditId: number;
  facilityId: number;
}

export function AttachmentsPanel({ auditId, facilityId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("exterior_photo");
  const [caption, setCaption] = useState("");
  const [expandedAnalysis, setExpandedAnalysis] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: attachments = [], isLoading } = trpc.attachment.list.useQuery({ auditId });

  const deleteMutation = trpc.attachment.delete.useMutation({
    onSuccess: () => {
      utils.attachment.list.invalidate({ auditId });
      toast.success("Attachment deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const analyzeMutation = trpc.attachment.analyze.useMutation({
    onSuccess: (data) => {
      utils.attachment.list.invalidate({ auditId });
      toast.success("AI analysis complete");
    },
    onError: (e) => toast.error(`Analysis failed: ${e.message}`),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        failCount++;
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("auditId", String(auditId));
      formData.append("facilityId", String(facilityId));
      formData.append("category", selectedCategory);
      formData.append("caption", caption);

      try {
        const res = await fetch("/api/upload/attachment", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }
        successCount++;
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
        failCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
      utils.attachment.list.invalidate({ auditId });
      setCaption("");
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = (attachments as any[]).filter((a) => a.category === cat.value);
    return acc;
  }, {} as Record<string, any[]>);

  const totalCount = (attachments as any[]).length;

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="p-4 border-dashed border-2 border-slate-200 bg-slate-50/50">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Upload Files</span>
            <span className="text-xs text-slate-400 ml-auto">JPG, PNG, PDF, DOCX · max 20MB</span>
          </div>

          {/* Category selector */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  selectedCategory === cat.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Caption */}
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional caption (e.g. 'Main entrance', 'Ground floor plan')"
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          {/* Upload button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> Uploading…</>
            ) : (
              <><Upload size={14} className="mr-2" /> Choose Files</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </Card>

      {/* Attachments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading attachments…
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Image size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No files uploaded yet</p>
          <p className="text-xs mt-1">Upload floor plans, interior/exterior photos, or documents to enhance the EAP</p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const items = grouped[cat.value] || [];
            if (items.length === 0) return null;
            const Icon = cat.icon;
            return (
              <div key={cat.value}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{cat.label}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <AttachmentCard
                      key={item.id}
                      item={item}
                      catColor={cat.color}
                      expandedAnalysis={expandedAnalysis}
                      setExpandedAnalysis={setExpandedAnalysis}
                      onDelete={() => deleteMutation.mutate({ id: item.id })}
                      onAnalyze={() => analyzeMutation.mutate({ id: item.id })}
                      isDeleting={deleteMutation.isPending && deleteMutation.variables?.id === item.id}
                      isAnalyzing={analyzeMutation.isPending && analyzeMutation.variables?.id === item.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttachmentCard({
  item, catColor, expandedAnalysis, setExpandedAnalysis,
  onDelete, onAnalyze, isDeleting, isAnalyzing,
}: {
  item: any;
  catColor: string;
  expandedAnalysis: number | null;
  setExpandedAnalysis: (id: number | null) => void;
  onDelete: () => void;
  onAnalyze: () => void;
  isDeleting: boolean;
  isAnalyzing: boolean;
}) {
  const isImage = item.mimeType?.startsWith("image/");
  const isExpanded = expandedAnalysis === item.id;

  return (
    <Card className="p-3 bg-white">
      <div className="flex items-start gap-3">
        {/* Thumbnail or icon */}
        {isImage ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <img
              src={item.url}
              alt={item.caption || item.filename}
              className="w-14 h-14 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <div className="w-14 h-14 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 flex-shrink-0">
            <FileText size={20} className="text-slate-400" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-800 truncate">{item.filename}</p>
          {item.caption && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.caption}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            {item.fileSize && (
              <span className="text-[10px] text-slate-400">
                {item.fileSize < 1024 * 1024
                  ? `${Math.round(item.fileSize / 1024)}KB`
                  : `${(item.fileSize / (1024 * 1024)).toFixed(1)}MB`}
              </span>
            )}
            {item.aiAnalyzedAt && (
              <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                <Sparkles size={9} /> Analyzed
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isImage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-blue-600"
              title="AI Analysis"
              disabled={isAnalyzing}
              onClick={onAnalyze}
            >
              {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-red-600"
            title="Delete"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </Button>
        </div>
      </div>

      {/* AI Analysis */}
      {item.aiAnalysis && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <button
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => setExpandedAnalysis(isExpanded ? null : item.id)}
          >
            <Sparkles size={10} />
            AI Safety Observations
            {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {isExpanded && (
            <div className="mt-1.5 text-[11px] text-slate-600 bg-blue-50 rounded-lg p-2.5 leading-relaxed whitespace-pre-wrap">
              {item.aiAnalysis}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
