from app.models.automation_preview_model import automation_preview_collection
from app.services.vectorstore import add_automation


async def store_generated_workflow(workflow: dict, domain:str) -> None:
    """
    Stores a newly generated workflow in MongoDB and indexes it in FAISS.
    """
    print("STORING KEYS:", sorted(workflow.keys()))   # <-- add this
    await automation_preview_collection.insert_one(workflow)

    # Remove MongoDB-generated ObjectId from the in-memory dict
    workflow.pop("_id", None)
    
    add_automation(
        automation_name=workflow["automation_name"],
        automation_description=workflow["automation_description"],
        domain = domain
    )

async def store_generated_workflow_mongo(workflow: dict) -> None:
    await automation_preview_collection.insert_one(workflow)
    workflow.pop("_id", None)
        