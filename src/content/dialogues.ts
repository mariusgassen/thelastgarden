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
    lines: [
      { text: 'Das Wasser ist erstaunlich klar. Ein paar Seerosen treiben am Rand.' },
      { text: 'Am sonnigen Uferstreifen schimmern wilde Honigbeeren im Gras, weiter draußen stehen alte Schilfrohre.' },
    ],
  },
  {
    id: 'old-well',
    lines: [{ text: 'Ein alter Brunnen, halb von Moos bedeckt. Tief unten glitzert Wasser — einen Augenblick noch, dann lässt sich wieder Tau schöpfen.' }],
  },
  {
    id: 'old-well-draw',
    lines: [{ text: 'Du lässt den moosigen Eimer in den alten Brunnen hinab und schöpfst klaren, kühlen Tau herauf.' }],
  },
  {
    id: 'workbench',
    lines: [{ text: 'Eine Werkbank voller Tontöpfe, Bindfaden und vergilbter Notizen.' }],
  },
  {
    id: 'workshop-shelf',
    lines: [{ text: 'Regale mit beschrifteten Samentüten. Die meisten sind leer.' }],
  },
  {
    id: 'workshop-shelf-trowel',
    lines: [
      { text: 'Hinter den leeren Samentüten liegt eine abgewetzte Pflanzkelle — ihr Holzgriff ist vom jahrelangen Graben ganz glattgeschliffen.' },
      { text: 'Darunter klebt ein kleiner Zettel in M.s Handschrift: „Meine allererste Kelle. Wenn sie noch hier liegt, warten die Beete wieder auf helfende Hände.“' },
      { text: 'Am Regalrand steckt noch eine Küchennotiz: „Honigbeeren am Teich und Goldrüben im Südwestwinkel — wer sie erntet, weiß an der Werkbank sofort, was daraus zu kochen ist.“' },
    ],
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
      { text: 'Für die Werkbank: zwei frische Triebe und ein Tropfen Tau, in feuchtes Moos gewickelt. So wird ein Steckling daraus, den man bis an jedes Gestrüpp tragen kann. Jedes braucht seinen eigenen.' },
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
      { text: 'Für die Werkbank: zweimal Lichtpollen in ein Einmachglas, einen Sonnenstrahl dazu. Die Laterne hält genau eine Nacht — lang genug für Beete, die keine Lilie erreicht.' },
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
      { text: 'Für die Werkbank: zwei Duftbündel, in der Sonne getrocknet und in Leinen genäht. Ein Säckchen in der Tasche schützt eine Nacht lang auch die Beete, zu denen kein Lavendel hinüberduftet.' },
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
      { text: 'Du zeichnest den Plan in dein Notizheft ab. Orte, an denen du schon warst, findest du damit jederzeit wieder.' },
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
      { text: 'Schnecken meiden Lavendelduft. Ein blühender Lavendel im Garten hält sie von den zarten Beeten fern — oder ein Lavendelsäckchen von der Werkbank.' },
    ],
  },
  {
    id: 'night-snails-safe',
    lines: [
      { text: 'Schnecken kamen in der Nacht — und drehten am Lavendelduft wieder um. Die Beete sind unversehrt.' },
    ],
  },
  {
    id: 'night-snails-hens',
    lines: [
      { text: 'Schnecken kamen in der Nacht. Die Hühner waren früher wach und haben sie von den Beeten gepickt. Nichts ist angenagt.' },
    ],
  },
  {
    id: 'night-snails-ducks',
    lines: [
      { text: 'Schnecken kamen in der Nacht ans Ufer. Die Enten waren schneller und haben sie aufgelesen. Alle Beete sind unversehrt.' },
    ],
  },
  {
    id: 'night-snails-sachet',
    lines: [
      { text: 'Schnecken kamen in der Nacht. Der Duft aus deinem Lavendelsäckchen lag über den Beeten — sie drehten um. Das Säckchen ist nun verduftet.' },
    ],
  },
  {
    id: 'night-voles-lantern',
    lines: [
      { text: 'Wühlmäuse schnupperten nachts an den Beeten. Deine Lilienlaterne stand dazwischen und leuchtete bis zum Morgen — sie blieben im Dunkeln. Jetzt ist das Glas erloschen.' },
    ],
  },
  {
    id: 'night-voles-hit',
    lines: [
      { text: 'Wühlmäuse haben nachts an einem Beet gegraben. Ein Erdhügel, lockere Wurzeln — der junge Trieb braucht Zeit, um sich zu erholen.' },
      { text: 'Wühlmäuse scheuen Licht. Das Leuchten einer reifen Leuchtlilie hält sie von den Beeten in ihrer Nähe fern — oder eine Lilienlaterne von der Werkbank.' },
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

  // ── Episode 2: Workshop saw, Garden clues & Tramline ─────────────────────
  {
    id: 'crow-stump-note',
    lines: [
      { text: 'Auf dem Baumstumpf liegt eine einzelne schwarze Feder. Die Krähe ist wirklich nach Osten vorausgeflogen.' },
    ],
  },
  {
    id: 'workbench-saw',
    lines: [
      { text: 'Zwischen den Tontöpfen und vergilbten Notizen klemmt eine alte Klappsäge mit glattgeschliffenem Griff.' },
      { text: 'M. hat ein Schildchen an den Bügel gebunden: „Für den Uferweg, falls mal wieder eine Erle fällt.“' },
    ],
  },
  {
    id: 'tramline-locked',
    lines: [
      { text: 'Die verblichene Straße führt nach Osten ins Dickicht. Ohne Anhaltspunkt weißt du nicht, wohin sie führt.' },
      { text: 'Sieh dich zuerst im Garten und im Gewächshaus um.' },
    ],
  },
  {
    id: 'tram-stop-sign',
    lines: [
      { text: 'Ein emailliertes Schild unter Efeu: „Linie 3 · Haltestelle Stadtrand“.' },
      { text: 'Darunter ein Fahrplan ohne Enddatum. Jemand hat die letzten Abfahrten sauber mit Bleistift durchgestrichen.' },
    ],
  },
  {
    id: 'signal-box-door',
    lines: [
      { text: 'Das alte Stellwerk steht halb offen, doch drinnen wächst nur Farn aus den Hebelschlitzen.' },
      { text: 'Auf dem Fensterbrett glänzt noch der Messingrahmen einer alten Weichenlampe.' },
    ],
  },
  // ── Mohn, the garden's old mare (systems/horse.ts) ──────────────────────
  {
    id: 'mohn-intro',
    lines: [
      { text: 'Auf der Lichtung grast eine kastanienbraune Stute. In ihrer Mähne steckt eine verblichene rote Stoffblüte.' },
      { text: 'Sie hebt den Kopf, schnaubt leise und weicht einen Schritt zurück. Zutraulich ist sie nicht — aber neugierig.' },
      { text: 'Am Zaunpfahl neben ihr flattert ein Zettel im Wind.' },
    ],
  },
  {
    id: 'mohn-waiting',
    lines: [
      { text: 'Die Stute beobachtet dich aus sicherem Abstand und zupft weiter am Gras.' },
      { text: 'Mit leeren Händen kommst du ihr nicht näher. Auf dem Zettel am Zaunpfahl steht, was sie mag.' },
    ],
  },
  {
    id: 'mohn-tamed',
    lines: [
      { text: 'Du hältst ihr das Kräuterleckerli auf der flachen Hand hin. Mohn bläht die Nüstern, macht einen Schritt, dann noch einen.' },
      { text: 'Weiche Lippen sammeln den Riegel von deiner Hand. Dann stupst sie dich so fest gegen die Schulter, dass du beinahe umfällst.' },
      { text: 'Mohn kommt von nun an mit dir. Auf ihrem Rücken bist du draußen viel schneller unterwegs.' },
    ],
  },
  {
    id: 'journal-page-mohn',
    style: 'page',
    title: 'Zettel · Am Zaunpfahl',
    lines: [
      { text: 'Das ist Mohn. Sie hat früher den Gartenkarren gezogen: Erde, Setzlinge, Gießkannen, einmal sogar ein Klavier.' },
      { text: 'Ich kann sie nicht mitnehmen, wohin ich gehe. Hier auf der Trasse hat sie Gras, Schatten und ihre Ruhe.' },
      { text: 'Wer ihr Vertrauen will, bringt Kräuterleckerli mit. An der Werkbank: ein Brombeertrieb, ein Duftbündel, ein Tropfen Tau.' },
      { text: 'Sei gut zu ihr. Sie kennt jeden Weg in Erlenbrück besser als ich. — M.' },
    ],
  },
  {
    id: 'tramline-sign-east',
    lines: [
      { text: 'Ein hölzerner Wegweiser, von der Witterung grau geworden: „Wasserturm →“. Auf der Rückseite klebt eine kleine schwarze Feder.' },
    ],
  },

  // ── Episode 2: Water Tower, Crow & Owl (with branching choices) ──────────
  {
    id: 'crow-tower-intro',
    lines: [
      { speaker: 'crow', text: 'Da bist du ja. Ich dachte schon, die Dornen auf den Gleisen hätten dich aufgehalten.' },
      { speaker: 'crow', text: 'Hier endet Linie 3. Weiter oben auf der Mauer sitzt jemand, der älter ist als der Garten — und der M. hier oben begegnet ist.' },
      { speaker: 'crow', text: 'Sprich mit der Turmeule. Sei höflich. Sie mag kein Getöse.' },
    ],
  },
  {
    id: 'crow-tower-waiting',
    lines: [
      { speaker: 'crow', text: 'Die alte Zisterne unter dem Turm führte einst das Wasser bis ins Gewächshaus zurück. Hör auf die Eule.' },
    ],
  },
  {
    id: 'crow-tower-after-owl',
    lines: [
      { speaker: 'crow', text: 'Das Quellwasser läuft wieder — und du hast es in der Hand. Jetzt wird die Innentür im Gewächshaus nicht mehr stumm bleiben.' },
      { speaker: 'crow', text: 'Wir sehen uns dort drin. Krah.' },
    ],
  },
  {
    id: 'owl-intro',
    lines: [
      { speaker: 'owl', text: 'Schhh … tritt leise, Mensch. Dein Schritt klingt fast wie ihrer, damals im Spätherbst.' },
      { speaker: 'owl', text: 'Du trägst den Geruch von Erde und frischem Lavendel. Die Krähe hat also nicht gelogen.' },
      {
        speaker: 'owl',
        text: 'Frag ruhig, wenn du wegen ihr hier bist. Die Nacht ist geduldig.',
        choices: [
          { label: 'Was hat M. hier am Wasserturm gesucht?', nextDialogueId: 'owl-branch-m' },
          { label: 'Warum ist Erlenbrück eigentlich so still geworden?', nextDialogueId: 'owl-branch-town' },
          { label: 'Wie bekommen wir die innere Gewächshaustür auf?', nextDialogueId: 'owl-branch-water' },
        ],
      },
    ],
  },
  {
    id: 'owl-branch-m',
    lines: [
      { speaker: 'owl', text: 'Sie wollte wissen, ob hinter der Stadt überhaupt noch Lichter brennen. Wir saßen zusammen an jenem Geländer dort.' },
      { speaker: 'owl', text: 'Dann verstand sie, dass die alte Wasserader unter dem Turm immer noch ins Gewächshaus führt — nur verschlammt und vergessen.' },
      {
        speaker: 'owl',
        text: 'Sie hat ihre Notiz am Geländer hinterlassen und ist zurück ins Gewächshaus, um das Herzbeet zu schützen.',
        choices: [
          { label: 'Und warum ist Erlenbrück so still?', nextDialogueId: 'owl-branch-town' },
          { label: 'Wie wecken wir die Wasserader wieder?', nextDialogueId: 'owl-branch-water' },
          { label: 'Danke. Ich kümmere mich darum.', nextDialogueId: 'owl-branch-end' },
        ],
      },
    ],
  },
  {
    id: 'owl-branch-town',
    lines: [
      { speaker: 'owl', text: 'Es gab keinen Knall und keinen Streit. Erst fuhr die Straßenbahn seltener, dann schloss die Fabrik am Fluss, dann zogen die Kinder fort.' },
      { speaker: 'owl', text: 'Die Häuser blieben leer, aber die Gärten hörten nicht auf zu atmen. M. wollte wenigstens einen Ort bewahren, der auf die Rückkehr wartet.' },
      {
        speaker: 'owl',
        text: 'Und seit heute Nacht summen hier draußen sogar wieder die Nachtfalter.',
        choices: [
          { label: 'Was hat M. hier am Turm getan?', nextDialogueId: 'owl-branch-m' },
          { label: 'Wie öffnen wir das innere Gewächshaus?', nextDialogueId: 'owl-branch-water' },
          { label: 'Ich werde den Garten bewahren.', nextDialogueId: 'owl-branch-end' },
        ],
      },
    ],
  },
  {
    id: 'owl-branch-water',
    lines: [
      { speaker: 'owl', text: 'Die Ranken im Gewächshaus haben die Tür von innen zugezogen, um die letzten Sporen vor dem Frost zu hüten. Gewalt würde sie nur verletzen.' },
      { speaker: 'owl', text: 'Repariere das alte Zisternen-Ventil hier auf dem Platz — es braucht klares Wasser als Dichtung, etwas gespeicherte Wärme und ein passendes Metallteil.' },
      { speaker: 'owl', text: 'Und pflanze eine Leuchtlilie in das Beet am Turm. Wenn Wasser und Licht wieder zusammenfinden, gebe ich dir eine Phiole vom frischen Quellwasser.' },
    ],
  },
  {
    id: 'owl-branch-end',
    lines: [
      { speaker: 'owl', text: 'Gut. Bring das Ventil an der Zisterne wieder in Gang und lass eine Leuchtlilie am Turm erblühen. Danach wartet frisches Quellwasser auf dich.' },
    ],
  },
  {
    id: 'owl-waiting',
    lines: [
      {
        speaker: 'owl',
        text: 'Der Turm wartet auf fließendes Wasser aus der Zisterne und auf das sanfte Licht einer reifen Leuchtlilie.',
        choices: [
          { label: 'Was brauche ich für die Zisterne?', nextDialogueId: 'owl-branch-water' },
          { label: 'Warum ist Erlenbrück so still?', nextDialogueId: 'owl-branch-town' },
          { label: 'Bis gleich.', nextDialogueId: 'owl-branch-end' },
        ],
      },
    ],
  },
  {
    id: 'owl-gives-vial',
    lines: [
      { speaker: 'owl', text: 'Hörst du das leise Singen in den Rohren? Und sieh nur, wie die Leuchtlilie die grauen Steine wärmt.' },
      { speaker: 'owl', text: 'Seit Jahren hat hier oben nichts mehr so ruhig geleuchtet. M. hatte recht mit dir.' },
      { text: 'Die Turmeule lässt eine kleine gläserne Phiole voller kühlem, klarem Wasser vor dir niedergleiten.' },
      { speaker: 'owl', text: 'Trag es zurück ins Gewächshaus. Gieße es über die Ranken an der inneren Tür — sie werden es erkennen.' },
    ],
  },
  {
    id: 'owl-after-vial',
    lines: [
      { speaker: 'owl', text: 'Das Wasser singt unter unseren Füßen bis zurück zum Garten. Geh ruhig hinunter — ich halte hier oben Wache.' },
    ],
  },

  {
    id: 'cistern-missing',
    lines: [
      { text: 'Das alte Zisternen-Ventil klemmt trocken im Stein. Die Dichtung ist porös und ein Zahnrad im Handrad fehlt.' },
      { text: 'Mit einer Ventildichtung von der Werkbank, 2× Sonnenlicht und 1× Fundstück als Zahnrad ließe sich die Leitung wieder abdichten.' },
    ],
  },
  {
    id: 'cistern-repaired',
    lines: [
      { text: 'Du setzt das Fundstück ins Handrad ein, drückst die neue Dichtung in den Sitz und wärmst das kalte Messing mit gesammeltem Sonnenlicht.' },
      { text: 'Ein tiefes, zufriedenes Rauschen läuft durch die Steine unter dir. Klares Quellwasser steigt ins Becken!' },
    ],
  },
  {
    id: 'cistern-done',
    lines: [{ text: 'Die Zisterne führt wieder klares Wasser. Tief unter dem Platz summt die alte Leitung Richtung Garten.' }],
  },

  {
    id: 'tower-vista',
    lines: [
      { text: 'Hinter dem Geländer breiten sich die stillen Dächer von Erlenbrück aus — Schornsteine, verwilderte Hinterhöfe und dazwischen viel Grün.' },
      { text: 'Ganz im Westen schimmert im Dunst das Glasdach des Botanischen Gartens.' },
    ],
  },
  {
    id: 'water-tower-door',
    lines: [{ text: 'Die Eichentür des Wasserturms ist vernagelt, doch im Inneren hört man das leise Echo tropfenden Wassers.' }],
  },

  {
    id: 'journal-page-tower',
    style: 'page',
    title: 'Notiz · Vom Wasserturm',
    lines: [
      { text: 'Von hier oben sieht man die ganze Stadt auf einmal. Sie wirkt gar nicht tot — eher wie ein Zimmer, aus dem alle nur kurz hinausgegangen sind.' },
      { text: 'Die alte Wasserleitung zum Gewächshaus ist noch heil. Sie wartet nur darauf, dass jemand das Ventil unten am Turm wieder öffnet.' },
      { text: 'Die Dichtung ist hin. Ich würde sie an der Werkbank neu drehen: ein Brombeertrieb für die Faser, ein Duftbündel als Füllung. Der Garten liefert, was die Stadt nicht mehr hat.' },
      { text: 'Ich gehe jetzt zurück in den Herzraum des Gewächshauses und schließe hinter mir ab, bis jemand kommt, der die Beete versteht. Die Krähe weiß Bescheid. — M.' },
    ],
  },

  // ── Episode 2: Greenhouse Heart & Finale ─────────────────────────────────
  {
    id: 'greenhouse-inner-unlock',
    lines: [
      { text: 'Du gießt das klare Quellwasser vom Wasserturm behutsam über die verflochtenen Wurzeln an der Tür.' },
      { text: 'Die Ranken zittern leicht, lösen ihren Griff wie nach einem langen Schlaf und geben den Durchgang ins Innere frei.' },
    ],
  },
  {
    id: 'fountain-basin',
    lines: [
      { text: 'Klares Wasser plätschert aus der Mitte des steinernen Beckens — genau dasselbe Wasser, das oben am Wasserturm entspringt.' },
      { text: 'Die Luft hier drinnen ist mild, feucht und riecht nach altem Moos.' },
    ],
  },
  {
    id: 'fountain-basin-draw',
    lines: [
      { text: 'Du hältst deine Phiole unter den sanften Wasserstrahl des Steinbeckens und fängst frischen Tau auf.' },
    ],
  },
  {
    id: 'seed-archive',
    lines: [
      { text: 'Hunderte kleine Glasfläschchen, sauber beschriftet nach Straßen und Gärten von Erlenbrück: „Lindenweg 4 · Stockrose“, „Alte Mühle · Nachtviole“.' },
      { text: 'M. hat aus jedem verlassenen Garten der Stadt eine Handvoll Zukunft gerettet.' },
    ],
  },
  {
    id: 'moon-desk',
    lines: [
      { text: 'Ein kleiner Schreibtisch unter dem Glasdach. Eine Laterne steht bereit, daneben eine Teetasse, die längst kalt geworden ist.' },
    ],
  },
  {
    id: 'journal-page-heart',
    style: 'page',
    title: 'Brief · An die neue Gärtnerin',
    lines: [
      { text: 'Wenn du diese Zeilen liest, haben meine Ranken dich eingelassen — und das heißt, du hast nicht nur gepflanzt, sondern zugehört.' },
      { text: 'Ich bin nicht fortgelaufen. Als Erlenbrück einschlief, habe ich die letzten Samen aller Gärten hier im Herzraum gesammelt, damit sie auf jemanden warten können, der Geduld mitbringt.' },
      { text: 'Der Mondfarn im Glasfläschchen ist die älteste Pflanze dieses Hauses. Wenn er im Herzbeet blüht, erinnert sich der ganze Garten an seinen Ursprung.' },
      { text: 'Noch etwas Praktisches, falls du mir folgst: Alte Holzrinnen dichtet man mit einem Zopf aus zwei Duftbündeln, in Tau eingeweicht. Mein Kräuterregal im Gartenhaus taugt als Werkbank.' },
      { text: 'Ich bin die alte Bahntrasse noch ein Stück weiter hinaufgezogen, zu den Obstwiesen hinter dem Hügel. Pflege Erlenbrücks letzten Garten — und vielleicht sehen wir uns dort draußen. — M.' },
    ],
  },
  {
    id: 'crow-heart-finale',
    lines: [
      { speaker: 'crow', text: 'Hier drin ist es still, nicht wahr? Als ich ein Jungvogel war, schlief M. manchmal genau auf dieser Bank ein.' },
      { speaker: 'crow', text: 'Jetzt bist du hier, die Beete draußen leuchten wieder, und die Quelle fließt.' },
      {
        speaker: 'crow',
        text: 'Sag mir, was du als Nächstes vorhast, Gärtnerin.',
        choices: [
          { label: 'Ich lasse zuerst den Mondfarn blühen und pflege diesen Garten.', nextDialogueId: 'crow-heart-garden' },
          { label: 'Ich will irgendwann M. hinter dem Hügel suchen.', nextDialogueId: 'crow-heart-journey' },
          { label: 'Bleibst du denn hier bei mir, Krähe?', nextDialogueId: 'crow-heart-stay' },
        ],
      },
    ],
  },
  {
    id: 'crow-heart-garden',
    lines: [
      { speaker: 'crow', text: 'Eine gute Antwort. Ein Garten entsteht nicht an einem Nachmittag — aber jeder Samen merkt sich, wer ihn in die Erde gelegt hat.' },
      { speaker: 'crow', text: 'Und solange hier etwas wächst, bleiben die Amseln, die Falter, die Eule und ich auch.' },
    ],
  },
  {
    id: 'crow-heart-journey',
    lines: [
      { speaker: 'crow', text: 'Ha! Das habe ich gehofft. Aber lass zuerst den Mondfarn hier wurzeln — ohne sein Licht findet man die Obstwiesen im Nebel schlecht.' },
      { speaker: 'crow', text: 'Wenn es so weit ist, kenne ich auch den Weg hinter den Hügel. Krah.' },
    ],
  },
  {
    id: 'crow-heart-stay',
    lines: [
      { speaker: 'crow', text: 'Solange du ab und zu ein Glanzstück fallen lässt und das Unkraut nicht zu ernst nimmst? Natürlich.' },
      { speaker: 'crow', text: 'Irgendwer muss schließlich aufpassen, dass du ordentlich gießt.' },
    ],
  },
  {
    id: 'crow-heart-waiting',
    lines: [
      { speaker: 'crow', text: 'Die Mondfarn-Sporen liegen gleich drüben beim Saatgut-Archiv. Das große Herzbeet in der Mitte wartet schon auf sie.' },
    ],
  },
  {
    id: 'crow-heart-after',
    lines: [
      { speaker: 'crow', text: 'Sieh dir dieses Licht an … Der Herzraum atmet wieder, genau wie früher.' },
      { speaker: 'crow', text: 'Draußen im Garten, an der Linie 3 und am Wasserturm gehört jetzt alles dir. Ruh dich aus oder pflanze weiter — der Garten läuft nicht weg. Krah.' },
    ],
  },

  // ── Episode 3: Wasserturm-Nordpfad & Hügelpfad im Nebel ──────────────────
  {
    id: 'tower-sign-north',
    lines: [
      { text: 'Ein wettergegerbter Holzpfeil zeigt bergauf in den Wald: „Hügelkamm · Obstwiesen ↑“.' },
      { text: 'Darunter hängt ein kleines Messingglöckchen, das im Wind kaum hörbar klingelt.' },
    ],
  },
  {
    id: 'hill-path-locked',
    lines: [
      { text: 'Ein schmaler Waldweg steigt hinter dem Wasserturm den Hang hinauf, doch dichter grauer Nebel schluckt jeden Schritt.' },
      { text: 'Lass zuerst den Mondfarn im Herzraum des Gewächshauses erblühen — erst mit seinem Licht findest du über den Hügel.' },
    ],
  },
  {
    id: 'owl-hill-hint',
    lines: [
      { speaker: 'owl', text: 'Hinter mir den Pfad hinauf zieht der Herbstnebel besonders tief über den Kamm.' },
      { speaker: 'owl', text: 'Aber ich spüre das silberne Licht deines Mondfarns bis hier herauf. Geh den Nordpfad entlang — die Obstwiesen warten hinter dem Rücken des Hügels.' },
    ],
  },
  {
    id: 'owl-episode3-after',
    lines: [
      { speaker: 'owl', text: 'Selbst bis hier oben auf den Turm weht heute ein Duft von Apfelblüten und Nachtviolen herüber.' },
      { speaker: 'owl', text: 'Du und M. habt Erlenbrück etwas zurückgegeben, das kein Fahrplan mehr versprechen konnte.' },
    ],
  },
  {
    id: 'crow-hill-intro',
    lines: [
      { speaker: 'crow', text: 'Hu, ganz schön frisch hier oben auf dem Kamm! Aber du hast es bis zum Hügelpfad geschafft.' },
      { speaker: 'crow', text: 'Siehst du die weiße Nebelwand dort vorne im Engpass? Ohne Führung verläuft man sich in ihr stundenlang.' },
      { speaker: 'crow', text: 'Geh nah an den Nebel heran — dein Mondfarn drüben im Herzraum kennt dieses Tal seit hundert Jahren. Sein Licht zeigt dir den Durchgang. Krah!' },
    ],
  },
  {
    id: 'crow-hill-waiting',
    lines: [
      { speaker: 'crow', text: 'Immer noch neblig? Geh dicht an die Nebelbank auf dem Kamm — das Licht des Mondfarns trägt weiter, als du denkst.' },
    ],
  },
  {
    id: 'hill-lantern',
    lines: [
      { text: 'Eine kleine steinerne Weglaterne am Wegesrand. Moos wächst auf dem Dach, aber das Glas im Inneren ist blitzsauber gewischt.' },
      { text: 'Jemand hat ein getrocknetes Farnblatt auf den Sockel gelegt.' },
    ],
  },
  {
    id: 'hill-cairn',
    lines: [
      { text: 'Ein alter Grenzstein aus Sandstein: „Erlenbrücker Obsthänge · gest. 1924“.' },
      { text: 'Von hier oben öffnet sich der Blick in ein windgeschütztes Tal voll alter Baumkronen.' },
    ],
  },

  // ── Episode 3: Die alten Obstwiesen & M.s Gartenhaus ─────────────────────
  {
    id: 'crow-orchard-intro',
    lines: [
      { speaker: 'crow', text: 'Geschafft! Willkommen hinter dem Hügel — hier hängen noch die alten Holzleitern in den Kirschbäumen.' },
      { speaker: 'crow', text: 'M. wohnt dort drüben in dem kleinen Gartenhaus am Bach. Aber eben habe ich sie den Hang hinaufgehen sehen, zum großen Mutterbaum.' },
      { speaker: 'crow', text: 'Eine Brombeerhecke hat den Aufstieg überwuchert. Hier, zwei Triebe aus deinem Garten — mit einem Tropfen Tau wird an M.s Kräuterregal ein Steckling daraus. Krah!' },
    ],
  },
  {
    id: 'crow-orchard-waiting',
    lines: [
      { speaker: 'crow', text: 'M. steht oben auf der Terrasse am Mutterbaum. Überquere den Bach auf der Holzbrücke und teile die Brombeerhecke am Hang mit einem Steckling. Werkeln kannst du an M.s Kräuterregal im Gartenhaus.' },
    ],
  },
  {
    id: 'crow-orchard-after',
    lines: [
      { speaker: 'crow', text: 'Weißt du, wie lange diese alten Bäume keine einzige Blüte mehr gezeigt haben? Sogar die Wildbienen sind ganz aufgeregt.' },
      { speaker: 'crow', text: 'Und M. lächelt wieder. Das war jeden einzelnen Samen wert. Krah.' },
    ],
  },
  {
    id: 'orchard-sluice-missing',
    lines: [
      { text: 'Die hölzerne Bewässerungsrinne am Hang ist ausgetrocknet. Ein Keil im Sperrschieber fehlt, und das Holz ist spröde.' },
      { text: 'Mit einem Dichtzopf von der Werkbank, 1× Sonnenlicht und 1× Fundstück als Metallkeil lässt sich das Wasser wieder auf die Obstwiese leiten.' },
    ],
  },
  {
    id: 'orchard-sluice-repaired',
    lines: [
      { text: 'Du klemmst das Fundstück als Keil in das Wehr, drückst den feuchten Dichtzopf in die trockenen Fugen und löst das harzige Holz mit warmem Sonnenlicht.' },
      { text: 'Mit einem fröhlichen Glucksen schießt klares Bergwasser in die alte Rinne und sickert bis unter die Wurzeln der Apfelbäume!' },
    ],
  },
  {
    id: 'orchard-sluice-done',
    lines: [
      { text: 'Klares Wasser plätschert stetig durch die Rinne bergab zur Bienenwiese.' },
    ],
  },
  {
    id: 'orchard-beehive-quiet',
    lines: [
      { text: 'Zwei verwitterte Bienenkästen aus Lärchenholz am Rand der Obstwiese. Alles darin schläft noch still.' },
      { text: 'Wenn hier wieder Nachtviolen blühen, kehren vielleicht auch die Bestäuber zurück.' },
    ],
  },
  {
    id: 'orchard-beehive-active',
    lines: [
      { text: 'Ein sanftes, zufriedenes Brummen erfüllt den Bienenstand. Goldene Wildbienen fliegen zwischen den blauen Nachtviolen und den Obstbäumen hin und her.' },
    ],
  },
  {
    id: 'orchard-cider-press',
    lines: [
      { text: 'Eine alte hölzerne Spindelpresse unter einem Wetterdach. Daneben stehen sorgfältig gestapelte Weidenkörbe für die nächste Ernte.' },
      { text: 'Mit 2× Honigbeere und 1× Tau lässt sich hier auch ohne Sonnenlicht sogleich frisches Beerenmus pressen.' },
    ],
  },
  {
    id: 'orchard-cider-press-use',
    lines: [
      { text: 'Du drehst die hölzerne Spindel mit gleichmäßigen Zügen. Goldroter Saft tropft in die Schale — warmes, süßes Beerenmus!' },
    ],
  },
  {
    id: 'mother-tree-dormant',
    lines: [
      { text: 'Ein gewaltiger, knorriger Apfelbaum — älter als alle Häuser unten in Erlenbrück. Seine Zweige tragen dichte Knospen, die nur auf Wasser und Wärme warten.' },
    ],
  },
  {
    id: 'mother-tree-bloom',
    lines: [
      { text: 'Über und über bedeckt mit rosaweißen Blüten summt der alte Mutterbaum im Sonnenlicht. Zarte Blütenblätter tanzen bis in den Bach hinab.' },
    ],
  },

  // ── M.s Gartenhaus ───────────────────────────────────────────────────────
  {
    id: 'cottage-stove',
    lines: [
      { text: 'Ein grüner Kachelofen mit einer Messingkanne darauf. Es riecht nach Apfelholz, Kamille und trockenem Moos.' },
      { text: 'Sobald du Honigbeeren oder Goldrüben erntest — oder in einer Mühle Blütenmehl mahlst — kannst du hier am Herd warme Speisen zubereiten.' },
    ],
  },
  {
    id: 'cottage-valley-map',
    lines: [
      { text: 'Eine handgezeichnete Karte des ganzen Tals: Erlenbrück liegt westlich des Hügels, die Obstwiesen im Windschatten — und dahinter führen gestrichelte Linien weiter zu einer alten Mühle und zu drei stillen Höfen am Fluss.' },
      { text: 'An den Rand hat M. geschrieben: „So viele verlassene Gärten warten noch darauf, dass man ihre Namen nicht vergisst.“' },
    ],
  },
  {
    id: 'cottage-herb-rack',
    lines: [
      { text: 'Bündel von Lavendel, Salbei und Schafgarbe hängen sauber beschriftet an kleinen Holzhaken zum Trocknen.' },
    ],
  },
  {
    id: 'cottage-tea-table',
    lines: [
      { text: 'Auf dem runden Holztisch stehen bereits zwei Tassen — eine mit einem frischen Minzblatt, als hätte M. dich erwartet.' },
    ],
  },
  {
    id: 'cottage-seed-chest',
    lines: [
      { text: 'Eine hübsch bemalte Holztruhe voller Papiertütchen mit handgeschriebenen Sortennamen: „Goldreinette“, „Winterprinzen“ und ganz oben noch ein Tütchen Nachtviolen-Samen.' },
    ],
  },
  {
    id: 'cottage-seed-chest-done',
    lines: [
      { text: 'Die Samen-Truhe duftet nach getrockneten Kräutern und sauberem Papier.' },
    ],
  },
  {
    id: 'journal-page-orchard',
    style: 'page',
    title: 'Notizbuch · Die Obstwiesen',
    lines: [
      { text: 'Als die Menschen aus Erlenbrück fortgingen, habe ich nicht nur die Beete im Botanischen Garten gepflegt. Jede Woche stieg ich über den Hügel hierher.' },
      { text: 'Die alten Obstbäume tragen die Erinnerung ganzer Generationen in ihrer Rinde. Solange man ihre Wasserader offen hält und im Frühjahr Nachtviolen für die Wildbienen sät, überdauern sie jedes Schweigen.' },
      { text: 'Aus dem Nektar der Nachtviolen koche ich in der Sonne ein zähes Wachs. Zweimal Nektar, ein Sonnenstrahl — damit lief früher jede Achse im Tal, auch die der Mühle am Fluss.' },
      { text: 'Doch allein reichten meine Hände irgendwann nicht mehr bis ganz ans Ende der Wiese. Deshalb habe ich den Schlüssel im Garten hinterlassen.' },
      { text: 'Falls du heute hier stehst und diese Zeilen liest: Jetzt gibt es wieder zwei Paar Hände in Erlenbrück. — M.' },
    ],
  },

  // ── NPC M. (branching dialogues) ─────────────────────────────────────────
  {
    id: 'm-intro',
    lines: [
      { speaker: 'm', text: '… Ich wusste es doch. Die Krähe fliegt niemals umsonst so laut krächzend über den Kamm.' },
      { speaker: 'm', text: 'Du hast es wirklich bis hinter den Hügel geschafft — mit Mondfarnlicht im Gepäck. Willkommen auf den Obstwiesen, junge Gärtnerin.' },
      {
        speaker: 'm',
        text: 'Ich bin M. Ich glaube, du hast in den letzten Tagen mehr über mich gelesen als irgendjemand sonst.',
        choices: [
          { label: 'Deine Tagebuchseiten haben mir den ganzen Weg gezeigt.', nextDialogueId: 'm-intro-pages' },
          { label: 'Warum bist du bis hier hinter den Hügel gezogen?', nextDialogueId: 'm-intro-orchard' },
          { label: 'Was können wir für die Obstwiesen tun?', nextDialogueId: 'm-intro-task' },
        ],
      },
    ],
  },
  {
    id: 'm-intro-pages',
    lines: [
      { speaker: 'm', text: 'Es beruhigt mich sehr, das zu hören. Manchmal dachte ich, meine Notizen lägen am Ende nur für den Regen dort.' },
      { speaker: 'm', text: 'Hier draußen warte ich seit dem Spätsommer darauf, dass der Mutterbaum endlich wieder Kraft schöpft.' },
      { speaker: 'm', text: 'Nimm dieses Tütchen Nachtviolen-Samen. Wenn die alte Bewässerungsrinne unten wieder fließt und die Nachtviolen am Bienenstand blühen, erwacht der ganze Hang.' },
      { speaker: 'm', text: 'Und sieh dir ruhig mein Gartenhaus unten am Bach an — auf dem Tisch liegt mein letztes Notizbuch für dich.' },
    ],
  },
  {
    id: 'm-intro-orchard',
    lines: [
      { speaker: 'm', text: 'Weil ein einzelner Garten in der Stadt nie genug Platz hat für alles, was überleben muss. Hier oben wachsen Apfelsorten, die es nirgendwo sonst mehr gibt.' },
      { speaker: 'm', text: 'Aber die alte Bewässerungsrinne am Bach klemmt, und ohne duftende Nachtviolen fehlen dem Hang die Wildbienen.' },
      { speaker: 'm', text: 'Hier, nimm diese Nachtviolen-Samen. Schau danach gern unten in meinem Gartenhaus vorbei — dort liegt mein Obstwiesen-Notizbuch auf dem Tisch.' },
    ],
  },
  {
    id: 'm-intro-task',
    lines: [
      { speaker: 'm', text: 'Gleich drei kleine Dinge, genau nach deinem Geschmack: Öffne die Bewässerungsrinne am Bach, pflanze diese Nachtviolen beim Bienenstand und lies in meinem Gartenhaus mein Notizbuch.' },
      { speaker: 'm', text: 'Für die Rinne gebe ich dir zwei Duftbündel von meinem Hut mit. In Tau eingeweicht wird an meinem Kräuterregal ein Dichtzopf daraus.' },
      { speaker: 'm', text: 'Wenn Wasser, Blüten und Erinnerung zusammenfinden, wird der Mutterbaum wieder blühen. Danach treffen wir uns wieder hier oben.' },
    ],
  },
  {
    id: 'm-waiting',
    lines: [
      {
        speaker: 'm',
        text: 'Wie läuft es unten auf der Wiese? Wir brauchen fließendes Wasser in der Rinne, blühende Nachtviolen am Bienenstand und einen Blick in mein Notizbuch im Gartenhaus.',
        choices: [
          { label: 'Wo kann ich die Nachtviolen pflanzen?', nextDialogueId: 'm-help-violet' },
          { label: 'Was braucht die Bewässerungsrinne genau?', nextDialogueId: 'm-help-sluice' },
          { label: 'Wo liegt dein Gartenhaus?', nextDialogueId: 'm-help-cottage' },
          { label: 'Ich mache mich gleich an die Arbeit.', nextDialogueId: 'm-help-bye' },
        ],
      },
    ],
  },
  {
    id: 'm-help-violet',
    lines: [
      { speaker: 'm', text: 'Gleich unterhalb dieses Hangs neben den hölzernen Bienenkästen liegt ein vorbereitetes Beet. Und falls du noch ein Tütchen brauchst: in der Samen-Truhe in meinem Gartenhaus liegt Ersatz.' },
    ],
  },
  {
    id: 'm-help-sluice',
    lines: [
      { speaker: 'm', text: 'Das Wehr am Bach braucht 2× Sonnenlicht, 2× Tau und 1× Fundstück als Keil. Hier oben auf der Terrasse und unten an der Wiese findest du genug davon.' },
    ],
  },
  {
    id: 'm-help-cottage',
    lines: [
      { speaker: 'm', text: 'Überquere unten einfach wieder die Holzbrücke nach Westen — im Nordwesten der Obstwiese wartet das kleine Holzhaus mit dem grünen Kachelofen.' },
    ],
  },
  {
    id: 'm-help-bye',
    lines: [
      { speaker: 'm', text: 'Lass dir Zeit. Ein guter Obstgarten kennt keine Hast.' },
    ],
  },
  {
    id: 'm-orchard-awakened',
    lines: [
      { speaker: 'm', text: 'Hörst du das? Das Wasser singt in den Gräben, die Bienen haben die Nachtviolen gefunden — und über uns öffnen sich schon die ersten Blüten am Mutterbaum!' },
      { speaker: 'm', text: 'Vor ein paar Wochen hätte ich nie geglaubt, dass ich diesen Frühling noch einmal mit jemand anderem teilen darf.' },
      {
        speaker: 'm',
        text: 'Sag mir ehrlich: Wohin soll unsere nächste Arbeit gehen, wenn die Obstwiesen jetzt gerettet sind?',
        choices: [
          {
            label: 'Wir tragen diese neuen Samen zurück in die verlassenen Gärten von Erlenbrück.',
            nextDialogueId: 'm-legacy-town',
            setFlags: ['legacy-choice-town'],
          },
          {
            label: 'Wir folgen deiner Karte bis zur Alten Mühle und den Höfen am Fluss.',
            nextDialogueId: 'm-legacy-valley',
            setFlags: ['legacy-choice-valley'],
          },
          {
            label: 'Zeig mir erst, wie man alte Sorten wie den Goldreinettenbaum veredelt.',
            nextDialogueId: 'm-legacy-graft',
            setFlags: ['legacy-choice-graft'],
          },
        ],
      },
    ],
  },
  {
    id: 'm-legacy-town',
    lines: [
      { speaker: 'm', text: 'Ja … Die Stadt hat den Botanischen Garten nie vergessen, sie wusste nur nicht mehr, wie man anfängt. Mit dir wächst die Hoffnung jetzt von innen nach außen.' },
      { speaker: 'm', text: 'Nimm dieses Goldreinetten-Edelreis als mein Versprechen mit: Unsere Arbeit hier hinter dem Hügel fängt gerade erst richtig an.' },
    ],
  },
  {
    id: 'm-legacy-valley',
    lines: [
      { speaker: 'm', text: 'Du hast meine Karte im Gartenhaus also genau angesehen! Hinter der Alten Mühle liegen die schönsten vergessenen Bauerngärten des Tals.' },
      { speaker: 'm', text: 'Nimm dieses Goldreinetten-Edelreis mit auf den Weg — sobald wir bereit sind, gehen wir das nächste Tal gemeinsam an.' },
    ],
  },
  {
    id: 'm-legacy-graft',
    lines: [
      { speaker: 'm', text: 'Sehr gern. Wer einen Zweig veredelt, pflanzt für Menschen, deren Namen er noch gar nicht kennt.' },
      { speaker: 'm', text: 'Nimm dieses Goldreinetten-Edelreis an dich — der Botanische Garten und diese Obstwiesen gehören nun genauso dir wie mir.' },
    ],
  },
  {
    id: 'm-after',
    lines: [
      {
        speaker: 'm',
        text: 'Sieh nur diese Blütenkrone über uns. Es fühlt sich an, als hätte das ganze Tal einmal tief durchgeatmet.',
        choices: [
          { label: 'Bleibst du jetzt hier oben auf den Obstwiesen?', nextDialogueId: 'm-after-stay' },
          { label: 'Was wächst als Nächstes in Erlenbrück?', nextDialogueId: 'm-after-future' },
          { label: 'Ich gehe noch etwas durch den Garten spazieren.', nextDialogueId: 'm-after-rest' },
        ],
      },
    ],
  },
  {
    id: 'm-after-stay',
    lines: [
      { speaker: 'm', text: 'Im Moment bleibe ich hier zwischen dem Mutterbaum und meinem Ofen — und sobald im Garten unten Platz für eine neue Obstreihe ist, komme ich dich besuchen.' },
    ],
  },
  {
    id: 'm-after-future',
    lines: [
      { speaker: 'm', text: 'Auf meiner Karte im Gartenhaus wartet noch die Alte Mühle hinter den Wiesen. Aber heute genießen wir erst einmal, was schon blüht.' },
    ],
  },
  {
    id: 'm-after-rest',
    lines: [
      { speaker: 'm', text: 'Mach das. Die Türen von Gartenhaus, Gewächshaus und Wasserturm stehen dir überall offen.' },
    ],
  },

  // ── Episode 4: Obstwiesen Ostweg, Alte Mühle & Drei Höfe ─────────────────
  {
    id: 'orchard-sign-east',
    lines: [
      { text: 'Ein verwitterter Holzwegweiser Richtung Osten: „Alte Mühle am Fluss · 10 Minuten“ — und darunter mit frischer Kreide: „Drei Höfe flussabwärts“.' },
    ],
  },
  {
    id: 'mill-path-locked',
    lines: [
      { text: 'Der schmale Bachsteg ostwärts liegt im tiefen Schatten überhängender Äste. Zuerst wartet M. auf den Obstwiesen darauf, dass der Mutterbaum erblüht.' },
    ],
  },
  {
    id: 'mill-workbench',
    lines: [{ text: 'Ein Wandregal mit Jakobs Werkzeug: Ahle, Wachstopf, Bindfaden. Aufgeräumt wie ein Mahlbuch — hier ließe sich gut werkeln, wenn man wüsste, was.' }],
  },
  {
    id: 'mill-wheel-missing',
    lines: [
      { text: 'Das große hölzerne Wasserrad der Mühle sitzt trocken und schief in seiner Halterung. Mehrere Schaufelbretter sind vermorscht, und der Eisenzapfen klemmt.' },
      { text: 'Mit Achsenwachs von der Werkbank, 2× Sonnenlicht und 2× Fundstück ließen sich die Zapfen lösen, das Holz geschmeidig machen und die gebrochenen Streben ersetzen.' },
    ],
  },
  {
    id: 'mill-wheel-repaired',
    lines: [
      { text: 'Du richtest die Schaufeln mit zwei Fundstücken als Keilen, streichst das harte Lager mit Achsenwachs ein und lässt warmes Sonnenlicht über das morsche Holz strömen.' },
      { text: 'Ein tiefes Knarren geht durch die Mühle — dann greift das Wasser unter das Rad, und Tropfen für Tropfen beginnt es sich wieder ruhig im Strom zu drehen!' },
    ],
  },
  {
    id: 'mill-wheel-done',
    lines: [
      { text: 'Das Wasserrad dreht sich gleichmäßig im Fluss und wirft silberne Tropfen in die warme Luft.' },
    ],
  },
  {
    id: 'mill-rootstock-missing',
    lines: [
      { text: 'Ein alter, knorriger Wildling von einem Apfelbaum auf der Flusswiese. Seine Krone wurde vor vielen Jahren gekappt, doch der Stamm steckt noch voller Lebenskraft.' },
      { text: 'Wenn du ein frisches Edelreis einer alten Sorte hättest, könntest du ihn neu veredeln.' },
    ],
  },
  {
    id: 'mill-rootstock-repaired',
    lines: [
      { text: 'Vorsichtig setzt du M.s Goldreinetten-Edelreis in die junge Rinde des Wildlings und streichst feuchten Mooslehm um die Veredlungsstelle.' },
      { text: 'Wie von selbst treibt der alte Stamm frische Triebe aus — ein neues Bündel rosafarbener Knospen spannt sich über der Flusswiese!' },
    ],
  },
  {
    id: 'mill-rootstock-done',
    lines: [
      { text: 'Aus dem alten Wildling ist ein junger, lebendiger Goldreinettenbaum gewachsen.' },
    ],
  },
  {
    id: 'mill-flour-barrels',
    lines: [
      { text: 'Leere Holzfässer stehen sauber abgedeckt unter dem Vordach. In einem liegt ein kleiner Strauß getrockneter Stockrosen gegen die Motten.' },
    ],
  },
  {
    id: 'mill-sign-farms',
    lines: [
      { text: '„Flussabwärts · Die drei Höfe von Erlenbrück“. Die alte Wagenspur im Gras ist halb zugewachsen, aber gut zu erkennen.' },
    ],
  },
  {
    id: 'mill-interior-stone',
    lines: [
      { text: 'Ein mächtiger grauer Mahlstein aus Basalt, fein gerillt wie vor hundert Jahren. Noch ruht er still — draußen am Fluss klemmt das alte Wasserrad.' },
    ],
  },
  {
    id: 'mill-interior-stone-running',
    lines: [
      { text: 'Über die Welle bebt der große Basaltstein ruhig im Takt des Flusses. Wenn du 2× beliebige Ernte bei dir hast, kannst du hier Blütenmehl mahlen.' },
    ],
  },
  {
    id: 'mill-interior-stone-grind',
    lines: [
      { text: 'Du schüttest zwei Hände reife Ernte in den hölzernen Trichter. Unter dem schweren Mahlstein rieselt feines, helles Blütenmehl in das Leinentuch.' },
    ],
  },
  {
    id: 'mill-interior-sacks',
    lines: [
      { text: 'Grob gewebte Leinensäcke mit verblasstem blauem Stempel: „Erlenbrücker Mühle · Vollkorn & Hafer“. Einige liegen noch ordentlich vernäht auf dem Holzpodest.' },
    ],
  },
  {
    id: 'mill-interior-ledger',
    lines: [
      { text: 'Ein dickes, ledergebundenes Mahlbuch. Neben den alten Kornmengen stehen am Rand kleine Garteneinträge: „Lindenweg 4 — drei Hände Stockrosen mitgegeben“.' },
    ],
  },
  {
    id: 'journal-page-mill',
    style: 'page',
    title: 'Chronik der Alten Mühle',
    lines: [
      { text: 'Wer Mehl mahlt, wartet immer auf die Ernte anderer Leute. Ohne die Höfe flussabwärts dreht sich dieses Rad nur für den Wind.' },
      { text: 'Als Erlenbrück still wurde, habe ich die letzten Stockrosensamen aus dem Lindenweg in meinem Mahlbuch versteckt. Sie blühen an jedem Zaun, wenn jemand nur Erde lockert.' },
      { text: 'Wer mir zwei Samenkapseln der Stockrose und einen Tropfen Tau aufs Wandregal legt, darf sich ein Saattütchen aus meinen Resten mischen: Brombeere, Leuchtlilie, Lavendel.' },
      { text: 'Heute stand wieder Wasser im Graben, als hätte oben auf den Obstwiesen jemand das alte Wehr geöffnet. Vielleicht bleibt der Fluss diesmal nicht allein. — Jakob' },
    ],
  },
  {
    id: 'farms-well',
    lines: [
      { text: 'Ein runder Dorfbrunnen zwischen den drei Höfen. Auf seinem Rand stehen noch zwei Tontöpfe, in denen längst vertrockneter Rosmarin steckt — doch unten spiegelt sich frisches Flusswasser.' },
    ],
  },
  {
    id: 'farms-well-draw',
    lines: [
      { text: 'Mit einem leichten Knarren holst du am Dorfbrunnen der drei Höfe einen Becher kühlen Tau herauf.' },
    ],
  },
  {
    id: 'farms-bell-quiet',
    lines: [
      { text: 'Eine kleine Hofglocke an einem verwitterten Eichenpfosten. Früher läutete sie, wenn frisches Brot aus dem Ofen kam oder die Nachbarn zusammen auf das Feld gingen.' },
    ],
  },
  {
    id: 'farms-bell-awakened',
    lines: [
      { text: 'Ein leichter Flusswind bewegt die Hofglocke über den erblühten Stockrosen — sie gibt einen einzelnen, hellen Klang über die Dächer ab.' },
    ],
  },
  {
    id: 'farms-house',
    lines: [
      { text: 'Die grünen Fensterläden des ersten Flusshofes sind fest verriegelt, doch auf der Schwelle hat jemand sorgfältig das Unkraut gezupft. Hier wurde lange auf Rückkehr gewartet.' },
    ],
  },
  {
    id: 'farms-boat',
    lines: [
      { text: 'Ein breiter Holzkahn schaukelt sanft am Steg. Seine Ruder liegen trocken unter der Bank — bereit für jeden, der wieder Säcke zwischen Höfen und Mühle hinüberfährt.' },
    ],
  },
  {
    id: 'journal-page-farms',
    style: 'page',
    title: 'Gedenknotiz · Die drei Flusshöfe',
    lines: [
      { text: 'Wir drei Höfe am unteren Flussbogen sind nicht aus Zorn gegangen, sondern weil nach der letzten Flut der Weg zum Markt verfiel und niemand mehr vom Garten zurückkam.' },
      { text: 'Falls eines Tages wieder Stockrosen am Flussufer leuchten und das Mühlrad oben schlägt: Sagt in Erlenbrück Bescheid, dass die Saat noch lebt. Unsere Türen stehen wieder offen.' },
    ],
  },

  // ── NPC Jakob & Finale im Botanischen Garten ─────────────────────────────
  {
    id: 'jakob-intro',
    lines: [
      { speaker: 'jakob', text: 'Nanu? Schritte auf dem Steg — und das nach all den Jahren, in denen mir höchstens einmal ein Reiher Gesellschaft geleistet hat.' },
      { speaker: 'jakob', text: 'Ich bin Jakob. Diese alte Mühle hier mahlt seit dem großen Fortzug eigentlich nur noch Stille.' },
      {
        speaker: 'jakob',
        text: 'Sag, woher kommst du denn herüber? Du riechst nach Apfelblüten und frischer Gartenerde.',
        choices: [
          { label: 'Von M. auf den Obstwiesen — wir haben den Mutterbaum wieder zum Blühen gebracht.', nextDialogueId: 'jakob-intro-orchard' },
          { label: 'Aus dem Botanischen Garten in Erlenbrück. Wir wecken das Tal Beet für Beet.', nextDialogueId: 'jakob-intro-mill' },
          { label: 'Ich habe deinen Eintrag über „Lindenweg 4 · Stockrose“ gefunden.', nextDialogueId: 'jakob-intro-lindenweg' },
        ],
      },
    ],
  },
  {
    id: 'jakob-intro-orchard',
    lines: [
      { speaker: 'jakob', text: 'M. ist noch immer oben zwischen den alten Bäumen? Und der Mutterbaum blüht wieder?! Das erklärt das frische Wasser im Bach!' },
      { speaker: 'jakob', text: 'Hör zu: Wenn die Obstwiesen leben, darf die Mühle nicht länger schlafen. Mein Wasserrad klemmt, auf der Wiese drüben wartet ein alter Wildling auf ein gutes Edelreis — und flussabwärts liegen noch drei stille Höfe.' },
      { speaker: 'jakob', text: 'Nimm diese Stockrosen-Samen mit. Einer für unser Mühlenbeet hier und einer für die Höfe unten — und wirf gern auch einen Blick in meine Mahlstube.' },
    ],
  },
  {
    id: 'jakob-intro-mill',
    lines: [
      { speaker: 'jakob', text: 'Den alten Botanischen Garten in der Stadt gibt es noch? Früher habe ich jede Woche einen Sack Kompost gegen Gewürzkräuter getauscht.' },
      { speaker: 'jakob', text: 'Wenn du mir hilfst, das Mühlrad anzuschieben, den alten Apfel-Wildling drüben zu veredeln und in der Mahlstube sowie bei den drei Höfen flussabwärts ein Zeichen zu setzen, wacht das ganze Tal wieder auf.' },
      { speaker: 'jakob', text: 'Nimm diese Stockrosen-Samen aus dem Lindenweg mit: eine für den Hof hier und eine für den Flussgarten bei den drei Höfen.' },
    ],
  },
  {
    id: 'jakob-intro-lindenweg',
    lines: [
      { speaker: 'jakob', text: 'Haha! Da siehst du, wie nichts Gutes jemals ganz verloren geht, solange jemand ein kleines Notizbuch behält.' },
      { speaker: 'jakob', text: 'Hier, nimm diese letzten beiden Tütchen Stockrosen-Samen an dich. Bring unser Mühlrad in Gang, veredle drüben den Apfel-Wildling, schau in der Mahlstube vorbei und trag die Stockrosen bis zu den drei Höfen flussabwärts!' },
    ],
  },
  {
    id: 'jakob-waiting',
    lines: [
      {
        speaker: 'jakob',
        text: 'Wie kommen wir voran? Das Mühlrad, der alte Apfel-Wildling auf der Wiese, die Stockrosen, meine Mahlstube und die drei Höfe flussabwärts warten noch auf unsere Hände.',
        choices: [
          { label: 'Was fehlt dem alten Wasserrad genau?', nextDialogueId: 'jakob-help-wheel' },
          { label: 'Wo finde ich den Apfel-Wildling?', nextDialogueId: 'jakob-help-graft' },
          { label: 'Wie komme ich zu den drei Höfen?', nextDialogueId: 'jakob-help-farms' },
          { label: 'Ich bin schon unterwegs!', nextDialogueId: 'jakob-help-bye' },
        ],
      },
    ],
  },
  {
    id: 'jakob-help-wheel',
    lines: [
      { speaker: 'jakob', text: 'Direkt an der Ostseite meines Hauses am Fluss. Für Lager und Holz brauchst du 3× Sonnenlicht, 3× Tau und 2× Fundstück.' },
    ],
  },
  {
    id: 'jakob-help-graft',
    lines: [
      { speaker: 'jakob', text: 'Überquere einfach die Steinbrücke hier nach Osten auf die Flusswiese. Dort steht der alte Wildling — genau richtig für das Edelreis, das M. dir geschenkt hat.' },
    ],
  },
  {
    id: 'jakob-help-farms',
    lines: [
      { speaker: 'jakob', text: 'Hinter der Flusswiese geht der Pfad nach Süden zu den drei Höfen. Für das zugewachsene Hoftor dort brauchst du einen Brombeer-Steckling. Werkeln kannst du an meinem Wandregal in der Mahlstube.' },
    ],
  },
  {
    id: 'jakob-help-bye',
    lines: [
      { speaker: 'jakob', text: 'Nur mit der Ruhe. Ein Müller lernt vom Fluss, dass Eile noch nie ein Rad schneller gedreht hat.' },
    ],
  },
  {
    id: 'jakob-return-finale',
    lines: [
      { speaker: 'jakob', text: 'Da bist du ja wieder! Hörst du das stetige Pochen unseres Wasserrads? Und bis hierher riecht man die Stockrosen vom Flussbogen.' },
      { speaker: 'jakob', text: 'Dass auf den drei Höfen schon wieder auf den Weg geschaut wird und drüben sogar ein junger Goldreinettenbaum austreibt … mir fehlen fast die Worte.' },
      {
        speaker: 'jakob',
        text: 'Wenn M. wirklich noch immer nach Erlenbrück zurückblickt — glaubst du, am runden Platz im Botanischen Garten wäre noch Platz für einen alten Müller?',
        choices: [
          { label: 'Unbedingt! Komm mit uns in den Botanischen Garten zurück.', nextDialogueId: 'jakob-return-garden' },
          { label: 'Alle drei Orte gehören jetzt zusammen: Garten, Obstwiesen und Mühle.', nextDialogueId: 'jakob-return-mill' },
          { label: 'Zur ersten Ernte bringen wir Körbe aus dem ganzen Tal zusammen.', nextDialogueId: 'jakob-return-harvest' },
        ],
      },
    ],
  },
  {
    id: 'jakob-return-garden',
    lines: [
      { speaker: 'jakob', text: 'Dann schultere ich meinen alten Rucksack! Ich gehe schon über den Steg voraus zu M. — wir treffen uns alle am runden Platz im Botanischen Garten.' },
    ],
  },
  {
    id: 'jakob-return-mill',
    lines: [
      { speaker: 'jakob', text: 'Ja … nicht ein einzelner Zaun macht eine Stadt aus, sondern die Wege dazwischen. Ich hole meinen Hut und gehe voraus zum Botanischen Garten!' },
    ],
  },
  {
    id: 'jakob-return-harvest',
    lines: [
      { speaker: 'jakob', text: 'Auf den Tag freue ich mich schon! Geh du ruhig in Ruhe zurück — ich treffe dich mit M. und der Krähe am runden Platz im Botanischen Garten.' },
    ],
  },
  {
    id: 'jakob-garden-arrival',
    lines: [
      { speaker: 'jakob', text: 'Wie still und schön der Botanische Garten geworden ist … Sprich zuerst mit M., sie wartet schon auf dich am Platz.' },
    ],
  },
  {
    id: 'jakob-garden-after',
    lines: [
      { speaker: 'jakob', text: 'Weißt du, früher dachte ich, ich sei der Letzte draußen am Fluss. Dabei mussten unsere Gärten sich nur wieder gegenseitig finden.' },
    ],
  },
  {
    id: 'crow-garden-gathering-wait',
    lines: [
      { speaker: 'crow', text: 'Krah! Alle sind zurück am alten Treffpunkt. Selbst der alte Müller steht schon da und staunt über deine Beete!' },
    ],
  },
  {
    id: 'crow-garden-gathering',
    lines: [
      { speaker: 'crow', text: 'Krahaha! Vom Baumstumpf an der Hütte bis zur Alten Mühle — und jetzt schau dir an, wer wieder auf diesem Platz steht!' },
      { speaker: 'crow', text: 'Wenn im Frühling die ersten Leute aus der Stadt zurückkommen, erzähle ich ihnen vielleicht, wer hier jeden einzelnen Samen gesät hat. Krah!' },
    ],
  },
  {
    id: 'owl-episode4-after',
    lines: [
      { speaker: 'owl', text: 'Von hier oben sehe ich heute nicht nur das Licht deines Gartens und des Gewächshauses, sondern auch die Obstwiesen in Blüte und die Lampen über der Alten Mühle. Erlenbrück schläft nicht mehr — es ruht nur.' },
    ],
  },
  {
    id: 'm-gathering-finale',
    lines: [
      { speaker: 'm', text: 'Schau dich einmal um … Vom verwilderten Tor damals bis heute: Das Glashaus leuchtet, die Beete stehen in Blüte, auf den Obstwiesen summt es — und Jakob steht wieder mitten unter uns.' },
      { speaker: 'jakob', text: 'Und ich habe unterwegs sogar das alte Goldreinetten-Muster in deinen Notizen wiedergefunden, M. Jetzt hat das ganze Tal wieder eine Zukunft.' },
      { speaker: 'crow', text: 'Krah! Vergesst nicht, wer am Anfang den Gewächshausschlüssel im Schnabel hüten musste!' },
      {
        speaker: 'm',
        text: 'Sie hat recht. Alles hier begann mit deiner ersten Handvoll Erde. Welche Geschichte soll diese gemeinsame Chronik von Erlenbrück von heute an tragen?',
        choices: [
          {
            label: 'Dass ein einziger gepflegter Garten ein ganzes stilles Tal wieder wecken kann.',
            nextDialogueId: 'm-finale-garden',
            setFlags: ['chronicle-ending-garden'],
          },
          {
            label: 'Dass jeder vergessene Ort einen Namen hat — vom Wasserturm bis zu den Höfen.',
            nextDialogueId: 'm-finale-valley',
            setFlags: ['chronicle-ending-valley'],
          },
          {
            label: 'Dass alle Türen in Erlenbrück jetzt weit offen stehen für jeden, der zurückkehrt.',
            nextDialogueId: 'm-finale-future',
            setFlags: ['chronicle-ending-future'],
          },
        ],
      },
    ],
  },
  {
    id: 'm-finale-garden',
    lines: [
      { speaker: 'm', text: 'Genau das werden die ersten Zeilen sein. Und hier — diese gemeinsame Chronik von Erlenbrück gehört dir, als Hüterin des letzten und nun wieder ersten Gartens.' },
    ],
  },
  {
    id: 'm-finale-valley',
    lines: [
      { speaker: 'm', text: 'Kein Name geht verloren, solange jemand ihn aufschreibt und gießt. Nimm unsere gemeinsame Chronik von Erlenbrück an dich.' },
    ],
  },
  {
    id: 'm-finale-future',
    lines: [
      { speaker: 'm', text: 'Die Türen sind entriegelt, die Wege sind frei, und im Boden steckt genug Saatgut für zehn Frühlinge. Nimm diese Chronik von Erlenbrück als unser gemeinsames Versprechen.' },
    ],
  },
  {
    id: 'm-garden-after',
    lines: [
      {
        speaker: 'm',
        text: 'Willkommen daheim im Botanischen Garten. Die Luft riecht nach Stockrosen, Lavendel und frischem Apfelholz.',
        choices: [
          { label: 'Wie fühlt sich Jakob hier im Garten?', nextDialogueId: 'm-garden-after-jakob' },
          { label: 'Gibt es noch Beete, die wir frei bepflanzen können?', nextDialogueId: 'm-garden-after-seeds' },
          { label: 'Ich möchte einfach noch durch das ganze Tal spazieren.', nextDialogueId: 'm-garden-after-peace' },
        ],
      },
    ],
  },
  {
    id: 'm-garden-after-jakob',
    lines: [
      { speaker: 'm', text: 'Er hat heute Morgen schon heimlich nachgemessen, wo neben der Gartenhütte Platz für ein schmales Korn- und Stockrosenbeet wäre. So schnell rostet kein Müller ein.' },
    ],
  },
  {
    id: 'm-garden-after-seeds',
    lines: [
      { speaker: 'm', text: 'Ja! Im Garten, im Gewächshaus-Vorraum, auf dem Hügelpfad, den Obstwiesen und der Flusswiese warten noch freie Beete für deine Lieblingssorten.' },
    ],
  },
  {
    id: 'm-garden-after-peace',
    lines: [
      { speaker: 'm', text: 'Nimm dir alle Zeit der Welt. Jeder Weg zwischen Gewächshaus, Wasserturm, Obstwiesen, Mühle und den Höfen gehört nun dir.' },
    ],
  },
];
