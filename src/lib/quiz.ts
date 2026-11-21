/* The blend finder's questions, carried over from the Shopify theme (templates/page.quiz.json). */
export interface QuizAnswer { label: string; sub: string; products: string[]; excludeTags: string[]; excludeProducts: string[]; caution: boolean }
export interface QuizStep { question: string; hint: string; multi: boolean; max: number; answers: QuizAnswer[] }

export const QUIZ: QuizStep[] = [
 {
  "question": "What are you looking for?",
  "hint": "Choose up to 3 goals. We will build your ritual around them.",
  "multi": true,
  "max": 3,
  "answers": [
   {
    "label": "Detox & a lighter routine",
    "sub": "A lighter, cleaner daily routine",
    "products": [
     "baraguz-slimt-day-booster-28-day-detox",
     "baraguz-slimt-night-cleanse"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Digestion & bloating",
    "sub": "Comfort after meals and gentle regularity",
    "products": [
     "baraguz-gut-health-plus-bundle",
     "baraguz-plant-based-supergreens-powder-with-enzymes-probiotics"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Calm & stress",
    "sub": "Unwind and take the edge off",
    "products": [
     "baraguz-anxiet-stress-therapy-tea-30-servings"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Cycle & menopause",
    "sub": "Hormonal changes through life’s stages",
    "products": [
     "baraguz-meno-feminine-harmony-blend-herbal-tea-w-raspberry-leaf-chamomile-ashwagandha-30-tea-bags",
     "baraguz-pmst-menstrual-care-cycle-formula-tea-30-servings"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Focus & energy",
    "sub": "A clearer, steadier day",
    "products": [
     "baraguz-braint-brain-health-tea",
     "super-green"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Immunity",
    "sub": "Support through the seasons",
    "products": [
     "baraguz-anxiet-immunity-stimulus-booster-kit-tea-30-servings"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Hair, skin & nails",
    "sub": "Glow from the outside in",
    "products": [
     "eia-organic-scalp-treatment-elixir-oil-hair-growth",
     "eia-organic-revitalizing-elixir-serum-hair-glow",
     "baraguz-premium-bovine-collagen-peptides-type-i-iii-collagen-powder"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   }
  ]
 },
 {
  "question": "Does any of this apply to you?",
  "hint": "It helps us keep your picks right for you.",
  "multi": false,
  "max": 1,
  "answers": [
   {
    "label": "None of these",
    "sub": "",
    "products": [],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Pregnant or breastfeeding",
    "sub": "",
    "products": [],
    "excludeTags": [
     "detox"
    ],
    "excludeProducts": [],
    "caution": true
   },
   {
    "label": "A health condition or medication",
    "sub": "",
    "products": [],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": true
   }
  ]
 },
 {
  "question": "Which life stage are you in?",
  "hint": "",
  "multi": false,
  "max": 1,
  "answers": [
   {
    "label": "No particular stage right now",
    "sub": "",
    "products": [],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Postpartum",
    "sub": "",
    "products": [
     "postpartum-recovery-wellness-bundle-collagen-hair-growth-oil-focus-detox"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Trying to conceive",
    "sub": "",
    "products": [
     "baraguz-fertilit-vitality-boost-fertility-support-30-servings"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Perimenopause or menopause",
    "sub": "",
    "products": [
     "baraguz-meno-feminine-harmony-blend-herbal-tea-w-raspberry-leaf-chamomile-ashwagandha-30-tea-bags"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   }
  ]
 },
 {
  "question": "When do you like your tea?",
  "hint": "",
  "multi": false,
  "max": 1,
  "answers": [
   {
    "label": "Morning",
    "sub": "To start the day",
    "products": [
     "baraguz-slimt-day-booster-28-day-detox",
     "super-green"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Evening",
    "sub": "To wind down",
    "products": [
     "baraguz-slimt-night-cleanse",
     "baraguz-anxiet-stress-therapy-tea-30-servings"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Any time",
    "sub": "",
    "products": [],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   }
  ]
 },
 {
  "question": "How do you feel about caffeine?",
  "hint": "",
  "multi": false,
  "max": 1,
  "answers": [
   {
    "label": "I enjoy it",
    "sub": "",
    "products": [
     "super-green"
    ],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   },
   {
    "label": "Keep it caffeine-free",
    "sub": "",
    "products": [],
    "excludeTags": [
     "caffeine"
    ],
    "excludeProducts": [
     "baraguz-slimt-day-booster-28-day-detox",
     "baraguz-braint-brain-health-tea",
     "super-green",
     "baraguz-anxiet-stress-therapy-tea-30-servings",
     "baraguz-pmst-menstrual-care-cycle-formula-tea-30-servings",
     "baraguz-anxiet-immunity-stimulus-booster-kit-tea-30-servings",
     "baraguz-fertilit-vitality-boost-fertility-support-30-servings"
    ],
    "caution": false
   },
   {
    "label": "No preference",
    "sub": "",
    "products": [],
    "excludeTags": [],
    "excludeProducts": [],
    "caution": false
   }
  ]
 }
];

export const CAUTION = 'You mentioned pregnancy, breastfeeding, a health condition or medication: check with your doctor before trying a new herbal blend.';
