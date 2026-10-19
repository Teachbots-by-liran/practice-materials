"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isTeacherToken, TEACHER_COOKIE } from "@/lib/server/auth";
import {
  createClass,
  createGroup,
  deleteGroup,
  removeStudent,
  resolveFlags,
  saveAssignment,
  setFocusWords,
  setHidden,
  updateStudent,
} from "@/lib/server/repo";
import { getStore, type Store } from "@/lib/server/store";
import type { AssignMode, AssignTarget, ClassRoom } from "@/lib/vocab/classroom";
import { addDays, dayKey } from "@/lib/vocab/dates";
import type { Pace } from "@/lib/vocab/types";

async function teacherStore(): Promise<Store> {
  const jar = await cookies();
  if (!isTeacherToken(jar.get(TEACHER_COOKIE)?.value)) redirect("/teacher/login");
  const store = getStore();
  if (!store) throw new Error("Classes aren't set up: add the Supabase keys.");
  return store;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const PACES: Pace[] = ["steady", "normal", "boost"];

export async function createClassAction(f: FormData) {
  const store = await teacherStore();
  const c = await createClass(store, str(f, "name"));
  redirect(`/teacher/class/${c.id}`);
}

export async function archiveClassAction(f: FormData) {
  const store = await teacherStore();
  const c = await store.get<ClassRoom>("classes", str(f, "classId"));
  if (c) await store.put("classes", { ...c, archived: !c.archived });
  revalidatePath("/teacher");
}

export async function createGroupAction(f: FormData) {
  const store = await teacherStore();
  const classId = str(f, "classId");
  await createGroup(store, classId, str(f, "name"));
  revalidatePath(`/teacher/class/${classId}`);
}

export async function deleteGroupAction(f: FormData) {
  const store = await teacherStore();
  const classId = str(f, "classId");
  await deleteGroup(store, classId, str(f, "groupId"));
  revalidatePath(`/teacher/class/${classId}`);
}

export async function saveAssignmentAction(f: FormData) {
  const store = await teacherStore();
  const classId = str(f, "classId");
  const who = str(f, "who");
  let target: AssignTarget = { type: "class" };
  if (who === "groups") target = { type: "groups", groupIds: f.getAll("groupIds").map(String) };
  if (who === "students") target = { type: "students", studentIds: f.getAll("studentIds").map(String) };
  if (target.type !== "class" && (target.type === "groups" ? target.groupIds : target.studentIds).length === 0) {
    redirect(`/teacher/class/${classId}?error=${encodeURIComponent("Choose at least one group or student.")}#assign`);
  }
  const mode = (["main", "replace", "addon"].includes(str(f, "mode")) ? str(f, "mode") : "main") as AssignMode;
  const pace = (PACES.includes(str(f, "pace") as Pace) ? str(f, "pace") : "normal") as Pace;
  await saveAssignment(store, {
    classId,
    listId: str(f, "listId"),
    target,
    mode,
    challengeListId: str(f, "challengeListId") || null,
    startsOn: str(f, "startsOn") || dayKey(),
    endsOn: str(f, "endsOn") || null,
    weeklyGoal: Math.max(1, Math.min(60, Number(str(f, "weeklyGoal")) || 15)),
    pace,
  });
  revalidatePath(`/teacher/class/${classId}`);
  redirect(`/teacher/class/${classId}#assign`);
}

export async function deleteAssignmentAction(f: FormData) {
  const store = await teacherStore();
  const classId = str(f, "classId");
  await store.remove("assignments", str(f, "assignmentId"));
  revalidatePath(`/teacher/class/${classId}`);
}

export async function setFocusAction(f: FormData) {
  const store = await teacherStore();
  const classId = str(f, "classId");
  const words = f.getAll("words").map(String);
  await setFocusWords(store, classId, words, words.length ? addDays(dayKey(), 7) : null);
  revalidatePath(`/teacher/class/${classId}`);
}

export async function updateStudentAction(f: FormData) {
  const store = await teacherStore();
  const sid = str(f, "studentId");
  const groupId = str(f, "groupId");
  const pace = str(f, "pace");
  const goal = str(f, "weeklyGoal");
  await updateStudent(store, sid, {
    groupId: groupId || null,
    pace: PACES.includes(pace as Pace) ? (pace as Pace) : null,
    weeklyGoal: goal ? Math.max(1, Math.min(60, Number(goal) || 15)) : null,
  });
  revalidatePath(`/teacher/class/${str(f, "classId")}`);
  revalidatePath(`/teacher/class/${str(f, "classId")}/student/${sid}`);
}

export async function resetPinAction(f: FormData) {
  const store = await teacherStore();
  const sid = str(f, "studentId");
  const classId = str(f, "classId");
  const pin = str(f, "pin");
  if (!/^\d{4}$/.test(pin)) redirect(`/teacher/class/${classId}/student/${sid}?error=${encodeURIComponent("The PIN needs exactly 4 digits.")}`);
  await updateStudent(store, sid, { pin });
  redirect(`/teacher/class/${classId}/student/${sid}?done=${encodeURIComponent(`PIN reset to ${pin}. Tell the student.`)}`);
}

export async function removeStudentAction(f: FormData) {
  const store = await teacherStore();
  await removeStudent(store, str(f, "studentId"));
  redirect(`/teacher/class/${str(f, "classId")}`);
}

export async function resolveFlagsAction(f: FormData) {
  const store = await teacherStore();
  await resolveFlags(store, f.getAll("flagIds").map(String));
  revalidatePath("/teacher/flags");
}

export async function toggleHiddenAction(f: FormData) {
  const store = await teacherStore();
  await setHidden(store, str(f, "listId"), str(f, "questionId"), str(f, "hide") === "1");
  revalidatePath("/teacher/flags");
}
