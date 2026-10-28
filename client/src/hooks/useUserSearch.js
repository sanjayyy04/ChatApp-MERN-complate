import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { connectSocket } from "../services/socket";
import { UserContext } from "../context/UserContext";

const DEBOUNCE_MS = 280;
const MIN_QUERY_LEN = 2;

const normalizeUsernameQuery = (raw) => {
  let term = String(raw || "").trim();
  if (term.startsWith("@")) term = term.slice(1).trim();
  return term.slice(0, 32);
};

/**
 * Realtime-style user search: debounced, aborts stale requests, refreshes on profile updates.
 */
export function useUserSearch(query, { enabled = true, excludeFriendIds = null } = {}) {
  const { user } = useContext(UserContext);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const abortRef = useRef(null);

  const term = useMemo(() => normalizeUsernameQuery(query), [query]);

  useEffect(() => {
    if (!user) return undefined;
    const socket = connectSocket();
    const onUserUpdated = ({ user: updated }) => {
      if (!updated?._id) return;
      setRefreshTick((n) => n + 1);
    };
    socket.on("user:updated", onUserUpdated);
    return () => {
      socket.off("user:updated", onUserUpdated);
    };
  }, [user]);

  useEffect(() => {
    if (!enabled || term.length < MIN_QUERY_LEN) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      axios
        .get(`${API_URL}/api/users/search`, {
          params: { username: term },
          withCredentials: true,
          signal: controller.signal,
        })
        .then((response) => {
          let data = response.data.data || [];
          if (excludeFriendIds) {
            data = data.filter((person) => !excludeFriendIds.has(String(person._id)));
          }
          setResults(data);
        })
        .catch((err) => {
          if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
          setResults([]);
          setError(err.response?.data?.message || "User search failed.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [term, enabled, excludeFriendIds, refreshTick]);

  return {
    results,
    loading,
    error,
    minLength: MIN_QUERY_LEN,
    term,
  };
}

export { normalizeUsernameQuery, MIN_QUERY_LEN as USER_SEARCH_MIN_LENGTH };
