import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  History,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import {
  activateAgent,
  deactivateAgent,
  deleteAgent,
  listAgentRuns,
  listAgents,
  type Agent,
  type AgentRun,
} from "../../lib/agentsApi";
import { cn } from "../../lib/utils";

const errMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Something went wrong";

// Unknown statuses fall back to a neutral badge (see STATUS_FALLBACK).
const STATUS_META: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "border-secondary/40 bg-secondary/10 text-secondary",
  },
  created: {
    label: "Created",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  inactive: {
    label: "Inactive",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
  failed: {
    label: "Failed",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  missing: {
    label: "Missing in n8n",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  },
};
const STATUS_FALLBACK = STATUS_META.inactive;
const STATUS_FILTERS = ["active", "created", "inactive", "failed", "missing"];

const RUN_OK = new Set(["success"]);
const RUN_BAD = new Set(["error", "crashed", "failed"]);

const formatDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // unexpected format: show it raw
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  });
};

type RunsState = {
  loading: boolean;
  error: string | null;
  runs: AgentRun[] | null;
};

export default function MyAgents() {
  const { token } = useAuth();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");

  const [busyId, setBusyId] = useState<string | null>(null); // activate/deactivate in flight
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [openRunsId, setOpenRunsId] = useState<string | null>(null);
  const [runsById, setRunsById] = useState<Record<string, RunsState>>({});

  // refresh=true re-syncs each status from n8n (slower), so it is opt-in.
  const load = async (refresh: boolean) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setAgents(await listAgents(token, refresh));
      setLoadError(null);
      if (refresh) toast.success("Statuses refreshed from n8n");
    } catch (err) {
      const msg = errMessage(err);
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const patchAgent = (id: string, patch: Partial<Agent>) =>
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );

  const filtered = useMemo(() => {
    let result = [...agents];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (a) =>
          a.workflow_name.toLowerCase().includes(q) ||
          a.automation_name.toLowerCase().includes(q),
      );
    }
    if (status !== "all") result = result.filter((a) => a.status === status);
    if (sort === "name") {
      result.sort((a, b) => a.workflow_name.localeCompare(b.workflow_name));
    } else {
      const t = (a: Agent) => Date.parse(a.created_at ?? "") || 0;
      result.sort((a, b) => t(b) - t(a));
    }
    return result;
  }, [agents, search, status, sort]);

  const toggleActive = async (agent: Agent) => {
    setBusyId(agent.id);
    try {
      if (agent.status === "active") {
        patchAgent(agent.id, await deactivateAgent(token, agent.id));
        toast.success("Agent deactivated");
      } else {
        // /activate's response shape is only guaranteed to be an AgentSummary,
        // so merge it over the row instead of replacing the row.
        patchAgent(agent.id, await activateAgent(token, agent.id));
        toast.success("Agent activated");
      }
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAgent(token, deleteTarget.id);
      setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      if (openRunsId === deleteTarget.id) setOpenRunsId(null);
      toast.success(`Deleted "${deleteTarget.workflow_name}"`);
      setDeleteTarget(null);
    } catch (err) {
      // 502 = n8n refused; the row is intentionally kept server-side.
      toast.error(errMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const loadRuns = async (id: string) => {
    setRunsById((prev) => ({
      ...prev,
      [id]: { loading: true, error: null, runs: prev[id]?.runs ?? null },
    }));
    try {
      const runs = await listAgentRuns(token, id, 10);
      setRunsById((prev) => ({
        ...prev,
        [id]: { loading: false, error: null, runs },
      }));
    } catch (err) {
      setRunsById((prev) => ({
        ...prev,
        [id]: { loading: false, error: errMessage(err), runs: null },
      }));
    }
  };

  const toggleRuns = (id: string) => {
    if (openRunsId === id) {
      setOpenRunsId(null);
      return;
    }
    setOpenRunsId(id);
    void loadRuns(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage the agents you have deployed to n8n
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-border/60"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button asChild className="gap-2">
            <Link to="/new-agent">
              <Plus className="h-4 w-4" />
              Create Agent
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass-card flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border/50 bg-muted/30 pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px] border-border/50 bg-muted/30">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[130px] border-border/50 bg-muted/30">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading agents…</p>
      ) : loadError && agents.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void load(false)}
          >
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-16 text-center"
        >
          <p className="text-lg font-medium">
            {agents.length === 0 ? "No agents yet" : "No agents found"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {agents.length === 0
              ? "Create your first agent to see it here"
              : "Try adjusting your search or status filter"}
          </p>
          {agents.length === 0 && (
            <Button asChild className="mt-4">
              <Link to="/new-agent">Create Agent</Link>
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden rounded-2xl"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((agent) => {
                const meta = STATUS_META[agent.status] ?? STATUS_FALLBACK;
                const rowBusy = busyId === agent.id;
                const runs = runsById[agent.id];
                const isActive = agent.status === "active";
                // A workflow that no longer exists in n8n can only be deleted.
                const canToggle = agent.status !== "missing";

                return (
                  <Fragment key={agent.id}>
                    <TableRow>
                      <TableCell>
                        <p className="font-medium">{agent.workflow_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.automation_name}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", meta.className)}
                        >
                          {agent.status in STATUS_META
                            ? meta.label
                            : agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(agent.created_at)}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        {agent.last_error ? (
                          <span
                            className="block truncate text-xs text-destructive"
                            title={agent.last_error}
                          >
                            {agent.last_error}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canToggle && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => void toggleActive(agent)}
                              disabled={rowBusy}
                            >
                              {rowBusy ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : isActive ? (
                                <Pause className="size-3.5" />
                              ) : (
                                <Play className="size-3.5" />
                              )}
                              {isActive ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={
                              openRunsId === agent.id ? "secondary" : "ghost"
                            }
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => toggleRuns(agent.id)}
                          >
                            <History className="size-3.5" />
                            Runs
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(agent)}
                            disabled={rowBusy}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {openRunsId === agent.id && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={5}>
                          <RunsPanel
                            state={runs}
                            onRetry={() => void loadRuns(agent.id)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.workflow_name}” will be stopped and its n8n
              workflow deleted. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open until the request settles
                void confirmDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RunsPanel({
  state,
  onRetry,
}: {
  state: RunsState | undefined;
  onRetry: () => void;
}) {
  if (!state || (state.loading && !state.runs)) {
    return <p className="py-2 text-sm text-muted-foreground">Loading runs…</p>;
  }
  if (state.error) {
    return (
      <div className="flex items-center gap-3 py-2">
        <p className="text-sm text-destructive">{state.error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (!state.runs || state.runs.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">No runs yet.</p>;
  }
  return (
    <ul className="divide-y divide-border/40 text-sm">
      {state.runs.map((run) => {
        const s = run.status ?? "unknown";
        return (
          <li
            key={run.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2"
          >
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                RUN_OK.has(s) &&
                  "border-secondary/40 bg-secondary/10 text-secondary",
                RUN_BAD.has(s) &&
                  "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              {s}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {run.mode ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              Started {formatDate(run.started_at, true)}
            </span>
            <span className="text-xs text-muted-foreground">
              Stopped {formatDate(run.stopped_at, true)}
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              #{run.id}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
