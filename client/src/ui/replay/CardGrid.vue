<!-- eslint-disable vue/no-deprecated-v-on-native-modifier -->
<template>
  <div class="_card-grid">
    <div v-if="sortedPackCards" class="selected-pack">
      <CardView
        v-for="card in sortedPackCards"
        :key="card.id"
        :card="card"
        :selectionStyle="getSelectionStyle(card.id)"
        class="card"
        @click.native="onPackCardClicked(card.id)"
      />
    </div>

    <div class="pool-label" v-if="selectedSeat && selectedPack">Drafted</div>
    <div v-if="selectedSeat" class="player-grid">
      <CardView
        v-for="cardId in selectedSeat.picks.cards"
        :key="cardId"
        :card="draftStore.getCard(cardId)"
        :selectionStyle="getSelectionStyle(cardId)"
        class="card"
        @click.native="onPoolCardClicked(cardId)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import CardView from "./CardView.vue";

import type { DraftSeat, CardPack, DraftCard, CardContainer } from "@/draft/DraftState";
import type { TimelineEvent } from "@/draft/TimelineEvent";
import type { SelectedView } from "@/state/selection";
import { pushDraftUrlRelative } from "@/router/url_manipulation";
import { draftStore, type DraftStore } from "@/state/DraftStore";
import { replayStore, type ReplayStore } from "@/state/ReplayStore";
import { checkNotNil } from "@/util/checkNotNil";
import { getActivePackForSeat } from "@/state/util/getters";

export default defineComponent({
  components: {
    CardView,
  },

  computed: {
    draftStore(): DraftStore {
      return draftStore;
    },

    selection(): SelectedView | null {
      return replayStore.selection;
    },

    selectedSeat(): DraftSeat | null {
      if (this.selection == null || this.selection.type == "pack") {
        return null;
      } else {
        return replayStore.draft.seats[this.selection.id];
      }
    },

    selectedPack(): CardPack | null {
      let pack: CardPack | null = null;

      if (this.selection == null) {
        return null;
      } else if (this.selection.type == "pack") {
        pack = requirePack(replayStore.draft.packs.get(this.selection.id));
      } else {
        pack = getActivePackForSeat(replayStore.draft, this.selection.id);
      }

      return pack;
    },

    sortedPackCards(): DraftCard[] | null {
      if (this.selectedPack == null) {
        return null;
      } else {
        return this.selectedPack.cards
          .map((id) => checkNotNil(draftStore.cards.get(id)))
          .sort((a, b) => a.sourcePackIndex - b.sourcePackIndex);
      }
    },

    nextEventForPack(): TimelineEvent | null {
      const packId = this.selectedPack?.id;
      if (packId == undefined) {
        return null;
      }

      const eventPos = replayStore.eventPos;
      const events = replayStore.events;
      for (let i = eventPos; i < events.length; i++) {
        const event = events[i];
        for (const action of event.actions) {
          if (action.type == "move-card" && (action.from == packId || action.to == packId)) {
            return event;
          }
        }
      }
      return null;
    },

    movedCards(): MovedCards {
      const moved = {
        picked: new Set<number>(),
        returned: new Set<number>(),
      };

      if (this.selectedPack != null && this.nextEventForPack != null) {
        for (const action of this.nextEventForPack.actions) {
          if (action.type == "move-card") {
            if (action.from == this.selectedPack.id) {
              moved.picked.add(action.card);
            } else if ((action.to = this.selectedPack.id)) {
              moved.returned.add(action.card);
            }
          }
        }
      }

      return moved;
    },
  },

  methods: {
    getSelectionStyle(cardId: number) {
      if (this.movedCards.picked.has(cardId)) {
        return "picked";
      } else if (this.movedCards.returned.has(cardId)) {
        return "returned";
      } else {
        return undefined;
      }
    },

    onPackCardClicked(cardId: number) {
      if (!draftStore.isFilteredDraft) {
        this.jumpToPick(cardId, "future");
      }
    },

    onPoolCardClicked(cardId: number) {
      this.jumpToPick(cardId, "past");
    },

    jumpToPick(cardId: number, direction: "future" | "past") {
      const pick = findPick(cardId, replayStore.eventPos, replayStore.events, direction);
      if (pick != null) {
        const adjustedIndex = maybeAdjustToStartOfEpoch(replayStore, pick.index);

        pushDraftUrlRelative(this, {
          eventIndex: adjustedIndex,
          selection: {
            type: "seat",
            id: pick.seat,
          },
        });
      }
    },
  },
});

function maybeAdjustToStartOfEpoch(store: ReplayStore, index: number) {
  let newIndex = index;
  const event = store.events[index];
  if (event != undefined && store.timeMode == "synchronized") {
    for (let i = index; i >= 0; i--) {
      if (store.events[i].roundEpoch != event.roundEpoch) {
        break;
      }
      newIndex = i;
    }
  }
  return newIndex;
}

function findPick(
  cardId: number,
  currentIndex: number,
  events: TimelineEvent[],
  direction: "future" | "past",
) {
  if (direction == "future") {
    for (let i = currentIndex; i < events.length; i++) {
      const event = events[i];
      if (containsPick(event, cardId)) {
        return {
          index: i,
          seat: event.associatedSeat,
        };
      }
    }
  } else {
    // We could be at currentIndex = length if at the end of the draft
    const startingPos = Math.min(currentIndex, events.length - 1);
    for (let i = startingPos; i >= 0; i--) {
      const event = events[i];
      if (containsPick(event, cardId)) {
        return {
          index: i,
          seat: event.associatedSeat,
        };
      }
    }
  }
  return null;
}

function containsPick(event: TimelineEvent, cardId: number) {
  for (const action of event.actions) {
    if (action.type == "move-card" && action.card == cardId) {
      return true;
    }
  }
  return false;
}

function requirePack(container: CardContainer | undefined): CardPack {
  if (container == undefined || container.type != "pack") {
    throw new Error(`Invalid container: ${container?.id}`);
  }
  return container;
}

interface MovedCards {
  picked: Set<number>;
  returned: Set<number>;
}
</script>

<style scoped>
._card-grid {
  padding-top: 10px;
  padding-left: 10px;
  overflow-y: scroll;
}

.player-grid,
.selected-pack {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 10px;
}

.pool-label {
  border-top: 1px solid #eaeaea;
  padding-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
  margin-bottom: 5px;
}

.card {
  margin: 0 10px 10px 0;
}
</style>
