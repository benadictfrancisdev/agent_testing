import { useEffect, useState } from "react";
import {
  fetchModels, createModel, deleteModel, fetchProviders,
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Plus, Database, Trash2, Check, X,
} from "lucide-react";

const CAPABILITY_LABELS = {
  text_generation: "Text Gen",
  tool_calling: "Tool Calling",
  vision: "Vision",
  streaming: "Streaming",
  prompt_caching: "Caching",
  structured_output: "Structured",
  audio_input: "Audio In",
  audio_output: "Audio Out",
  video_input: "Video In",
};

export default function ModelsPage() {
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    provider_id: "", provider_type: "", model_id: "", display_name: "",
    context_window: 0, max_output_tokens: 0,
    capabilities: {
      text_generation: true, tool_calling: false, vision: false, streaming: false,
      prompt_caching: false, structured_output: false, audio_input: false, audio_output: false, video_input: false,
    },
    pricing: { input_per_1m: 0, output_per_1m: 0, cached_input_per_1m: 0, cache_creation_per_1m: 0 },
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([fetchModels(), fetchProviders()]);
      setModels(m);
      setProviders(p);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleProviderSelect = (pid) => {
    const p = providers.find((x) => x.id === pid);
    setForm((f) => ({ ...f, provider_id: pid, provider_type: p?.provider_type || "" }));
  };

  const handleCreate = async () => {
    if (!form.provider_id || !form.model_id || !form.display_name) return;
    setCreating(true);
    try {
      await createModel(form);
      toast.success("Model registered");
      setShowCreate(false);
      setForm({
        provider_id: "", provider_type: "", model_id: "", display_name: "",
        context_window: 0, max_output_tokens: 0,
        capabilities: {
          text_generation: true, tool_calling: false, vision: false, streaming: false,
          prompt_caching: false, structured_output: false, audio_input: false, audio_output: false, video_input: false,
        },
        pricing: { input_per_1m: 0, output_per_1m: 0, cached_input_per_1m: 0, cache_creation_per_1m: 0 },
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to register model");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete model "${name}"?`)) return;
    try {
      await deleteModel(id);
      toast.success("Model removed");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const providerName = (pid) => providers.find((p) => p.id === pid)?.display_name || providers.find((p) => p.id === pid)?.name || "—";
  const formatTokens = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n);

  return (
    <div data-testid="models-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-font text-3xl sm:text-4xl font-bold tracking-tight text-[#f4f4f5]">Model Registry</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Registered AI models and their capabilities</p>
        </div>
        <Button
          data-testid="add-model-button"
          onClick={() => setShowCreate(true)}
          disabled={providers.length === 0}
          className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium h-9 px-4"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Register Model
        </Button>
      </div>

      {providers.length === 0 && !loading && (
        <div className="p-4 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
          Add an AI provider first before registering models.
        </div>
      )}

      <div className="bg-[#121215] border border-[#27272a] rounded-lg overflow-hidden">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-[#27272a] hover:bg-transparent">
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Model</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Provider</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Context</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Capabilities</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider text-right">$/1M In</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider text-right">$/1M Out</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-[#71717a] py-8">Loading...</TableCell></TableRow>
              ) : models.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-[#71717a] py-8">
                  <Database className="w-8 h-8 text-[#27272a] mx-auto mb-2" />
                  No models registered
                </TableCell></TableRow>
              ) : (
                models.map((m) => (
                  <TableRow key={m.id} data-testid={`model-row-${m.id}`} className="border-[#27272a] hover:bg-[#ffffff]/[0.02]">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-[#f4f4f5]">{m.display_name}</p>
                        <p className="text-[10px] mono-font text-[#52525b]">{m.model_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-[#27272a] text-[#a1a1aa] capitalize">{m.provider_type}</Badge>
                    </TableCell>
                    <TableCell className="mono-font text-xs text-[#a1a1aa]">{formatTokens(m.context_window)}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(m.capabilities || {}).filter(([, v]) => v).map(([k]) => (
                            <Tooltip key={k}>
                              <TooltipTrigger>
                                <Badge className="bg-[#00f0ff]/10 text-[#00f0ff] border-0 text-[9px] px-1.5 py-0">
                                  {CAPABILITY_LABELS[k] || k}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#09090b] border-[#27272a] text-xs">{k}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right mono-font text-xs text-[#a1a1aa]">${m.pricing?.input_per_1m?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell className="text-right mono-font text-xs text-[#a1a1aa]">${m.pricing?.output_per_1m?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>
                      <button
                        data-testid={`model-delete-${m.id}`}
                        onClick={() => handleDelete(m.id, m.display_name)}
                        className="p-1.5 rounded hover:bg-[#f43f5e]/10 text-[#71717a] hover:text-[#f43f5e]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Register Model Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#121215] border-[#27272a] text-[#f4f4f5] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-font text-lg font-semibold text-[#f4f4f5]">Register Model</DialogTitle>
            <DialogDescription className="text-[#a1a1aa] text-sm">Add a model to the registry with its capabilities and pricing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Provider</Label>
              <Select value={form.provider_id} onValueChange={handleProviderSelect}>
                <SelectTrigger data-testid="model-provider-select" className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5]">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-[#121215] border-[#27272a]">
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">
                      {p.display_name || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Model ID</Label>
                <Input
                  data-testid="model-id-input"
                  value={form.model_id}
                  onChange={(e) => setForm((f) => ({ ...f, model_id: e.target.value }))}
                  placeholder="claude-sonnet-4-20250514"
                  className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] mono-font text-sm"
                />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Display Name</Label>
                <Input
                  data-testid="model-display-name-input"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="Claude Sonnet 4"
                  className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Context Window</Label>
                <Input
                  type="number"
                  value={form.context_window}
                  onChange={(e) => setForm((f) => ({ ...f, context_window: parseInt(e.target.value) || 0 }))}
                  className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] mono-font"
                />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Max Output Tokens</Label>
                <Input
                  type="number"
                  value={form.max_output_tokens}
                  onChange={(e) => setForm((f) => ({ ...f, max_output_tokens: parseInt(e.target.value) || 0 }))}
                  className="mt-1.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] mono-font"
                />
              </div>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-2 block">Capabilities</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CAPABILITY_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-2 rounded border border-[#27272a] bg-[#09090b] cursor-pointer">
                    <Switch
                      checked={form.capabilities[key]}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, capabilities: { ...f.capabilities, [key]: v } }))}
                      className="scale-75"
                    />
                    <span className="text-xs text-[#a1a1aa]">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-2 block">Pricing ($ per 1M tokens)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-[#71717a]">Input</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.pricing.input_per_1m}
                    onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, input_per_1m: parseFloat(e.target.value) || 0 } }))}
                    className="mt-0.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] mono-font text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-[#71717a]">Output</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.pricing.output_per_1m}
                    onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, output_per_1m: parseFloat(e.target.value) || 0 } }))}
                    className="mt-0.5 bg-[#09090b] border-[#27272a] text-[#f4f4f5] mono-font text-sm h-8"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]">Cancel</Button>
            <Button
              data-testid="register-model-submit-btn"
              onClick={handleCreate}
              disabled={!form.provider_id || !form.model_id || !form.display_name || creating}
              className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium"
            >
              {creating ? "Registering..." : "Register Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
