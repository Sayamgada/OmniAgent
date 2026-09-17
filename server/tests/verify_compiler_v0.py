import json
import os
import sys
import uuid

# Ensure 'server' directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.workflow_compiler import compile_ir_to_n8n_workflow

def main():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_ir_email_scheduler.json")
    with open(fixture_path, "r", encoding="utf-8") as f:
        ir_schema = json.load(f)

    # Use dummy user_id and None db_session for isolated testing
    dummy_user_id = uuid.uuid4()
    compiled_output = compile_ir_to_n8n_workflow(
        ir_schema=ir_schema,
        user_id=dummy_user_id,
        db_session=None,
    )

    print("=== COMPILED WORKFLOW JSON ===")
    print(json.dumps(compiled_output, indent=2))
    print("=== END COMPILED WORKFLOW JSON ===")

if __name__ == "__main__":
    main()
