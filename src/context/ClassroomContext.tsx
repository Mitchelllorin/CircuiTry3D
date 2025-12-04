import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Classroom } from "../model/classroom";
import { classroomApi } from "../services/classroomApi";
import type {
  AddStudentPayload,
  CreateAssignmentPayload,
  CreateClassroomPayload,
  RecordProgressPayload,
} from "../services/classroomMutations";
import { useAuth } from "./AuthContext";

type ClassroomState = {
  classes: Classroom[];
  selectedClassId: string | null;
  loading: boolean;
  saving: boolean;
  error?: string;
  lastSyncedAt?: number;
};

type ClassroomContextValue = {
  classes: Classroom[];
  selectedClass: Classroom | null;
  loading: boolean;
  saving: boolean;
  error?: string;
  lastSyncedAt?: number;
  selectClass: (classId: string) => void;
  createClassroom: (payload: CreateClassroomPayload) => Promise<void>;
  inviteStudent: (payload: AddStudentPayload) => Promise<void>;
  scheduleAssignment: (payload: CreateAssignmentPayload) => Promise<void>;
  recordProgress: (payload: RecordProgressPayload) => Promise<void>;
  refreshAnalytics: (classId: string) => Promise<void>;
};

const ClassroomContext = createContext<ClassroomContextValue | undefined>(undefined);

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const teacherId = currentUser?.id ?? "teacher-local-demo";

  const [state, setState] = useState<ClassroomState>({
    classes: [],
    selectedClassId: null,
    loading: true,
    saving: false,
  });

  useEffect(() => {
    let isMounted = true;
    setState((previous) => ({ ...previous, loading: true, error: undefined }));
    classroomApi
      .load(teacherId)
      .then((document) => {
        if (!isMounted) {
          return;
        }
        setState((previous) => ({
          ...previous,
          classes: document.classes,
          selectedClassId: previous.selectedClassId ?? document.classes[0]?.id ?? null,
          loading: false,
          lastSyncedAt: document.updatedAt,
        }));
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unable to load classrooms.";
        setState((previous) => ({
          ...previous,
          loading: false,
          error: message,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const applyDocument = useCallback((document: Awaited<ReturnType<typeof classroomApi.load>>) => {
    setState((previous) => ({
      ...previous,
      classes: document.classes,
      selectedClassId: previous.selectedClassId ?? document.classes[0]?.id ?? null,
      loading: false,
      saving: false,
      lastSyncedAt: document.updatedAt,
    }));
  }, []);

  const runMutation = useCallback(
    async (mutator: () => Promise<ReturnType<typeof classroomApi.load>>) => {
      setState((previous) => ({ ...previous, saving: true, error: undefined }));
      try {
        const document = await mutator();
        applyDocument(document);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update classroom data.";
        setState((previous) => ({ ...previous, saving: false, error: message }));
      }
    },
    [applyDocument],
  );

  const selectClass = useCallback((classId: string) => {
    setState((previous) => ({ ...previous, selectedClassId: classId }));
  }, []);

  const createClassroom = useCallback(
    async (payload: CreateClassroomPayload) => {
      await runMutation(() => classroomApi.createClassroom(teacherId, payload));
    },
    [runMutation, teacherId],
  );

  const inviteStudent = useCallback(
    async (payload: AddStudentPayload) => {
      await runMutation(() => classroomApi.addStudent(teacherId, payload));
    },
    [runMutation, teacherId],
  );

  const scheduleAssignment = useCallback(
    async (payload: CreateAssignmentPayload) => {
      await runMutation(() => classroomApi.createAssignment(teacherId, payload));
    },
    [runMutation, teacherId],
  );

  const recordProgress = useCallback(
    async (payload: RecordProgressPayload) => {
      await runMutation(() => classroomApi.recordProgress(teacherId, payload));
    },
    [runMutation, teacherId],
  );

  const refreshAnalytics = useCallback(
    async (classId: string) => {
      await runMutation(() => classroomApi.refreshAnalytics(teacherId, classId));
    },
    [runMutation, teacherId],
  );

  const selectedClass = useMemo(
    () => state.classes.find((classroom) => classroom.id === state.selectedClassId) ?? null,
    [state.classes, state.selectedClassId],
  );

  const value: ClassroomContextValue = {
    classes: state.classes,
    selectedClass,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    lastSyncedAt: state.lastSyncedAt,
    selectClass,
    createClassroom,
    inviteStudent,
    scheduleAssignment,
    recordProgress,
    refreshAnalytics,
  };

  return <ClassroomContext.Provider value={value}>{children}</ClassroomContext.Provider>;
}

export const useClassroom = () => {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error("useClassroom must be used within a ClassroomProvider");
  }
  return context;
};

