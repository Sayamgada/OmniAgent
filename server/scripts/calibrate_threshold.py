# scripts/calibrate_threshold.py
from app.services.vectorstore import vectorstore, embeddings
import numpy as np

# Paraphrase pairs you'd WANT to match to a seed row, in your own natural wording
# (not copy-pasted from the dataset — write these the way a real user would type)
test_queries = [
    ("An AI-powered assistant that helps draft professional emails and schedules meetings with clear priorities, streamlining corporate communication and organization.", "Professional Email and Meeting Scheduler"),
    # ...add ~15-20 more (query, expected_matched_automation_name) pairs across
    # Corporate/Education/Finance, covering the range of how differently a user
    # might phrase the same automation
]

true_match_scores = []
for query, expected_name in test_queries:
    search_query = "Represent this sentence for searching relevant passages: " + query
    results = vectorstore.similarity_search_with_score(search_query, k=1)
    doc, raw_distance = results[0]
    similarity = max(0.0, 1 - (float(raw_distance) / 2))
    hit = doc.metadata["name"] == expected_name
    true_match_scores.append(similarity)
    print(f"{'✓' if hit else '✗'} {similarity:.3f}  expected={expected_name!r} got={doc.metadata['name']!r}")

true_match_scores.sort()
print("\nTrue-match score distribution:")
print("  min:", true_match_scores[0])
print("  p25:", np.percentile(true_match_scores, 25))
print("  median:", np.percentile(true_match_scores, 50))
print("  max:", true_match_scores[-1])