import type { DialogueDef } from './types';

/**
 * All dialogue text. `speaker: 'crow'` resolves to the NPC's name and portrait
 * (see ui/DialoguePanel.ts); lines without a speaker are narration.
 */
export const DIALOGUES: DialogueDef[] = [
  // ── Signs & scenery (Wave 1) ─────────────────────────────────────────────
  {
    id: 'sign-garden',
    lines: [{ text: '„Botanischer Garten Erlenbrück — gegr. 1911“. Die Farbe blättert ab.' }],
  },
  {
    id: 'greenhouse-locked',
    lines: [
      { text: 'Die Tür des Gewächshauses ist fest verschlossen. Eine Kette, ein schweres Schloss.' },
      { text: 'Durch das beschlagene Glas schimmert etwas Grünes.' },
    ],
  },
  {
    id: 'bus-stop-sign',
    lines: [{ text: 'Der Fahrplan ist verblichen. „Linie 3 — Wasserturm“ ist noch zu lesen. Der letzte Bus fuhr vor sehr langer Zeit.' }],
  },
  {
    id: 'pond-edge',
    lines: [{ text: 'Das Wasser ist erstaunlich klar. Ein paar Seerosen treiben am Rand.' }],
  },
  {
    id: 'old-well',
    lines: [{ text: 'Ein alter Brunnen, halb von Moos bedeckt. Tief unten glitzert Wasser.' }],
  },
  {
    id: 'workbench',
    lines: [{ text: 'Eine Werkbank voller Tontöpfe, Bindfaden und vergilbter Notizen.' }],
  },
  {
    id: 'workshop-shelf',
    lines: [{ text: 'Regale mit beschrifteten Samentüten. Die meisten sind leer.' }],
  },

  // ── The crow ─────────────────────────────────────────────────────────────
  {
    id: 'crow-intro',
    lines: [
      { speaker: 'crow', text: 'Krah. — Nein, warte. Du verstehst mich? Gut. Das spart Zeit.' },
      { speaker: 'crow', text: 'Du bist die Neue. Die mit dem Brief und dem Erbe. Ich habe dich an der Haltestelle gesehen.' },
      { speaker: 'crow', text: 'Sie hat gesagt, irgendwann kommt jemand. Sie hat viel gesagt. Zum Schluss nur noch zu mir.' },
      { speaker: 'crow', text: 'Drei Beete. Im Hauptgarten, die dunkle Erde. Verwildert, seit sie fort ist. Bring sie zurück, dann reden wir weiter.' },
      { speaker: 'crow', text: 'Samen findest du im Garten, wenn du die Augen offen hältst. Ich halte meine auch offen. Immer.' },
    ],
  },
  {
    id: 'crow-waiting',
    lines: [
      { speaker: 'crow', text: 'Die Beete. Drei. Ich zähle mit.' },
      { speaker: 'crow', text: 'Brombeere im Nordwesten, Lilie im Nordosten, Lavendel im Südwesten. So hatte sie es. So will ich es wieder.' },
    ],
  },
  {
    id: 'crow-progress',
    lines: [
      { speaker: 'crow', text: 'Es wächst. Ich habe es gerochen, bevor ich es gesehen habe.' },
      { speaker: 'crow', text: 'Sie hat Seiten dagelassen. Nicht versteckt — hingelegt. Zwischen den Beeten. Für den, der sie wieder zum Blühen bringt.' },
    ],
  },
  {
    id: 'crow-pages-pending',
    lines: [
      { speaker: 'crow', text: 'Alle drei Beete. Gut. Aber du hast noch nicht alles gelesen, was sie dir hingelegt hat.' },
      { speaker: 'crow', text: 'Lies. Dann reden wir.' },
    ],
  },
  {
    id: 'crow-gives-key',
    lines: [
      { speaker: 'crow', text: 'Alle drei. Und du hast gelesen. Ich sehe es dir an — du hast jetzt diesen Blick. Den hatte sie auch.' },
      { speaker: 'crow', text: 'Sie hat mir etwas Glänzendes gegeben, bevor sie ging. Ich mag Glänzendes. Aber das hier war nie meins.' },
      { text: 'Die Krähe lässt einen schweren Messingschlüssel vor deine Füße fallen.' },
      { speaker: 'crow', text: 'Das Gewächshaus. Öffne es. Dort hat sie dir gezeigt, wo sie hingegangen ist.' },
    ],
  },
  {
    id: 'crow-key-given',
    lines: [
      { speaker: 'crow', text: 'Der Schlüssel passt. Ich habe zugesehen, wie sie ihn hundertmal gedreht hat.' },
      { speaker: 'crow', text: 'Das Gewächshaus. Nördlich vom Hauptgarten. Geh schon.' },
    ],
  },
  {
    id: 'crow-epilogue',
    lines: [
      { speaker: 'crow', text: 'Linie 3. Zum Wasserturm. Da ist sie hin.' },
      { speaker: 'crow', text: 'Ich fliege voraus. Du findest den Weg — du hast ja jetzt die Beete, die dir leuchten. Krah.' },
    ],
  },

  // ── Journal pages ────────────────────────────────────────────────────────
  {
    id: 'journal-page-bramble',
    style: 'page',
    title: 'Tagebuchseite · Die Brombeere',
    lines: [
      { text: 'Die Brombeere ist keine Feindin. Ich habe sie jahrelang zurückgeschnitten, bis ich endlich verstand: Sie wächst nicht gegen den Garten. Sie wächst für ihn.' },
      { text: 'Wo ich eine Ranke pflanze, weichen die wilden Dornen zurück — als würden sie eine Verwandte erkennen und ihr Platz machen. Ein gepflanzter Weg durchs Gestrüpp, wo vorher keiner war.' },
      { text: 'Die Amseln kamen zurück, sobald die erste Ranke blühte. Erst die Amseln, dann die Igel. Die Stadt war da schon still. Niemand hat es bemerkt außer mir.' },
      { text: 'Ich glaube, dieser Garten hält etwas zusammen, das größer ist als er selbst. Ich schreibe es auf, falls ich es irgendwann jemandem erklären muss. — M.' },
    ],
  },
  {
    id: 'journal-page-lily',
    style: 'page',
    title: 'Tagebuchseite · Die Leuchtlilie',
    lines: [
      { text: 'Die Leuchtlilie speichert den Tag. Ich habe sie aus dem Gewächshaus nach draußen geholt, als der Strom in Erlenbrück ausfiel — der letzte Winter, in dem noch jemand im Rathaus Licht gemacht hat.' },
      { text: 'Ihre Blüten geben nachts ab, was sie am Tag gesammelt haben. Kein grelles Licht. Eher wie ein Fenster, hinter dem jemand noch wach ist.' },
      { text: 'Die Falter folgen ihr, und wo Falter sind, finden die Fledermäuse zurück. Die Wühlmäuse dagegen meiden ihr Leuchten — sie graben nur im Dunkeln. Jedes Licht ist für irgendwen eine Einladung und für irgendwen eine Grenze.' },
      { text: 'Ich glaube inzwischen: Der Garten hat die Tiere nie verloren. Er hat sie nur nicht mehr gerufen. — M.' },
    ],
  },
  {
    id: 'journal-page-lavender',
    style: 'page',
    title: 'Tagebuchseite · Der Lavendel',
    lines: [
      { text: 'Lavendel beruhigt. Nicht nur mich. Die Zecken im hohen Gras ziehen ab, wenn er blüht, die Rehe kommen näher, und die Schnecken drehen auf halbem Weg wieder um.' },
      { text: 'Als der letzte Bus fuhr, habe ich den Lavendel an den Pfad gepflanzt — damit wenigstens die Tiere bleiben, wenn schon die Menschen gehen. Sie sind geblieben.' },
      { text: 'Ich gehe jetzt zum Wasserturm, der Krähe hinterher. Sie weiß etwas über die Stadt, das ich nur ahne. Ich komme wieder, wenn ich es verstanden habe.' },
      { text: 'Den Schlüssel zum Gewächshaus habe ich ihr gegeben. Sie gibt ihn nur jemandem, der die Beete versteht. Wenn du das liest: Du verstehst sie. — M.' },
    ],
  },
  {
    id: 'journal-page-found',
    lines: [{ text: 'Zwischen den jungen Blättern liegt eine vergilbte Seite, mit einem Stein beschwert. Handschrift. Ordentlich, aber eilig.' }],
  },

  // ── Greenhouse ───────────────────────────────────────────────────────────
  {
    id: 'greenhouse-unlock',
    lines: [
      { text: 'Der Schlüssel dreht sich schwer. Dann gibt das Schloss nach, und die Kette fällt ins Gras.' },
      { text: 'Warme, feuchte Luft schlägt dir entgegen. Es riecht nach Erde — und nach etwas, das blüht.' },
    ],
  },
  {
    id: 'map-board',
    lines: [
      { text: 'Ein Stadtplan von Erlenbrück, mit Bleistift überarbeitet. Eine Linie führt vom Garten über die alte Straßenbahntrasse hinaus — bis zum Wasserturm am Stadtrand.' },
      { text: 'Daneben, in ihrer Schrift: „Linie 3. Die Gleise sind noch da, nur zugewachsen. Wenn du das liest: Die Krähe kennt den Weg. — M.“' },
      { text: 'Eine zweite Notiz, kleiner: „Dort, wo die Stadt endet, fängt der Garten erst richtig an.“' },
    ],
  },
  {
    id: 'greenhouse-inner-locked',
    lines: [
      { text: 'Die innere Tür ist von Ranken verwachsen — von innen. Als hätte das Gewächshaus sich selbst verschlossen.' },
      { text: 'Dahinter, im Halbdunkel, bewegt sich etwas Grünes. Hier geht es weiter, sobald der Weg zum Wasserturm offen ist.' },
    ],
  },
  {
    id: 'planter-table',
    lines: [{ text: 'Anzuchtkästen voller Erde. Jemand hat hier zuletzt Lavendel vorgezogen — ein paar Samentüten liegen noch da.' }],
  },
  {
    id: 'vestibule-entered',
    lines: [
      { text: 'Der Vorraum des Gewächshauses. Glas, Moos, ein Tisch voller Töpfe. An der Wand hängt ein Plan.' },
    ],
  },

  // ── Night events (see systems/nightEvents.ts) ────────────────────────────
  {
    id: 'night-snails-hit',
    lines: [
      { text: 'Über Nacht waren Schnecken im Garten. An den jungen Trieben glänzen Schleimspuren — ein Beet hat ein Stück Wachstum verloren.' },
      { text: 'Schnecken meiden Lavendelduft. Ein blühender Lavendel im Garten hält sie von den zarten Beeten fern.' },
    ],
  },
  {
    id: 'night-snails-safe',
    lines: [
      { text: 'Schnecken kamen in der Nacht — und drehten am Lavendelduft wieder um. Die Beete sind unversehrt.' },
    ],
  },
  {
    id: 'night-voles-hit',
    lines: [
      { text: 'Wühlmäuse haben nachts an einem Beet gegraben. Ein Erdhügel, lockere Wurzeln — der junge Trieb braucht Zeit, um sich zu erholen.' },
      { text: 'Wühlmäuse scheuen Licht. Das Leuchten einer reifen Leuchtlilie hält sie von den Beeten in ihrer Nähe fern.' },
    ],
  },
  {
    id: 'night-voles-safe',
    lines: [
      { text: 'Wühlmäuse schnupperten nachts an den Beeten. Aber das Licht der Leuchtlilie war ihnen nicht geheuer — sie blieben im Dunkeln.' },
    ],
  },
  {
    id: 'night-crows-hit',
    lines: [
      { text: 'Krähen haben nachts in deinen Taschen gewühlt. Ein glänzendes Fundstück fehlt. Auf dem Hüttendach sitzt eine und tut unschuldig.' },
      { text: 'Krähen lieben Glänzendes — und nichts glänzt nachts wie eine Leuchtlilie. Oder man kennt die richtige Krähe.' },
    ],
  },
  {
    id: 'night-crows-friend',
    lines: [
      { text: 'Krähen kreisten über dem Garten. Dann ein scharfes Krah vom Hüttendach — und sie zogen ab.' },
      { text: 'Vor der Hüttentür liegt etwas Glänzendes. Deine Krähe hat es dir hingelegt. Als Pfand, oder als Entschuldigung für die Verwandtschaft.' },
    ],
  },
  {
    id: 'night-crows-lily',
    lines: [
      { text: 'Die Krähen umkreisten die halbe Nacht die Leuchtlilie und vergaßen darüber deine Taschen. Eine hat etwas Glänzendes fallen lassen.' },
    ],
  },
  {
    id: 'night-crows-nothing',
    lines: [{ text: 'Krähen suchten nachts nach Glänzendem. Bei dir gab es nichts zu holen — sie zogen weiter.' }],
  },
  {
    id: 'night-rain',
    lines: [
      { text: 'Nachtregen. Die Beete haben getrunken — die Triebe stehen ein Stück höher als gestern.' },
    ],
  },
  {
    id: 'night-rain-empty',
    lines: [{ text: 'Nachtregen trommelt auf das Glas des Gewächshauses. Die leeren Beete saugen das Wasser auf und warten.' }],
  },
];
