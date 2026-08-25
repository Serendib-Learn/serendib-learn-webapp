export type HeritageRegion =
  | "Colombo"
  | "Cultural Triangle"
  | "Hill Country"
  | "South Coast"
  | "North"
  | "East";

export interface HeritageSite {
  slug: string;
  name: string;
  alsoKnownAs?: string;
  sinhala?: string;
  tamil?: string;
  region: HeritageRegion;
  era: string;
  /** Real coordinates, projected onto the stylised island map. */
  lat: number;
  lng: number;
  unesco?: boolean;
  /** One line shown on the card. */
  hook: string;
  story: string[];
  facts: { label: string; value: string }[];
  /** Why this place is a meeting point of peoples — the Colombo thesis. */
  meltingPot?: string;
  /** Chapter id from the vocabulary decks that pairs well with this site. */
  pairedChapter?: string;
}

export const heritageSites: HeritageSite[] = [
  {
    slug: "galle-face-green",
    name: "Galle Face Green",
    sinhala: "ගාලු මුවදොර",
    tamil: "காலி முகத்திடல்",
    region: "Colombo",
    era: "Laid out 1859",
    lat: 6.9271,
    lng: 79.8425,
    hook: "Half a kilometre of grass between the city and the Indian Ocean, where all of Colombo turns up at sunset.",
    story: [
      "The Green began as a firing line. The Dutch cleared the ground so their cannon at Colombo fort had an open field toward the sea, and for two centuries it stayed a stretch of scrub used for drills and horse racing.",
      "In 1859 the British governor Sir Henry Ward had it laid out as a promenade and left an inscription dedicating it to the ladies and children of Colombo. The dedication stuck, and the Green quietly became the one piece of the city that belongs to everybody.",
      "Come at six in the evening and the whole island is on that lawn. Kite sellers work the sea wall, isso wade sizzles in kerosene fryers, couples angle for the seaward benches, and cricket breaks out in whatever space is left over.",
    ],
    facts: [
      { label: "Laid out", value: "1859, by Governor Sir Henry Ward" },
      { label: "Length", value: "About 500 m along the sea wall" },
      { label: "Eat", value: "Isso wade — deep-fried lentil patties topped with prawns" },
      { label: "Best time", value: "An hour before sunset, any day of the week" },
    ],
    meltingPot:
      "There is no ticket and no dress code, so the Green flattens a city that is otherwise sorted by neighbourhood and income. Office workers from Fort, families from Dematagoda, tourists from the hotels along the strip and schoolboys with a taped-up cricket ball all end up on the same grass at the same hour.",
    pairedChapter: "weather-chat",
  },
  {
    slug: "pettah",
    name: "The streets of Pettah",
    alsoKnownAs: "Pita Kotuwa",
    sinhala: "පිටකොටුව",
    tamil: "பேட்டை",
    region: "Colombo",
    era: "Dutch era onward",
    lat: 6.9366,
    lng: 79.8562,
    hook: "A bazaar district where each street sells one thing, and every street sells it to everyone.",
    story: [
      "Pettah takes its name from the Tamil pettai, meaning the settlement outside the fort walls. The Sinhala name says the same thing — Pita Kotuwa, outside the fort. Two languages, one description, which tells you most of what you need to know about the place.",
      "The district is organised by trade rather than by map. Sea Street is goldsmiths, Gabo's Lane is ayurvedic herbs and spices, Fifth Cross Street is electrical parts, First Cross Street is fabric. Ask for an address and you will be given a trade instead.",
      "At the centre stands the Khan Clock Tower, put up in 1923 by a Parsi merchant family from Bombay who had settled in Colombo. It is the landmark everyone navigates by, and nobody thinks it odd that the middle of a Sinhala and Tamil bazaar is marked by a Parsi family's gift.",
    ],
    facts: [
      { label: "Name", value: "From Tamil pettai — the town outside the fort" },
      { label: "Landmark", value: "Khan Clock Tower, 1923" },
      { label: "Gold", value: "Sea Street, the goldsmiths' quarter" },
      { label: "Go early", value: "Before 9am, before the heat and the crowds" },
    ],
    meltingPot:
      "Pettah is the clearest argument for Colombo as a mixed city. Sinhala wholesalers, Tamil goldsmiths, Muslim textile traders, Malay and Memon families and Parsi merchants have worked these same few blocks for generations. A Buddhist temple, a Hindu kovil, a mosque and a Dutch Reformed church all stand within a ten minute walk of each other, and the trade never stopped for any of it.",
    pairedChapter: "at-the-shop",
  },
  {
    slug: "jami-ul-alfar-mosque",
    name: "Jami Ul-Alfar Mosque",
    alsoKnownAs: "The Red Mosque",
    tamil: "செம்மசூதி",
    region: "Colombo",
    era: "1908",
    lat: 6.938,
    lng: 79.8571,
    hook: "Candy-striped red and white, rising straight out of the Pettah bazaar.",
    story: [
      "Built in 1908 for the Indian Muslim traders working in Pettah, the mosque was designed by a local builder who had never trained as an architect and drew on whatever he had seen and liked. The result belongs to no single style and is unmistakable from three streets away.",
      "Sailors reportedly used the red and white banding as a landmark when approaching Colombo harbour, spotting the mosque before the shoreline resolved.",
      "It is still a working mosque in the middle of a working bazaar. Prayer empties the surrounding streets of traders five times a day, and then the shutters go back up.",
    ],
    facts: [
      { label: "Built", value: "1908, for Pettah's Indian Muslim traders" },
      { label: "Style", value: "Indo-Saracenic, freely interpreted" },
      { label: "Visiting", value: "Modest dress; ask before entering, avoid prayer times" },
    ],
    meltingPot:
      "A mosque commissioned by Indian Muslim migrants, designed by a self-taught local hand, used as a navigation mark by foreign sailors, and standing across the road from Hindu and Sinhala-owned shops. Nothing about it came from one place.",
  },
  {
    slug: "wolvendaal-church",
    name: "Wolvendaal Church",
    sinhala: "වොල්වෙන්ඩාල් පල්ලිය",
    region: "Colombo",
    era: "1749",
    lat: 6.9412,
    lng: 79.86,
    hook: "A Dutch Reformed church on a hill above Pettah, barely altered in 275 years.",
    story: [
      "The Dutch finished Wolvendaal in 1749 on a rise above the bazaar, in the shape of a Greek cross with walls a metre and a half thick. They named the hill for the jackals they mistook for wolves.",
      "Inside are the tombstones of Dutch governors, moved here from the old church inside the fort, along with pews, a pulpit and a lectern of Dutch furniture that have never left the building.",
      "It is one of the oldest Protestant churches still in use anywhere in Asia, and it holds services in Sinhala, Tamil and English.",
    ],
    facts: [
      { label: "Completed", value: "1749" },
      { label: "Plan", value: "Greek cross, walls about 1.5 m thick" },
      { label: "Inside", value: "Governors' tombstones and original Dutch furniture" },
    ],
    meltingPot:
      "A Dutch colonial building that outlived the Dutch, now serving a Sri Lankan congregation in three languages. The city absorbed it rather than the other way round.",
  },
  {
    slug: "gangaramaya-temple",
    name: "Gangaramaya Temple",
    sinhala: "ගංගාරාමය",
    region: "Colombo",
    era: "Founded 1885",
    lat: 6.9166,
    lng: 79.8564,
    hook: "A Buddhist temple on Beira Lake with a museum of things people could not throw away.",
    story: [
      "Founded in 1885 beside Beira Lake, Gangaramaya grew into one of Colombo's most important temples and one of its strangest collections. Alongside the shrine room and the bodhi tree is a museum stuffed with gifts, curiosities and donated oddities accumulated over a century.",
      "During Vesak the temple and the lake around it are lit with pandals and paper lanterns, and the crowd walking the shore is a fair sample of the whole city.",
      "The Seema Malaka meditation hall sits out on the water a short walk away, rebuilt in the 1970s to a design by Geoffrey Bawa.",
    ],
    facts: [
      { label: "Founded", value: "1885" },
      { label: "Nearby", value: "Seema Malaka, redesigned by Geoffrey Bawa" },
      { label: "Best time", value: "Vesak, when the lake is full of lanterns" },
    ],
    pairedChapter: "meeting-relatives",
  },
  {
    slug: "old-dutch-hospital",
    name: "Old Dutch Hospital",
    region: "Colombo",
    era: "17th century",
    lat: 6.9337,
    lng: 79.8425,
    hook: "The oldest building in Colombo Fort, now full of restaurants.",
    story: [
      "The Dutch built it in the 1600s to treat the staff of the East India Company, arranged around two courtyards with deep shaded verandahs to move air through the wards.",
      "It served as a hospital, then a police station, then offices, then very nearly nothing at all.",
      "Restored and reopened as a shopping and dining precinct, it is now where Colombo goes for dinner. The verandahs still do exactly what they were designed to do.",
    ],
    facts: [
      { label: "Built", value: "17th century, by the Dutch East India Company" },
      { label: "Now", value: "Restaurants, bars and shops around two courtyards" },
      { label: "Walk to", value: "Galle Face Green, ten minutes south" },
    ],
  },
  {
    slug: "captains-garden-kovil",
    name: "Captain's Garden Kovil",
    alsoKnownAs: "Sri Kailawasanathan Swami Devasthanam",
    tamil: "கப்டன்ஸ் கார்டன் கோவில்",
    region: "Colombo",
    era: "Early 19th century",
    lat: 6.933,
    lng: 79.866,
    hook: "The oldest Hindu temple in Colombo, tucked behind the railway yards.",
    story: [
      "Reckoned to be Colombo's oldest surviving Hindu temple, Captain's Garden sits in an unglamorous pocket of the city near the Maradana rail yards, hemmed in by workshops and sidings.",
      "It is a working neighbourhood temple rather than a monument. The gopuram is bright, the courtyard is small, and the crowd is whoever lives and works nearby.",
      "During the Vel festival the temple's chariot is drawn through the streets, and the route cuts across parts of the city that have nothing else in common.",
    ],
    facts: [
      { label: "Age", value: "Considered Colombo's oldest Hindu temple" },
      { label: "Festival", value: "Vel — the chariot procession through the city" },
      { label: "Setting", value: "Beside the Maradana railway yards" },
    ],
    meltingPot:
      "A Tamil Hindu temple in a district built around a British railway, surrounded by Sinhala and Muslim-owned workshops. Colombo rarely sorts itself into neat quarters for long.",
  },
  {
    slug: "sigiriya",
    name: "Sigiriya",
    alsoKnownAs: "Lion Rock",
    sinhala: "සීගිරිය",
    tamil: "சிகிரியா",
    region: "Cultural Triangle",
    era: "5th century",
    lat: 7.957,
    lng: 80.76,
    unesco: true,
    hook: "A king built his palace on top of a two hundred metre rock, and put a lion in the doorway.",
    story: [
      "King Kashyapa took the throne in the 470s by walling up his father alive, then moved the capital to the top of a granite monolith where his brother could not easily reach him.",
      "The way up passes a sheer face of frescoes — women in procession, painted around the rock — and then the mirror wall, polished plaster carrying more than a thousand years of visitors' graffiti. Some of the scratched verses are the oldest Sinhala writing of their kind.",
      "At the summit are the foundations of the palace, cisterns cut into the rock, and gardens laid out below with a symmetry that only makes sense from up here. Kashyapa lasted eighteen years. The rock has done rather better.",
    ],
    facts: [
      { label: "Built", value: "Late 5th century, by King Kashyapa" },
      { label: "Height", value: "About 180 m above the surrounding plain" },
      { label: "UNESCO", value: "World Heritage since 1982" },
      { label: "Climb", value: "Roughly 1,200 steps — go at opening time" },
    ],
    pairedChapter: "tuk-tuk-adventure",
  },
  {
    slug: "dambulla-cave-temple",
    name: "Dambulla Cave Temple",
    alsoKnownAs: "Golden Temple of Dambulla",
    sinhala: "දඹුලු ලෙන් විහාරය",
    region: "Cultural Triangle",
    era: "1st century BCE onward",
    lat: 7.856,
    lng: 80.649,
    unesco: true,
    hook: "Five caves under one rock overhang, painted end to end.",
    story: [
      "A king hid in these caves while in exile, and converted them to a temple once he had his kingdom back. Later rulers kept adding to them for the better part of two thousand years.",
      "Five caves hold more than 150 statues of the Buddha and a handful of kings and gods. Every surface that is not a statue is painted, including the rock ceilings, which follow the natural contours of the stone.",
      "Water seeps up rather than down in one of the caves, collecting in a vessel that is said never to run dry.",
    ],
    facts: [
      { label: "Founded", value: "1st century BCE" },
      { label: "Caves", value: "Five, with over 150 statues" },
      { label: "UNESCO", value: "World Heritage since 1991" },
      { label: "Note", value: "Shoes off and shoulders covered at the entrance" },
    ],
  },
  {
    slug: "anuradhapura",
    name: "Anuradhapura",
    sinhala: "අනුරාධපුරය",
    tamil: "அனுராதபுரம்",
    region: "Cultural Triangle",
    era: "4th century BCE – 11th century CE",
    lat: 8.335,
    lng: 80.389,
    unesco: true,
    hook: "A capital that ran for over a thousand years, and a tree that has outlasted it.",
    story: [
      "Anuradhapura was the seat of Sinhalese kings for more than a millennium, a city of monasteries, palaces and colossal brick stupas fed by reservoirs that still hold water today.",
      "At its heart is the Sri Maha Bodhi, grown from a cutting of the tree under which the Buddha reached enlightenment, planted in the 3rd century BCE. It is the oldest human-planted tree with a continuous written record anywhere in the world, and it has been tended without a break ever since.",
      "The Ruwanwelisaya stupa nearby was raised in the 2nd century BCE on a scale that still reads as ambitious. Much of the city is ruins; the tree and the stupa are not.",
    ],
    facts: [
      { label: "Capital", value: "From the 4th century BCE for over 1,000 years" },
      { label: "Sri Maha Bodhi", value: "Planted 3rd century BCE" },
      { label: "UNESCO", value: "World Heritage since 1982" },
      { label: "Getting round", value: "Hire a bicycle — the site is enormous" },
    ],
  },
  {
    slug: "polonnaruwa",
    name: "Polonnaruwa",
    sinhala: "පොළොන්නරුව",
    region: "Cultural Triangle",
    era: "11th – 13th century",
    lat: 7.94,
    lng: 81.0,
    unesco: true,
    hook: "The second capital, compact enough to see in a day, and the finest stone carving on the island.",
    story: [
      "After Anuradhapura fell, the kings moved here. Parakramabahu I rebuilt the city in the 12th century and dammed a reservoir so large it is still called the Sea of Parakrama.",
      "The Gal Vihara is the reason people come — four figures of the Buddha cut from a single granite face, including a standing figure with folded arms and a reclining figure fourteen metres long. The stone's natural banding runs through the carving and the sculptors used it deliberately.",
      "Parakramabahu is remembered for a line about water: not a drop should reach the sea without first serving people. The irrigation works around the city were the argument.",
    ],
    facts: [
      { label: "Peak", value: "12th century, under Parakramabahu I" },
      { label: "Gal Vihara", value: "Four Buddhas cut from one granite face" },
      { label: "Reservoir", value: "Parakrama Samudra — the Sea of Parakrama" },
      { label: "UNESCO", value: "World Heritage since 1982" },
    ],
  },
  {
    slug: "temple-of-the-sacred-tooth-relic",
    name: "Temple of the Sacred Tooth Relic",
    alsoKnownAs: "Sri Dalada Maligawa",
    sinhala: "ශ්‍රී දළදා මාළිගාව",
    region: "Hill Country",
    era: "16th century onward",
    lat: 7.294,
    lng: 80.641,
    unesco: true,
    hook: "A tooth of the Buddha, and the kingdom that was built around keeping it.",
    story: [
      "The relic arrived on the island in the 4th century and became a proof of the right to rule — whoever held the tooth held the country. It moved from capital to capital as kingdoms rose and fell, and ended up in Kandy.",
      "The temple sits beside the old royal palace on the edge of Kandy Lake. The relic itself stays in a casket within a casket and is almost never shown; the daily thevava ceremonies of drumming and offerings take place in front of the closed shrine.",
      "Kandy held out against the Portuguese and the Dutch and was the last kingdom on the island to fall, in 1815. Every July or August the Esala Perahera takes the relic's casket through the streets behind dancers, drummers and tusked elephants.",
    ],
    facts: [
      { label: "Relic", value: "A tooth of the Buddha, on the island since the 4th century" },
      { label: "Ceremony", value: "Thevava, three times daily" },
      { label: "Festival", value: "Esala Perahera, July or August" },
      { label: "UNESCO", value: "Sacred City of Kandy, World Heritage since 1988" },
    ],
    pairedChapter: "arriving",
  },
  {
    slug: "adams-peak",
    name: "Adam's Peak",
    alsoKnownAs: "Sri Pada",
    sinhala: "ශ්‍රී පාදය",
    tamil: "சிவனொளிபாதமலை",
    region: "Hill Country",
    era: "Pilgrimage for over a thousand years",
    lat: 6.809,
    lng: 80.499,
    hook: "One footprint at the summit, claimed by four religions, climbed through the night.",
    story: [
      "At the top of a 2,243 metre peak is a hollow in the rock shaped roughly like a footprint. Buddhists hold it to be the Buddha's. Hindus say it is Shiva's and call the mountain Sivanolipadamalai. Muslims and Christians have long held it to be Adam's, left when he first set foot on earth.",
      "Nobody has ever needed to resolve this. In pilgrimage season, from December to May, the stairway is lit through the night and climbed by all of them at once, along with a fair number of people who simply want to see the sunrise.",
      "You start around two in the morning to be up in time. As the sun comes up the mountain throws a perfect triangular shadow across the cloud below it.",
    ],
    facts: [
      { label: "Height", value: "2,243 m" },
      { label: "Season", value: "December to May, when the path is lit" },
      { label: "Start", value: "About 2am from Dalhousie, to reach the top by dawn" },
      { label: "Sacred to", value: "Buddhists, Hindus, Muslims and Christians" },
    ],
    meltingPot:
      "Four faiths reading the same mark in the same rock four different ways, and climbing the same steps to see it. If Colombo is the island's mixed city, Sri Pada is its mixed mountain.",
  },
  {
    slug: "galle-fort",
    name: "Galle Fort",
    sinhala: "ගාල්ල කොටුව",
    tamil: "காலிக் கோட்டை",
    region: "South Coast",
    era: "1588 onward",
    lat: 6.026,
    lng: 80.217,
    unesco: true,
    hook: "A walled Portuguese and Dutch port town on a headland, still lived in.",
    story: [
      "The Portuguese fortified the headland in 1588. The Dutch took it in 1640 and spent the next century rebuilding it properly, in coral and granite, with bastions named after the virtues and the vices.",
      "Inside is a grid of streets that has not moved in three hundred years, holding a Dutch Reformed church, a mosque, temples, warehouses and houses with deep verandahs. The 1969 lighthouse stands on the rampart at the point.",
      "The tsunami in 2004 came over the walls in places, and the walls held. People still live and trade inside them.",
    ],
    facts: [
      { label: "Founded", value: "Portuguese 1588, rebuilt by the Dutch after 1640" },
      { label: "UNESCO", value: "World Heritage since 1988" },
      { label: "Best walk", value: "The ramparts at sunset, anti-clockwise from the gate" },
      { label: "Still", value: "A living town, not a museum" },
    ],
    meltingPot:
      "Portuguese foundations, Dutch walls, British lighthouse, and a Sri Lankan town of Sinhala, Tamil, Muslim and Burgher families living inside all of it at once.",
    pairedChapter: "ordering-food",
  },
  {
    slug: "nine-arch-bridge",
    name: "Nine Arch Bridge",
    sinhala: "ආරුක්කු නමයේ පාලම",
    region: "Hill Country",
    era: "Built around 1921",
    lat: 6.876,
    lng: 81.06,
    hook: "Nine stone arches across a tea-covered gorge, built without a girder of steel.",
    story: [
      "The bridge carries the hill country railway across a ravine near Ella on nine arches of brick, stone and cement. The story told locally is that the steel earmarked for it was diverted to the war effort, so it was finished in stone instead.",
      "Trains still cross it a handful of times a day, slowly, which is why the walk out along the track from Ella has become a small industry.",
      "The gorge below is planted with tea and the mist comes and goes in minutes. Wait for it to clear.",
    ],
    facts: [
      { label: "Built", value: "Around 1921, on the Badulla line" },
      { label: "Arches", value: "Nine, in stone and brick — no steel" },
      { label: "Getting there", value: "A 25 minute walk from Ella along the track" },
    ],
    pairedChapter: "finding-your-driver",
  },
  {
    slug: "nallur-kandaswamy-kovil",
    name: "Nallur Kandaswamy Kovil",
    tamil: "நல்லூர் கந்தசுவாமி கோவில்",
    region: "North",
    era: "Rebuilt from 1734",
    lat: 9.677,
    lng: 80.028,
    hook: "Jaffna's great temple to Murugan, destroyed once and rebuilt on a different spot.",
    story: [
      "The original temple was a centre of the Jaffna kingdom until the Portuguese destroyed it in 1620. Rebuilding began in 1734 on a nearby site, and has essentially never stopped — the gopurams, halls and gold work have been added to for close to three centuries.",
      "Men remove their shirts to enter, a custom kept here more strictly than at most kovils on the island.",
      "The annual festival runs for twenty-five days and fills Jaffna with people who have come home for it, some from a long way away.",
    ],
    facts: [
      { label: "Deity", value: "Murugan (Kandaswamy)" },
      { label: "Destroyed", value: "1620, by the Portuguese" },
      { label: "Rebuilt", value: "From 1734, and continuously since" },
      { label: "Festival", value: "Twenty-five days, in July and August" },
    ],
  },
  {
    slug: "koneswaram-temple",
    name: "Koneswaram Temple",
    tamil: "கோணேசுவரம்",
    region: "East",
    era: "Ancient; rebuilt after 1622",
    lat: 8.583,
    lng: 81.246,
    hook: "A Shiva temple on a cliff above Trincomalee harbour, with the sea on three sides.",
    story: [
      "Koneswaram stands on Swami Rock, a headland above one of the finest natural harbours in the world. It is one of the five ancient Shiva temples of the island and was rich enough to be famous well beyond it.",
      "The Portuguese destroyed the temple in 1622 and pushed much of it off the cliff. Some of the original stonework was later recovered from the seabed below and returned to the shrine.",
      "The view down from the rock takes in the whole harbour, which is why the site has been fought over by nearly everyone who ever wanted this coast.",
    ],
    facts: [
      { label: "Deity", value: "Shiva, as Konesar" },
      { label: "Setting", value: "Swami Rock, above Trincomalee harbour" },
      { label: "Destroyed", value: "1622; stonework later recovered from the sea" },
    ],
  },
  {
    slug: "ceylon-tea-country",
    name: "Ceylon Tea Country",
    sinhala: "නුවර එළිය",
    region: "Hill Country",
    era: "From 1867",
    lat: 6.949,
    lng: 80.789,
    hook: "Hills terraced with tea, worked by families brought here five generations ago.",
    story: [
      "Coffee failed in the 1860s, and the British planters replaced it with tea. James Taylor put in the first commercial plantation at Loolecondera in 1867, and within thirty years the hill country had been remade into estates, factories and narrow-gauge lines.",
      "The labour came from South India — Tamil workers recruited in their thousands, whose descendants still live and work on the estates. Their citizenship was only fully resolved late in the twentieth century.",
      "Nuwara Eliya at the centre of it was built to look like an English hill town, with a racecourse, a golf course and a post office in red brick, at nearly 1,900 metres.",
    ],
    facts: [
      { label: "First estate", value: "Loolecondera, 1867, by James Taylor" },
      { label: "Nuwara Eliya", value: "About 1,870 m above sea level" },
      { label: "Ride", value: "The Kandy to Ella train, through the middle of it" },
    ],
    meltingPot:
      "The tea that the world knows as Ceylon was planted by the British, worked by Tamils from South India, and is now the identity of a Sinhala-majority country. All three are in the cup.",
    pairedChapter: "weather-chat",
  },
];

export const heritageRegions: HeritageRegion[] = [
  "Colombo",
  "Cultural Triangle",
  "Hill Country",
  "South Coast",
  "North",
  "East",
];

export function getHeritageSite(slug: string): HeritageSite | undefined {
  return heritageSites.find((site) => site.slug === slug);
}

export const meltingPotSites = heritageSites.filter((site) => site.meltingPot);
