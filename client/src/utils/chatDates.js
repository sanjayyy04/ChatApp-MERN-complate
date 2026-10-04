const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatMessageTime = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatChatDateLabel = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const today = startOfDay(new Date());
  const messageDay = startOfDay(date);
  const dayDiff = Math.round((today - messageDay) / 86_400_000);

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";

  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
    });
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const dayKey = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "unknown";
  return startOfDay(date).toISOString().slice(0, 10);
};

/** Flat list of date separators + messages for rendering. */
export const buildMessageTimeline = (messages) => {
  const items = [];
  let lastDay = null;

  messages.forEach((message) => {
    const stamp = message.createdAt || message.updatedAt || new Date().toISOString();
    const key = dayKey(stamp);
    if (key !== lastDay) {
      items.push({
        kind: "date",
        id: `date-${key}`,
        label: formatChatDateLabel(stamp),
      });
      lastDay = key;
    }
    items.push({
      kind: "message",
      id: String(message._id),
      message,
    });
  });

  return items;
};
