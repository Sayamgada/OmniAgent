import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "../ui/button";
import type { CreateWorkflowResponse } from "../../lib/agentsApi";

interface CreateResultProps {
  result: CreateWorkflowResponse;
  retrying: boolean;
  onRetry: () => void;
  onCreateAnother: () => void;
}

export const CreateResult = ({
  result,
  retrying,
  onRetry,
  onCreateAnother,
}: CreateResultProps) => {
  const agent = result.agent;
  if (!agent) return null;

  const isActive = agent.status === "active";

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      {isActive ? (
        <CheckCircle2 className="size-12 text-secondary" />
      ) : (
        <AlertTriangle className="size-12 text-amber-500" />
      )}

      <div>
        <h3 className="text-lg font-semibold">
          {isActive
            ? "Your agent is live"
            : "Agent created, but not active yet"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {agent.workflow_name} · n8n workflow {agent.n8n_workflow_id}
        </p>
      </div>

      {!isActive && (
        <div className="max-w-xl space-y-3">
          <p className="text-sm text-muted-foreground">
            The workflow was saved in n8n, but activating it failed. Fix the
            cause below and retry. This will not create a second workflow.
          </p>
          {agent.last_error && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-left text-xs text-amber-500">
              {agent.last_error}
            </pre>
          )}
          <Button onClick={onRetry} disabled={retrying}>
            {retrying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Retrying...
              </>
            ) : (
              "Retry activation"
            )}
          </Button>
        </div>
      )}

      {result.warnings.length > 0 && (
        <ul className="max-w-xl list-disc space-y-1 pl-5 text-left text-xs text-muted-foreground">
          {result.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <Button variant="outline" onClick={onCreateAnother}>
        Create another agent
      </Button>
    </div>
  );
};
