import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchProject, updateProject, updateRepoConfig, updateAppConfig,
  fetchDocuments, uploadDocument, deleteDocument, fetchDocument,
} from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, GitBranch, Globe, FileText, Upload,
  Check, X, Eye, Trash2, Hash, BookOpen,
  Settings, AlertTriangle,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DOC_TYPES = [
  { key: "plan", label: "plan.md", desc: "Functional requirements and business rules", field: "plan_uploaded" },
  { key: "scenario", label: "scenario.md", desc: "Expected behaviour, positive/negative scenarios", field: "scenario_uploaded" },
  { key: "functionalities", label: "functionalities-scenario.md", desc: "Failure scenarios, recovery, rollback", field: "functionalities_uploaded" },
];

function DocumentUploader({ projectId, docType, isUploaded, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (accepted) => {
    if (accepted.length === 0) return;
    const file = accepted[0];
    if (!file.name.endsWith(".md")) {
      toast.error("Only .md files are accepted");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument(projectId, docType, file);
      toast.success(`${file.name} uploaded successfully`);
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [projectId, docType, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/markdown": [".md"] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      data-testid={`document-upload-${docType}`}
      className={`upload-zone ${isDragActive ? "drag-active" : ""} ${isUploaded ? "has-file" : ""}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <p className="text-sm text-[#a1a1aa]">Uploading...</p>
      ) : isUploaded ? (
        <div className="flex items-center justify-center gap-2 text-[#10b981]">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Uploaded — Drop to replace</span>
        </div>
      ) : (
        <div>
          <Upload className="w-8 h-8 text-[#3f3f46] mx-auto mb-2" />
          <p className="text-sm text-[#a1a1aa]">
            {isDragActive ? "Drop the file here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-[#52525b] mt-1">Only .md files accepted</p>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [appUrl, setAppUrl] = useState("");
  const [appEnv, setAppEnv] = useState("staging");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState("");
  const [savingRepo, setSavingRepo] = useState(false);
  const [savingApp, setSavingApp] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const p = await fetchProject(id);
      setProject(p);
      setRepoUrl(p.repository?.url || "");
      setRepoBranch(p.repository?.branch || "main");
      setAppUrl(p.application?.url || "");
      setAppEnv(p.application?.environment || "staging");
    } catch {
      toast.error("Failed to load project");
    }
  }, [id]);

  const loadDocs = useCallback(async () => {
    try {
      const d = await fetchDocuments(id);
      setDocuments(d);
    } catch {
      console.error("Failed to load documents");
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadProject(), loadDocs()]).finally(() => setLoading(false));
  }, [loadProject, loadDocs]);

  const handleSaveRepo = async () => {
    setSavingRepo(true);
    try {
      const updated = await updateRepoConfig(id, { url: repoUrl, branch: repoBranch });
      setProject(updated);
      toast.success("Repository config saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingRepo(false);
    }
  };

  const handleSaveApp = async () => {
    setSavingApp(true);
    try {
      const updated = await updateAppConfig(id, { url: appUrl, environment: appEnv });
      setProject(updated);
      toast.success("Application config saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingApp(false);
    }
  };

  const handlePreview = async (docId) => {
    try {
      const doc = await fetchDocument(docId);
      setPreviewDoc(doc);
      setPreviewContent(doc.content);
    } catch {
      toast.error("Failed to load document");
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocument(docId);
      toast.success("Document deleted");
      loadDocs();
      loadProject();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-[#121215] rounded-lg" />;
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-[#71717a]">Project not found</p>
        <Button variant="link" className="text-[#00f0ff] mt-2" onClick={() => navigate("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  const ds = project.document_status || {};
  const allDocsUploaded = ds.plan_uploaded && ds.scenario_uploaded && ds.functionalities_uploaded;

  return (
    <div data-testid="project-detail-page" className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          data-testid="back-to-projects-btn"
          onClick={() => navigate("/projects")}
          className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="heading-font text-2xl sm:text-3xl font-bold tracking-tight text-[#f4f4f5] truncate">{project.name}</h1>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${project.status === "active" ? "border-[#10b981]/30 text-[#10b981]" : "border-[#27272a] text-[#71717a]"}`}
            >
              {project.status}
            </Badge>
          </div>
          {project.description && <p className="text-sm text-[#a1a1aa] mt-0.5 truncate">{project.description}</p>}
        </div>
      </div>

      {!allDocsUploaded && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/20">
          <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />
          <p className="text-xs text-[#f59e0b]">
            Upload all 3 required documents (plan.md, scenario.md, functionalities-scenario.md) to enable full testing.
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#121215] border border-[#27272a] p-0.5">
          {["overview", "documents", "repository", "application"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              data-testid={`project-tab-${t}`}
              className="data-[state=active]:bg-[#27272a] data-[state=active]:text-[#f4f4f5] text-[#a1a1aa] text-sm capitalize"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <p className="text-xs mono-font uppercase tracking-[0.2em] text-[#a1a1aa] mb-1">Documents</p>
              <p className="heading-font text-2xl font-bold text-[#f4f4f5]">{[ds.plan_uploaded, ds.scenario_uploaded, ds.functionalities_uploaded].filter(Boolean).length}/3</p>
            </div>
            <div className="stat-card">
              <p className="text-xs mono-font uppercase tracking-[0.2em] text-[#a1a1aa] mb-1">Repository</p>
              <p className="text-sm font-medium text-[#f4f4f5]">{project.repository?.connected ? "Connected" : "Not configured"}</p>
              {project.repository?.connected && <p className="text-xs text-[#71717a] mono-font mt-1">{project.repository.branch}</p>}
            </div>
            <div className="stat-card">
              <p className="text-xs mono-font uppercase tracking-[0.2em] text-[#a1a1aa] mb-1">Application</p>
              <p className="text-sm font-medium text-[#f4f4f5]">{project.application?.url ? "Configured" : "Not configured"}</p>
              {project.application?.url && <p className="text-xs text-[#71717a] mono-font mt-1 truncate">{project.application.environment}</p>}
            </div>
          </div>
          {project.repository?.connected && (
            <div className="bg-[#121215] border border-[#27272a] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4 text-[#10b981]" />
                <span className="text-sm font-medium text-[#f4f4f5]">Repository</span>
              </div>
              <p className="text-xs mono-font text-[#a1a1aa] truncate">{project.repository.url}</p>
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-6">
          {DOC_TYPES.map((dt) => {
            const docObj = documents.find((d) => d.doc_type === dt.key);
            const isUp = ds[dt.field];
            return (
              <div key={dt.key} className="bg-[#121215] border border-[#27272a] rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#00f0ff]" />
                      <h3 className="text-sm font-semibold text-[#f4f4f5]">{dt.label}</h3>
                      {isUp && <Badge className="bg-[#10b981]/10 text-[#10b981] border-0 text-[10px]">Uploaded</Badge>}
                    </div>
                    <p className="text-xs text-[#71717a] mt-0.5 ml-6">{dt.desc}</p>
                  </div>
                  {docObj && (
                    <div className="flex items-center gap-1">
                      <button
                        data-testid={`doc-preview-${dt.key}`}
                        onClick={() => handlePreview(docObj.id)}
                        className="p-1.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5]"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        data-testid={`doc-delete-${dt.key}`}
                        onClick={() => handleDeleteDoc(docObj.id)}
                        className="p-1.5 rounded hover:bg-[#f43f5e]/10 text-[#71717a] hover:text-[#f43f5e]"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <DocumentUploader
                  projectId={id}
                  docType={dt.key}
                  isUploaded={isUp}
                  onUploaded={() => { loadDocs(); loadProject(); }}
                />
                {docObj && (
                  <div className="mt-3 flex items-center gap-4 text-[10px] mono-font text-[#52525b]">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> v{docObj.version}</span>
                    <span>{docObj.metadata?.word_count || 0} words</span>
                    <span>{docObj.metadata?.sections?.length || 0} sections</span>
                    <span>{docObj.metadata?.requirements_extracted || 0} requirements</span>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* Repository Tab */}
        <TabsContent value="repository" className="mt-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5 max-w-2xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-[#00f0ff]" />
              <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Repository Configuration</h3>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Repository URL</Label>
              <Input
                data-testid="repo-url-input"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] mono-font text-sm"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Branch</Label>
              <Input
                data-testid="repo-branch-input"
                value={repoBranch}
                onChange={(e) => setRepoBranch(e.target.value)}
                placeholder="main"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] mono-font text-sm"
              />
            </div>
            <Button
              data-testid="save-repo-config-btn"
              onClick={handleSaveRepo}
              disabled={savingRepo}
              className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium"
            >
              {savingRepo ? "Saving..." : "Save Repository Config"}
            </Button>
          </div>
        </TabsContent>

        {/* Application Tab */}
        <TabsContent value="application" className="mt-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5 max-w-2xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-[#00f0ff]" />
              <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Application Configuration</h3>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Application URL</Label>
              <Input
                data-testid="app-url-input"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://staging.myapp.com"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] mono-font text-sm"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Environment</Label>
              <Input
                data-testid="app-env-input"
                value={appEnv}
                onChange={(e) => setAppEnv(e.target.value)}
                placeholder="staging"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b]"
              />
            </div>
            <Button
              data-testid="save-app-config-btn"
              onClick={handleSaveApp}
              disabled={savingApp}
              className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium"
            >
              {savingApp ? "Saving..." : "Save Application Config"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="bg-[#121215] border-[#27272a] text-[#f4f4f5] max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="heading-font text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00f0ff]" />
              {previewDoc?.filename}
              <Badge variant="outline" className="text-[10px] border-[#27272a] text-[#a1a1aa] ml-2">v{previewDoc?.version}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
