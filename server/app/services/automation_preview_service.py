from datetime import datetime

from app.models.automation_preview_model import automation_preview_collection


class AutomationPreviewService:

    @staticmethod
    async def create(data: dict):
        data["created_at"] = datetime.utcnow()

        result = await automation_preview_collection.insert_one(data)

        return str(result.inserted_id)

    @staticmethod
    async def get_by_name(name: str):
        return await automation_preview_collection.find_one(
            {"automation_name": name}
        )

    @staticmethod
    async def get_by_id(object_id):
        return await automation_preview_collection.find_one(
            {"_id": object_id}
        )

    @staticmethod
    async def delete(name: str):
        return await automation_preview_collection.delete_one(
            {"automation_name": name}
        )

    @staticmethod
    async def update_preview(name: str, preview_json: dict):
        return await automation_preview_collection.update_one(
            {"automation_name": name},
            {
                "$set": {
                    "preview_json": preview_json
                }
            }
        )