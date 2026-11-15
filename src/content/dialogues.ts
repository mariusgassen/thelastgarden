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
      { text: 'Mit 3× Sonnenlicht, 3× Tau und 1× Fundstück als Ersatzteil ließe sich die Leitung wieder abdichten.' },
    ],
  },
  {
    id: 'cistern-repaired',
    lines: [
      { text: 'Du setzt das Fundstück ins Handrad ein, benetzt die Dichtung mit Tau und wärmst das kalte Messing mit gesammeltem Sonnenlicht.' },
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
];
