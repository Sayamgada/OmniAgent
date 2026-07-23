from app.database import mongo_db
from app.services.vectorstore import add_automation

automation_preview_collection = mongo_db["AutomationPreview"]


async def store_generated_workflow(workflow: dict) -> None:
    """
    Stores a newly generated workflow in MongoDB and indexes it in FAISS.
    """

    await automation_preview_collection.insert_one(workflow)

    # Remove MongoDB-generated ObjectId from the in-memory dict
    workflow.pop("_id", None)
    
    add_automation(
        automation_name=workflow["automation_name"],
        automation_description=workflow["automation_description"],
    )