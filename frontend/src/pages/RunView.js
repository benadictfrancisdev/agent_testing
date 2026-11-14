import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ArrowLeft, Play, CheckCircle2, XCircle, Loader2,
  Clock, Wrench, FileText, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_MAP = {
  queued: { color: "#71717a", icon: Clock, label: "Queued" },
  running: { color: "#f59e0b", icon: Loader2, label: "Running" },
  completed: { color: "#10b981", icon: CheckCircle2, label: "Completed" },
  failed: { color: "#f43f5e", icon: XCircle, label: "Failed" },
};

function ToolCallEntry({ tc, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-l-2 pl-3 py-2" style={{ borderColor: tc.status === "error" ? "#f43f5e" : "#27272a" }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left flex items-center gap-2">
        <Wrench className="w-3 h-3 text-[#00f0ff] shrink-0" />
        <span className="text-xs font-medium text-[#f4f4f5] mono-font">{tc.tool}</span>
        <Badge className={`text-[9px] border-0 ${tc.status === "error" ? "bg-[#f43f5e]/10 text-[#f43f5e]" : "bg-[#10b981]/10 text-[#10b981]"}`}>{tc.status}</Badge>
        <span className="text-[10px] text-[#52525b] ml-auto mono-font">{tc.timestamp?.split("T")[1]?.slice(0, 8)}</span>
        {open ? <ChevronUp className="w-3 h-3 text-[#52525b]" /> : <ChevronDown className="w-3 h-3 text-[#52525b]" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {tc.arguments && Object.keys(tc.arguments).length > 0 && (
            <div className="text-[10px] mono-font text-[#71717a] bg-[#09090b] p-2 rounded border border-[#27272a] overflow-x-auto">
              <span className="text-[#52525b]">args: </span>{JSON.stringify(tc.arguments, null, 1)}
            </div>
          )}
          {tc.result_preview && (
            <div className="text-[10px] mono-font text-[#a1a1aa] bg-[#09090b] p-2 rounded border border-[#27272a] overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
              {tc.result_preview}
            </div>
          )}
          {tc.error && <p className="text-[10px] text-[#f43f5e] mono-font">{tc.error}</p>}
        </div>
      )}
    </div>
  );
}

function ReportView({ report }) {
  if (!report) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Passed", val: report.tests_passed || 0, color: "#10b981" },
          { label: "Failed", val: report.tests_failed || 0, color: "#f43f5e" },
          { label: "Blocked", val: report.tests_blocked || 0, color: "#f59e0b" },
          { label: "Files Changed", val: report.files_changed || 0, color: "#00f0ff" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded border border-[#27272a] bg-[#09090b] text-center">
            <p className="heading-font text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] text-[#71717a] uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
      {report.summary && <p className="text-sm text-[#a1a1aa] leading-relaxed">{report.summary}</p>}
      {report.critical_defects?.length > 0 && (
        <div className="p-3 rounded bg-[#f43f5e]/5 border border-[#f43f5e]/20">
          <p className="text-xs font-medium text-[#f43f5e] mb-1">Critical Defects</p>
          {report.critical_defects.map((d, i) => <p key={i} className="text-xs text-[#a1a1aa]">- {d}</p>)}
        </div>
      )}
      {report.findings?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[#f4f4f5] mb-2">Findings ({report.findings.length})</h4>
          <div className="space-y-2">
            {report.findings.map((f, i) => (
              <div key={i} className="p-3 rounded border border-[#27272a] bg-[#09090b]">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-[9px] border-0 ${f.status === "PASSED" ? "bg-[#10b981]/10 text-[#10b981]" : f.status === "FAILED" ? "bg-[#f43f5e]/10 text-[#f43f5e]" : "bg-[#f59e0b]/10 text-[#f59e0b]"}`}>{f.status}</Badge>
                  <span className="text-xs font-medium text-[#f4f4f5]">{f.test_id || `T-${i + 1}`}</span>
                  {f.category && <Badge variant="outline" className="text-[9px] border-[#27272a] text-[#71717a]">{f.category}</Badge>}
                  {f.severity && <Badge variant="outline" className="text-[9px] border-[#27272a] text-[#71717a]">{f.severity}</Badge>}
                </div>
                <p className="text-xs text-[#a1a1aa]">{f.description}</p>
                {f.expected && <p className="text-[10px] text-[#52525b] mt-1"><span className="text-[#71717a]">Expected:</span> {f.expected}</p>}
                {f.actual && <p className="text-[10px] text-[#52525b]"><span className="text-[#71717a]">Actual:</span> {f.actual}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RunView() {
  const { runId } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadRun = useCallback(async () => {
    if (!runId || runId === "new") return;
    try {
      const { data } = await axios.get(`${API}/runs/${runId}`);
      setRun(data);
    } catch {}
    setLoading(false);
  }, [runId]);

  useEffect(() => {
    if (runId === "new") { setLoading(false); return; }
    loadRun();
    const interval = setInterval(() => {
      if (run?.status === "running" || run?.status === "queued") loadRun();
    }, 3000);
    return () => clearInterval(interval);
  }, [runId, run?.status, loadRun]);

  const startRun = async () => {
    if (!projectId) { toast.error("No project selected"); return; }
    setStarting(true);
    try {
      const { data } = await axios.post(`${API}/runs`, { project_id: projectId });
      toast.success("Run started");
      navigate(`/runs/${data.id}?project=${projectId}`, { replace: true });
      setRun(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start run");
    } finally {
      setStarting(false);
    }
  };

  if (runId === "new") {
    return (
      <div data-testid="run-new-page" className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#a1a1aa] hover:text-[#f4f4f5] text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center py-16 bg-[#121215] border border-[#27272a] rounded-lg">
          <Play className="w-12 h-12 text-[#00f0ff] mx-auto mb-4" />
          <h2 className="heading-font text-xl font-bold text-[#f4f4f5] mb-2">Start Agent Run</h2>
          <p className="text-sm text-[#71717a] mb-6 max-w-md mx-auto">
            The agent will analyze the repository, read requirement documents, test the application, and produce a report.
          </p>
          <Button data-testid="start-run-btn" onClick={startRun} disabled={starting || !projectId}
            className="bg-[#00f0ff] text-[#09090b] hover:bg-[#38f4ff] font-medium h-10 px-6">
            {starting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</> : <><Play className="w-4 h-4 mr-2" /> Start Run</>}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="animate-pulse h-96 bg-[#121215] rounded-lg" />;
  if (!run) return <div className="text-center py-16 text-[#71717a]">Run not found</div>;

  const st = STATUS_MAP[run.status] || STATUS_MAP.queued;
  const StIcon = st.icon;

  return (
    <div data-testid="run-detail-page" className="space-y-6">
      <div className="flex items-center gap-4">
        <button data-testid="back-from-run" onClick={() => navigate(`/projects/${run.project_id}`)}
          className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="heading-font text-xl font-bold text-[#f4f4f5]">Run — {run.project_name || "Unknown"}</h1>
            <Badge className="text-[10px] border-0" style={{ background: `${st.color}15`, color: st.color }}>
              <StIcon className={`w-3 h-3 mr-1 ${run.status === "running" ? "animate-spin" : ""}`} />
              {st.label}
            </Badge>
          </div>
          <p className="text-xs text-[#52525b] mono-font mt-0.5">{run.id}</p>
        </div>
      </div>

      {run.token_usage && (
        <div className="flex gap-4 text-xs mono-font text-[#71717a]">
          <span>Input: {run.token_usage.input_tokens?.toLocaleString()} tokens</span>
          <span>Output: {run.token_usage.output_tokens?.toLocaleString()} tokens</span>
          <span>Model: {run.token_usage.model}</span>
          {run.steps_taken && <span>Steps: {run.steps_taken}</span>}
        </div>
      )}

      {run.error && (
        <div className="p-3 rounded-lg bg-[#f43f5e]/5 border border-[#f43f5e]/20">
          <p className="text-xs text-[#f43f5e] mono-font">{run.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Tool Call Log */}
        <div className="lg:col-span-2 bg-[#121215] border border-[#27272a] rounded-lg">
          <div className="flex items-center gap-2 p-4 border-b border-[#27272a]">
            <Wrench className="w-4 h-4 text-[#00f0ff]" />
            <h3 className="text-sm font-semibold text-[#f4f4f5]">Tool Calls ({run.tool_calls?.length || 0})</h3>
          </div>
          <ScrollArea className="max-h-[600px] p-3">
            {(!run.tool_calls || run.tool_calls.length === 0) ? (
              <p className="text-xs text-[#52525b] text-center py-4">{run.status === "running" ? "Waiting for agent..." : "No tool calls"}</p>
            ) : (
              <div className="space-y-1">
                {run.tool_calls.map((tc, i) => <ToolCallEntry key={i} tc={tc} index={i} />)}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Report / Agent Output */}
        <div className="lg:col-span-3 bg-[#121215] border border-[#27272a] rounded-lg">
          <div className="flex items-center gap-2 p-4 border-b border-[#27272a]">
            <FileText className="w-4 h-4 text-[#10b981]" />
            <h3 className="text-sm font-semibold text-[#f4f4f5]">
              {run.report ? "Test Report" : "Agent Output"}
            </h3>
          </div>
          <div className="p-4">
            {run.report ? (
              <ReportView report={run.report} />
            ) : run.agent_final_message ? (
              <p className="text-sm text-[#a1a1aa] whitespace-pre-wrap">{run.agent_final_message}</p>
            ) : run.status === "running" ? (
              <div className="flex items-center gap-2 text-[#f59e0b] text-sm py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Agent is working...
              </div>
            ) : (
              <p className="text-xs text-[#52525b] text-center py-8">No output yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
