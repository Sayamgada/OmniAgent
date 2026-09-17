import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_postgres_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.agent import Agent
from app.schemas.agent import AgentCreateRequest, AgentOut
from app.services.workflow_compiler import compile_ir_to_n8n_workflow, WorkflowCompilerError
from app.services import n8n_client

router = APIRouter(prefix="/agents", tags=["agent-management"])


@router.post("", response_model=AgentOut, status_code=status.HTTP_201_CREATED)
async def create_agent(
    body: AgentCreateRequest,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates an Agent in draft state, compiles its IR schema to an n8n workflow,
    and deploys the workflow to n8n. Updates status to 'compiled' on success or
    'failed' with specific error messages on failure.
    """
    # 1. Create Agent record in 'draft' status
    agent_row = Agent(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        ir_schema=body.ir_schema,
        status="draft",
    )
    db.add(agent_row)
    db.commit()
    db.refresh(agent_row)

    # 2. Compile IR schema to n8n workflow payload
    try:
        compiled_payload = compile_ir_to_n8n_workflow(
            ir_schema=body.ir_schema,
            user_id=current_user.id,
            db_session=db,
        )
    except WorkflowCompilerError as e:
        agent_row.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Compiler error: {str(e)}",
        )
    except Exception as e:
        agent_row.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile workflow: {str(e)}",
        )

    # 3. Deploy workflow to n8n REST API
    try:
        n8n_resp = await n8n_client.create_workflow(compiled_payload)
        workflow_id = n8n_resp.get("id")
        if not workflow_id:
            raise n8n_client.N8nClientError("n8n responded without a workflow id", detail=n8n_resp)

        agent_row.n8n_workflow_id = str(workflow_id)
        agent_row.status = "compiled"
        db.commit()
        db.refresh(agent_row)
    except n8n_client.N8nClientError as e:
        agent_row.status = "failed"
        db.commit()
        detail_msg = f": {e.detail}" if e.detail else ""
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"n8n deployment failed ({e.message}){detail_msg}",
        )
    except Exception as e:
        agent_row.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during workflow deployment: {str(e)}",
        )

    return agent_row


@router.get("", response_model=list[AgentOut])
def list_agents(
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all agents created by the current user.
    # TODO(v1): Add pagination, search query filtering, and tag filtering.
    """
    agents = (
        db.query(Agent)
        .filter(Agent.user_id == current_user.id)
        .order_by(Agent.created_at.desc())
        .all()
    )
    return agents


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(
    agent_id: uuid.UUID,
    db: Session = Depends(get_postgres_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves full details of a specific agent including its IR schema and n8n workflow ID.
    # TODO(v1): Add execution run logs and workflow telemetry fetching.
    """
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == agent_id,
            Agent.user_id == current_user.id,
        )
        .first()
    )
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' not found",
        )
    return agent
