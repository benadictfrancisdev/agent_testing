import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProjects, createProject, deleteProject } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Search, FolderKanban, ArrowRight,
  GitBranch, Globe, FileText, Trash2, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    fetchProjects({ search: search || undefined })
      .then(setProjects)
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject({ name: newName.trim(), description: newDesc.trim() });
      toast.success("Project created");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      load();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete project "${name}"?`)) return;
    try {
      await deleteProject(id);
      toast.success("Project deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const docCount = (ds) => [ds?.plan_uploaded, ds?.scenario_uploaded, ds?.functionalities_uploaded].filter(Boolean).length;

  return (
    <div data-testid="projects-list-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-font text-3xl sm:text-4xl font-bold tracking-tight text-[#f4f4f5]">Projects</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Manage your testing projects</p>
        </div>
        <Button
          data-testid="create-project-button"
          onClick={() => setShowCreate(true)}
          className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium h-9 px-4"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
          <Input
            data-testid="project-search-input"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#121215] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] h-9"
          />
        </div>
        <Button type="submit" variant="outline" className="border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] h-9">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card animate-pulse h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-[#121215] border border-[#27272a] rounded-lg">
          <FolderKanban className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
          <p className="text-[#71717a]">No projects yet</p>
          <Button
            data-testid="create-first-project-button"
            onClick={() => setShowCreate(true)}
            variant="link"
            className="text-[#00f0ff] mt-2"
          >
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              data-testid={`project-card-${p.id}`}
              className="stat-card group cursor-pointer hover:border-[#3f3f46]"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`status-dot ${p.status}`} />
                  <h3 className="text-sm font-semibold text-[#f4f4f5] truncate">{p.name}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button data-testid={`project-menu-${p.id}`} className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#f4f4f5]">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#121215] border-[#27272a]" align="end">
                    <DropdownMenuItem
                      data-testid={`project-delete-${p.id}`}
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                      className="text-[#f43f5e] focus:text-[#f43f5e] focus:bg-[#f43f5e]/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {p.description && <p className="text-xs text-[#71717a] mb-3 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-3 text-[10px] text-[#52525b]">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {docCount(p.document_status)}/3 docs
                </span>
                {p.repository?.connected && (
                  <span className="flex items-center gap-1 text-[#10b981]">
                    <GitBranch className="w-3 h-3" /> {p.repository.branch}
                  </span>
                )}
                {p.application?.url && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Configured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#27272a]/50">
                {p.tags?.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] border-[#27272a] text-[#71717a]">{t}</Badge>
                ))}
                <ArrowRight className="w-3.5 h-3.5 text-[#3f3f46] ml-auto group-hover:text-[#00f0ff] transition-colors duration-150" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#121215] border-[#27272a] text-[#f4f4f5]">
          <DialogHeader>
            <DialogTitle className="heading-font text-lg font-semibold text-[#f4f4f5]">Create Project</DialogTitle>
            <DialogDescription className="text-[#a1a1aa] text-sm">
              Set up a new testing project. You can configure repository, documents and AI providers later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Project Name</Label>
              <Input
                data-testid="create-project-name-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. E-Commerce Platform QA"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b]"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Description</Label>
              <Input
                data-testid="create-project-desc-input"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of the project"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]">
              Cancel
            </Button>
            <Button
              data-testid="create-project-submit-btn"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium"
            >
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
