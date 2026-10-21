# Evaluation summary

Runs: 60 (20 prompts). 'Clean' = generated with no COMPLIANCE MISS and no unresolved missing branch. 'Compiled' = deployable with placeholder params and dummy credentials; steps needing an operation pick count as not compiled (see 'Needs pick').

| Domain | Generated | Clean | Resolved | Compiled | Needs pick | Expectations met |
|---|---|---|---|---|---|---|
| Corporate | 7% (2/27) | 4% (1/27) | 7% (2/27) | 4% (1/27) | 4% (1/27) | 100% (2/2) |
| Education | 0% (0/18) | 0% (0/18) | 0% (0/18) | 0% (0/18) | 0% (0/18) | - |
| Finance | 0% (0/12) | 0% (0/12) | 0% (0/12) | 0% (0/12) | 0% (0/12) | - |
| **All** | 4% (2/57) | 2% (1/57) | 4% (2/57) | 2% (1/57) | 2% (1/57) | 100% (2/2) |

## Scope control (out-of-scope prompts that must be refused)

- X1 run 1: refused
- X1 run 2: refused
- X1 run 3: refused

Compliance: 1 run(s) with a COMPLIANCE MISS or an unresolved missing branch; the corrective retry fired in 0 run(s).
