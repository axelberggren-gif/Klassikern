-- ============================================================================
-- Boss Battle Enhancement: Smart Crits, Defeat Quotes & Richer Lore
-- ============================================================================
-- Adds:
--   1. crit_conditions (jsonb) — deterministic conditions that trigger crits
--   2. defeat_quotes (text[]) — array of 3-4 sentence defeat monologues
--   3. crit_hint (text) — revealed after boss is defeated
--   4. Updated lore with more mythology facts
--
-- Also adds defeat_text and crit_secret to boss_encounters to store
-- the generated text for each specific kill.
-- ============================================================================

-- New columns on boss_definitions
ALTER TABLE boss_definitions
  ADD COLUMN IF NOT EXISTS crit_conditions jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS defeat_quotes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crit_hint text;

-- Store the defeat narrative per encounter (personalized with names)
ALTER TABLE boss_encounters
  ADD COLUMN IF NOT EXISTS defeat_text text,
  ADD COLUMN IF NOT EXISTS crit_secret text;

-- ============================================================================
-- UPDATE: Richer lore, crit conditions, defeat quotes, and hints
-- ============================================================================

-- Tier 1: Skogsväsen (Forest creatures) - Levels 1-5

UPDATE boss_definitions SET
  lore = 'En förförisk skogsande som lockar vandrare djupt in bland träden. Skogsrået visar sig som en vacker kvinna framifrån, men baksidan är ihålig som en rutten trädstam. Den som följer hennes lockrop försvinner för alltid in i den mörka granskogen.',
  crit_conditions = '[{"type": "evening_session", "description": "Kvällspass (18-22)"}]',
  defeat_quotes = ARRAY[
    'Ni... ni jagade mig genom min egen skog? {killer} slog ner mig som om jag vore ett ruttet träd. Skamligt!',
    'Min skog brinner av skam! {killer} var stark, men {random_member} — den sprang som en skrämd hare genom snåren. Jag kommer tillbaka, och nästa gång biter träden!',
    'Hur vågar ni! I tusen år har ingen passerat min skog levande. {killer} fick in det sista hugget, men {random_member} luktade som en svamp i regn. Min skog glömmer aldrig!',
    '{killer} fällde mig som en gammal gran! Men oroa er inte — skogen har ögon, och {random_member} cyklar som en berusad älg. Vi ses igen när dimman lägger sig...'
  ],
  crit_hint = 'Skogsrået fruktade mörkret — kvällspass (18-22) var hennes svaghet 🌙'
WHERE level = 1;

UPDATE boss_definitions SET
  lore = 'En vattenande som spelar oemotståndlig fiolmusik vid forsande vatten. Näcken sitter naken på en sten i forsen och lockar med sin spelman-konst. Enligt sagan kan man bryta trolldomen genom att ropa hans namn — men få hinner innan melodin drar dem under ytan.',
  crit_conditions = '[{"type": "dawn_raid", "description": "Morgonpass (före 06:00)"}]',
  defeat_quotes = ARRAY[
    'Min fiol... ni slog sönder min fiol! {killer} gav mig det sista slaget medan jag spelade min vackraste melodi. Barbariskt!',
    'I tusen år har ingen motstått min musik! {killer} måste vara döv! Och {random_member} — den simmar som en sten med armpuffar. Min hämnd ska vara en moll-symfoni!',
    'Vattnet gråter med mig! {killer} sänkte mig i min egen fors. Men {random_member} kunde inte simma ens om fisken visade vägen. Jag ska komponera er undergång!',
    '{killer} krossade mig! Men hör mina ord — {random_member} springer som en gammal tant med gåstavar. Nästa gång spelar jag ert requiem!'
  ],
  crit_hint = 'Näcken var svagast vid gryningen — pass före 06:00 träffade extra hårt 🌅'
WHERE level = 2;

UPDATE boss_definitions SET
  lore = 'Rastlösa andar av odöpta barn som jagar vandrare genom dimman. Mylingarna bärs på ryggen av den olycklige som möter dem, och de blir tyngre och tyngre tills offret sjunker ner i marken. Deras klagande rop hörs i skymningen över kärren.',
  crit_conditions = '[{"type": "long_session", "min_minutes": 60, "description": "Långa pass (60+ min)"}]',
  defeat_quotes = ARRAY[
    'Vi... vi är så tunga... men {killer} bar oss ändå och kastade av oss! Så stark, så grym!',
    '{killer} besegrade oss! Men {random_member} — den var så svag att vi knappt behövde trycka. Kunde inte cykla ens om vägen var nedför hela tiden!',
    'Vår börda var inte tung nog! {killer} slängde av oss som en fjäder. Men {random_member} gnällde som ett spädbarn efter bara fem minuter. Vi ska komma tillbaka, tyngre än någonsin!',
    'Vi försvinner... men glöm inte — {random_member} luktade som ett gammalt kärr, och {killer} var onaturligt stark. Nästa gång bär NI oss i uppförsbacke!'
  ],
  crit_hint = 'Mylingarna var svaga mot uthållighet — pass över 60 minuter krossade dem 💪'
WHERE level = 3;

UPDATE boss_definitions SET
  lore = 'Underjordiska väsen som vaktar dolda skatter i bergens djup. Vittran lever i parallella gårdar under jorden och är osynliga för de flesta. Trampar man på deras tak — alltså marken ovanför — kan de förhäxa dig till att vandra i cirklar i evighet.',
  crit_conditions = '[{"type": "weekend_warrior", "description": "Helgpass (lördag/söndag)"}]',
  defeat_quotes = ARRAY[
    'Våra skatter! {killer} plundrade våra berg! Under tusen år har vi gömt guld och ädelstenar, och nu detta!',
    '{killer} sprängde sig genom berget! Men {random_member} — den snubblade på sina egna fötter som en blind mullvad. Våra tunnlar kommer svälja er alla!',
    'Vi var dolda i tusen år! {killer} hittade oss ändå. Men {random_member} hade inte hittat ut ur en papperskasse. Vi gräver djupare nästa gång!',
    'Bergen gråter! {killer} slog sönder våra dörrar! Och {random_member} — alltså, den har konditionen av en senil guldhamster. Vi återvänder med starkare väggar!'
  ],
  crit_hint = 'Vittran vilade på helgen — lördags- och söndagspass slog extra hårt 📅'
WHERE level = 4;

UPDATE boss_definitions SET
  lore = 'En magisk häst som lockar ryttare ner i vattendjupet. Bäckahästen ser ut som en vacker vit häst vid sjökanten, men den som sätter sig upp fastnar och dras ner under ytan. Bara järn kan bryta förtrollningen — eller en vilja starkare än trolldomens.',
  crit_conditions = '[{"type": "first_attack_of_day", "description": "Dagens första attack"}]',
  defeat_quotes = ARRAY[
    'Min magi... bruten! {killer} red mig och hoppade av innan jag nådde vattnet. Första gången på tusen år!',
    '{killer} besegrade mig! Men {random_member} hade inte kunnat rida en gunghäst. Min sjö ska frysa till is av ilska!',
    'Jag drar ner skepp, men {killer} var för stark! Och {random_member} — den simmar som en tegelsten med ambitioner. Jag väntar i nästa sjö!',
    'Neeeej! {killer} slet sig loss! Men {random_member} fastnade i sin egen cykelkedja bara av att titta på mig. Nästa gång drar jag er ALLA under ytan!'
  ],
  crit_hint = 'Bäckahästen var sårbar för tidiga angripare — dagens första attack slog extra hårt ⚡'
WHERE level = 5;

-- Tier 2: Troll & Jättar (Trolls & Giants) - Levels 6-10

UPDATE boss_definitions SET
  lore = 'Ett enormt troll som slår vakt om bergspassen med sin stenklubba. Bergatrollet förstenas av solljus och vaknar bara när mörkret faller. Det samlar stenar stora som hus och kastar dem på var och en som försöker passera bergskedjan.',
  crit_conditions = '[{"type": "evening_session", "description": "Kvällspass (18-22)"}]',
  defeat_quotes = ARRAY[
    'Min klubba... krossad! {killer} slog hårdare än en jordbävning! Jag har stått här sedan istiden, och nu detta!',
    '{killer} slog sönder mig som grus! Men {random_member} — den orkade inte ens lyfta en liten sten. Har den armarna av kokt spaghetti? Bergen ska skaka när jag reser mig igen!',
    'Solljuset bränner och {killer} slog mig i grytan! Men {random_member} sprang som om marken var gjord av lego. Jag ska kasta STÖRRE stenar nästa gång!',
    '{killer} var som en bergsmaskin! Respect. Men {random_member} cyklade som en pensionär i motvind. Jag gräver mig ner och väntar på er... i mörkret!'
  ],
  crit_hint = 'Bergatrollet vaknade i skymningen — kvällspass (18-22) var dess svagaste stund 🌙'
WHERE level = 6;

UPDATE boss_definitions SET
  lore = 'En frostjätte vars andedräkt förvandlar allt till is. Rimtussen härstammar från Nifelheim, dimmvärlden, och bär med sig en köld som får sjöar att frysa på sekunder. Den som andas in hans frostdimma förvandlas till en isskulptur.',
  crit_conditions = '[{"type": "streak", "min_days": 3, "description": "3+ dagars streak"}]',
  defeat_quotes = ARRAY[
    'Min frost... smälter! {killer} brände genom min is med ren viljekraft! Nifelheim gråter iskristaller!',
    '{killer} smälte mig som en snögubbe i maj! Men {random_member} — den darrade av köld bara av att öppna frysen hemma. Min is ska bli tjockare nästa vinter!',
    'Omöjligt! Jag fryser hela sjöar! Men {killer} var het som lava. {random_member} däremot — den hade frusit ihjäl av en glasspinne. Vintern kommer tillbaka!',
    '{killer} krossade min permafrost! Men {random_member} springer som en frusen pingvin i uppförsbacke. Nästa gång fryser jag fast era cyklar!'
  ],
  crit_hint = 'Rimtussen smälte av uthållighet — 3+ dagars streak bröt igenom isen 🔥'
WHERE level = 7;

UPDATE boss_definitions SET
  lore = 'En skogsnymf med ihålig rygg som förvillar ensamma resenärer. Huldran ser ut som en vacker kvinna men har en kotejp och ihålig rygg som en gammal björk. Hon kan förhäxa män att följa henne in i skogen, där de vandrar i åratal utan att hitta hem.',
  crit_conditions = '[{"type": "long_session", "min_minutes": 60, "description": "Långa pass (60+ min)"}]',
  defeat_quotes = ARRAY[
    'Min förtrollning... bruten! {killer} såg igenom mig — bokstavligt! Min ihåliga rygg skyddade mig inte!',
    '{killer} var immun mot min charm! Men {random_member} hade följt mig vart som helst — den hade gått vilse i sin egen trädgård. Skogen har fler hemligheter!',
    'I hundra år har ingen sett min rygg! Men {killer} sprang runt mig snabbare än jag kunde snurra. {random_member} däremot — den cyklade in i ett träd av att titta på mig. Jag hittar nya vägar!',
    '{killer} avslöjade mig! Skammen brinner! Men {random_member} hade blivit kvar i skogen för alltid — den har orienteringssinnet av en stressad myra. Vi ses i dimman!'
  ],
  crit_hint = 'Huldran tålde inte uthållighet — pass över 60 minuter bröt hennes trolldom 💪'
WHERE level = 8;

UPDATE boss_definitions SET
  lore = 'En odöd sjöman som seglar ett halvt skepp genom stormiga hav. Draugen är en drunknad sjömans vålnad som förebådar storm och skeppsbrott. Hans halvkluvna båt glider ljudlöst genom dimman, och hans skrik får till och med de modigaste sjömän att vända om.',
  crit_conditions = '[{"type": "dawn_raid", "description": "Morgonpass (före 06:00)"}]',
  defeat_quotes = ARRAY[
    'Mitt skepp... sjunker igen! {killer} sänkte mig djupare än Marianergraven! Jag har seglat sedan vikingatiden!',
    '{killer} borrade mitt halva skepp! Men {random_member} simmar som en ankare med självförtroende. Havet glömmer aldrig sina döda — jag seglar tillbaka!',
    'Min dimma skingrades! {killer} skar igenom som en fyr i natten. Men {random_member} hade drunknat i en vattenpöl. Nästa storm blir VÄRRE!',
    '{killer} krossade min mast! Men hör min varning — {random_member} hade inte klarat en pedalo i en barnpool. Vågorna ska bära min hämnd!'
  ],
  crit_hint = 'Draugen var svagast i gryningen — morgonpass före 06:00 skar genom dimman 🌅'
WHERE level = 9;

UPDATE boss_definitions SET
  lore = 'En uråldrig jätte så stor att berg bildas där hen vilar. Storjätten vaknade senast under den senaste istiden och formade hela Skandinaviens kustlinje bara genom att vända sig i sömnen. Varje steg skapar en ny dal.',
  crit_conditions = '[{"type": "group_sync", "min_same_day": 3, "description": "3+ gruppmedlemmar tränar samma dag"}]',
  defeat_quotes = ARRAY[
    'Hela... berg... skakar! {killer} fick mig att FALLA! Jag har inte fallit sedan istiden! Skandinavien darrar!',
    '{killer} fällde en JÄTTE! Men {random_member} — den kunde inte fälla ett korthus i vindstilla. Min nästa vila skapar en ny bergskedja... OVANPÅ er!',
    'Jag formade FJORDAR! Och {killer} slog mig ner som om jag var en stubbe! {random_member} orkade knappt lyfta blicken. Marken ska öppna sig under era fötter!',
    '{killer} störde min sömn! Oförlåtligt! {random_member} snarkade högre än mig — och det säger MYCKET. Nästa gång trampar jag platt hela stället!'
  ],
  crit_hint = 'Storjätten var sårbar mot gruppattacker — 3+ som tränade samma dag krossade honom 👥'
WHERE level = 10;

-- Tier 3: Mytiska Odjur (Mythical Beasts) - Levels 11-15

UPDATE boss_definitions SET
  lore = 'En vingad orm som terroriserar byar från sitt näste i bergen. Lindormen är en nordisk drake utan vingar men med dödlig gift i sina huggtänder. Enligt sagan kan den bara dödas av den som visar mod nog att stå kvar när den anfaller — de som springer blir alltid infångade.',
  crit_conditions = '[{"type": "evening_session", "description": "Kvällspass (18-22)"}]',
  defeat_quotes = ARRAY[
    'Min gift... verkar inte! {killer} stod kvar när jag anföll! Ingen har vågat det på hundra år!',
    '{killer} högg av mitt gift! Men {random_member} sprang som en skrämd kanin — precis den typen jag brukar fånga. Mitt näste ska byggas starkare!',
    'Jag terroriserade HELA byar! {killer} behandlade mig som en mask på kroken! {random_member} hade inte stått emot min blick i en sekund. Gift och eld väntar er!',
    '{killer} krossade mina huggtänder! Men {random_member} cyklade in i mitt näste av misstag — den har sämre riktningssinne än en blind orm. Jag häckar snart igen!'
  ],
  crit_hint = 'Lindormen sov på kvällen — kvällspass (18-22) fångade den i sitt näste 🌙'
WHERE level = 11;

UPDATE boss_definitions SET
  lore = 'Den gigantiska vargen bunden av gudarna, vars vrål skakar världen. Fenrisulven bands med Gleipner, en magisk kedja gjord av kattens steg, bergets rötter och fiskens andedräkt. Gudarna offrade Tyrs hand för att binda honom. Vid Ragnarök bryter han fri och slukar Oden.',
  crit_conditions = '[{"type": "weekend_warrior", "description": "Helgpass (lördag/söndag)"}]',
  defeat_quotes = ARRAY[
    'Gleipner... håller igen! {killer} band mig med ren styrka! Inte ens Tyr vågade göra det ensam!',
    '{killer} kedjade fast mig! Men {random_member} — den sprang så långsamt att jag kunde ha jamlat den i sömnen. Mina kedjor ska brista vid Ragnarök!',
    'Gudarna behövde MAGI för att binda mig! {killer} klarade det med bara muskelkraft! Men {random_member} hade jag svalt som en godibit. Mitt vrål ska skaka himlen!',
    '{killer} lurade mig som Oden lurade mig med Gleipner! Men {random_member} hade inte kunnat binda en skosnöre. Nästa gång biter jag av MER än en hand!'
  ],
  crit_hint = 'Fenrisulven vilade på helgen — lördags- och söndagspass bröt hans kedjor 📅'
WHERE level = 12;

UPDATE boss_definitions SET
  lore = 'Draken som gnager på världsträdets rötter i underjorden. Nidhogg bor vid Yggdrasils tredje rot i Nifelheim och gnager ständigt på den, med syfte att förstöra hela världsordningen. Ekorren Ratatoskr springer längs stammen och bär förolämpningar mellan Nidhogg och örnen i trädets krona.',
  crit_conditions = '[{"type": "long_session", "min_minutes": 60, "description": "Långa pass (60+ min)"}]',
  defeat_quotes = ARRAY[
    'Yggdrasils rot... jag tappade greppet! {killer} slog mig bort från världsträdet! Ratatoskr ska sprida nyheten om min skam!',
    '{killer} sparkade mig från roten! Men {random_member} simmar så dåligt att Nidhogg hade kunnat gnaga klart hela trädet innan den nådde stranden. Jag gnager mig tillbaka!',
    'Jag hotar HELA världsordningen! Och {killer} behandlade mig som ett husdjur! {random_member} hade inte hittat Yggdrasil med en karta och GPS. Rötterna ska falla!',
    '{killer} rev loss mig! Men {random_member} — den hade blivit lunch åt Ratatoskr. En EKORRE! Jag återvänder till roten, hungrigare än någonsin!'
  ],
  crit_hint = 'Nidhogg tålde inte uthållighet — pass över 60 minuter lossnade hans grepp om roten 💪'
WHERE level = 13;

UPDATE boss_definitions SET
  lore = 'Odins åttabenta häst som galopperar mellan världarna. Sleipner är Lokes avkomma och den snabbaste varelsen i alla nio världar. Oden rider Sleipner till Hel och tillbaka, och hästen kan springa på vatten, genom luft och mellan dimensioner.',
  crit_conditions = '[{"type": "first_attack_of_day", "description": "Dagens första attack"}]',
  defeat_quotes = ARRAY[
    'Mina åtta ben... sviker mig! {killer} var snabbare än jag! Omöjligt — jag springer mellan DIMENSIONER!',
    '{killer} sprang ikapp mig! Men {random_member} hade inte hunnit ikapp mig med åtta rulltrappor. Mina hovar ska dundra mellan världarna igen!',
    'Jag bär ODEN mellan världar! Och {killer} stoppade mig som en trafikpolis! {random_member} cyklar långsammare än jag går — på TVÅ ben. Nio världar ska höra min galopp!',
    '{killer} fångade mig! Oden ska bli rasande! Men {random_member} — den springer som en trebenig pall i motvind. Mina hovar ska mullra igen!'
  ],
  crit_hint = 'Sleipner var sårbar tidigt — dagens första attack fångade honom oförberedd ⚡'
WHERE level = 14;

UPDATE boss_definitions SET
  lore = 'Det kolossala havsmonster som drar hela skepp ner i djupet. Kraken beskrevs av nordiska sjömän som en ö som plötsligt rörde sig — tentakler så långa att de kunde nå masttopparna. Hela fiskeflottor försvann spårlöst, och ingen vågade segla ensam över djuphavet.',
  crit_conditions = '[{"type": "streak", "min_days": 3, "description": "3+ dagars streak"}]',
  defeat_quotes = ARRAY[
    'Mina tentakler... klippta! {killer} dök ner i MITT djup och besegrade mig! Havet kokar av ilska!',
    '{killer} sänkte Kraken! Men {random_member} — den hade fastnat i mina tentakler bara genom att titta på havet. Hade inte kunnat simma ur en barnpool! Djupet väntar!',
    'Jag drar ner FLOTTOR! Och {killer} klippte mina tentakler som spaghetti! {random_member} hade jag svalt utan att ens märka det. Havet ska resa sig igen!',
    '{killer} besegrade havets skräck! Men {random_member} hade drunknat i sin egen svett under ett gympass. Nästa gång öppnar jag HELA djupet!'
  ],
  crit_hint = 'Kraken var sårbar mot uthålliga krigare — 3+ dagars streak klippte tentaklerna 🔥'
WHERE level = 15;

-- Tier 4: Gudarnas Fiender (Enemies of the Gods) - Levels 16-20

UPDATE boss_definitions SET
  lore = 'Eldvärldens härskare som bär ett flammande svärd. Surt vaktar Muspelheim, eldvärlden i söder, och hans svärd brinner hetare än tusen solar. Vid Ragnarök leder han eldjättarna mot Asgård och sätter hela världen i brand med en enda svärdshugg.',
  crit_conditions = '[{"type": "dawn_raid", "description": "Morgonpass (före 06:00)"}]',
  defeat_quotes = ARRAY[
    'Mitt svärd... slocknar! {killer} släckte min eld! Muspelheim gråter lavaströmmar!',
    '{killer} släckte min eviga eld! Men {random_member} — den hade fattat eld av att springa hundra meter. Har konditionen av en blöt tändsticka! Min eld ska tändas igen!',
    'Jag BRÄNNER världar! Och {killer} kastade vatten på min själ! {random_member} hade smält som smör i min närvaro. Ragnaröks eld väntar!',
    '{killer} dränkte mig! Men {random_member} cyklar som om pedalerna brinner — fast tvärtom, den tar knappt i. Muspelheims flammor ska nå himlen!'
  ],
  crit_hint = 'Surt var svagast i gryningen innan hans eld vaknade — morgonpass före 06:00 släckte honom 🌅'
WHERE level = 16;

UPDATE boss_definitions SET
  lore = 'Dödsrikets drottning, halv levande och halv skelett. Hel är Lokes dotter och härskar över Helheim, dit alla döda som inte föll i strid färdas. Hennes sal heter Éljúðnir (elände) och hennes tallrik heter Hunger. Inte ens gudarna kan ta tillbaka en själ hon äger.',
  crit_conditions = '[{"type": "evening_session", "description": "Kvällspass (18-22)"}]',
  defeat_quotes = ARRAY[
    'Mitt rike... vacklar! {killer} besegrade DÖDEN! Inte ens gudarna har gjort det!',
    '{killer} dödade döden! Ironiskt! Men {random_member} — den hade hamnat i mitt rike av att ta trapporna istället för hissen. Min hunger ska aldrig mättas!',
    'Jag ÄGER döda själar! Och {killer} tog tillbaka dem med våld! {random_member} hade serverat sig själv på min tallrik Hunger. Helheim ska öppna sina portar igen!',
    '{killer} krossade Éljúðnir! Men {random_member} — den var så långsam att mina döda hade sprungit ikapp den. Dödsriket kommer aldrig att stängas!'
  ],
  crit_hint = 'Hel var svagast i skymningen — kvällspass (18-22) öppnade sprickor i dödsriket 🌙'
WHERE level = 17;

UPDATE boss_definitions SET
  lore = 'Den blodiga vakthunden vid Hels portar. Garm är bunden vid Gnipahålan, ingången till dödsriket, och hans skall ekar genom alla nio världar. Vid Ragnarök bryter han sig fri och kämpar mot guden Tyr — båda faller i striden.',
  crit_conditions = '[{"type": "weekend_warrior", "description": "Helgpass (lördag/söndag)"}]',
  defeat_quotes = ARRAY[
    'Mitt skall... tystnar! {killer} tystade vakthunden vid Hels portar! Gnipahålan står obevakad!',
    '{killer} band min munkorg! Men {random_member} sprang så långsamt att jag hade kunnat jaga den i sömnen. Mitt skall ska eka igen genom ALLA nio världar!',
    'Tyr offrade sin hand för att kämpa mot mig! {killer} behövde bara sina knytnävar! Men {random_member} hade blivit hundmat — den simmar som en tegelsten med päls. Grindarna ska öppnas!',
    '{killer} kedjade fast mig! Men {random_member} — den hade inte ens vågat klappa en chihuahua. Mitt nästa skall ska få bergen att rämna!'
  ],
  crit_hint = 'Garm sov tyngst på helgen — lördags- och söndagspass fångade honom sårbar 📅'
WHERE level = 18;

UPDATE boss_definitions SET
  lore = 'Jättarnas kapten som styr Naglfar, skeppet byggt av dödas naglar. Hrym samlar naglar från alla döda i världen för att bygga det gigantiska krigsskeppet. Vid Ragnarök seglar han Naglfar lastat med jättar mot Asgård. Enligt sagan kan man fördröja Ragnarök genom att klippa de dödas naglar.',
  crit_conditions = '[{"type": "group_sync", "min_same_day": 3, "description": "3+ gruppmedlemmar tränar samma dag"}]',
  defeat_quotes = ARRAY[
    'Naglfar... sjunker! {killer} borrade mitt nagelykepp! Det tog tusen år att bygga!',
    '{killer} sänkte mitt skepp av naglar! Men {random_member} — den hade inte kunnat ro en gummibåt i en pool. Jag ska bygga ett STÖRRE skepp! Med er naglar!',
    'Mitt skepp bär HELA jättarnas armé! Och {killer} sänkte det med ett slag! {random_member} seglar sämre än en kork i avloppet. Nagelfar ska resa sig ur djupet!',
    '{killer} saboterade min flotta! Men {random_member} hade blivit sjösjuk av en vattenpöl. Jag samlar nya naglar... era naglar. Klipp dom medan ni kan!'
  ],
  crit_hint = 'Hrym var sårbar mot samordnade attacker — 3+ som tränade samma dag sänkte Naglfar 👥'
WHERE level = 19;

UPDATE boss_definitions SET
  lore = 'Midgårdsormen som omsluter hela jorden i havsdjupet. Jörmungandr är Lokes son och så stor att han biter sig själv i svansen runt hela Midgård. Vid Ragnarök släpper han svansen och reser sig ur havet. Thor dödar honom men faller själv efter nio steg från ormens gift.',
  crit_conditions = '[{"type": "long_session", "min_minutes": 60, "description": "Långa pass (60+ min)"}]',
  defeat_quotes = ARRAY[
    'Min svans... jag släppte den! {killer} slog mig hårdare än Thors hammare! Midgård skakar!',
    '{killer} besegrade MIDGÅRDSORMEN! Thor dog av det — men {killer} lever! {random_member} däremot hade dött av giftet bara av att lukta på det. Havet ska svälla igen!',
    'Jag omsluter HELA jorden! Och {killer} bröt min cirkel! {random_member} hade inte kunnat bryta en spagettistråk. Mitt gift ska förmörka himlen!',
    '{killer} slog mig som Thor! Respekt! Men {random_member} — den simmar som en betongsugga i full fart. Havsdjupet väntar med öppna käftar!'
  ],
  crit_hint = 'Jörmungandr var svag mot uthålliga krigare — pass över 60 minuter bröt hans grepp om Midgård 💪'
WHERE level = 20;

-- Tier 5: Ragnarök-Strider (Ragnarök Battles) - Levels 21-25

UPDATE boss_definitions SET
  lore = 'Vargen som jagar solen över himlavalvet. Skoll springer ständigt efter solen Sol och försöker svälja henne. Vid Ragnarök lyckas han till slut, och världen kastas i evigt mörker. Han är son till Fenrisulven och bror till Hati.',
  crit_conditions = '[{"type": "dawn_raid", "description": "Morgonpass (före 06:00)"}]',
  defeat_quotes = ARRAY[
    'Solen... undkom! {killer} sparkade bort mig från himlavalvet! Jag har jagat henne i tusen år!',
    '{killer} räddade solen! Men {random_member} — den springer så långsamt att solen hade gått ner, kommit upp och gått ner IGEN innan den var klar. Mörkret kommer ändå!',
    'Jag slukar SOLAR! Och {killer} behandlade mig som en valp! {random_member} hade inte kunnat jaga sin egen skugga. Himlavalvet ska bli mörkt!',
    '{killer} stoppade evigt mörker! Men {random_member} hade blivit omsprungen av en snigel — i en UPPFÖRSBACKE. Solen ska bli min!'
  ],
  crit_hint = 'Skoll hatade gryningen — morgonpass före 06:00 när solen steg slog extra hårt 🌅'
WHERE level = 21;

UPDATE boss_definitions SET
  lore = 'Vargen som jagar månen genom natten. Hati Hróðvitnisson springer efter månen Mani och försöker svälja honom. Han och brodern Skoll är söner till Fenris, och vid Ragnarök lyckas de båda — himlen går i kras och stjärnorna faller.',
  crit_conditions = '[{"type": "evening_session", "description": "Kvällspass (18-22)"}]',
  defeat_quotes = ARRAY[
    'Månen... lyser fortfarande! {killer} slog mig bort från nattskyn! Min far Fenris ska hämnas!',
    '{killer} räddade månen! Men {random_member} cyklar som en blind fladdermus — irrar runt utan riktning. Natten ska bli evig!',
    'Jag jagar MÅNEN! Och {killer} stoppade mig som en hundvakt! {random_member} hade inte hittat månen med en kikare och en kompass. Stjärnorna ska falla!',
    '{killer} besegrade nattens jägare! Men {random_member} — den hade blivit utsprungen av en fullmåne i slow motion. Min hämnd ska skymma stjärnorna!'
  ],
  crit_hint = 'Hati var svagast på kvällen — kvällspass (18-22) fångade honom nära månen 🌙'
WHERE level = 22;

UPDATE boss_definitions SET
  lore = 'En armé av eldjättar som marscherar från Muspelheim. Surts armé är en hord av eldväsen som följer sin herre mot Asgård under Ragnarök. De marscherar över Bifrost, regnbågsbron, som kollapsar under deras glödande vikt. Allt de rör vid fattar eld.',
  crit_conditions = '[{"type": "streak", "min_days": 3, "description": "3+ dagars streak"}]',
  defeat_quotes = ARRAY[
    'Vår marsch... stoppad! {killer} släckte en HEL armé! Muspelheim gråter aská!',
    '{killer} besegrade tusen eldjättar! Men {random_member} hade inte kunnat släcka ett stearinljus med en brandsläckare. Bifrost ska brinna igen!',
    'Vi brände NER regnbågsbron! Och {killer} släckte oss som ljus på en tårta! {random_member} springer som om marken brinner — fast den gör ju det. Elden dör aldrig!',
    '{killer} släckte vår armé! Men {random_member} hade fattat eld av en brödrost. Vi marscherar igen — hettare, ilsknare och med fler jättar!'
  ],
  crit_hint = 'Surts Armé var sårbar mot uthållighet — 3+ dagars streak bröt deras formation 🔥'
WHERE level = 23;

UPDATE boss_definitions SET
  lore = 'Tricksterguden som leder kaoskrafterna mot Asgård. Loke är blodbroder med Oden men förrådde gudarna genom att orsaka Balders död. Han straffades genom att bindas med sin sons inälvor under en orm som droppar gift i hans ansikte. Hans fru Sigyn håller en skål för att fånga giftet.',
  crit_conditions = '[{"type": "first_attack_of_day", "description": "Dagens första attack"}]',
  defeat_quotes = ARRAY[
    'Ha! Ni tror ni vann? {killer} kanske slog mig, men jag PLANERADE detta! Allt är en del av min plan... förmodligen!',
    '{killer} överlistade tricksterguden! Omöjligt! Eller... kanske ville jag förlora? {random_member} föll i alla fall för ALLA mina fällor. Den hade trott att en skylt som sa "fälla" var en inbjudan!',
    'Bunden med min sons inälvor och FORTFARANDE farligare än er! {killer} fick in en lyckträff! Men {random_member} — den lurades lättare än Höder med misteltenen. Kaos slutar aldrig!',
    '{killer} band mig... IGEN! Men som Oden vet — jag bryter ALLTID fri. {random_member} hade blivit lurad av en papegoja. Mitt nästa trick blir mitt mästerverk!'
  ],
  crit_hint = 'Loke var sårbar för överraskningar — dagens första attack fångade honom mitt i ett trick ⚡'
WHERE level = 24;

UPDATE boss_definitions SET
  lore = 'Dödsskeppet av naglar, lastat med Hels krigare. Naglfar är det gigantiska skeppet byggt av döda människors naglar som seglar under Ragnarök. Det styrs av jätten Hrym och bär en armé av döda från Helheim. Sagan säger att man kan fördröja Ragnarök genom att klippa de dödas naglar innan de begravs.',
  crit_conditions = '[{"type": "group_sync", "min_same_day": 3, "description": "3+ gruppmedlemmar tränar samma dag"}]',
  defeat_quotes = ARRAY[
    'Mitt skepp... av tusen års naglar... {killer} sänkte det på EN dag! Dödsarmén simmar hem med skammen!',
    '{killer} sprängde Naglfar! Men {random_member} — den hade blivit sjösjuk av en badanka. Hels krigare ska bygga en ny flotta!',
    'Tusen års naglar! Miljoner döda! Och {killer} sänkte alltihop! {random_member} hade inte kunnat sänka en pappersbåt i ett badkar. Vi bygger igen — klipp era naglar medan ni kan!',
    '{killer} förstörde mitt mästerverk! Men {random_member} — den seglar sämre än en sten med segel. Nagelfar II ska bli DUBBELT så stor!'
  ],
  crit_hint = 'Naglfar var sårbar mot samordnade attacker — 3+ som tränade samma dag sprängde skrovet 👥'
WHERE level = 25;

-- Tier 6: Ragnarök (Final Battles) - Levels 26-30

UPDATE boss_definitions SET
  lore = 'Fenrisulven bryter sina bojor och slukar himmel och jord. Den kolossala vargen som gudarna band med den magiska kedjan Gleipner bryter äntligen fri vid Ragnarök. Hans gap är så stort att överkäken når himlen och underkäken vilar på jorden. Han slukar Oden och allt i sin väg.',
  crit_conditions = '[{"type": "long_session", "min_minutes": 60, "description": "Långa pass (60+ min)"}]',
  defeat_quotes = ARRAY[
    'Gleipner... binder igen! {killer} kedjade en FRIBRUTEN gud-varg! Inte ens Oden klarade det!',
    '{killer} besegrade den fria Fenrir! Men {random_member} — den hade blivit svald som en tictac. Min käft slukar VÄRLDAR och den klarar inte ens en kvällsjogga! Kedjorna ska brista!',
    'JAG SLUKADE ODEN! Och {killer} stoppade MIG?! {random_member} hade inte ens kunnat öppna min käft med en kofot. Ragnarök tar aldrig slut!',
    '{killer} band Fenrir IGEN! Legend! Men {random_member} — den sprang så långsamt att jag gäspade. Och min gäspning SLUKAR SOLAR. Vi ses vid världens ände!'
  ],
  crit_hint = 'Fenrir Lös var svag mot uthållighet — pass över 60 minuter smidde nya kedjor 💪'
WHERE level = 26;

UPDATE boss_definitions SET
  lore = 'Midgårdsormen reser sig ur havet och förgiftar himlen. Jörmungandr släpper sin svans och hela havet kokar när han reser sig. Hans gift sprids som dimma och dödar allt levande. Thor möter honom i den sista striden — nio steg efter dödsslaget faller åskguden av ormens gift.',
  crit_conditions = '[{"type": "dawn_raid", "description": "Morgonpass (före 06:00)"}]',
  defeat_quotes = ARRAY[
    'Mitt gift... neutraliserat! {killer} överlevde det som dödade THOR! Havet sjunker tillbaka!',
    '{killer} slog mig som Thor men ÖVERLEVDE! {random_member} hade dött av att se mitt gift på bild. Havets kokning var inget mot min ilska!',
    'Thor dog av mig! MEN {killer} LEVER?! Omöjligt! {random_member} hade inte ens kommit till stranden — den simmar som en rostig ubåt. Giftet ska bli starkare!',
    '{killer} besegrade Midgårdsormen... igen! Men {random_member} — den hade blivit förgiftad av sin egen svett. Havet ska resa sig en sista gång!'
  ],
  crit_hint = 'Jörmungandrs Vrede var svagast i gryningen — morgonpass före 06:00 slog genom giftet 🌅'
WHERE level = 27;

UPDATE boss_definitions SET
  lore = 'Surt svingar sitt eldiga svärd och sätter världen i brand. I Ragnaröks klimax svingar Surt sitt flammande svärd och sätter hela jorden i brand. Allt brinner — Asgård, Midgård, allt. Ur askan föds en ny, grönare värld, men först måste allt gammalt förintas.',
  crit_conditions = '[{"type": "streak", "min_days": 5, "description": "5+ dagars streak"}]',
  defeat_quotes = ARRAY[
    'Min eld... SLOCKNAD! {killer} släckte Ragnaröks eld! Inte ens Freja kunde det!',
    '{killer} släckte VÄRLDSBRANDEN! Men {random_member} — den hade inte kunnat släcka en tänd fis. Min eld ska tändas ur askan starkare än förr!',
    'JAG BRÄNNER VÄRLDAR! Hela Asgård! Och {killer} släckte mig med TRÄNINGSSVETT?! {random_member} hade blivit kol innan den hann skrika. Ur askan reser sig ny eld!',
    '{killer} besegrade elden! Men {random_member} hade blivit grillad av en solstråle. Muspelheims eviga eld kan inte släckas — bara fördröjas!'
  ],
  crit_hint = 'Surts Eld var sårbar mot eldsjälar — 5+ dagars streak släckte hans svärd 🔥'
WHERE level = 28;

UPDATE boss_definitions SET
  lore = 'Gudaskymningen! Alla krafter möts i den sista striden. Ragnarök är slutstriden där gudar och jättar förintar varandra. Oden faller för Fenris, Thor för Jörmungandr, Heimdall och Loke dödar varandra. Himlen klyves, stjärnorna slocknar, och jorden sjunker i havet. Men ur kaoset föds en ny värld.',
  crit_conditions = '[{"type": "group_sync", "min_same_day": 4, "description": "4+ gruppmedlemmar tränar samma dag"}]',
  defeat_quotes = ARRAY[
    'Gudaskymningen... avvärjd! {killer} räddade ALLA nio världar! Inte ens Oden lyckades med det!',
    '{killer} stoppade RAGNARÖK! Men {random_member} — den hade inte stoppat en rulltrappa. Världen lever vidare tack vare {killer}, definitivt INTE tack vare {random_member}. Men kaoset väntar alltid...',
    'Gudar och jättar faller! Och {killer} stod kvar som sist! {random_member} hade inte överlevt FÖRSPELET till Ragnarök. Men hör mina ord — gudaskymningen skjuts bara upp!',
    '{killer} besegrade ÖDET SJÄLVT! Men {random_member} — den hade inte klarat en mellanbossfight i världens lättaste spel. Ragnarök tar aldrig riktigt slut!'
  ],
  crit_hint = 'Ragnarök var sårbar mot samlad styrka — 4+ som tränade samma dag avvärjde gudaskymningen 👥'
WHERE level = 29;

UPDATE boss_definitions SET
  lore = 'Världsträdet pånyttföds — slå det sista slaget för en ny värld. Efter Ragnarök reser sig Yggdrasil ur askan, grönare och starkare. Två människor, Liv och Livtrase, överlevde i trädets grenar och ska befolka den nya världen. Solen föder en dotter som lyser ännu starkare. Allt börjar om.',
  crit_conditions = '[{"type": "streak", "min_days": 7, "description": "7+ dagars streak"}]',
  defeat_quotes = ARRAY[
    'Ni... ni klarade det! {killer} slog det sista slaget och den nya världen föds! Yggdrasil blommar igen!',
    '{killer} avslutade cykeln! Liv och Livtrase kan andas ut! Men {random_member} hade förmodligen gömt sig i en gren hela tiden — helt ärligt, den hade inte märkt att världen gick under. En ny era börjar!',
    'Världen föds på nytt! {killer} var den sista hjälten! {random_member} — ja, den var med... typ. Som en supporter på läktaren. Men ALLA bidrog! Den nya solen lyser för er alla!',
    '{killer} planterade den nya världen! Men {random_member} — den hade satt fröet upp och ner. Trots allt — ni är hjältar. Yggdrasils grenar bär er historia nu!'
  ],
  crit_hint = 'Yggdrasils Pånyttfödelse krävde ultimat uthållighet — 7+ dagars streak fullbordade cykeln ✨'
WHERE level = 30;

-- Notify PostgREST about schema changes
NOTIFY pgrst, 'reload schema';
