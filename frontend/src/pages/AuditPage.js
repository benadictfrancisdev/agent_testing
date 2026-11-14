import { useEffect, useState } from "react";
import { fetchAuditLogs } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollText, Filter } from "lucide-react";

const ACTION_COLORS = {
  created: "#10b981",
  updated: "#00f0ff",
  deleted: "#f43f5e",
  uploaded: "#6366f1",
  validated: "#f59e0b",
  registered: "#10b981",
  assigned: "#00f0ff",
  key_configured: "#f59e0b",
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const load = () => {
    setLoading(true);
    const params = { limit: 100 };
    if (filterType !== "all") params.resource_type = filterType;
    fetchAuditLogs(params)
      .then((res) => { setLogs(res.items || []); setTotal(res.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterType]);

  const formatTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  };

  return (
    <div data-testid="audit-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-font text-3xl sm:text-4xl font-bold tracking-tight text-[#f4f4f5]">Audit Logs</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Track all platform activities ({total} records)</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#71717a]" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger data-testid="audit-filter-select" className="w-40 bg-[#121215] border-[#27272a] text-[#f4f4f5] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#121215] border-[#27272a]">
              <SelectItem value="all" className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">All Types</SelectItem>
              <SelectItem value="project" className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">Projects</SelectItem>
              <SelectItem value="document" className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">Documents</SelectItem>
              <SelectItem value="provider" className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">Providers</SelectItem>
              <SelectItem value="model" className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">Models</SelectItem>
              <SelectItem value="model_assignment" className="text-[#f4f4f5] focus:bg-[#27272a] focus:text-[#f4f4f5]">Assignments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-[#121215] border border-[#27272a] rounded-lg overflow-hidden">
        <ScrollArea className="w-full max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="border-[#27272a] hover:bg-transparent">
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Timestamp</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">User</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Action</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Resource</TableHead>
                <TableHead className="text-[#a1a1aa] text-xs mono-font uppercase tracking-wider">Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-[#71717a] py-8">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-[#71717a] py-8">
                  <ScrollText className="w-8 h-8 text-[#27272a] mx-auto mb-2" />
                  No audit logs found
                </TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-[#27272a] hover:bg-[#ffffff]/[0.02]">
                    <TableCell className="mono-font text-[11px] text-[#71717a] whitespace-nowrap">{formatTime(log.created_at)}</TableCell>
                    <TableCell className="text-sm text-[#a1a1aa]">{log.user_name || "System"}</TableCell>
                    <TableCell>
                      <Badge
                        className="text-[10px] border-0 px-2"
                        style={{
                          background: `${ACTION_COLORS[log.action] || "#71717a"}15`,
                          color: ACTION_COLORS[log.action] || "#71717a",
                        }}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-[#27272a] text-[#a1a1aa] capitalize">{log.resource_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-[#f4f4f5] truncate max-w-[200px]">{log.resource_name || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
