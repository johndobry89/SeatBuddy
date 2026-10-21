<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  changesSelectedBuddy,
  nicknameSchema,
  selectedBuddy,
  type BuddyAction,
  type BuddyMutation,
  type BuddyView,
} from '../core/buddies';
const props = defineProps<{
  state: BuddyView | null;
  busy: boolean;
  disabled?: boolean;
  prefix: string;
}>();
const emit = defineEmits<{ command: [command: BuddyMutation] }>();
const nickname = ref('');
const editId = ref<string | null>(null);
const editName = ref('');
const problem = ref('');
const pending = ref<BuddyMutation | null>(null);
const selected = computed(() =>
  props.state ? selectedBuddy(props.state) : null,
);
const blocked = computed(() => props.busy || props.disabled || !props.state);
watch(
  () => `${props.state?.generation}:${props.state?.revision}`,
  (current, previous) => {
    if (
      current.split(':')[0] !== previous?.split(':')[0] ||
      !props.state?.roster.length
    ) {
      nickname.value = '';
      editName.value = '';
      editId.value = null;
    }
    if (pending.value) {
      pending.value = null;
      problem.value =
        'De lijst is gewijzigd. Kies opnieuw voordat je B laat beginnen.';
    }
    if (
      editId.value &&
      !props.state?.roster.some((buddy) => buddy.id === editId.value)
    ) {
      editId.value = null;
      editName.value = '';
    }
  },
);
function validated(value: string) {
  const parsed = nicknameSchema.safeParse(value);
  if (!parsed.success) {
    problem.value =
      'Gebruik 1–24 tekens voor een bijnaam: letters, korte cijfers, spaties of een koppelteken. Geen e-mail, pasnummer, wachtwoord of link.';
    return null;
  }
  return parsed.data;
}
async function prepare(action: BuddyAction) {
  if (!props.state || blocked.value) return;
  problem.value = '';
  const command: BuddyMutation = {
    type: 'BUDDY_MUTATE',
    generation: props.state.generation,
    revision: props.state.revision,
    resetB: false,
    action,
  };
  if (changesSelectedBuddy(props.state, action)) {
    pending.value = { ...command, resetB: true };
    await nextTick();
    document.getElementById(`${props.prefix}-confirm`)?.focus();
  } else emit('command', command);
}
function add() {
  const name = validated(nickname.value);
  if (name) {
    void prepare({ kind: 'ADD', nickname: name });
    nickname.value = '';
  }
}
function rename() {
  const name = validated(editName.value);
  if (name && editId.value) {
    void prepare({ kind: 'RENAME', id: editId.value, nickname: name });
    editId.value = null;
  }
}
function confirm() {
  const command = pending.value;
  pending.value = null;
  if (command && !blocked.value) emit('command', command);
}
function cancel() {
  pending.value = null;
}
</script>
<template>
  <div class="buddy-manager">
    <p class="privacy-note">
      Optioneel: alleen een tijdelijke bijnaam. Geen account, pas of abonnement
      wordt gekoppeld. Bij workerherstart verdwijnt de lijst.
    </p>
    <p v-if="disabled" class="notice">
      Buddybeheer vraagt een browserverbinding. Je kunt de handmatige
      A/B-assistent zonder buddy blijven gebruiken.
    </p>
    <p class="buddy-selection" :data-testid="`${prefix}-selection`">
      {{
        selected
          ? `Ik + ${selected.nickname}`
          : 'Ik + een buddy — nog niemand geselecteerd'
      }}<span v-if="selected?.demo" class="badge">DEMO</span>
    </p>
    <p v-if="!state?.roster.length" class="empty-state">
      Nog geen buddy’s. Voeg een bijnaam toe of probeer de fictieve voorbeelden.
    </p>
    <ul v-else class="buddy-roster" aria-label="Tijdelijke buddy’s">
      <li v-for="buddy in state.roster" :key="buddy.id" class="buddy-row">
        <span class="avatar" aria-hidden="true">{{
          Array.from(buddy.nickname)
            .slice(0, 2)
            .join('')
            .toLocaleUpperCase('nl-NL')
        }}</span>
        <div class="buddy-label">
          <strong>{{ buddy.nickname }}</strong
          ><span class="source"
            >{{
              buddy.id === state.selectedId
                ? 'Geselecteerd · geen accountbewijs'
                : 'Niet geselecteerd'
            }}
            {{ buddy.demo ? '· fictief DEMO' : '' }}</span
          >
        </div>
        <button
          class="secondary"
          :disabled="blocked"
          :aria-pressed="buddy.id === state.selectedId"
          :aria-label="`Kies ${buddy.nickname}`"
          @click="prepare({ kind: 'SELECT', id: buddy.id })"
        >
          {{ buddy.id === state.selectedId ? 'Geselecteerd' : 'Kies buddy' }}
        </button>
        <div class="buddy-tools">
          <button
            class="text-button"
            :disabled="blocked"
            :aria-label="`Hernoem ${buddy.nickname}`"
            @click="
              editId = buddy.id;
              editName = buddy.nickname;
            "
          >
            Hernoem</button
          ><button
            class="text-button"
            :disabled="blocked"
            :aria-label="`Verwijder ${buddy.nickname}`"
            @click="prepare({ kind: 'REMOVE', id: buddy.id })"
          >
            Verwijder
          </button>
        </div>
      </li>
    </ul>
    <form v-if="editId" @submit.prevent="rename">
      <label :for="`${prefix}-rename`"
        >Nieuwe bijnaam<input
          :id="`${prefix}-rename`"
          v-model="editName"
          maxlength="24"
          autocomplete="off"
          required
      /></label>
      <button class="secondary" :disabled="blocked">Bewaar bijnaam</button
      ><button type="button" class="text-button" @click="editId = null">
        Hernoemen annuleren
      </button>
    </form>
    <form @submit.prevent="add">
      <label :for="`${prefix}-nickname`"
        >Bijnaam toevoegen<input
          :id="`${prefix}-nickname`"
          v-model="nickname"
          maxlength="24"
          autocomplete="off"
          placeholder="Bijvoorbeeld: Filmmaatje"
          required
          :disabled="blocked"
      /></label>
      <button class="secondary" :disabled="blocked">Voeg buddy toe</button>
    </form>
    <p v-if="problem" role="alert" class="error">{{ problem }}</p>
    <div
      v-if="pending"
      class="buddy-confirm notice"
      role="group"
      aria-label="Buddywijziging bevestigen"
    >
      <h3 :id="`${prefix}-confirm`" tabindex="-1">B begint opnieuw</h3>
      <p>
        Deze wijziging wist B’s eerdere invoer, browserkoppeling en controles. A
        blijft ongewijzigd. Dit annuleert geen echte boeking; controleer
        eventuele uitkomsten altijd zelf.
      </p>
      <button :disabled="blocked" @click="confirm">
        Bevestig wijziging en wis B</button
      ><button class="secondary" @click="cancel">Annuleren</button>
    </div>
    <div class="buddy-tools">
      <button
        v-if="!state?.roster.length"
        class="text-button"
        :disabled="blocked"
        @click="prepare({ kind: 'DEMO' })"
      >
        Probeer fictieve buddy’s Sanne en Mark
      </button>
      <button
        v-if="state?.selectedId"
        class="text-button"
        :disabled="blocked"
        @click="prepare({ kind: 'SELECT', id: null })"
      >
        Ga verder zonder buddy
      </button>
      <button
        v-if="state?.roster.length"
        class="text-button"
        :disabled="blocked"
        @click="prepare({ kind: 'CLEAR' })"
      >
        Wis alle buddy’s
      </button>
    </div>
  </div>
</template>
