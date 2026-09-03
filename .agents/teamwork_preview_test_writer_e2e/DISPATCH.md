## 2026-09-03T15:51:48Z

You are teamwork_preview_test_writer_e2e.
Your working directory is: /Users/Farooq/Desktop/game/.agents/teamwork_preview_test_writer_e2e
Your parent conversation ID is: b2ee6bb6-9070-4fe4-8271-5f255aa4fca8

MANDATORY FIRST STEP: Read the original user request at:
/Users/Farooq/Desktop/game/.agents/ORIGINAL_REQUEST.md

Read the project specification at:
/Users/Farooq/Desktop/game/.agents/orchestrator/PROJECT.md

Read the explorer survey reports:
/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_1/handoff.md
/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_2/handoff.md
/Users/Farooq/Desktop/game/.agents/teamwork_preview_explorer_survey_3/handoff.md

EXCLUSIVE FILE OWNERSHIP:
You own:
- tests/ directory (create tests/e2e/ or tests/unit/ as appropriate)
- /Users/Farooq/Desktop/game/TEST_INFRA.md and /Users/Farooq/Desktop/game/TEST_READY.md
- You MUST NOT modify game source files in src/.

Your mission:
Design and implement the complete E2E Testing Track for the project following the 4-tier methodology:
1. Test Architecture & Harness:
   Set up an automated test runner (using Node.js, tsx, vitest, or lightweight runner already configured/runnable in the project) that can run in headless/CI mode and exit with code 0 on pass or code 1 on failure.
2. Build 4-Tier Opaque-Box Test Suites covering all requirements (R1, R2, R3, R4):
   - Tier 1 - Feature Coverage (>=5 tests per feature: physics contact resolution, step-up prevention, jump apex bounds, standard leap reachability, launch pad trigger & trajectory, camera occlusion, respawn velocity reset, build & bundle cleanliness, shader compilation/parameters).
   - Tier 2 - Boundary & Corner Cases (>=5 tests per feature: exact limit jumps Δy = 1.60m, horizontal gaps 2.60m, terminal fall velocity -35m/s ground collision, edge landings, zero velocity respawn).
   - Tier 3 - Cross-Feature Combinations: Pairwise interactions (jump + jump pad, jump pad + camera shake, respawn + moving platform, high fall + edge landing, dash + jump).
   - Tier 4 - Real-World Application Scenarios: Multi-platform climbing traversal simulations across Zones 1 to 6, full death fall -> safe respawn recovery loop.
3. Test Execution & Verification:
   Run the test runner to verify it executes cleanly.
4. Output Documentation:
   - Create /Users/Farooq/Desktop/game/TEST_INFRA.md documenting the test architecture, inventory, and coverage.
   - When the test runner and suites are in place, create /Users/Farooq/Desktop/game/TEST_READY.md detailing the command to run tests and coverage summary.
   - Write your 5-component handoff report to: /Users/Farooq/Desktop/game/.agents/teamwork_preview_test_writer_e2e/handoff.md.
   - Send a completion message to your parent (b2ee6bb6-9070-4fe4-8271-5f255aa4fca8).
