# scripts/calibrate_threshold.py
#
# Run AFTER rebuild_index.py (clean, seed-only index) and AFTER removing the
# BGE instruction prefix from vectorstore.py's search_automations().
#
# test_cases below are hand-paraphrased (not copy-pasted) versions of real
# rows sampled from OmniAgent_Dataset.xlsx, so the "true match" side is a
# genuine paraphrase-of-a-real-automation test, not a made-up concept the
# dataset never contained (see earlier "Professional Email and Meeting
# Scheduler" false lead - that name never existed in the seed data).
#
# Each tuple is (query, expected_match_name, unrelated_name), where
# unrelated_name is a same-domain seed row that should score meaningfully
# lower than the true match.

from app.services.vectorstore import vectorstore
import numpy as np

test_cases = [
    # Corporate
    (
        "Pull together sprint velocity and blockers from every product team into one dashboard for leadership.",
        "Cross-Team Sprint Retrospective Form Aggregator",
        "Corporate Laptop Refresh Cycle Identifier",
    ),
    (
        "Flag it as a security ticket whenever an employee logs in from an unusual location.",
        "Suspicious Endpoint Login Alert",
        "Master Services Agreement (MSA) Formatter",
    ),
    (
        "Check that updated employee bank details match what payroll has on file before processing.",
        "Direct Deposit Detail Matcher",
        "Facilities Security System Pass Allocation Reviewer",
    ),
    (
        "Automatically assemble enterprise contract drafts from client tier, pricing, and liability inputs.",
        "Master Services Agreement (MSA) Formatter",
        "Technical Document Structural Alignment Checker",
    ),

    # Education
    (
        "Keep track of AV equipment student clubs borrow for events so nothing goes missing.",
        "Campus Event Equipment Rental Tracker",
        "Alumni Engagement Giving Campaign Segmenter",
    ),
    (
        "Verify a remote student's photo against their state ID before letting them start a proctored exam.",
        "Student Identity Verification System",
        "Token Economy Reward Balance Spreadsheet",
    ),
    (
        "Generate alt text for the charts and diagrams in our textbooks so they're accessible.",
        "Alt-Text Image Description Compiler",
        "Remedial Study Guide Assembler",
    ),
    (
        "Segment our alumni list by grad year and involvement for a targeted fundraising campaign.",
        "Alumni Engagement Giving Campaign Segmenter",
        "Apprenticeship Employer Site Placement Engine",
    ),

    # Finance
    (
        "Email vendors a breakdown of exactly which invoices a wire transfer covers.",
        "Electronic Remittance Advice Dispatch",
        "Unidentified Deposit Escalate",
    ),
    (
        "Remind us 60 days before a vendor contract with auto-renewal is about to lapse.",
        "Vendor Contract Expiration Watchdog",
        "Utility Bill Auto-Payment",
    ),
    (
        "Scan client portfolios for losing positions we could sell to offset capital gains taxes.",
        "Tax-Loss Harvesting Scanner",
        "Fringe Benefit Tax Evaluator",
    ),
    (
        "Work out the tax owed on non-cash perks like company cars given to employees.",
        "Fringe Benefit Tax Evaluator",
        "Media Royalty Stream Allocator",
    ),
]

true_match_scores = []
unrelated_scores = []

for query, expected_name, unrelated_name in test_cases:
    results = vectorstore.similarity_search_with_score(query, k=10)

    match_score = next(
        (max(0.0, 1 - (float(s) / 2)) for d, s in results if d.metadata["name"] == expected_name),
        None,
    )
    unrelated_score = next(
        (max(0.0, 1 - (float(s) / 2)) for d, s in results if d.metadata["name"] == unrelated_name),
        None,
    )

    top_name = results[0][0].metadata["name"]
    top_score = max(0.0, 1 - (float(results[0][1]) / 2))
    hit = top_name == expected_name

    print(f"{'✓' if hit else '✗'} top={top_score:.3f} {top_name!r}  "
          f"| expected={expected_name!r} score={match_score}  "
          f"| unrelated={unrelated_name!r} score={unrelated_score}")

    if match_score is not None:
        true_match_scores.append(match_score)
    if unrelated_score is not None:
        unrelated_scores.append(unrelated_score)

if true_match_scores:
    print("\nTrue-match score distribution:")
    print("  min:", min(true_match_scores))
    print("  p25:", np.percentile(true_match_scores, 25))
    print("  median:", np.percentile(true_match_scores, 50))
    print("  max:", max(true_match_scores))

if unrelated_scores:
    print("\nUnrelated (same-domain) score distribution:")
    print("  min:", min(unrelated_scores))
    print("  median:", np.percentile(unrelated_scores, 50))
    print("  max:", max(unrelated_scores))

if true_match_scores and unrelated_scores:
    gap = min(true_match_scores) - max(unrelated_scores)
    print(f"\nSeparation gap (min true match - max unrelated): {gap:.3f}")
    if gap > 0:
        print(f"Suggested threshold: {(min(true_match_scores) + max(unrelated_scores)) / 2:.3f}")
    else:
        print("WARNING: distributions overlap - no single threshold cleanly separates them.")
        print("Consider adding a reranking step, or expanding seed phrasing variety.")