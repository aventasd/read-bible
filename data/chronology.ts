/**
 * The Old Testament arranged in historical order.
 *
 * This file is DATA AND REASONING, not logic. It was drafted, cross checked
 * against published chronological reading plans, and then verified by script:
 * every one of the 929 chapters appears exactly once, none missing, none twice.
 *
 * ---------------------------------------------------------------------------
 * THE UNIT HERE IS A "BLOCK", NOT A CHAPTER RANGE
 *
 * A block is the smallest thing that must be read together. The splitter groups
 * blocks into days but NEVER breaks one. A block is either:
 *
 *   one(...)  a single chapter
 *   par(...)  two or more chapters that tell THE SAME EVENTS from different
 *             writers, so they are read side by side instead of days apart
 *
 * The parallel pairings are a reviewed fact recorded here, not something the
 * build infers. Blocks are kept to roughly one day of reading so the splitter
 * can still balance the year.
 * ---------------------------------------------------------------------------
 */

export interface Ref {
  /** USFM book id, e.g. "GEN". Also what bible.com links use. */
  book: string;
  chapter: number;
}

export interface Block {
  refs: Ref[];
  /** Set when refs.length > 1: the same events told by more than one writer. */
  parallel: boolean;
}

export interface EraDef {
  id: number;
  name: string;
  /** Shown on the Timeline screen. Written for a 12 year old. */
  blurb: string;
}

export interface Segment {
  era: number;
  /** Human readable, for review and for the generated plan report. */
  label: string;
  blocks: Block[];
}

// --- small helpers so the data below stays readable ------------------------

/** One block per chapter listed. */
const one = (book: string, ...chapters: number[]): Block[] =>
  chapters.map((chapter) => ({ refs: [{ book, chapter }], parallel: false }));

/** One block per chapter in an inclusive range. */
const run = (book: string, from: number, to: number): Block[] => {
  const out: Block[] = [];
  for (let c = from; c <= to; c++) out.push({ refs: [{ book, chapter: c }], parallel: false });
  return out;
};

/** A single block holding parallel accounts of the same events. */
const par = (...refs: [string, number][]): Block[] => [
  { refs: refs.map(([book, chapter]) => ({ book, chapter })), parallel: true },
];

/** Psalms by number, one block each. */
const ps = (...numbers: number[]): Block[] => one('PSA', ...numbers);

/** Inclusive list of numbers, so the Psalm collections stay readable. */
const nums = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
};

export const ERAS: EraDef[] = [
  { id: 1, name: 'How It All Started', blurb: 'The world begins, everything goes wrong, and one family is chosen.' },
  { id: 2, name: 'Out of Egypt', blurb: 'Slaves become a nation, get rescued, and are given rules to live by.' },
  { id: 3, name: 'A Land of Their Own', blurb: 'They take the land, then keep forgetting God for about 300 years.' },
  { id: 4, name: 'The First Kings', blurb: 'The people ask for a king, Saul fails, and David builds a kingdom.' },
  { id: 5, name: 'Solomon and the Temple', blurb: 'The richest and wisest king builds the temple, then loses his way.' },
  { id: 6, name: 'The Kingdom Splits in Two', blurb: 'One nation becomes two, and prophets warn both until the north is wiped out.' },
  { id: 7, name: 'Only Judah Left', blurb: 'The south survives alone for 130 more years, with some good kings and some terrible ones.' },
  { id: 8, name: 'Jerusalem Falls', blurb: 'The city and the temple are destroyed, and the people are taken to Babylon.' },
  { id: 9, name: 'Coming Home', blurb: 'Persia lets them go home to rebuild the temple, the walls, and the nation.' },
];

export const SEGMENTS: Segment[] = [
  // =========================================================================
  // ERA 1 — How It All Started
  // =========================================================================
  { era: 1, label: 'Genesis 1-11', blocks: run('GEN', 1, 11) },

  // Job sits here, before Abraham. Job has no Law, no Israel and no priests.
  // He offers his own sacrifices and counts wealth in livestock, like Abraham.
  // Both published chronological plans checked read Job between Genesis 11 and 12.
  { era: 1, label: 'Job 1-42', blocks: run('JOB', 1, 42) },

  { era: 1, label: 'Genesis 12-50', blocks: run('GEN', 12, 50) },

  // =========================================================================
  // ERA 2 — Out of Egypt
  // =========================================================================
  { era: 2, label: 'Exodus 1-40', blocks: run('EXO', 1, 40) },
  { era: 2, label: 'Leviticus 1-27', blocks: run('LEV', 1, 27) },
  { era: 2, label: 'Numbers 1-36', blocks: run('NUM', 1, 36) },
  { era: 2, label: 'Deuteronomy 1-34', blocks: run('DEU', 1, 34) },
  // The only psalm whose title names Moses.
  { era: 2, label: 'Psalm 90', blocks: ps(90) },

  // =========================================================================
  // ERA 3 — A Land of Their Own
  // =========================================================================
  { era: 3, label: 'Joshua 1-24', blocks: run('JOS', 1, 24) },
  { era: 3, label: 'Judges 1-21', blocks: run('JDG', 1, 21) },
  // Ruth 1:1 "when the judges ruled", and the closing family list ends with
  // David's grandfather, so it leads straight into 1 Samuel.
  { era: 3, label: 'Ruth 1-4', blocks: run('RUT', 1, 4) },

  // =========================================================================
  // ERA 4 — The First Kings
  //
  // The signature of this era: fourteen psalms carry a title naming the exact
  // event behind them, so they are read on the same day as the story. Reading
  // Psalm 51 beside Nathan's rebuke is the best thing this ordering does.
  // =========================================================================
  { era: 4, label: '1 Samuel 1-17', blocks: run('1SA', 1, 17) },
  { era: 4, label: '1 Samuel 18-20', blocks: run('1SA', 18, 20) },
  // Title: "when Saul had sent men to watch David's house in order to kill him".
  { era: 4, label: 'Psalm 59', blocks: ps(59) },
  { era: 4, label: '1 Samuel 21-24', blocks: run('1SA', 21, 24) },
  // Titles name Gath, the cave, Doeg the Edomite, and the Ziphites.
  { era: 4, label: 'Psalms 7, 34, 52, 54, 56-57, 63, 142', blocks: ps(7, 34, 52, 54, 56, 57, 63, 142) },
  { era: 4, label: '1 Samuel 25-30', blocks: run('1SA', 25, 30) },
  { era: 4, label: '1 Samuel 31 || 1 Chronicles 10', blocks: par(['1SA', 31], ['1CH', 10]) },
  { era: 4, label: '2 Samuel 1-4', blocks: run('2SA', 1, 4) },
  { era: 4, label: '1 Chronicles 1-9', blocks: run('1CH', 1, 9) },
  {
    era: 4,
    label: '2 Samuel 5 || 1 Chronicles 11-12',
    // 1 Chronicles 12 lists the warriors who joined David; it has no parallel.
    blocks: [...par(['2SA', 5], ['1CH', 11]), ...one('1CH', 12)],
  },
  {
    era: 4,
    label: '2 Samuel 6 || 1 Chronicles 13-16',
    // 2 Samuel 6 tells the whole ark story in one chapter; Chronicles spreads it
    // over 13, 15 and 16, with 14 inserted. Paired at the opening, then followed.
    blocks: [...par(['2SA', 6], ['1CH', 13]), ...one('1CH', 14, 15, 16)],
  },
  // Psalms sung when the ark came up to Jerusalem.
  { era: 4, label: 'Psalms 24, 96, 105, 132', blocks: ps(24, 96, 105, 132) },
  { era: 4, label: '2 Samuel 7 || 1 Chronicles 17', blocks: par(['2SA', 7], ['1CH', 17]) },
  {
    era: 4,
    label: '2 Samuel 8-9 || 1 Chronicles 18',
    blocks: [...par(['2SA', 8], ['1CH', 18]), ...one('2SA', 9)],
  },
  { era: 4, label: '2 Samuel 10 || 1 Chronicles 19', blocks: par(['2SA', 10], ['1CH', 19]) },
  // Title: "when Joab fought Aram Naharaim and Aram Zobah".
  { era: 4, label: 'Psalm 60', blocks: ps(60) },
  {
    era: 4,
    label: '2 Samuel 11-12 || 1 Chronicles 20',
    // Chronicles keeps the siege of Rabbah and leaves out Bathsheba entirely,
    // so all three chapters belong to one day rather than to separate ones.
    blocks: par(['2SA', 11], ['2SA', 12], ['1CH', 20]),
  },
  // Psalm 51: "when Nathan the prophet came to him, after he had gone in to Bathsheba".
  { era: 4, label: 'Psalms 32, 51', blocks: ps(32, 51) },
  { era: 4, label: '2 Samuel 13-15', blocks: run('2SA', 13, 15) },
  // Title: "when he fled from Absalom his son".
  { era: 4, label: 'Psalm 3', blocks: ps(3) },
  { era: 4, label: '2 Samuel 16-21', blocks: run('2SA', 16, 21) },
  // 2 Samuel 22 and Psalm 18 are the same song, so they are read together.
  { era: 4, label: '2 Samuel 22 || Psalm 18', blocks: par(['2SA', 22], ['PSA', 18]) },
  { era: 4, label: '2 Samuel 23', blocks: one('2SA', 23) },
  { era: 4, label: '2 Samuel 24 || 1 Chronicles 21', blocks: par(['2SA', 24], ['1CH', 21]) },
  { era: 4, label: 'Psalm 30', blocks: ps(30) },
  { era: 4, label: '1 Chronicles 22-27', blocks: run('1CH', 22, 27) },
  {
    era: 4,
    label: 'Psalms of David, first collection',
    blocks: ps(...nums(1, 2), ...nums(4, 6), ...nums(8, 17), ...nums(19, 23), ...nums(25, 29), 31, 33, ...nums(35, 41)),
  },
  {
    era: 4,
    // Sons of Korah (42-49) and Asaph (50) were David's temple singers.
    label: 'Psalms of the temple singers',
    blocks: ps(...nums(42, 50), 53, 55, 58, 61, 62, ...nums(64, 71)),
  },
  {
    era: 4,
    label: 'Psalms of David, second collection',
    blocks: ps(...nums(108, 110), ...nums(138, 141), ...nums(143, 145)),
  },
  {
    era: 4,
    label: '1 Chronicles 28-29 and 1 Kings 1-2',
    // David's public charge to Solomon, then Solomon's accession. The overlap
    // between them is only a few verses, so these stay as separate chapters
    // rather than being merged.
    blocks: [...run('1CH', 28, 29), ...run('1KI', 1, 2)],
  },

  // =========================================================================
  // ERA 5 — Solomon and the Temple
  // =========================================================================
  {
    era: 5,
    label: '1 Kings 3-4 || 2 Chronicles 1',
    blocks: [...par(['1KI', 3], ['2CH', 1]), ...one('1KI', 4)],
  },
  // "A psalm of Solomon", a prayer for the king.
  { era: 5, label: 'Psalm 72', blocks: ps(72) },
  { era: 5, label: 'Song of Songs 1-8', blocks: run('SNG', 1, 8) },
  { era: 5, label: 'Proverbs 1-31', blocks: run('PRO', 1, 31) },
  {
    era: 5,
    label: '1 Kings 5-8 || 2 Chronicles 2-7',
    // The temple, told twice. Paired chapter by chapter: preparations, building,
    // furnishings, then the ark brought in. Solomon's prayer and the dedication
    // fire are Chronicles-only chapters that follow.
    blocks: [
      ...par(['1KI', 5], ['2CH', 2]),
      ...par(['1KI', 6], ['2CH', 3]),
      ...par(['1KI', 7], ['2CH', 4]),
      ...par(['1KI', 8], ['2CH', 5]),
      ...one('2CH', 6, 7),
    ],
  },
  // "Of Solomon", one of the songs of ascents.
  { era: 5, label: 'Psalm 127', blocks: ps(127) },
  {
    era: 5,
    label: 'Psalms 91-95, 97-104',
    blocks: ps(...nums(91, 95), ...nums(97, 104)),
  },
  {
    era: 5,
    label: '1 Kings 9-10 || 2 Chronicles 8-9',
    blocks: [...par(['1KI', 9], ['2CH', 8]), ...par(['1KI', 10], ['2CH', 9])],
  },
  // Solomon looking back on wealth and building. Traditional placement; many
  // scholars date the writing much later. See "judgment calls" in the plan.
  { era: 5, label: 'Ecclesiastes 1-12', blocks: run('ECC', 1, 12) },
  { era: 5, label: '1 Kings 11', blocks: one('1KI', 11) },

  // =========================================================================
  // ERA 6 — The Kingdom Splits in Two
  // =========================================================================
  {
    era: 6,
    label: '1 Kings 12-14 || 2 Chronicles 10-12',
    blocks: [
      ...par(['1KI', 12], ['2CH', 10]),
      ...one('1KI', 13),
      ...one('2CH', 11),
      ...par(['1KI', 14], ['2CH', 12]), // Shishak invades, told in both
    ],
  },
  {
    era: 6,
    label: '1 Kings 15 || 2 Chronicles 13-16',
    // 1 Kings 15 covers Abijah and Asa of Judah plus Nadab and Baasha of Israel;
    // Chronicles gives Abijah one chapter and Asa three.
    blocks: [...par(['1KI', 15], ['2CH', 13]), ...one('2CH', 14, 15, 16)],
  },
  {
    era: 6,
    label: '1 Kings 16 and 2 Chronicles 17',
    // Not parallel: 1 Kings 16 follows Israel's kings to Ahab, 2 Chronicles 17
    // introduces Jehoshaphat of Judah.
    blocks: [...one('1KI', 16), ...one('2CH', 17)],
  },
  { era: 6, label: '1 Kings 17-19', blocks: run('1KI', 17, 19) },
  { era: 6, label: '1 Kings 20-21', blocks: run('1KI', 20, 21) },
  { era: 6, label: '1 Kings 22 || 2 Chronicles 18', blocks: par(['1KI', 22], ['2CH', 18]) },
  { era: 6, label: '2 Chronicles 19-20', blocks: run('2CH', 19, 20) },
  { era: 6, label: '2 Kings 1-7', blocks: run('2KI', 1, 7) },
  {
    era: 6,
    label: '2 Kings 8-10 || 2 Chronicles 21-22',
    blocks: [...par(['2KI', 8], ['2CH', 21]), ...one('2KI', 9), ...par(['2KI', 10], ['2CH', 22])],
  },
  // JUDGMENT CALL. Obadiah's 21 verses describe Edom cheering while Jerusalem is
  // looted, and Jerusalem was looted more than once, so the book fits two
  // centuries equally well. Published plans split about evenly between Edom's
  // revolt under Jehoram (here, about 845 BC) and just after 586 BC. Modern
  // scholarship leans later. To move it, put it after Lamentations.
  { era: 6, label: 'Obadiah 1', blocks: one('OBA', 1) },
  {
    era: 6,
    label: '2 Kings 11-12 || 2 Chronicles 23-24',
    blocks: [...par(['2KI', 11], ['2CH', 23]), ...par(['2KI', 12], ['2CH', 24])],
  },
  // JUDGMENT CALL. Joel names no king and no empire, so nothing inside the book
  // dates it, and estimates spread across 400 years. Published plans disagree
  // three ways. Modern scholarship leans to after the exile. Placed here at
  // about 835 BC, the most common placement in printed plans. To move it, put it
  // beside Habakkuk.
  { era: 6, label: 'Joel 1-3', blocks: run('JOL', 1, 3) },
  { era: 6, label: '2 Kings 13', blocks: one('2KI', 13) },
  { era: 6, label: '2 Kings 14 || 2 Chronicles 25', blocks: par(['2KI', 14], ['2CH', 25]) },
  // 2 Kings 14:25 names Jonah as a prophet of Jeroboam II's reign.
  { era: 6, label: 'Jonah 1-4', blocks: run('JON', 1, 4) },
  {
    era: 6,
    label: '2 Kings 15 || 2 Chronicles 26-27',
    blocks: [...par(['2KI', 15], ['2CH', 26]), ...one('2CH', 27)],
  },
  // Amos 1:1 names Uzziah of Judah and Jeroboam II of Israel, about 760 BC.
  { era: 6, label: 'Amos 1-9', blocks: run('AMO', 1, 9) },
  // Hosea 1:1 names Jeroboam II through Hezekiah, so he outlasts Samaria's fall.
  { era: 6, label: 'Hosea 1-14', blocks: run('HOS', 1, 14) },
  {
    era: 6,
    label: 'Psalms 73, 75-78, 80-89',
    blocks: ps(73, ...nums(75, 78), ...nums(80, 89)),
  },
  { era: 6, label: '2 Kings 16 || 2 Chronicles 28', blocks: par(['2KI', 16], ['2CH', 28]) },
  // Micah 1:1 names Jotham, Ahaz and Hezekiah; 1:6 still treats Samaria's fall
  // as future, so Micah is read just before it happens.
  { era: 6, label: 'Micah 1-7', blocks: run('MIC', 1, 7) },
  { era: 6, label: '2 Kings 17', blocks: one('2KI', 17) },

  // =========================================================================
  // ERA 7 — Only Judah Left
  //
  // Isaiah is read in three parts, not one block. The book dates itself:
  // chapter 6 is "the year King Uzziah died", 7-8 sit under Ahaz, 14:28 is "the
  // year King Ahaz died", and 36-39 is almost word for word 2 Kings 18-20.
  // Reading all 66 chapters at Hezekiah would be the least accurate thing in
  // this plan.
  // =========================================================================
  { era: 7, label: 'Isaiah 1-35', blocks: run('ISA', 1, 35) },
  {
    era: 7,
    label: '2 Kings 18-20 || 2 Chronicles 29-32 || Isaiah 36-39',
    // Hezekiah's reforms are Chronicles-only and come first. Then the Assyrian
    // crisis, told three times, paired chapter by chapter.
    blocks: [
      ...one('2CH', 29, 30, 31),
      ...par(['2KI', 18], ['2CH', 32], ['ISA', 36]),
      ...par(['2KI', 19], ['ISA', 37]),
      ...par(['2KI', 20], ['ISA', 38], ['ISA', 39]),
    ],
  },
  { era: 7, label: 'Isaiah 40-66', blocks: run('ISA', 40, 66) },
  { era: 7, label: '2 Kings 21 || 2 Chronicles 33', blocks: par(['2KI', 21], ['2CH', 33]) },
  // Nahum treats the fall of Thebes (3:8) as past and Nineveh's fall as future,
  // so between 663 and 612 BC, before Josiah's reforms.
  { era: 7, label: 'Nahum 1-3', blocks: run('NAM', 1, 3) },
  {
    era: 7,
    label: '2 Kings 22-23 || 2 Chronicles 34-35',
    blocks: [...par(['2KI', 22], ['2CH', 34]), ...par(['2KI', 23], ['2CH', 35])],
  },
  // Zephaniah 1:1 places him in Josiah's reign directly.
  { era: 7, label: 'Zephaniah 1-3', blocks: run('ZEP', 1, 3) },

  // =========================================================================
  // ERA 8 — Jerusalem Falls
  //
  // Jeremiah's 52 chapters running straight into Ezekiel's 48 would be 100
  // chapters of judgment poetry with almost no story, arriving late in the year
  // when a reader is already tired. So the two are read in blocks of about six
  // chapters, alternating with the story in this era: Daniel, the fall of the
  // city, and Lamentations. The reader never faces more than about a week of
  // poetry without a story to anchor it.
  //
  // Honest limit: Jeremiah's own chapters are not in time order inside the book,
  // so no chapter-level arrangement here is perfectly chronological. These
  // blocks are historically sensible, not perfect.
  // =========================================================================
  // Babylon is the rising power God is about to send: about 609 to 605 BC.
  { era: 8, label: 'Habakkuk 1-3', blocks: run('HAB', 1, 3) },
  { era: 8, label: 'Jeremiah 1-6', blocks: run('JER', 1, 6) },
  { era: 8, label: 'Jeremiah 7-12', blocks: run('JER', 7, 12) },
  // Daniel 1:1 puts him in the first deportation, 605 BC.
  { era: 8, label: 'Daniel 1-3', blocks: run('DAN', 1, 3) },
  { era: 8, label: 'Jeremiah 13-18', blocks: run('JER', 13, 18) },
  { era: 8, label: 'Jeremiah 19-24', blocks: run('JER', 19, 24) },
  // Ezekiel 1:1-3 dates him to the fifth year of Jehoiachin's exile, 593 BC,
  // by the Kebar canal in Babylon.
  { era: 8, label: 'Ezekiel 1-6', blocks: run('EZK', 1, 6) },
  { era: 8, label: 'Jeremiah 25-30', blocks: run('JER', 25, 30) },
  { era: 8, label: 'Ezekiel 7-12', blocks: run('EZK', 7, 12) },
  { era: 8, label: 'Jeremiah 31-38', blocks: run('JER', 31, 38) },
  { era: 8, label: 'Ezekiel 13-18', blocks: run('EZK', 13, 18) },
  {
    era: 8,
    label: '2 Kings 24-25 || 2 Chronicles 36 || Jeremiah 52',
    // Jeremiah 52 repeats 2 Kings 25, so it is read with it rather than 14
    // blocks later at the end of the book.
    blocks: [...par(['2KI', 24], ['2CH', 36]), ...par(['2KI', 25], ['JER', 52])],
  },
  // Five poems mourning a city already destroyed.
  { era: 8, label: 'Lamentations 1-5', blocks: run('LAM', 1, 5) },
  { era: 8, label: 'Psalms 74, 79, 106, 137', blocks: ps(74, 79, 106, 137) },
  // Jeremiah 39-45 happens during and after the siege, so it follows the fall.
  { era: 8, label: 'Jeremiah 39-45', blocks: run('JER', 39, 45) },
  { era: 8, label: 'Ezekiel 19-24', blocks: run('EZK', 19, 24) },
  { era: 8, label: 'Jeremiah 46-51', blocks: run('JER', 46, 51) },
  { era: 8, label: 'Ezekiel 25-32', blocks: run('EZK', 25, 32) },
  { era: 8, label: 'Daniel 4-6', blocks: run('DAN', 4, 6) },
  { era: 8, label: 'Ezekiel 33-39', blocks: run('EZK', 33, 39) },
  { era: 8, label: 'Ezekiel 40-48', blocks: run('EZK', 40, 48) },
  // Daniel 10:1 is "the third year of Cyrus", so Daniel bridges into Ezra 1.
  { era: 8, label: 'Daniel 7-12', blocks: run('DAN', 7, 12) },

  // =========================================================================
  // ERA 9 — Coming Home
  // =========================================================================
  { era: 9, label: 'Ezra 1-4', blocks: run('EZR', 1, 4) },
  // Ezra 5:1 says the temple work restarted because Haggai and Zechariah
  // preached, so both are read before Ezra 5-6 rather than after it. Published
  // plans usually read them afterwards, which shows the result before the cause.
  { era: 9, label: 'Haggai 1-2', blocks: run('HAG', 1, 2) },
  { era: 9, label: 'Zechariah 1-14', blocks: run('ZEC', 1, 14) },
  { era: 9, label: 'Ezra 5-6', blocks: run('EZR', 5, 6) },
  // Ezra 6 ends in 516 BC under Darius and Ezra 7 opens in 458 BC under
  // Artaxerxes. Esther happens between them, under Xerxes, so Ezra is split.
  { era: 9, label: 'Esther 1-10', blocks: run('EST', 1, 10) },
  { era: 9, label: 'Ezra 7-10', blocks: run('EZR', 7, 10) },
  { era: 9, label: 'Nehemiah 1-13', blocks: run('NEH', 1, 13) },
  // Temple running, priests careless: the problems match Nehemiah's second visit.
  { era: 9, label: 'Malachi 1-4', blocks: run('MAL', 1, 4) },
  {
    era: 9,
    label: 'Psalms 107, 111-126, 128-131, 133-136, 146-150',
    blocks: ps(107, ...nums(111, 126), ...nums(128, 131), ...nums(133, 136), ...nums(146, 150)),
  },
];

/** Every block in reading order, each tagged with its era and segment. */
export interface FlatBlock extends Block {
  era: number;
  segment: number;
  segmentLabel: string;
}

export const BLOCKS: FlatBlock[] = SEGMENTS.flatMap((seg, i) =>
  seg.blocks.map((b) => ({ ...b, era: seg.era, segment: i + 1, segmentLabel: seg.label })),
);
