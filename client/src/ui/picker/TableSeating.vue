<template>
  <div class="_table-seating">
    <div class="table">
      <component
        :is="seat.player.isPresent && isDevMode ? 'a' : 'div'"
        v-for="seat in draftStore.currentState.seats"
        :key="seat.position"
        class="seated-player"
        :class="{
          selected: seat.player.id == authStore.user?.id,
        }"
        :style="{
          left: `${TABLE_POSITIONS[seat.position].x * 100}%`,
          top: `${TABLE_POSITIONS[seat.position].y * 100}%`,
        }"
        :href="`${route.path}?as=${seat.player.id}`"
      >
        <img
          v-if="seat.player.id == authStore.user?.id"
          class="selection-halo"
          src="./selection_halo.svg"
        />

        <img
          v-if="seat.player.isPresent"
          class="player-icon"
          :src="seat.player.iconUrl"
          :title="seat.player.name"
        />
        <div v-else class="player-icon-standin"></div>

        <div class="position-badge" :class="[TABLE_POSITIONS[seat.position].orientation]">
          {{ seat.position + 1 }}
        </div>
      </component>
    </div>

    <div class="footer">
      <button v-if="canJoin" class="join-btn" @click="onJoinClick">Join</button>
      <template v-else-if="draftStore.hasSeatsAvailable">Waiting for seats to fill</template>
      <template v-else-if="isSelfSeated">Take your seat</template>
      <template v-else>Ready to start</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

import { authStore } from "@/state/AuthStore";
import { draftStore } from "@/state/DraftStore";
import { computed } from "vue";
import { fetchEndpoint, fetchEndpointEv } from "@/fetch/fetchEndpoint";
import { ROUTE_JOIN_DRAFT } from "@/rest/api/join/join";
import { ROUTE_DRAFT } from "@/rest/api/draft/draft";

const route = useRoute();

const isDevMode = import.meta.env.DEV;

const ownSeatPosition = computed(() => {
  for (const seat of draftStore.currentState.seats) {
    if (seat.player.id == authStore.user?.id) {
      return seat.position;
    }
  }
  return null;
});

const isSelfSeated = computed(() => {
  return ownSeatPosition.value != null;
});

const canJoin = computed(() => {
  return !isSelfSeated.value && draftStore.hasSeatsAvailable;
});

async function onJoinClick() {
  const [response, e] = await fetchEndpointEv(ROUTE_JOIN_DRAFT, {
    id: draftStore.draftId,
    position: undefined,
    as: authStore.user?.id,
  });
  const payload = await fetchEndpoint(ROUTE_DRAFT, {
    id: draftStore.draftId.toString(),
    as: authStore.user?.id,
  });
  draftStore.loadDraft(payload);
}
</script>

<script lang="ts">
const TABLE_POSITIONS = [
  { x: 0.7538, y: 0.125, orientation: "right" },
  { x: 0.7538, y: 0.375, orientation: "right" },
  { x: 0.7538, y: 0.625, orientation: "right" },
  { x: 0.7538, y: 0.875, orientation: "right" },

  { x: 0.2462, y: 0.875, orientation: "left" },
  { x: 0.2462, y: 0.625, orientation: "left" },
  { x: 0.2462, y: 0.375, orientation: "left" },
  { x: 0.2462, y: 0.125, orientation: "left" },
];
</script>

<style scoped>
._table-seating {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.table {
  position: relative;
  width: 260px;
  height: 480px;

  display: flex;
  flex-direction: column;

  background-color: #641111;
  background-image: url("./table_decoration.png");
  background-size: contain;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2px;

  box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.75);
}

.seated-player {
  position: absolute;
  width: 0;
  height: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.player-icon {
  width: 60px;
  height: 60px;
  border-radius: 100px;

  border: 2px solid #8b4d4d;
}

.player-icon-standin {
  width: 60px;
  height: 60px;
  border-radius: 100px;
  min-height: 60px;

  border: 1px solid #7a3231;
}

.position-badge {
  position: absolute;
  top: -37px;

  width: 30px;
  height: 30px;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: #641111;
  border: 1px solid #8b4d4d;
  border-radius: 30px;
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.position-badge.left {
  left: -47px;
}

.position-badge.right {
  right: -47px;
}

.seated-player.selected .player-icon {
  border-color: #fff;
}

.seated-player.selected .position-badge {
  background-color: #fff;
  border-color: #fff;
  color: #000;
}

.selection-halo {
  position: absolute;
  left: -40px;
  top: -40px;
  width: 80px;
  height: 80px;

  animation: table-seating-halo-spin 60s linear infinite;
}

@keyframes table-seating-halo-spin {
  100% {
    transform: rotate3d(0, 0, 1, 360deg);
  }
}

.footer {
  margin-top: 60px;
}

.join-btn {
  padding: 20px;
  min-width: 160px;
  font-size: 16px;
}
</style>
