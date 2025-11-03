import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type CommunityMessage = {
  id: string;
  userId: string;
  body: string;
  createdAt: number;
  reactions: string[];
};

export type CircuitShare = {
  id: string;
  userId: string;
  title: string;
  summary: string;
  createdAt: number;
  tags: string[];
  likes: string[];
  reference?: string;
};

export type CommunityReview = {
  id: string;
  userId: string;
  rating: number;
  headline: string;
  body: string;
  createdAt: number;
  endorsements: string[];
};

export type PostMessagePayload = {
  body: string;
};

export type ShareCircuitPayload = {
  title: string;
  summary: string;
  tags?: string[];
  reference?: string;
};

export type SubmitReviewPayload = {
  rating: number;
  headline: string;
  body: string;
};

type EngagementState = {
  messages: CommunityMessage[];
  circuits: CircuitShare[];
  reviews: CommunityReview[];
};

type EngagementContextValue = {
  messages: CommunityMessage[];
  circuits: CircuitShare[];
  reviews: CommunityReview[];
  postMessage: (payload: PostMessagePayload) => Promise<{ ok: true } | { ok: false; message: string }>;
  shareCircuit: (payload: ShareCircuitPayload) => Promise<{ ok: true } | { ok: false; message: string }>;
  submitReview: (payload: SubmitReviewPayload) => Promise<{ ok: true } | { ok: false; message: string }>;
  toggleMessageReaction: (messageId: string) => void;
  toggleCircuitLike: (circuitId: string) => void;
  toggleReviewEndorsement: (reviewId: string) => void;
  stats: {
    memberCount: number;
    totalMessages: number;
    circuitsShared: number;
    averageRating: number | null;
  };
};

const STORAGE_KEY = "circuiTry3d.engagement.v1";

const seededState: EngagementState = {
  messages: [
    {
      id: "msg-onboarding",
      userId: "sample-mentor",
      body: "Welcome to the lab channel! Share your circuit ideas or questions and someone from the community will help you refine them.",
      createdAt: Date.now() - 1000 * 60 * 60 * 8,
      reactions: ["sample-builder"],
    },
    {
      id: "msg-power-stage",
      userId: "sample-builder",
      body: "Just posted a 12V to 5V buck converter layout in the circuits tab. Curious how others handle thermal on the high-side MOSFET.",
      createdAt: Date.now() - 1000 * 60 * 60 * 2,
      reactions: ["sample-mentor"],
    },
  ],
  circuits: [
    {
      id: "circuit-buck",
      userId: "sample-builder",
      title: "Compact Buck Converter",
      summary: "3A synchronous buck with current sense taps for the Arena showdown. Includes thermal vias under the power stage.",
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      tags: ["power", "dc-dc", "prototype"],
      likes: ["sample-mentor"],
      reference: "arena://circuit-buck",
    },
  ],
  reviews: [
    {
      id: "rev-simulation",
      userId: "sample-mentor",
      rating: 5,
      headline: "Arena comparisons are brilliant",
      body: "Being able to import JSON and instantly compare key metrics is saving our lab hours every week.",
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      endorsements: ["sample-builder"],
    },
  ],
};

const EngagementContext = createContext<EngagementContextValue | undefined>(undefined);

const readStoredState = (): EngagementState => {
  if (typeof window === "undefined") {
    return seededState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seededState;
    }
    const parsed = JSON.parse(raw) as Partial<EngagementState>;
    if (!parsed || typeof parsed !== "object") {
      return seededState;
    }

    const messages = Array.isArray(parsed.messages) ? parsed.messages.filter((entry): entry is CommunityMessage => Boolean(entry && entry.id && entry.userId && entry.body)) : seededState.messages;
    const circuits = Array.isArray(parsed.circuits) ? parsed.circuits.filter((entry): entry is CircuitShare => Boolean(entry && entry.id && entry.userId && entry.title && entry.summary)) : seededState.circuits;
    const reviews = Array.isArray(parsed.reviews) ? parsed.reviews.filter((entry): entry is CommunityReview => Boolean(entry && entry.id && entry.userId && entry.rating)) : seededState.reviews;

    return {
      messages,
      circuits,
      reviews,
    };
  } catch (error) {
    console.warn("Community storage read failed", error);
    return seededState;
  }
};

const writeStoredState = (value: EngagementState) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn("Community storage write failed", error);
  }
};

const randomId = (prefix: string) => {
  const uniquePart = typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uniquePart}`;
};

export function EngagementProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState<EngagementState>(() => readStoredState());

  useEffect(() => {
    writeStoredState(state);
  }, [state]);

  const postMessage = useCallback<EngagementContextValue["postMessage"]>(
    async (payload) => {
      const trimmed = payload.body.trim();
      if (!trimmed) {
        return { ok: false, message: "Message cannot be empty." };
      }

      if (!currentUser) {
        return { ok: false, message: "Sign in to post in the community chat." };
      }

      setState((previous) => ({
        ...previous,
        messages: [
          {
            id: randomId("msg"),
            userId: currentUser.id,
            body: trimmed,
            createdAt: Date.now(),
            reactions: [],
          },
          ...previous.messages,
        ].slice(0, 75),
      }));

      return { ok: true };
    },
    [currentUser]
  );

  const shareCircuit = useCallback<EngagementContextValue["shareCircuit"]>(
    async (payload) => {
      const trimmedTitle = payload.title.trim();
      const trimmedSummary = payload.summary.trim();
      if (!trimmedTitle || !trimmedSummary) {
        return { ok: false, message: "Circuit posts need a title and summary." };
      }

      if (!currentUser) {
        return { ok: false, message: "Sign in to share circuits." };
      }

      setState((previous) => ({
        ...previous,
        circuits: [
          {
            id: randomId("circuit"),
            userId: currentUser.id,
            title: trimmedTitle,
            summary: trimmedSummary,
            createdAt: Date.now(),
            tags: payload.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
            likes: [],
            reference: payload.reference?.trim() || undefined,
          },
          ...previous.circuits,
        ].slice(0, 60),
      }));

      return { ok: true };
    },
    [currentUser]
  );

  const submitReview = useCallback<EngagementContextValue["submitReview"]>(
    async (payload) => {
      const rating = Math.round(payload.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return { ok: false, message: "Choose a rating between 1 and 5." };
      }

      const headline = payload.headline.trim();
      const body = payload.body.trim();
      if (!headline || !body) {
        return { ok: false, message: "Please add a headline and a few details." };
      }

      if (!currentUser) {
        return { ok: false, message: "Sign in to leave feedback." };
      }

      setState((previous) => ({
        ...previous,
        reviews: [
          {
            id: randomId("review"),
            userId: currentUser.id,
            rating,
            headline,
            body,
            createdAt: Date.now(),
            endorsements: [],
          },
          ...previous.reviews,
        ].slice(0, 60),
      }));

      return { ok: true };
    },
    [currentUser]
  );

  const toggleMessageReaction = useCallback<EngagementContextValue["toggleMessageReaction"]>(
    (messageId) => {
      const activeUserId = currentUser?.id;
      if (!activeUserId) {
        return;
      }
      setState((previous) => ({
        ...previous,
        messages: previous.messages.map((message) => {
          if (message.id !== messageId) {
            return message;
          }
          const hasReacted = message.reactions.includes(activeUserId);
          return {
            ...message,
            reactions: hasReacted ? message.reactions.filter((id) => id !== activeUserId) : [...message.reactions, activeUserId],
          };
        }),
      }));
    },
    [currentUser]
  );

  const toggleCircuitLike = useCallback<EngagementContextValue["toggleCircuitLike"]>(
    (circuitId) => {
      const activeUserId = currentUser?.id;
      if (!activeUserId) {
        return;
      }
      setState((previous) => ({
        ...previous,
        circuits: previous.circuits.map((circuit) => {
          if (circuit.id !== circuitId) {
            return circuit;
          }
          const liked = circuit.likes.includes(activeUserId);
          return {
            ...circuit,
            likes: liked ? circuit.likes.filter((id) => id !== activeUserId) : [...circuit.likes, activeUserId],
          };
        }),
      }));
    },
    [currentUser]
  );

  const toggleReviewEndorsement = useCallback<EngagementContextValue["toggleReviewEndorsement"]>(
    (reviewId) => {
      const activeUserId = currentUser?.id;
      if (!activeUserId) {
        return;
      }
      setState((previous) => ({
        ...previous,
        reviews: previous.reviews.map((review) => {
          if (review.id !== reviewId) {
            return review;
          }
          const endorsed = review.endorsements.includes(activeUserId);
          return {
            ...review,
            endorsements: endorsed ? review.endorsements.filter((id) => id !== activeUserId) : [...review.endorsements, activeUserId],
          };
        }),
      }));
    },
    [currentUser]
  );

  const stats = useMemo<EngagementContextValue["stats"]>(() => {
    const distinctMemberIds = new Set<string>();
    state.messages.forEach((message) => distinctMemberIds.add(message.userId));
    state.circuits.forEach((circuit) => distinctMemberIds.add(circuit.userId));
    state.reviews.forEach((review) => distinctMemberIds.add(review.userId));

    const averageRating = state.reviews.length
      ? state.reviews.reduce((acc, review) => acc + review.rating, 0) / state.reviews.length
      : null;

    return {
      memberCount: distinctMemberIds.size,
      totalMessages: state.messages.length,
      circuitsShared: state.circuits.length,
      averageRating,
    };
  }, [state.messages, state.circuits, state.reviews]);

  const value = useMemo<EngagementContextValue>(
    () => ({
      messages: state.messages,
      circuits: state.circuits,
      reviews: state.reviews,
      postMessage,
      shareCircuit,
      submitReview,
      toggleMessageReaction,
      toggleCircuitLike,
      toggleReviewEndorsement,
      stats,
    }),
    [state.messages, state.circuits, state.reviews, postMessage, shareCircuit, submitReview, toggleMessageReaction, toggleCircuitLike, toggleReviewEndorsement, stats]
  );

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export const useEngagement = () => {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error("useEngagement must be used within an EngagementProvider");
  }
  return context;
};

