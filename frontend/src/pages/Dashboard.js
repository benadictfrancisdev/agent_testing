import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardStats } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderKanban, FileText, Cpu, Database,
  ArrowRight, Activity, Clock, Zap
} from "lucide-react";

const STAT_CARDS = [
  { key: "projects", label: "Projects", icon: FolderKanban, color: "#00f0ff", getVal: (s) => s?.projects?.total ?? 0, getSub: (s) => `${s?.projects?.active ?? 0} active` },
  { key: "documents", label: "Documents", icon: FileText, color: "#10b981", getVal: (s) => s?.documents?.total ?? 0, getSub: () => "Uploaded" },
  { key: "providers", label: "AI Providers", icon: Cpu, color: "#f59e0b", getVal: (s) => s?.providers?.total ?? 0, getSub: (s) => `${s?.providers?.active ?? 0} active` },
  { key: "models", label: "Models", icon: Database, color: "#6366f1", getVal: (s) => s?.models?.total ?? 0, getSub: (s) => `${s?.assignments?.total ?? 0} assigned` },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div>
        <h1 className="heading-font text-3xl sm:text-4xl font-bold tracking-tight text-[#f4f4f5]">
          Dashboard
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Overview of your AI testing platform</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} data-testid={`stat-card-${card.key}`} className="stat-card group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs mono-font uppercase tracking-[0.2em] text-[#a1a1aa] mb-2">{card.label}</p>
                <p className="heading-font text-3xl font-bold text-[#f4f4f5]">
                  {loading ? "—" : card.getVal(stats)}
                </p>
                <p className="text-xs text-[#71717a] mt-1">{loading ? "" : card.getSub(stats)}</p>
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${card.color}15` }}
              >
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-3 bg-[#121215] border border-[#27272a] rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#00f0ff]" />
              <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Recent Projects</h3>
            </div>
            <button
              data-testid="view-all-projects-btn"
              onClick={() => navigate("/projects")}
              className="text-xs text-[#00f0ff] hover:text-[#38f4ff] flex items-center gap-1 transition-colors duration-150"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <ScrollArea className="max-h-[320px]">
            {!loading && stats?.recent_projects?.length === 0 && (
              <div className="p-8 text-center text-[#71717a] text-sm">
                No projects yet. Create your first project to get started.
              </div>
            )}
            {stats?.recent_projects?.map((p) => (
              <div
                key={p.id}
                data-testid={`recent-project-${p.id}`}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex items-center justify-between p-4 border-b border-[#27272a]/50 hover:bg-[#ffffff]/[0.02] cursor-pointer transition-colors duration-150"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`status-dot ${p.status}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#f4f4f5] truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.document_status?.plan_uploaded && <Badge variant="outline" className="text-[10px] border-[#10b981]/30 text-[#10b981]">Plan</Badge>}
                      {p.document_status?.scenario_uploaded && <Badge variant="outline" className="text-[10px] border-[#10b981]/30 text-[#10b981]">Scenario</Badge>}
                      {p.document_status?.functionalities_uploaded && <Badge variant="outline" className="text-[10px] border-[#10b981]/30 text-[#10b981]">Func</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-[#27272a] text-[#a1a1aa]">{p.status}</Badge>
                  <ArrowRight className="w-3.5 h-3.5 text-[#3f3f46]" />
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-[#121215] border border-[#27272a] rounded-lg">
          <div className="flex items-center gap-2 p-4 border-b border-[#27272a]">
            <Activity className="w-4 h-4 text-[#10b981]" />
            <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Recent Activity</h3>
          </div>
          <ScrollArea className="max-h-[320px]">
            {!loading && stats?.recent_activity?.length === 0 && (
              <div className="p-8 text-center text-[#71717a] text-sm">No activity yet.</div>
            )}
            {stats?.recent_activity?.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 px-4 border-b border-[#27272a]/50">
                <div className="mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#3f3f46]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#a1a1aa]">
                    <span className="text-[#f4f4f5] font-medium">{log.user_name || "System"}</span>
                    {" "}{log.action}{" "}
                    <span className="text-[#00f0ff]">{log.resource_type}</span>
                    {log.resource_name && <> — <span className="text-[#e4e4e7]">{log.resource_name}</span></>}
                  </p>
                  <p className="text-[10px] text-[#52525b] mt-0.5 mono-font">{formatTime(log.created_at)}</p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[#f59e0b]" />
          <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "New Project", desc: "Create and configure a testing project", to: "/projects", testId: "quick-new-project" },
            { label: "Add AI Provider", desc: "Connect Anthropic, OpenAI or Gemini", to: "/providers", testId: "quick-add-provider" },
            { label: "Browse Models", desc: "View registered models and capabilities", to: "/models", testId: "quick-browse-models" },
          ].map((action) => (
            <button
              key={action.testId}
              data-testid={action.testId}
              onClick={() => navigate(action.to)}
              className="text-left p-4 rounded-lg border border-[#27272a] hover:border-[#3f3f46] bg-[#09090b] transition-colors duration-150 group"
            >
              <p className="text-sm font-medium text-[#f4f4f5] group-hover:text-[#00f0ff] transition-colors duration-150">{action.label}</p>
              <p className="text-xs text-[#71717a] mt-1">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
