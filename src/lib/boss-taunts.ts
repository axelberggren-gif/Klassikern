/**
 * Boss taunts — dramatic Swedish voice lines for each of the 30 bosses.
 * Each boss has attack taunts (played when the group deals damage) and
 * a defeat line (played on the killing blow).
 *
 * Voice profiles control Web Speech API parameters to give each boss
 * a unique "personality": pitch, rate, and volume.
 */

export interface BossVoiceProfile {
  pitch: number;   // 0–2, default 1
  rate: number;    // 0.1–10, default 1
  volume: number;  // 0–1, default 1
}

export interface BossTauntData {
  /** Taunts spoken when the group attacks (randomly picked) */
  attackTaunts: string[];
  /** Spoken on the killing blow */
  defeatLine: string;
  /** Web Speech API voice tuning */
  voice: BossVoiceProfile;
}

/**
 * Keyed by boss level (1–30) matching boss_definitions.level
 */
export const BOSS_TAUNTS: Record<number, BossTauntData> = {
  // ── Tier 1: Skogsväsen (Forest Creatures) ──────────────────────────
  1: {
    // Skogsrået
    attackTaunts: [
      'Ni vandrar in i min skog... och tror att ni kan besegra mig?',
      'Skogen viskade ert namn... men inte med vänlighet.',
      'Kom närmare... träden hungrar.',
    ],
    defeatLine: 'Skogen... faller tyst... ni har vunnit... denna gång...',
    voice: { pitch: 1.4, rate: 0.85, volume: 0.9 },
  },
  2: {
    // Näcken
    attackTaunts: [
      'Min fiol spelar er undergång!',
      'Vattnet stiger... känner ni det?',
      'Dansar ni? Eller dränks ni?',
    ],
    defeatLine: 'Melodin... tystnar... strömmen tar mig...',
    voice: { pitch: 1.1, rate: 0.9, volume: 0.85 },
  },
  3: {
    // Mylingen
    attackTaunts: [
      'Bär mig! Bär mig till kyrkogården!',
      'Ni kan inte fly från det som redan är dött!',
      'Mina skrik ekar i era drömmar!',
    ],
    defeatLine: 'Äntligen... vila... tack...',
    voice: { pitch: 1.8, rate: 1.1, volume: 0.95 },
  },
  4: {
    // Vittra
    attackTaunts: [
      'Under jorden vakar vi... alltid.',
      'Ni trampar på vårt tak! Betala tribut!',
      'De osynliga ser allt ni gör.',
    ],
    defeatLine: 'Vi drar oss tillbaka... men glömmer aldrig...',
    voice: { pitch: 0.9, rate: 0.8, volume: 0.8 },
  },
  5: {
    // Bäckahästen
    attackTaunts: [
      'Sitt upp på min rygg... om ni vågar!',
      'Vattenfallets dån döljer era skrik!',
      'Ingen som ridit mig har återvänt!',
    ],
    defeatLine: 'Hoven... sjunker... vattnet... släpper...',
    voice: { pitch: 0.7, rate: 1.0, volume: 0.9 },
  },

  // ── Tier 2: Bergatroll & Jättar ────────────────────────────────────
  6: {
    // Bergatrollet
    attackTaunts: [
      'Jag krossar era ben som kvistar!',
      'Bergen skakar när jag reser mig!',
      'Småfolk! Ni är ingenting mot sten!',
    ],
    defeatLine: 'Stenen... spricker... berget faller...',
    voice: { pitch: 0.5, rate: 0.7, volume: 1.0 },
  },
  7: {
    // Rimtussen
    attackTaunts: [
      'Frosten biter hårdare än era vapen!',
      'Kylan är mitt vapen, och den når överallt!',
      'Fryser ni redan? Vi har bara börjat!',
    ],
    defeatLine: 'Isen... smälter... våren vinner...',
    voice: { pitch: 0.8, rate: 0.85, volume: 0.9 },
  },
  8: {
    // Huldran
    attackTaunts: [
      'Ser ni skönheten? Eller svansen?',
      'Kom till mig... jag lovar att det inte gör ont.',
      'Skogen dansar till min melodi!',
    ],
    defeatLine: 'Min skönhet... bleknar... men minnet består...',
    voice: { pitch: 1.5, rate: 0.9, volume: 0.85 },
  },
  9: {
    // Draugen
    attackTaunts: [
      'Jag seglar med de dödas skepp!',
      'Havet spyr ut mig, och ni ska följa mig ner!',
      'Stormen är mitt andetag!',
    ],
    defeatLine: 'Djupet... ropar mig åter... farväl...',
    voice: { pitch: 0.6, rate: 0.75, volume: 1.0 },
  },
  10: {
    // Storjätten
    attackTaunts: [
      'Jag ser er därnere, myror!',
      'Ett steg och ni är borta!',
      'Himlen skälver när jag går!',
    ],
    defeatLine: 'Marken... skakar... för sista gången...',
    voice: { pitch: 0.4, rate: 0.65, volume: 1.0 },
  },

  // ── Tier 3: Havsväsen & Mytiska Bestar ─────────────────────────────
  11: {
    // Lindormen
    attackTaunts: [
      'Min eld bränner starkare än er vilja!',
      'Jag har vaktat denna skatt i tusen år!',
      'Fjällen skyddar mig — vad skyddar er?',
    ],
    defeatLine: 'Elden... slocknar... skatten är er...',
    voice: { pitch: 0.6, rate: 0.8, volume: 0.95 },
  },
  12: {
    // Fenrisulven
    attackTaunts: [
      'Kedjan brast! Inget kan binda mig!',
      'Mitt gap slukar himmel och jord!',
      'Hör ni ylandet? Det är er dödsdom!',
    ],
    defeatLine: 'Vargen... faller... men Ragnarök väntar...',
    voice: { pitch: 0.5, rate: 1.1, volume: 1.0 },
  },
  13: {
    // Nidhogg
    attackTaunts: [
      'Jag gnager på världens rötter!',
      'Underifrån kommer undergången!',
      'Yggdrasils smärta är min glädje!',
    ],
    defeatLine: 'Rötterna... helar... jag sjunker...',
    voice: { pitch: 0.4, rate: 0.7, volume: 1.0 },
  },
  14: {
    // Sleipner
    attackTaunts: [
      'Åtta hovar, åtta slag — ingen kan följa!',
      'Jag galopperar mellan världarna!',
      'Inte ens Oden kan tygla er!',
    ],
    defeatLine: 'Galoppen... stannar... ryttaren faller av...',
    voice: { pitch: 0.9, rate: 1.3, volume: 0.9 },
  },
  15: {
    // Kraken
    attackTaunts: [
      'Ur djupet stiger jag!',
      'Mina tentakler krossar skepp som leksaker!',
      'Havet tillhör mig — och nu även ni!',
    ],
    defeatLine: 'Djupet... tar mig tillbaka... havet tystnar...',
    voice: { pitch: 0.3, rate: 0.65, volume: 1.0 },
  },

  // ── Tier 4: Jotnar / Gudarnas fiender ──────────────────────────────
  16: {
    // Surt
    attackTaunts: [
      'Mitt flammande svärd bränner allt!',
      'Muspelheims eld renar alla världar!',
      'Ni brinner redan — ni vet det bara inte!',
    ],
    defeatLine: 'Elden... slocknar... men askan minns...',
    voice: { pitch: 0.5, rate: 0.8, volume: 1.0 },
  },
  17: {
    // Hel
    attackTaunts: [
      'Välkomna till Helheim... ni stannar för evigt.',
      'Halva mitt ansikte ler — den andra gråter för er.',
      'Döden är inte slutet... det är min början.',
    ],
    defeatLine: 'Dödsriket... släpper er... denna gång...',
    voice: { pitch: 1.3, rate: 0.75, volume: 0.85 },
  },
  18: {
    // Garm
    attackTaunts: [
      'Jag vaktar porten till Hel! Ingen passerar!',
      'Mitt skall splittrar berg!',
      'Blodet på mina tänder är ert!',
    ],
    defeatLine: 'Porten... står öppen... vakten faller...',
    voice: { pitch: 0.4, rate: 1.0, volume: 1.0 },
  },
  19: {
    // Hrym
    attackTaunts: [
      'Naglfar seglar! De dödas naglar bär mig!',
      'Jotnarnas armé marscherar bakom mig!',
      'Ni kan inte stoppa det som redan har börjat!',
    ],
    defeatLine: 'Skeppet... sjunker... arméns marsch tystnar...',
    voice: { pitch: 0.5, rate: 0.8, volume: 0.95 },
  },
  20: {
    // Jörmungandr
    attackTaunts: [
      'Jag omfamnar hela Midgård!',
      'När jag släpper min svans — då är slutet här!',
      'Mitt gift förmörkar himlen!',
    ],
    defeatLine: 'Midgårds... orm... faller... världen andas...',
    voice: { pitch: 0.3, rate: 0.6, volume: 1.0 },
  },

  // ── Tier 5: Drömväsen / Ragnarök ───────────────────────────────────
  21: {
    // Skoll
    attackTaunts: [
      'Jag jagar solen! Snart är allt mörker!',
      'Varje dag närmar jag mig... snart fångar jag henne!',
      'Skuggan växer när solen krymper!',
    ],
    defeatLine: 'Solen... slipper undan... ljuset återvänder...',
    voice: { pitch: 0.7, rate: 1.2, volume: 0.9 },
  },
  22: {
    // Hati
    attackTaunts: [
      'Månen flyr men jag är snabbare!',
      'Natten är mitt rike — och ni är mina byte!',
      'Månens ljus faller för mina käftar!',
    ],
    defeatLine: 'Månen... lyser igen... jakten är över...',
    voice: { pitch: 0.6, rate: 1.15, volume: 0.9 },
  },
  23: {
    // Surts Armé
    attackTaunts: [
      'Tusen elddemon marscherar!',
      'Muspelheims legioner krossar allt!',
      'Elden sprider sig — ni kan inte fly!',
    ],
    defeatLine: 'Armén... faller... en efter en...',
    voice: { pitch: 0.5, rate: 0.9, volume: 1.0 },
  },
  24: {
    // Loke
    attackTaunts: [
      'Var det jag? Eller var det ni? Ha ha ha!',
      'Sanningen? Jag ljuger alltid... eller gör jag?',
      'Kaos är den enda ordningen!',
    ],
    defeatLine: 'Haha... ni tror ni vann? Kanske... kanske inte...',
    voice: { pitch: 1.2, rate: 1.1, volume: 0.9 },
  },
  25: {
    // Naglfar
    attackTaunts: [
      'Dödens skepp seglar mot er strand!',
      'Varje nagel, varje lik — allt bär mig framåt!',
      'Ragnaröks flotta är ostoppbar!',
    ],
    defeatLine: 'Skeppet... bryter upp... naglarna sprids...',
    voice: { pitch: 0.4, rate: 0.7, volume: 1.0 },
  },

  // ── Tier 6: Ragnarök / Finala strider ──────────────────────────────
  26: {
    // Fenrir Lös
    attackTaunts: [
      'Gleipner brast! Ingen kedja håller mig!',
      'Jag slukar Allfather själv!',
      'Hela Asgård bävar!',
    ],
    defeatLine: 'Käftarna... sluts... besten faller...',
    voice: { pitch: 0.3, rate: 0.9, volume: 1.0 },
  },
  27: {
    // Jörmungandrs Vrede
    attackTaunts: [
      'Hela havet kokar av min vrede!',
      'Thor själv vacklar för mitt gift!',
      'Midgård krackelerar under min kropp!',
    ],
    defeatLine: 'Giftet... sinar... haven stillar sig...',
    voice: { pitch: 0.3, rate: 0.55, volume: 1.0 },
  },
  28: {
    // Surts Eld
    attackTaunts: [
      'Allt brinner! Allt förgås!',
      'Bifrost krossas under mina eldsteg!',
      'Nio världar i aska — det är min dröm!',
    ],
    defeatLine: 'Elden... dör... ur askan föds nytt...',
    voice: { pitch: 0.4, rate: 0.75, volume: 1.0 },
  },
  29: {
    // Ragnarök
    attackTaunts: [
      'Världens ände! Ingen kan stoppa ödet!',
      'Gudarna faller en efter en — nu är det er tur!',
      'Himlen brister! Jorden sjunker!',
    ],
    defeatLine: 'Ödet... vänder... en ny värld föds...',
    voice: { pitch: 0.3, rate: 0.6, volume: 1.0 },
  },
  30: {
    // Yggdrasils Pånyttfödelse
    attackTaunts: [
      'Jag är livets träd — och dödens!',
      'Ni kan inte döda det som alltid återföds!',
      'Rötterna gräver genom era själar!',
    ],
    defeatLine: 'Världsträdet... blommar... cirkeln sluts... ni segrade.',
    voice: { pitch: 1.0, rate: 0.7, volume: 1.0 },
  },
};

/** Pick a random attack taunt for a given boss level */
export function getRandomTaunt(bossLevel: number): string | null {
  const data = BOSS_TAUNTS[bossLevel];
  if (!data) return null;
  const taunts = data.attackTaunts;
  return taunts[Math.floor(Math.random() * taunts.length)];
}

/** Get the defeat line for a given boss level */
export function getDefeatLine(bossLevel: number): string | null {
  return BOSS_TAUNTS[bossLevel]?.defeatLine ?? null;
}

/** Get the voice profile for a given boss level */
export function getVoiceProfile(bossLevel: number): BossVoiceProfile {
  return BOSS_TAUNTS[bossLevel]?.voice ?? { pitch: 1, rate: 1, volume: 1 };
}
