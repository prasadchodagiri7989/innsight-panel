import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi, ActivityLog } from "@/lib/api";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  X,
  User,
  Shield,
  Clock,
  Globe,
  Settings,
  Database,
  ArrowRight,
} from "lucide-react";

export default function ActivityHistory() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "15",
      };
      if (search) params.search = search;
      if (selectedModule) params.module = selectedModule;
      if (selectedRole) params.role = selectedRole;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const data = await adminApi.getActivityLogs(params);
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      setPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error("Failed to load activity logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedModule, selectedRole, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedModule("");
    setSelectedRole("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleExport = (format: "csv" | "pdf") => {
    const params: Record<string, string> = { format };
    if (search) params.search = search;
    if (selectedModule) params.module = selectedModule;
    if (selectedRole) params.role = selectedRole;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;

    const exportUrl = adminApi.exportActivityLogsUrl(params);
    window.open(exportUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity History & Audit Trail"
        subtitle="Track administrative actions and config updates."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("csv")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export CSV
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <FileText className="h-4 w-4 text-red-500" /> Export PDF
            </button>
          </div>
        }
      />

      {/* Filter panel */}
      <div className="panel p-5">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user, booking..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">All Modules</option>
              <option value="Bookings">Bookings</option>
              <option value="Pricing">Pricing</option>
              <option value="Rooms">Rooms</option>
              <option value="Staff">Staff</option>
              <option value="Check-In">Check-In</option>
              <option value="Check-Out">Check-Out</option>
              <option value="Payments">Payments</option>
              <option value="Settings">Settings</option>
              <option value="Authentication">Authentication</option>
            </select>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="receptionist">Receptionist</option>
              <option value="user">Guest</option>
              <option value="system">System</option>
            </select>

            {/* Date From */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            />

            {/* Date To */}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3.5 font-medium">Date/Time</th>
                <th className="px-5 py-3.5 font-medium">User</th>
                <th className="px-5 py-3.5 font-medium">Role</th>
                <th className="px-5 py-3.5 font-medium">Module</th>
                <th className="px-5 py-3.5 font-medium">Action</th>
                <th className="px-5 py-3.5 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td className="px-5 py-4 font-semibold whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-deep capitalize">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {log.module}
                    </td>
                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Total {total} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs font-semibold flex items-center px-2">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Slide-out Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedLog(null)}
          />
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-background p-6 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  Activity Details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Audit log identifier: {selectedLog._id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {/* Core fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">User</p>
                    <p className="text-sm font-semibold">{selectedLog.userName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Role</p>
                    <p className="text-sm font-semibold capitalize">{selectedLog.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Module</p>
                    <p className="text-sm font-semibold">{selectedLog.module}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Timestamp</p>
                    <p className="text-sm font-semibold">
                      {new Date(selectedLog.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action & Description */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Action</p>
                <p className="text-sm font-semibold">{selectedLog.action}</p>
              </div>

              <div className="space-y-1 bg-muted/40 rounded-xl p-3.5 border border-border/40">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Description</p>
                <p className="text-sm leading-relaxed">{selectedLog.description}</p>
              </div>

              {/* System info */}
              <div className="grid grid-cols-1 gap-4 border-t border-border/60 pt-4">
                {selectedLog.ipAddress && (
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>IP Address: <strong>{selectedLog.ipAddress}</strong></span>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div className="flex items-start gap-2 text-xs">
                    <Settings className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground line-clamp-2">
                      User Agent: <span className="text-foreground">{selectedLog.userAgent}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Data Diff */}
              {(selectedLog.previousData || selectedLog.newData) && (
                <div className="border-t border-border/60 pt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Change History (Data Diff)
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    {selectedLog.previousData && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-red-500 uppercase">Previous Value</span>
                        <pre className="rounded-xl border border-red-500/10 bg-red-500/5 p-3.5 font-mono text-xs overflow-x-auto max-h-48 text-red-600 dark:text-red-400">
                          {JSON.stringify(selectedLog.previousData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.previousData && selectedLog.newData && (
                      <div className="flex justify-center py-1">
                        <div className="rounded-full border border-border p-1 bg-background text-muted-foreground">
                          <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                        </div>
                      </div>
                    )}
                    {selectedLog.newData && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">New Value</span>
                        <pre className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3.5 font-mono text-xs overflow-x-auto max-h-48 text-emerald-600 dark:text-emerald-400">
                          {JSON.stringify(selectedLog.newData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
