import { checkProposal, type CheckResult } from '../core/compare';
import { formatDiagnostic, type DiagnosticInput } from '../core/diagnostic';
import {
  ageMinutes,
  clockTime,
  formatProposal,
  MessageError,
  parseProposal,
  type Proposal,
} from '../core/message';
import { discover, type Discovery, type Pair, type Rejection } from '../core/seats';
import type { MapStatus, Observation, PageStatus, Showing, ShowingField } from '../core/types';
import { ReadError, type ReadFailure } from './browser';

export interface Deps {
  read: () => Promise<Observation>;
  copy: (text: string) => Promise<void>;
  now: () => number;
}

/** 'here': a second Chrome window/profile on this computer; 'send': via a chat app. */
type ShareMode = 'here' | 'send';

type State =
  | { screen: 'home' }
  | { screen: 'busy'; role: 'A' | 'B' }
  | { screen: 'a-problem'; text: string; detail?: string }
  | { screen: 'a-choose'; observation: Observation; discovery: Discovery; selected: number | null; copyError?: string }
  | { screen: 'a-shared'; message: string; pair: Pair; copied: boolean; mode: ShareMode }
  | { screen: 'b-input'; draft: string; error?: string; reportable?: boolean }
  | { screen: 'b-result'; draft: string; proposal: Proposal; result: CheckResult; observation: Observation };

const FIELD_LABELS: Record<ShowingField, string> = {
  movie: 'film',
  cinema: 'bioscoop',
  date: 'datum',
  time: 'tijd',
  hall: 'zaal',
};

export const READ_FAILURES: Record<ReadFailure, string> = {
  NOT_VUE_TAB:
    'Open eerst de stoelkaart op vuecinemas.nl in dit tabblad. Klik daarna opnieuw op het SeatBuddies-icoon.',
  INCOGNITO: 'SeatBuddies werkt bewust niet in incognitovensters.',
  TAB_LOADING: 'De pagina is nog aan het laden. Probeer het zo opnieuw.',
  TAB_CHANGED: 'De pagina veranderde tijdens het lezen. Probeer het opnieuw.',
  NO_ACCESS:
    'Chrome gaf geen toegang tot deze pagina. Sluit dit venster en klik opnieuw op het SeatBuddies-icoon terwijl de stoelkaart open staat.',
  TIMEOUT: 'De pagina reageerde niet op tijd. Probeer het opnieuw.',
  INVALID: 'De pagina gaf onverwachte gegevens terug. SeatBuddies doet daarom geen voorstel.',
};

export const PAGE_PROBLEMS: Record<Exclude<PageStatus, 'OK'>, string> = {
  NOT_VUE: 'Dit is geen pagina van vuecinemas.nl.',
  PROTECTED:
    'Dit is een inlog-, account- of betaalpagina, of er staat een venster open. Daar leest SeatBuddies bewust niets. Ga terug naar de stoelkaart.',
  NO_SHOWING:
    'Geen voorstelling met stoelkaart gevonden. Kies op Vue een voorstelling en ga naar de stap waar je stoelen kiest.',
  AMBIGUOUS:
    'Op deze pagina staan meerdere voorstellingen of keuzemenu’s tegelijk. Open alleen de stoelkaart van één voorstelling.',
  INCOMPLETE:
    'Film, bioscoop, datum, tijd of zaal is niet eenduidig te lezen. SeatBuddies doet daarom geen voorstel.',
};

export const MAP_PROBLEMS: Record<Exclude<MapStatus, 'OK'>, string> = {
  NO_MAP: 'Nog geen stoelkaart zichtbaar. Ga op Vue door naar de stap ‘stoelen kiezen’ en probeer opnieuw.',
  NOT_VISIBLE: 'De stoelkaart is nog niet helemaal geladen of deels verborgen. Wacht even en probeer opnieuw.',
  INCONSISTENT: 'De stoelkaart ziet er anders uit dan verwacht. Kies daarom zelf op Vue.',
  LEGEND_UNKNOWN: 'De stoelsoorten (zoals Lux) zijn niet betrouwbaar te herkennen. Kies daarom zelf op Vue.',
};

const UNSAFE: Record<Rejection | 'CATEGORY_CHANGED', string> = {
  NOT_FOUND: 'deze stoelen staan niet op de stoelkaart',
  NOT_AVAILABLE: 'minstens één stoel is niet vrij',
  CATEGORY_UNKNOWN: 'de soort stoel is niet te herkennen',
  ULTRA_LUX: 'het gaat om Ultra Lux-stoelen',
  SPECIAL: 'het gaat om een bijzondere plek (bijvoorbeeld een rolstoel- of begeleidersplek)',
  NOT_ADJACENT: 'de stoelen liggen niet zeker direct naast elkaar',
  SPECIAL_NEIGHBOUR:
    'er ligt direct naast deze stoelen een bezette of onbekende plek (dat kan een rolstoel- of begeleidersplek zijn)',
  CATEGORY_CHANGED: 'de soort stoel wijkt af van het voorstel',
};

type Child = Node | string | null | undefined | false;
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string | boolean | ((event: Event) => void)>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function') node.addEventListener(key.replace(/^on/, ''), value);
    else if (value === true) node.setAttribute(key, '');
    else if (typeof value === 'string') node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    // textContent only: page data is never interpreted as HTML.
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

const showingLine = (s: Partial<Showing>) =>
  [s.movie, s.cinema, s.date && s.time ? `${s.date.split('-').reverse().join('-')} ${s.time}` : null, s.hall]
    .filter(Boolean)
    .join(' · ');

const pairLabel = (pair: Pair) => {
  const [first, second] = pair.categories;
  const kind = first === second ? first : `${first} + ${second}`;
  return `Rij ${pair.row}: stoel ${pair.seats[0]} + ${pair.seats[1]} · ${kind}`;
};

export function mount(root: HTMLElement, deps: Deps) {
  let state: State = { screen: 'home' };
  let generation = 0;
  // Codes and counts of the latest read, for the optional developer report.
  let diagnostic: DiagnosticInput | null = null;

  const set = (next: State) => {
    state = next;
    render();
  };

  async function readForA() {
    const mine = ++generation;
    set({ screen: 'busy', role: 'A' });
    try {
      const observation = await deps.read();
      if (mine !== generation) return;
      diagnostic = { phase: 'SEARCH', observation };
      if (observation.status !== 'OK')
        return set({ screen: 'a-problem', text: PAGE_PROBLEMS[observation.status], detail: showingLine(observation.showing) });
      const map = observation.map!;
      if (map.status !== 'OK')
        return set({ screen: 'a-problem', text: MAP_PROBLEMS[map.status], detail: showingLine(observation.showing) });
      const discovery = discover(map);
      diagnostic = { phase: 'SEARCH', observation, discovery };
      if (!discovery.pairs.length) {
        const skipped = discovery.bufferRejected
          ? ` ${discovery.bufferRejected} mogelijk${discovery.bufferRejected === 1 ? ' paar is' : 'e paren zijn'} overgeslagen omdat er direct naast een bezette of onbekende plek ligt (dat kan een rolstoel- of begeleidersplek zijn).`
          : '';
        return set({
          screen: 'a-problem',
          text: `Geen twee vrije, gewone stoelen gevonden die zeker naast elkaar liggen.${skipped} Kies zelf op Vue, of probeer een andere voorstelling.`,
          detail: showingLine(observation.showing),
        });
      }
      set({ screen: 'a-choose', observation, discovery, selected: null });
    } catch (error) {
      if (mine !== generation) return;
      const reason = error instanceof ReadError ? error.reason : 'NO_ACCESS';
      diagnostic = { phase: 'SEARCH', failure: reason };
      set({ screen: 'a-problem', text: READ_FAILURES[reason] });
    }
  }

  async function share(mode: ShareMode) {
    if (state.screen !== 'a-choose' || state.selected === null) return;
    const { observation, discovery, selected } = state;
    const pair = discovery.pairs[selected]!;
    let message: string;
    try {
      message = formatProposal({
        showing: observation.showing as Showing,
        row: pair.row,
        sender: pair.seats[0],
        receiver: pair.seats[1],
        categories: [pair.categories[0]!, pair.categories[1]!],
        readAt: clockTime(observation.observedAt),
      });
    } catch (error) {
      return set({ ...state, copyError: error instanceof MessageError ? error.message : 'Kon geen bericht maken.' });
    }
    let copied = true;
    try {
      await deps.copy(message);
    } catch {
      copied = false;
    }
    set({ screen: 'a-shared', message, pair, copied, mode });
  }

  async function checkForB(draft: string) {
    let proposal: Proposal;
    try {
      proposal = parseProposal(draft);
    } catch (error) {
      return set({ screen: 'b-input', draft, error: error instanceof MessageError ? error.message : 'Dit bericht is niet te lezen.' });
    }
    const mine = ++generation;
    set({ screen: 'busy', role: 'B' });
    try {
      const observation = await deps.read();
      if (mine !== generation) return;
      const result = checkProposal(proposal, observation);
      diagnostic = { phase: 'CHECK', observation, check: result };
      set({ screen: 'b-result', draft, proposal, observation, result });
    } catch (error) {
      if (mine !== generation) return;
      const reason = error instanceof ReadError ? error.reason : 'NO_ACCESS';
      diagnostic = { phase: 'CHECK', failure: reason };
      set({ screen: 'b-input', draft, error: READ_FAILURES[reason], reportable: true });
    }
  }

  function reportButton() {
    if (!diagnostic) return null;
    const report = formatDiagnostic(diagnostic);
    const button = el('button', { type: 'button', class: 'link', 'aria-describedby': 'report-note' }, 'Kopieer foutrapport');
    button.addEventListener('click', async () => {
      try {
        await deps.copy(report);
        button.textContent = 'Foutrapport gekopieerd';
      } catch {
        button.textContent = 'Kopiëren lukte niet';
      }
    });
    return el('div', { class: 'report' }, button, el('small', { id: 'report-note' }, 'Alleen statuscodes en aantallen, geen titels, stoelnummers of accountgegevens.'));
  }

  function header(title: string, back = true) {
    return el(
      'header',
      {},
      back && el('button', { type: 'button', class: 'link', onclick: () => { generation++; set({ screen: 'home' }); } }, '← Terug'),
      el('h1', { tabindex: '-1', 'data-autofocus': true }, title),
    );
  }

  function homeView() {
    return [
      el('header', {}, el('h1', { tabindex: '-1', 'data-autofocus': true }, 'SeatBuddies')),
      el('p', { class: 'lead' }, 'Twee stoelen naast elkaar, twee losse Movie Pass-boekingen. SeatBuddies zoekt het paar en controleert in het tweede venster of de stoel nog vrij is.'),
      el('button', { type: 'button', class: 'primary', onclick: readForA }, 'Zoek twee stoelen'),
      el('small', { class: 'hint' }, 'Open eerst op Vue de stoelkaart van de voorstelling.'),
      el('button', { type: 'button', class: 'secondary', onclick: () => set({ screen: 'b-input', draft: '' }) }, 'Gekozen stoelen controleren'),
      el('small', { class: 'hint' }, 'In het tweede venster, of als je een voorstel kreeg.'),
      el('details', {}, el('summary', {}, 'Hoe werkt het?'),
        el('ol', {},
          el('li', {}, 'Open in twee Chrome-vensters (twee profielen, elk met een eigen Vue-account) dezelfde voorstelling tot de stoelkaart.'),
          el('li', {}, 'Venster 1: “Zoek twee stoelen”, kies een paar en kopieer.'),
          el('li', {}, 'Venster 2: “Gekozen stoelen controleren” en plakken. De controle start meteen.'),
          el('li', {}, 'Groen? Kies in elk venster de eigen stoel en rond de boeking af.'),
        )),
    ];
  }

  function chooseView(s: Extract<State, { screen: 'a-choose' }>) {
    return [
      header('Kies twee stoelen'),
      el('p', { class: 'showing' }, showingLine(s.observation.showing)),
      el('fieldset', {},
        el('legend', {}, 'Twee vrije stoelen naast elkaar'),
        ...s.discovery.pairs.map((pair, index) =>
          el('label', { class: 'choice' },
            el('input', {
              type: 'radio', name: 'pair', value: String(index),
              ...(s.selected === index ? { checked: true } : {}),
              onchange: () => set({ ...s, selected: index, copyError: '' }),
            }),
            pairLabel(pair),
          ),
        ),
      ),
      el('small', { class: 'hint' }, s.discovery.mode === 'SCREEN'
        ? 'Gesorteerd: verst van het scherm en zo midden mogelijk eerst.'
        : 'Volgorde zoals op de kaart: waar het scherm zit, kon SeatBuddies niet vaststellen. Kijk zelf welke plek je het fijnst vindt.'),
      el('button', { type: 'button', class: 'primary', ...(s.selected === null ? { disabled: true } : {}), onclick: () => share('here') },
        'Kopieer voor het tweede venster'),
      el('button', { type: 'button', class: 'secondary', ...(s.selected === null ? { disabled: true } : {}), onclick: () => share('send') },
        'Kopieer om te versturen'),
      s.selected === null ? el('small', { class: 'hint' }, 'Kies eerst één paar. Er wordt niets gereserveerd.') : null,
      s.copyError ? el('p', { class: 'stop', role: 'alert' }, s.copyError) : null,
      el('button', { type: 'button', class: 'link', onclick: readForA }, 'Opnieuw lezen'),
    ];
  }

  function sharedView(s: Extract<State, { screen: 'a-shared' }>) {
    const [first, second] = s.pair.seats;
    const manual = el('textarea', { readonly: true, rows: '7', 'aria-label': 'Gekopieerd stoelvoorstel' }, s.message);
    if (s.mode === 'here')
      return [
        header(s.copied ? 'Gekopieerd!' : 'Kopieer dit voorstel'),
        s.copied ? null : el('p', { role: 'status' }, 'Automatisch kopiëren lukte niet. Selecteer de tekst hieronder en kopieer die zelf.'),
        s.copied ? null : manual,
        el('ol', { class: 'steps' },
          el('li', {}, 'Ga naar het tweede Chrome-venster, met het andere Vue-account, op dezelfde voorstelling.'),
          el('li', {}, 'Klik daar op SeatBuddies → “Gekozen stoelen controleren” en plak (Ctrl+V of Cmd+V). De controle start meteen.'),
          el('li', {}, `Groen? Kies in dat venster stoel ${second} en hier stoel ${first} (rij ${s.pair.row}). Rond in elk venster de eigen boeking af.`),
        ),
        el('button', { type: 'button', class: 'link', onclick: () => set({ screen: 'home' }) }, 'Klaar'),
      ];
    return [
      header(s.copied ? 'Gekopieerd!' : 'Kopieer dit voorstel'),
      el('p', { role: 'status' }, s.copied
        ? 'Stuur dit bericht nu naar je partner, bijvoorbeeld via WhatsApp.'
        : 'Automatisch kopiëren lukte niet. Selecteer de tekst hieronder en kopieer die zelf.'),
      manual,
      el('ol', { class: 'steps' },
        el('li', {}, 'Je partner opent dezelfde voorstelling op Vue, met een eigen account.'),
        el('li', {}, 'Je partner klikt op SeatBuddies → “Gekozen stoelen controleren” en plakt het bericht.'),
        el('li', {}, `Groen? Dan kies jij stoel ${first} en je partner stoel ${second} (rij ${s.pair.row}). Ieder rondt de eigen boeking af.`),
      ),
      el('button', { type: 'button', class: 'link', onclick: () => set({ screen: 'home' }) }, 'Klaar'),
    ];
  }

  function inputView(s: Extract<State, { screen: 'b-input' | 'b-result' }>) {
    const area = el('textarea', { id: 'incoming', rows: '4', spellcheck: 'false', autocomplete: 'off', ...(s.screen === 'b-input' ? { 'data-autofocus': true } : {}) }, s.draft);
    area.addEventListener('input', () => {
      // Editing invalidates any earlier verdict immediately.
      if (state.screen === 'b-result' || (state.screen === 'b-input' && state.error)) {
        generation++;
        state = { screen: 'b-input', draft: area.value };
        render();
        (root.querySelector('#incoming') as HTMLTextAreaElement | null)?.focus();
        return;
      }
      if (state.screen === 'b-input') state = { screen: 'b-input', draft: area.value };
    });
    // Pasting is the deliberate action: check right away, one click less.
    area.addEventListener('paste', () => setTimeout(() => checkForB(area.value), 0));
    return [
      el('p', {}, 'Open in dit venster dezelfde voorstelling tot je de stoelkaart ziet.'),
      el('label', { for: 'incoming' }, 'Plak het SeatBuddies-voorstel'),
      area,
      el('button', { type: 'button', class: 'primary', onclick: () => checkForB(area.value) }, 'Controleer op deze pagina'),
    ];
  }

  function resultView(s: Extract<State, { screen: 'b-result' }>) {
    const { result, proposal } = s;
    const age = ageMinutes(proposal.readAt, deps.now());
    let tone: 'go' | 'warn' | 'stop' = 'stop';
    let title: string;
    let body: string;
    switch (result.kind) {
      case 'FREE':
        tone = 'go';
        title = `Stoel ${result.mine} is nu vrij`;
        body = `Rij ${result.row}: stoel ${result.mine} (dit account) ligt direct naast stoel ${result.theirs} (het andere account). Beide zijn vrij en van dezelfde soort als in het voorstel. Kies hier stoel ${result.mine} en rond de boeking af; stoel ${result.theirs} hoort bij het andere account.`;
        break;
      case 'PARTNER_SEAT_TAKEN':
        tone = 'warn';
        title = `Stoel ${result.mine} is vrij, stoel ${result.theirs} niet meer`;
        body = `Is stoel ${result.theirs} net voor het andere account gekozen of geboekt? Dan is dit verwacht: kies hier stoel ${result.mine} (rij ${result.row}) en rond af. Zo niet, dan heeft iemand anders hem: zoek opnieuw twee stoelen.`;
        break;
      case 'MINE_ALREADY_SELECTED':
        tone = 'warn';
        title = `Stoel ${result.mine} is hier al geselecteerd`;
        body = `Controleer zelf op Vue dat die direct naast stoel ${proposal.sender} ligt.`;
        break;
      case 'PARTNER_SEAT_SELECTED_BY_YOU':
        title = 'Let op: verkeerde stoel geselecteerd';
        body = `Hier is stoel ${result.theirs} geselecteerd. Die hoort bij het andere account; hier hoort stoel ${proposal.receiver}.`;
        break;
      case 'MINE_TAKEN':
        title = `STOP: stoel ${result.mine} is niet meer vrij`;
        body = 'Zoek opnieuw twee stoelen.';
        break;
      case 'OTHER_SHOWING': {
        title = 'STOP: andere voorstelling';
        const seen = s.observation.showing;
        body = `Deze pagina wijkt af van het voorstel bij ${result.differences.map((f) => `${FIELD_LABELS[f]} (hier: ${seen[f] ?? 'onbekend'}, voorstel: ${proposal.showing[f]})`).join('; ')}. Open exact dezelfde voorstelling.`;
        break;
      }
      case 'UNSAFE':
        title = 'STOP: niet veilig vastgesteld';
        body = `Op deze stoelkaart: ${UNSAFE[result.reason]}. Zoek opnieuw twee stoelen, of kies zelf op Vue.`;
        break;
      case 'UNKNOWN':
        title = 'STOP: niet te controleren';
        body =
          result.reason === 'PAGE' ? (s.observation.status === 'OK' ? 'Onbekend.' : PAGE_PROBLEMS[s.observation.status])
          : result.reason === 'MAP' ? (s.observation.map && s.observation.map.status !== 'OK' ? MAP_PROBLEMS[s.observation.map.status] : MAP_PROBLEMS.NO_MAP)
          : result.reason === 'SEAT_NOT_FOUND' ? 'Deze stoelnummers staan niet op deze stoelkaart.'
          : 'Of deze stoelen vrij zijn, is niet eenduidig te zien.';
        break;
    }
    return el('section', { class: `result ${tone}`, role: 'status', 'aria-live': 'polite' },
      el('h2', { tabindex: '-1', 'data-autofocus': true }, title),
      el('p', {}, body),
      tone !== 'stop' ? el('small', {}, 'Dit is een momentopname, geen reservering. Er wordt niets voor je vastgehouden.') : null,
      age !== null && age > 10 ? el('small', {}, `Het voorstel is ${age} minuten oud. De controle hierboven is wel actueel.`) : null,
    );
  }

  function render() {
    const s = state;
    const views: Child[] =
      s.screen === 'home' ? homeView()
      : s.screen === 'busy' ? [header(s.role === 'A' ? 'Kies twee stoelen' : 'Gekozen stoelen controleren'), el('p', { role: 'status' }, 'Stoelkaart lezen…')]
      : s.screen === 'a-problem' ? [header('Kies twee stoelen'), s.detail ? el('p', { class: 'showing' }, s.detail) : null, el('p', { class: 'stop', role: 'alert' }, s.text), el('button', { type: 'button', class: 'primary', onclick: readForA }, 'Opnieuw lezen'), reportButton()]
      : s.screen === 'a-choose' ? chooseView(s)
      : s.screen === 'a-shared' ? sharedView(s)
      : s.screen === 'b-input' ? [header('Gekozen stoelen controleren'), ...inputView(s), s.error ? el('p', { class: 'stop', role: 'alert' }, s.error) : null, s.reportable ? reportButton() : null]
      : [header('Gekozen stoelen controleren'), ...inputView(s), resultView(s), s.result.kind === 'FREE' ? null : reportButton()];
    root.replaceChildren(
      ...views.filter((v): v is Node | string => !!v),
      el('footer', {}, 'SeatBuddies reserveert of betaalt niets en is niet verbonden aan Vue.'),
    );
    // The last requested target wins: screen content (paste field, verdict)
    // before the generic heading.
    const targets = root.querySelectorAll<HTMLElement>('[data-autofocus]');
    targets[targets.length - 1]?.focus();
  }

  render();
  return { get state() { return state; } };
}
