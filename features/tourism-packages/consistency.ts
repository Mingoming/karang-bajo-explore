export type CreateConsistencyResult =
  "complete" | "compensated" | "compensation-failed";

export type UpdateConsistencyResult =
  | "complete"
  | "sync-failed-restored"
  | "sync-failed-restore-failed"
  | "parent-failed-restored"
  | "parent-failed-restore-failed";

export async function runCreateRelationConsistency(
  writeRelations: () => Promise<boolean>,
  compensateParent: () => Promise<boolean>,
): Promise<CreateConsistencyResult> {
  if (await writeRelations()) return "complete";
  return (await compensateParent()) ? "compensated" : "compensation-failed";
}

export async function runUpdateConsistency(
  synchronizeRelations: () => Promise<boolean>,
  restoreRelations: () => Promise<boolean>,
  updateParent: () => Promise<boolean>,
): Promise<UpdateConsistencyResult> {
  if (!(await synchronizeRelations())) {
    return (await restoreRelations())
      ? "sync-failed-restored"
      : "sync-failed-restore-failed";
  }
  if (!(await updateParent())) {
    return (await restoreRelations())
      ? "parent-failed-restored"
      : "parent-failed-restore-failed";
  }
  return "complete";
}
