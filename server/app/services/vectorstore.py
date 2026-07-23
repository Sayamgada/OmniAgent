# app/services/vectorstore.py
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from app.core.config import settings
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_core.documents import Document


embeddings = HuggingFaceEmbeddings(
    model_name=settings.EMBEDDING_MODEL,
    encode_kwargs={"normalize_embeddings": True}
)

vectorstore = FAISS.load_local(
    settings.FAISS_INDEX_PATH,
    embeddings,
    distance_strategy=DistanceStrategy.COSINE,
    allow_dangerous_deserialization=True
)

def search_automations(query: str, category: str | None = None, top_k: int = 5):

    search_query = (
        "Represent this sentence for searching relevant passages: "
        + query
    )

    if category:
        results = vectorstore.similarity_search_with_score(
            query=search_query,
            k=top_k,
            filter={"category": category}
        )
    else:
        results = vectorstore.similarity_search_with_relevance_scores(
            query=search_query,
            k=top_k
        )

    response = []

    for doc, distance in results:
        similarity = max(0.0, 1 - (float(distance) / 2))

        response.append({
            "automation_name": doc.metadata["name"],
            "description": doc.metadata["description"],
            "metadata": {
                "category": doc.metadata["category"],
                "row_index": doc.metadata["row_index"],
                "source": doc.metadata["source"]
            },
            "similarity_score": round(similarity, 4)
        })

    return response


def add_automation(
    automation_name: str,
    automation_description: str,
) -> None:
    """
    Adds a newly generated automation to the FAISS index
    and persists it to disk.
    """

    document = Document(
        page_content=automation_description,
        metadata={
            "name": automation_name,
            "description": automation_description,
            "row_index": -1,
            "source": "Generated",
            "category": "Generated",
        },
    )

    vectorstore.add_documents([document])

    vectorstore.save_local(settings.FAISS_INDEX_PATH)