# GitHub Project status updates

Use this procedure only for the transition authorized by the invoking skill: implement-issue starts work with **In Progress**; open-pr marks published work **In Review**. This changes the issue item's Project **Status** field, not an issue label, open/closed state, or local plan checkpoint.

1. Resolve the exact issue repository/number and intended Project from explicit developer input, established workflow context, or a single unambiguous issue membership. Read current memberships, project ID, item ID, Status field ID, available option IDs, and current value through `gh` or GitHub's API. Fetch enough pages to establish the result; do not treat a truncated list as complete. If several projects qualify, ask which one to update; never update all by default.
2. Match the actual **In Progress** or **In Review** option. Never invent IDs, create fields/options, or silently substitute a different workflow state. If the issue has no Project item, ask which Project to use and obtain authorization before adding it. A missing option or ambiguous workflow needs developer clarification. Keep the status change pending while continuing independent authorized work.
3. If already at the desired status, report it without another write. Starting implementation accepts To Do; explicitly requested review fixes may move In Review back to In Progress. Opening the completed PR accepts To Do or In Progress. For Done, cancelled, or other unexpected states, ask rather than reopening or overwriting them automatically. Re-read the current value before writing to avoid overwriting a concurrent workflow change.
4. Update only the selected item's Status using resolved IDs:

   ```sh
   gh project item-edit --id ITEM_ID --project-id PROJECT_ID --field-id STATUS_FIELD_ID --single-select-option-id OPTION_ID
   ```

   For field discovery, `gh project field-list PROJECT_NUMBER --owner OWNER --format json` exposes field/option IDs; use the actual project's owner and retrieve all needed fields. Use the developer's authorized account and normal tool permissions. Do not change other fields, membership, labels, issue bodies, or other items as part of a status update.
5. Re-read the item's Status to verify success. On an ambiguous timeout, inspect before retrying; do not repeatedly issue an unverified mutation. If access is unavailable or the update fails, report the exact limitation and required manual change. Continue authorized implementation or retain the successfully created PR; do not claim the board was updated, roll back code, or create a duplicate PR.
6. Record the Project URL, issue item identity, observed status, and outcome in the local plan when present and in the user-facing result. Without a plan, report the result directly. A failed status synchronization is a visible follow-up, not proof that implementation or PR creation failed.
