import { useEffect, useState } from "react";
import {
  fetchProviders, createProvider, deleteProvider, validateProvider, setProviderKey,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Cpu, Trash2, RefreshCw, Shield, Key,
  MoreVertical, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const PROVIDER_OPTIONS = [
  { value: "anthropic", label: "Anthropic", desc: "Claude models" },
  { value: "openai", label: "OpenAI", desc: "GPT, o-series models" },
  { value: "google", label: "Google", desc: "Gemini models" },
  { value: "custom", label: "Custom", desc: "Compatible endpoint" },
];

const STATUS_ICONS = {
  valid: <CheckCircle2 className="w-4 h-4 text-[#10b981]" />,
  invalid: <XCircle className="w-4 h-4 text-[#f43f5e]" />,
  error: <AlertCircle className="w-4 h-4 text-[#f59e0b]" />,
  not_validated: <AlertCircle className="w-4 h-4 text-[#52525b]" />,
  no_key: <Key className="w-4 h-4 text-[#f59e0b]" />,
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", provider_type: "", display_name: "", endpoint_url: "" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    fetchProviders()
      .then(setProviders)
      .catch(() => toast.error("Failed to load providers"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.provider_type) return;
    setCreating(true);
    try {
      await createProvider(form);
      toast.success("Provider added");
      setShowCreate(false);
      setForm({ name: "", provider_type: "", display_name: "", endpoint_url: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete provider "${name}"? This will also remove all associated models.`)) return;
    try {
      await deleteProvider(id);
      toast.success("Provider deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleValidate = async (id) => {
    try {
      await validateProvider(id);
      toast.success("Validation complete");
      load();
    } catch {
      toast.error("Validation failed");
    }
  };

  const handleSetKey = async (id) => {
    try {
      await setProviderKey(id);
      toast.success("API key marked as configured");
      load();
    } catch {
      toast.error("Failed to set key");
    }
  };

  return (
    <div data-testid="providers-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-font text-3xl sm:text-4xl font-bold tracking-tight text-[#f4f4f5]">AI Providers</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Configure and manage AI model providers</p>
        </div>
        <Button
          data-testid="add-provider-button"
          onClick={() => setShowCreate(true)}
          className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium h-9 px-4"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Provider
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="stat-card animate-pulse h-36" />)}
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 bg-[#121215] border border-[#27272a] rounded-lg">
          <Cpu className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
          <p className="text-[#71717a]">No AI providers configured</p>
          <Button
            data-testid="add-first-provider-button"
            onClick={() => setShowCreate(true)}
            variant="link"
            className="text-[#00f0ff] mt-2"
          >
            Add your first provider
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p) => {
            const vs = p.connection?.validation_status || "not_validated";
            return (
              <div key={p.id} data-testid={`provider-card-${p.id}`} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#09090b] border border-[#27272a] flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#f4f4f5]">{p.display_name || p.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] border-[#27272a] text-[#a1a1aa]">{
                        p.provider_type === "openai" ? "OpenAI" : p.provider_type === "anthropic" ? "Anthropic" : p.provider_type === "google" ? "Google" : p.provider_type
                      }</Badge>
                        <div className={`status-dot ${p.status}`} />
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button data-testid={`provider-menu-${p.id}`} className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#f4f4f5]">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#121215] border-[#27272a]" align="end">
                      <DropdownMenuItem
                        data-testid={`provider-set-key-${p.id}`}
                        onClick={() => handleSetKey(p.id)}
                        className="text-[#f4f4f5]"
                      >
                        <Key className="w-3.5 h-3.5 mr-2" /> Mark Key Configured
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        data-testid={`provider-validate-${p.id}`}
                        onClick={() => handleValidate(p.id)}
                        className="text-[#f4f4f5]"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-2" /> Validate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        data-testid={`provider-delete-${p.id}`}
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-[#f43f5e] focus:text-[#f43f5e] focus:bg-[#f43f5e]/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#71717a]">
                  <span className="flex items-center gap-1">
                    {STATUS_ICONS[vs] || STATUS_ICONS.not_validated}
                    <span className="capitalize">{vs.replace(/_/g, " ")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {p.connection?.api_key_set ? "Key set" : "No key"}
                  </span>
                  <span>{p.models_count || 0} models</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Provider Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#121215] border-[#27272a] text-[#f4f4f5]">
          <DialogHeader>
            <DialogTitle className="heading-font text-lg font-semibold text-[#f4f4f5]">Add AI Provider</DialogTitle>
            <DialogDescription className="text-[#a1a1aa] text-sm">
              Connect a new AI model provider. API keys are stored securely on the server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Provider Type</Label>
              <Select value={form.provider_type} onValueChange={(v) => setForm((f) => ({ ...f, provider_type: v }))}>
                <SelectTrigger data-testid="provider-type-select" className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5]">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-[#121215] border-[#27272a]">
                  {PROVIDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">
                      <div>
                        <span>{o.label}</span>
                        <span className="text-[#71717a] ml-2 text-xs">— {o.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Connection Name</Label>
              <Input
                data-testid="provider-name-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Production Anthropic"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b]"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Display Name (optional)</Label>
              <Input
                data-testid="provider-display-name-input"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Friendly name"
                className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b]"
              />
            </div>
            {form.provider_type === "custom" && (
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Endpoint URL</Label>
                <Input
                  data-testid="provider-endpoint-url-input"
                  value={form.endpoint_url}
                  onChange={(e) => setForm((f) => ({ ...f, endpoint_url: e.target.value }))}
                  placeholder="https://api.example.com/v1"
                  className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] mono-font text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]">Cancel</Button>
            <Button
              data-testid="create-provider-submit-btn"
              onClick={handleCreate}
              disabled={!form.name.trim() || !form.provider_type || creating}
              className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium"
            >
              {creating ? "Adding..." : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
