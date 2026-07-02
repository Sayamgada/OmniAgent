import pandas as pd
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

DATA_PATH = r"D:\Projects\OmniAgent\OmniAgent_Dataset.xlsx"
INDEX_PATH = r"D:\Projects\OmniAgent\server\faiss_index"

def load_sheet(path, sheet_name):
    df = pd.read_excel(path, sheet_name=sheet_name)
    docs = []
    for i, row in df.iterrows():
        page_content = f"Automation Name: {row['Automation Name']}\nAutomation Description: {row['Automation Description']}"
        docs.append(
            Document(
                page_content=page_content,
                metadata={"row_index": i, "source": "OmniAgent_Dataset.xlsx", "category": sheet_name}
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

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    vectorstore = FAISS.from_documents(all_docs, embeddings)
    vectorstore.save_local(INDEX_PATH)
    print(f"FAISS index saved to {INDEX_PATH}")

if __name__ == "__main__":
    main()