// Tiny invented markup based ONLY on issue #31's sanitised selector table.
const promo = '<h1>Promotie: De superhelden van morgen</h1>';
export const bookingAlpha = `${promo}<section data-test="booking-hero">
<h1 data-test="booking-film-title">Demo Alpha</h1><p class="booking-hero__cinema">Vue Teststad</p>
<span data-test="booking-hero-cinema-screen-name">Zaal 2</span>
<time data-test="booking-date-date" datetime="2030-04-12T19:30:00">vr 12 apr</time>
<time data-test="booking-date-start-time" datetime="19:30">19:30</time></section>
<h2 data-test="screen-title">Zaal 2</h2>`;
export const bookingBeta = `${promo}<section data-test="booking-hero">
<h1 class="booking-heading__title">Demo Beta</h1><p class="booking-hero__cinema">Vue Teststad</p>
<span class="booking-hero__cinema-screen">Zaal 5</span>
<time class="booking-date__date" datetime="2030-04-13T20:45:00">za 13 apr</time>
<time class="booking-date__time__start" datetime="2030-04-13T20:45:00">20:45</time></section>
<section class="checkout"><p>Fictieve accounttekst</p><input value="dummy-private-value"></section>`;
const quick = (values: string[]) =>
  `${promo}<div class="quick-book" role="complementary"><ul>${['venue', 'film', 'date', 'time'].map((field, i) => `<li data-test="quick-book-${field}-selector"><button data-test="dropdown-opener"><span class="dropdown-opener__label">NIET LEZEN</span><span class="dropdown-opener__title-value">${values[i]}</span></button><ul role="listbox" hidden><li>Andere film / 22:15 / Zaal 9</li><li>Nog een optie</li></ul></li>`).join('')}</ul>`;
export const quickBlank = `${quick(['Kies een locatie', 'Kies een film of evenement', 'Kies een datum', 'Kies een tijd'])}<button data-test="quick-book-cta" disabled>Zoeken</button></div>`;
export const quickSelected = `${quick(['Vue Teststad', 'Demo Alpha', 'za 13 apr', '20:45'])}<a data-test="quick-book-cta" href="/kopen/overzicht/fictief-geheim">Bestel Nu</a></div>`;
