-- Run ONCE in pgAdmin (Query Tool) on the OmniAgent database.
-- Base.metadata.create_all() creates missing tables but never alters existing
-- ones, so the new (user_id, workflow_name) uniqueness must be added by hand.

-- 1) Look for duplicates first. Must return zero rows before step 2 can succeed.
SELECT user_id, workflow_name, count(*) AS copies, array_agg(id) AS agent_ids
FROM agents
GROUP BY user_id, workflow_name
HAVING count(*) > 1;

-- 2) If step 1 returned rows, rename or delete the extras (and their n8n
--    workflows), e.g.:
--    UPDATE agents SET workflow_name = workflow_name || ' (2)' WHERE id = '<id>';

-- 3) Add the constraint.
ALTER TABLE agents
    ADD CONSTRAINT uq_agents_user_workflow_name UNIQUE (user_id, workflow_name);