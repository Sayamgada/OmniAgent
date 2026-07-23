import pandas as pd
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy

DATA_PATH = r"D:\Projects\OmniAgent\OmniAgent_Dataset.xlsx"
INDEX_PATH = r"D:\Projects\OmniAgent\server\faiss_index"

def load_sheet(path, sheet_name):
    df = pd.read_excel(path, sheet_name=sheet_name)
    docs = []
    for i, row in df.iterrows():
        docs.append(
            Document(
                page_content=row["Automation Description"],   # Only description is embedded
                metadata={
                    "name": row["Automation Name"],
                    "description": row["Automation Description"],
                    "row_index": i,
                    "source": "OmniAgent_Dataset.xlsx",
                    "category": sheet_name
                }
            )
        )
    return docs

def main():
    all_docs = (
        load_sheet(DATA_PATH, "Finance")
        + load_sheet(DATA_PATH, "Education")
        + load_sheet(DATA_PATH, "Corporate")
    )
    print(f"Loaded {len(all_docs)} documents")

    embeddings = HuggingFaceEmbeddings(
        model_name="BAAI/bge-base-en-v1.5",
        encode_kwargs={"normalize_embeddings": True}
    )

    vectorstore = FAISS.from_documents(
        all_docs,
        embeddings,
        distance_strategy=DistanceStrategy.COSINE
    )
    vectorstore.save_local(INDEX_PATH)
    print(f"FAISS index saved to {INDEX_PATH}")

if __name__ == "__main__":
    main()