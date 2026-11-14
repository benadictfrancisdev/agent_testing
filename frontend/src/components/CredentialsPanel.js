import { useEffect, useState, useCallback } from "react";
import { fetchTestAccounts, addTestAccount, removeTestAccount } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Key, User, Shield, Info, ChevronDown, ChevronUp } from "lucide-react";

export default function CredentialsPanel({ projectId }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [form, setForm] = useState({ label: "", role: "", username: "", password: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchTestAccounts(projectId);
      setAccounts(data);
    } catch {}
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.label || !form.username) return;
    setSaving(true);
    try {
      await addTestAccount(projectId, form);
      toast.success("Test account added — password encrypted");
      setForm({ label: "", role: "", username: "", password: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId, label) => {
    if (!window.confirm(`Delete test account "${label}"?`)) return;
    try {
      await removeTestAccount(projectId, accountId);
      toast.success("Account removed");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-[#121215] border border-[#27272a] rounded-lg">
        <button data-testid="staging-docs-toggle" onClick={() => setShowDocs(!showDocs)} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-sm font-medium text-[#f4f4f5]">Staging Environment Setup Guide</span>
          </div>
          {showDocs ? <ChevronUp className="w-4 h-4 text-[#71717a]" /> : <ChevronDown className="w-4 h-4 text-[#71717a]" />}
        </button>
        {showDocs && (
          <div className="px-4 pb-4 text-xs text-[#a1a1aa] space-y-2 border-t border-[#27272a] pt-3">
            <p><strong className="text-[#f4f4f5]">1.</strong> Create a staging branch in your repo. Vercel provides a free per-branch preview URL.</p>
            <p><strong className="text-[#f4f4f5]">2.</strong> Point the staging deploy at a <strong className="text-[#f4f4f5]">separate staging database</strong> — the agent submits forms and creates records. Never point at production data.</p>
            <p><strong className="text-[#f4f4f5]">3.</strong> Seed at least one test user with a non-admin role (e.g. <code className="mono-font text-[#00f0ff] bg-[#09090b] px-1 rounded">qa-bot@yourorg.com</code>) so permission boundaries are tested.</p>
            <p><strong className="text-[#f4f4f5]">4.</strong> Paste the staging URL and test credentials below. The vault encrypts passwords on save — the agent receives only a reference at run time, never the raw password.</p>
          </div>
        )}
      </div>

      <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Test Accounts</h3>
            <Badge variant="outline" className="text-[10px] border-[#27272a] text-[#71717a]">{accounts.length}</Badge>
          </div>
          <Button data-testid="add-test-account-btn" onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium h-8 px-3 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add Account
          </Button>
        </div>

        {showAdd && (
          <div className="mb-4 p-4 rounded-lg border border-[#27272a] bg-[#09090b] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Label</Label>
                <Input data-testid="test-account-label" value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Admin User" className="mt-1 bg-[#121215] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] h-8 text-sm" />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Role</Label>
                <Input data-testid="test-account-role" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. admin, user" className="mt-1 bg-[#121215] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Username / Email</Label>
                <Input data-testid="test-account-username" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="qa-bot@yourorg.com" className="mt-1 bg-[#121215] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] h-8 text-sm mono-font" />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs uppercase tracking-wider">Password</Label>
                <Input data-testid="test-account-password" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Encrypted on save" className="mt-1 bg-[#121215] border-[#27272a] text-[#f4f4f5] placeholder:text-[#52525b] h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button data-testid="save-test-account-btn" onClick={handleAdd} disabled={!form.label || !form.username || saving} size="sm" className="bg-[#10b981] text-white hover:bg-[#059669] h-8 text-xs">{saving ? "Saving..." : "Save Account"}</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)} size="sm" className="border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] h-8 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-[#71717a]">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-6 text-[#52525b] text-sm">
            <Shield className="w-8 h-8 text-[#27272a] mx-auto mb-2" />
            No test accounts configured yet.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} data-testid={`test-account-${a.id}`} className="flex items-center justify-between p-3 rounded border border-[#27272a] bg-[#09090b]">
                <div className="flex items-center gap-3 min-w-0">
                  <User className="w-4 h-4 text-[#71717a] shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#f4f4f5]">{a.label}</span>
                      {a.role && <Badge variant="outline" className="text-[10px] border-[#27272a] text-[#a1a1aa]">{a.role}</Badge>}
                    </div>
                    <p className="text-xs mono-font text-[#71717a] truncate">{a.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.has_password && <Badge className="bg-[#10b981]/10 text-[#10b981] border-0 text-[9px]">Encrypted</Badge>}
                  <button data-testid={`delete-account-${a.id}`} onClick={() => handleDelete(a.id, a.label)} className="p-1 rounded hover:bg-[#f43f5e]/10 text-[#71717a] hover:text-[#f43f5e]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
