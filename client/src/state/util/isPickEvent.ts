import type { TimelineEvent } from "@/draft/TimelineEvent";

export function isPickEvent(event: TimelineEvent): boolean {
  return event.type == "pick" || event.type == "hidden-pick";
}
