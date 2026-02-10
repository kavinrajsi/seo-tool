// Shared calendar data used by both ecommerce and content calendar pages,
// as well as the ICS export and Google Calendar sync endpoints.

// 2026 Holiday & Revenue Calendar — Sweet & Savoury Focus
// Each range: [startMonth, startDay, endMonth, endDay] (1-based months)
export const SALES_EVENTS = [
  {
    name: "New Year Fresh Start",
    ranges: [[1, 1, 1, 5]],
    description: "Sweet gift packs, assorted boxes & combo hampers.",
    tips: [
      "Position as \u201CStart the Year Sweet\u201D with online delivery",
      "Sweet consumption rises as households host gatherings",
    ],
  },
  {
    name: "Pongal / Harvest Super Peak",
    ranges: [[1, 13, 1, 17]],
    description: "Essential window for festive sweets: Chakkara Pongal, Ariselu, Sundal & Murukku. Heavy family & bulk orders.",
    tips: [
      "Promote Pongal kits, murukku & savouries",
      "Bulk packs + same-day delivery messaging",
      "Heavy family & bulk order volumes expected",
    ],
  },
  {
    name: "Valentine\u2019s Day",
    ranges: [[2, 9, 2, 14]],
    description: "Seasonal romantic flavour combos (pink/red barfi, chocolate twists). Low\u2013Medium peak in South India.",
    tips: [
      "Small premium sweet boxes for couples & gifting",
      "Sugar-reduced & dry-fruit sweets",
    ],
  },
  {
    name: "Holi Season",
    ranges: [[2, 26, 3, 7]],
    description: "Holi assortments with both sweets and crunchy savouries.",
    tips: [
      "Emphasize colourful sweet assortments and murukku packs",
    ],
  },
  {
    name: "Ugadi \u2013 South Regional New Year",
    ranges: [[3, 17, 3, 19]],
    description: "Major South Indian New Year peak (TN, KA, AP, TS). Bobbatlu / Puran Poli and traditional New Year assortments.",
    tips: [
      "Traditional New Year sweet assortments",
      "Bobbatlu / Puran Poli prominently featured",
      "Festive gift packs for family visits",
    ],
  },
  {
    name: "Eid-Ul-Fitr",
    ranges: [[3, 14, 4, 2]],
    description: "Gifting bundles and festive sweets like kaju katli, laddu, halwa.",
    tips: [
      "Bulk orders for family gatherings",
      "Date varies yearly \u2014 plan flexible inventory",
    ],
  },
  {
    name: "April Anomaly",
    ranges: [[4, 4, 4, 6]],
    description: "National spike visible in South India. Short burst of unplanned orders.",
    tips: [
      "Keep inventory ready for unexpected order lift",
      "Flash promotions on best-sellers",
    ],
  },
  {
    name: "Vishu / Tamil New Year",
    ranges: [[4, 13, 4, 15]],
    description: "Kerala (Vishu) & Tamil Nadu (Puthandu) New Year celebrations. Payasam mixes, light sweets & savouries for guest visits.",
    tips: [
      "Payasam mixes and traditional sweet packs",
      "Light sweets & savouries for guest visits",
    ],
  },
  {
    name: "Summer Prep Spike",
    ranges: [[4, 24, 4, 30]],
    description: "Pre-summer order spike for gatherings and travel sweets.",
    tips: [
      "Travel-friendly sweet packs",
      "Light savouries & tea-time snacks",
    ],
  },
  {
    name: "Summer Seasonal Treats",
    ranges: [[4, 1, 6, 23]],
    seasonal: true,
    description: "Spotlight seasonal items like Mango Barfi and chilled sweets.",
    tips: [
      "Limited-edition summer specials create urgency",
      "Seasonal limited editions: jaggery sweets, lower-sugar options, festive savouries",
    ],
  },
  {
    name: "Mid-Year EOSS",
    ranges: [[6, 24, 6, 30]],
    description: "End-of-season sale. Evergreen sweets, combo & value packs. Inventory cleanup window.",
    tips: [
      "Combo & value packs to move inventory",
      "Promote online with delivery cut-off reminders",
      "Inventory cleanup before festive build-up",
    ],
  },
  {
    name: "August Convergence",
    ranges: [[8, 21, 8, 28]],
    description: "Raksha Bandhan + Janmashtami + Onam prep. Multiple festival demand converges.",
    tips: [
      "Gift boxes + snack bundles for Aug festivals",
      "Sweet + salty savoury combo packs for long festival visits",
    ],
  },
  {
    name: "Onam Gifting Marathon",
    ranges: [[8, 23, 8, 31]],
    description: "South Super Peak. Onam sweet boxes, Kerala-style savouries, premium gift hampers. Aug 23 (Sunday) is highest-intent day.",
    tips: [
      "Onam sweet boxes & Kerala-style savouries",
      "Premium gift hampers for corporate & family",
      "Plan raw-material locking in July",
      "Aug 23 Sunday \u2014 expect highest single-day intent",
    ],
  },
  {
    name: "Shadow Festive Peak",
    ranges: [[9, 4, 9, 7]],
    description: "Early festive sweet boxes and dry sweets with longer shelf life. Pre-festive demand building.",
    tips: [
      "Early festive sweet boxes for planners",
      "Dry sweets with longer shelf life sell well",
    ],
  },
  {
    name: "Regional Mid-Festive Windows",
    ranges: [[9, 20, 10, 2]],
    description: "Navaratri Preparations (Sep\u2013Oct).",
    tips: [
      "Sundal combos & sweets for pooja plates",
      "Sweet + salty savoury combo packs for long festival visits",
    ],
  },
  {
    name: "Diwali & Deepavali Finale",
    ranges: [[10, 31, 11, 8]],
    description: "#1 Revenue event. Laddu, Mysore Pak, Kaju sweets dominate. Nov 1 (Sunday) is peak buying day.",
    tips: [
      "Luxury gift hampers & corporate gifting",
      "Early-bird offers + online pre-order campaigns",
      "Express shipping push",
      "Nov 1 (Sunday) \u2014 peak buying day",
    ],
  },
  {
    name: "Mega Super Peak",
    ranges: [[11, 18, 11, 30]],
    description: "Compound demand: Black Friday + Wedding Season. Bulk gifting & wedding return-gift packs. High-volume dispatch.",
    tips: [
      "Bulk gifting hampers sell strong",
      "Wedding return-gift packs in demand",
      "High-volume dispatch \u2014 plan 1.5\u00D7 operations capacity",
      "Use Sunday flash upsells & bundle deals",
    ],
  },
  {
    name: "Christmas & Year-End",
    ranges: [[12, 18, 12, 25]],
    description: "Strong South India lift. Gourmet & mixed hampers for Christmas gifting.",
    tips: [
      "Gourmet & mixed hampers for gifting",
      "Tap office party bulk orders",
    ],
  },
  {
    name: "Year-End Clearance",
    ranges: [[12, 26, 12, 31]],
    description: "Clearance before year close. Move remaining inventory with aggressive discounts.",
    tips: [
      "Clearance pricing to reduce inventory before year close",
      "Combo packs to drive final orders",
    ],
  },
];

// 2026 South India Social Content Calendar
// phase: "prep" | "check" | "schedule" | "live"
export const CONTENT_TASKS = [
  // JANUARY — New Year + Pongal
  { event: "New Year", phase: "prep", ranges: [[12, 10, 12, 18]], label: "Content preparation" },
  { event: "New Year", phase: "check", ranges: [[12, 19, 12, 22]], label: "Content check & approval" },
  { event: "New Year", phase: "schedule", ranges: [[12, 23, 12, 26]], label: "Content scheduling" },
  { event: "New Year", phase: "live", ranges: [[12, 27, 1, 5]], label: "Campaign live" },
  { event: "Pongal", phase: "prep", ranges: [[12, 20, 12, 30]], label: "Content preparation" },
  { event: "Pongal", phase: "check", ranges: [[1, 2, 1, 4]], label: "Content check" },
  { event: "Pongal", phase: "schedule", ranges: [[1, 5, 1, 7]], label: "Content scheduling" },
  { event: "Pongal", phase: "live", ranges: [[1, 8, 1, 17]], label: "Campaign live" },
  // FEBRUARY — Valentine's
  { event: "Valentine\u2019s", phase: "prep", ranges: [[1, 20, 1, 25]], label: "Content preparation" },
  { event: "Valentine\u2019s", phase: "check", ranges: [[1, 26, 1, 28]], label: "Content check" },
  { event: "Valentine\u2019s", phase: "schedule", ranges: [[1, 29, 1, 31]], label: "Content scheduling" },
  { event: "Valentine\u2019s", phase: "live", ranges: [[2, 1, 2, 14]], label: "Campaign live" },
  // MARCH — Ugadi
  { event: "Ugadi", phase: "prep", ranges: [[2, 25, 3, 5]], label: "Content preparation" },
  { event: "Ugadi", phase: "check", ranges: [[3, 6, 3, 8]], label: "Content check" },
  { event: "Ugadi", phase: "schedule", ranges: [[3, 9, 3, 11]], label: "Content scheduling" },
  { event: "Ugadi", phase: "live", ranges: [[3, 12, 3, 19]], label: "Campaign live" },
  // APRIL — Vishu / Tamil New Year + Summer
  { event: "Vishu / Tamil NY", phase: "prep", ranges: [[3, 15, 3, 25]], label: "Content preparation" },
  { event: "Vishu / Tamil NY", phase: "check", ranges: [[3, 26, 3, 28]], label: "Content check" },
  { event: "Vishu / Tamil NY", phase: "schedule", ranges: [[3, 29, 3, 31]], label: "Content scheduling" },
  { event: "Vishu / Tamil NY", phase: "live", ranges: [[4, 1, 4, 14]], label: "Campaign live" },
  { event: "Summer Spike", phase: "prep", ranges: [[4, 10, 4, 15]], label: "Summer content prep" },
  { event: "Summer Spike", phase: "schedule", ranges: [[4, 16, 4, 18]], label: "Summer scheduling" },
  { event: "Summer Spike", phase: "live", ranges: [[4, 19, 4, 30]], label: "Summer campaign live" },
  // MAY — Low Season (Retention)
  { event: "Retention", phase: "prep", ranges: [[4, 20, 4, 25]], label: "Content preparation" },
  { event: "Retention", phase: "check", ranges: [[4, 26, 4, 27]], label: "Content check" },
  { event: "Retention", phase: "schedule", ranges: [[4, 28, 4, 30]], label: "Content scheduling" },
  { event: "Retention", phase: "live", ranges: [[5, 1, 5, 31]], label: "Campaign live \u2014 reels, BTS, customer stories" },
  // JUNE — Mid-Year Sale
  { event: "Mid-Year EOSS", phase: "prep", ranges: [[6, 1, 6, 8]], label: "Content preparation" },
  { event: "Mid-Year EOSS", phase: "check", ranges: [[6, 9, 6, 11]], label: "Content check" },
  { event: "Mid-Year EOSS", phase: "schedule", ranges: [[6, 12, 6, 14]], label: "Content scheduling" },
  { event: "Mid-Year EOSS", phase: "live", ranges: [[6, 15, 6, 30]], label: "Campaign live" },
  // JULY — Onam Warm-Up
  { event: "Onam Warm-Up", phase: "prep", ranges: [[7, 1, 7, 10]], label: "Content preparation" },
  { event: "Onam Warm-Up", phase: "check", ranges: [[7, 11, 7, 13]], label: "Content check" },
  { event: "Onam Warm-Up", phase: "schedule", ranges: [[7, 14, 7, 15]], label: "Content scheduling" },
  { event: "Onam Warm-Up", phase: "live", ranges: [[7, 16, 7, 31]], label: "Campaign live" },
  // AUGUST — Onam Super Peak
  { event: "Onam", phase: "prep", ranges: [[7, 15, 7, 25]], label: "Content preparation" },
  { event: "Onam", phase: "check", ranges: [[7, 26, 7, 28]], label: "Content check" },
  { event: "Onam", phase: "schedule", ranges: [[7, 29, 7, 31]], label: "Content scheduling" },
  { event: "Onam", phase: "live", ranges: [[8, 1, 8, 30]], label: "Campaign live" },
  // SEPTEMBER — Early Festive
  { event: "Early Festive", phase: "prep", ranges: [[8, 15, 8, 22]], label: "Content preparation" },
  { event: "Early Festive", phase: "check", ranges: [[8, 23, 8, 25]], label: "Content check" },
  { event: "Early Festive", phase: "schedule", ranges: [[8, 26, 8, 28]], label: "Content scheduling" },
  { event: "Early Festive", phase: "live", ranges: [[8, 29, 9, 7]], label: "Campaign live" },
  // OCTOBER — Diwali Build-Up
  { event: "Diwali", phase: "prep", ranges: [[9, 15, 9, 25]], label: "Content preparation" },
  { event: "Diwali", phase: "check", ranges: [[9, 26, 9, 28]], label: "Content check" },
  { event: "Diwali", phase: "schedule", ranges: [[9, 29, 9, 30]], label: "Content scheduling" },
  { event: "Diwali", phase: "live", ranges: [[10, 1, 11, 8]], label: "Campaign live" },
  { event: "Diwali Urgency", phase: "live", ranges: [[10, 24, 10, 30]], label: "Final urgency creatives" },
  // NOVEMBER — Mega Super Peak
  { event: "Mega Peak", phase: "prep", ranges: [[10, 25, 10, 30]], label: "Content preparation" },
  { event: "Mega Peak", phase: "check", ranges: [[10, 31, 11, 2]], label: "Content check" },
  { event: "Mega Peak", phase: "schedule", ranges: [[11, 3, 11, 5]], label: "Content scheduling" },
  { event: "Mega Peak", phase: "live", ranges: [[11, 6, 11, 30]], label: "Campaign live" },
  // DECEMBER — Christmas + Year-End
  { event: "Christmas", phase: "prep", ranges: [[12, 1, 12, 5]], label: "Content preparation" },
  { event: "Christmas", phase: "check", ranges: [[12, 6, 12, 7]], label: "Content check" },
  { event: "Christmas", phase: "schedule", ranges: [[12, 8, 12, 10]], label: "Content scheduling" },
  { event: "Christmas", phase: "live", ranges: [[12, 11, 12, 31]], label: "Campaign live" },
];

export const PHASE_LABELS = {
  prep: "Preparation",
  check: "Review",
  schedule: "Scheduling",
  live: "Live",
};
