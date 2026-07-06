# Reaction artwork manifest

Image-generation queue for the reaction artwork across all 6 scenarios / 54 cards.
Every distinct file is listed once with its category, the prompt (used verbatim as the
image-generation prompt and as the in-game `altText`), and how many of the 918 reaction
slots reference it. Placeholder solid-fill PNGs exist on disk for every file below.

IMPORTANT: newspaper / front-page prompts describe the PHOTO INSIDE the paper (a scene),
never the front page or headline itself — the masthead/headline/standfirst are live,
readable layout text rendered by the game, not part of the image.

Dimensions by category: hero & press 320x240, avatars 120x120.

Distinct files: 88  (hero 54, press 19, avatar-x 6, avatar-bsky 9).
Total slots filled: 918.

Notes:
- Two neutral X headshots (`avatar-x-neutral-reporter`, `avatar-x-neutral-analyst`) balance the
  moderately-stereotyped pundits: Westminster Whisper and TaxpayerWatch use neutral faces.
- `avatar-larry-cat.png` (the Larry parody account) is used on BOTH X and Bluesky; filed under avatar-x.
- Heroes are bespoke per card; structural/Larry cards that repeat across a scenario pair get
  content-identical heroes under different filenames — one render can serve each pair.
- 3 pre-existing placeholders are reused: daily-rage-gagged.png, frontpage-press-muzzle.png, avatar-nigel-pinstripe.png.


## Heroes (newspaper.negative — bespoke per card)

| file | slots | prompt |
| --- | --- | --- |
| `images/daily-rage-gagged.png` | 1 | Politician at a lectern shot from a low angle, finger jabbing, looking brutally authoritarian. |
| `images/news-carbon-cap-big-money-donations.png` | 1 | Politician firmly waving away a fat brown envelope of donor cash. |
| `images/news-carbon-carbon-border-tax.png` | 1 | Customs officer stamping a shipping container beside a smoking factory chimney. |
| `images/news-carbon-carers-allowance-boost.png` | 1 | Grateful family carer hugging an elderly relative at a sunny kitchen table. |
| `images/news-carbon-green-energy-subsidies.png` | 1 | Engineer in a hard hat grinning beside a row of white wind turbines. |
| `images/news-carbon-legal-aid-restoration.png` | 1 | Hopeful client shaking hands with a solicitor across a tidy legal-aid desk. |
| `images/news-carbon-nhs-dental-access-drive.png` | 1 | Friendly dentist giving a thumbs up beside a smiling patient in the chair. |
| `images/news-carbon-public-sunbeam-access-act.png` | 1 | Happy cat basking in a warm sunbeam on a public-building windowsill. |
| `images/news-carbon-service-mousers-honours-act.png` | 1 | Proud office cat wearing a tiny medal on a small ceremonial cushion. |
| `images/news-carbon-universal-cat-flap-mandate.png` | 1 | Worker fitting a shiny new cat flap in a council door, a curious cat looking on. |
| `images/news-costofliving-adult-skills-fund.png` | 1 | Mature student in an evening class grinning over a laptop and notebook. |
| `images/news-costofliving-electoral-reform-package.png` | 1 | Voter happily posting a ballot paper into a box at a polling station. |
| `images/news-costofliving-energy-bill-support-scheme.png` | 1 | Relieved family at a kitchen table beside a much smaller energy bill. |
| `images/news-costofliving-knit-a-cardigan-programme.png` | 1 | Cheerful knitter holding up a tiny hand-knitted cardigan for a patient cat. |
| `images/news-costofliving-library-reopening-programme.png` | 1 | Beaming librarian cutting a red ribbon outside a freshly reopened library. |
| `images/news-costofliving-national-mouse-census.png` | 1 | Official in a tabard counting tiny mice on a clipboard, a cat supervising. |
| `images/news-costofliving-price-controls-on-essentials.png` | 1 | Shopper smiling at a supermarket shelf with clearly capped low prices. |
| `images/news-costofliving-science-research-fund.png` | 1 | Smiling researcher in a lab coat beside bubbling test tubes and a microscope. |
| `images/news-costofliving-the-whisker-allowance.png` | 1 | Low-income cat owner happily buying a pouch of cat biscuits with a voucher. |
| `images/news-housing-cap-big-money-donations.png` | 1 | Politician firmly turning away a fat brown envelope of donor cash. |
| `images/news-housing-disability-income-floor.png` | 1 | Smiling wheelchair user at a kitchen table with a reassuring benefits letter. |
| `images/news-housing-fund-social-housing-build.png` | 1 | Beaming politician in a hard hat breaking ground on a new council estate. |
| `images/news-housing-mental-health-hubs.png` | 1 | Friendly counsellor welcoming a visitor into a calm, bright mental-health hub. |
| `images/news-housing-public-sunbeam-access-act.png` | 1 | Contented cat stretching in a warm sunbeam on a public-building windowsill. |
| `images/news-housing-renters-rights-bill.png` | 1 | Happy tenant holding keys outside a rented flat with a freshly fixed boiler. |
| `images/news-housing-restore-0-7-aid-target.png` | 1 | Aid worker unloading a UK-aid relief crate from a truck at sunrise. |
| `images/news-housing-service-mousers-honours-act.png` | 1 | Dignified office cat wearing a tiny medal on a little ceremonial cushion. |
| `images/news-housing-universal-cat-flap-mandate.png` | 1 | Council worker fitting a shiny new cat flap in an office door, cat watching. |
| `images/news-nhs-cabinet-petting-allowance.png` | 1 | Minister at a cabinet table happily petting a contented cat instead of working. |
| `images/news-nhs-downing-street-dog-ban.png` | 1 | Smug Downing Street cat on the No. 10 doorstep beside a no-dogs sign. |
| `images/news-nhs-free-school-meals-pilot.png` | 1 | Smiling schoolchildren at a canteen table with trays of hot free dinners. |
| `images/news-nhs-fund-more-doctors.png` | 1 | Beaming nurse and doctor on a hospital ward beside a giant cardboard cheque. |
| `images/news-nhs-nhs-tech-upgrade.png` | 1 | Doctor frowning at a glitchy hospital computer while a server blinks ominously. |
| `images/news-nhs-road-repair-fund.png` | 1 | Glum local councillor in a rosette pointing sadly at a deep pothole. |
| `images/news-nhs-working-cats-fish-subsidy.png` | 1 | Office cat in a tiny hi-vis vest sitting proudly beside a tin of tuna. |
| `images/news-nhs-youth-employment-scheme.png` | 1 | Cheerful young apprentice in a hi-vis vest and hard hat on a worksite. |
| `images/news-taxloopholes-apprenticeship-levy-reform.png` | 1 | Small-business owner shaking hands with a young apprentice in a workshop. |
| `images/news-taxloopholes-cabinet-petting-allowance.png` | 1 | Minister at the cabinet table happily petting a purring cat mid-meeting. |
| `images/news-taxloopholes-close-offshore-loopholes.png` | 1 | Stern HMRC official eyeing a tiny tropical tax-haven island on a map. |
| `images/news-taxloopholes-digital-hmrc-enforcement.png` | 1 | HMRC officer at a glowing computer scanning long rows of bank statements. |
| `images/news-taxloopholes-downing-street-dog-ban.png` | 1 | Smug Downing Street cat on the No. 10 doorstep beside a no-dogs sign. |
| `images/news-taxloopholes-expand-free-childcare.png` | 1 | Smiling nursery worker with happy toddlers in a bright, colourful playroom. |
| `images/news-taxloopholes-freeze-fuel-duty.png` | 1 | Relieved motorist grinning at a petrol pump with a steady, frozen price. |
| `images/news-taxloopholes-independent-press-regulator.png` | 1 | Severe politician looming over a podium, hand raised to silence, cold authoritarian lighting. |
| `images/news-taxloopholes-working-cats-fish-subsidy.png` | 1 | Office cat in a tiny hi-vis vest beside a tin of subsidised tuna. |
| `images/news-water-electoral-reform-package.png` | 1 | Hand posting a ballot paper into a box, a rosette pinned at a polling station. |
| `images/news-water-full-water-nationalisation.png` | 1 | Engineer in overalls turning a big valve at a public waterworks, thumbs up. |
| `images/news-water-knit-a-cardigan-programme.png` | 1 | Cheerful knitter holding a tiny hand-knitted cardigan for a patient cat. |
| `images/news-water-national-mouse-census.png` | 1 | Official in a tabard tallying tiny mice on a clipboard, a cat supervising. |
| `images/news-water-restorative-justice-pilots.png` | 1 | Mediator and two people shaking hands across a table in a calm courtroom. |
| `images/news-water-sure-start-centres-reopen.png` | 1 | Smiling parent and toddler at the door of a freshly reopened Sure Start centre. |
| `images/news-water-the-whisker-allowance.png` | 1 | Cat owner happily buying a pouch of biscuits with a Whisker Allowance voucher. |
| `images/news-water-veterans-mental-health-service.png` | 1 | Veteran in a beret talking warmly with a counsellor in a calm, bright room. |
| `images/news-water-windfall-tax-on-water-companies.png` | 1 | Worried water-company executives frowning at a falling share-price screen. |

## Press library (newspaper.neutral + front-page tiles — reused, theme-mapped)

| file | slots | prompt |
| --- | --- | --- |
| `images/press-cat.png` | 94 | A smug ginger Downing Street cat lounging on a red ministerial box. |
| `images/press-tabloid-rage.png` | 48 | Scrum of press photographers thrusting cameras and microphones at a cornered politician. |
| `images/press-handshake.png` | 35 | Two smiling politicians in suits shaking hands for the cameras. |
| `images/press-stethoscope.png` | 31 | Stethoscope and an NHS-blue lanyard resting on a tidy clinic desk. |
| `images/press-coins.png` | 29 | Stock press photo of neat stacks of shiny pound coins on a Union Jack background. |
| `images/press-classroom.png` | 19 | Bright primary classroom with a tray of healthy free school dinners. |
| `images/press-turbine.png` | 15 | Row of white wind turbines on a green hillside under a bright sky. |
| `images/frontpage-press-muzzle.png` | 14 | Stern minister at a lectern pressing a finger to their lips, harsh shadows, authoritarian. |
| `images/press-benefits.png` | 12 | A brown benefits envelope and a calculator on a kitchen table. |
| `images/press-gavel.png` | 12 | A wooden judge gavel resting on law books in soft daylight. |
| `images/press-ballot.png` | 12 | A hand posting a ballot paper into a ballot box, a rosette pinned beside it. |
| `images/press-tap.png` | 12 | Clear fresh water running from a kitchen tap into a glass. |
| `images/press-childcare.png` | 9 | Sunny nursery playroom with toys and a smiling parent and toddler. |
| `images/press-hivis.png` | 7 | Cheery politician in a hi-vis vest and hard hat on a building site. |
| `images/press-science.png` | 7 | A smiling researcher in a lab coat beside test tubes and a microscope. |
| `images/press-pothole.png` | 6 | Glum local councillor in a rosette pointing sadly at a pothole in the road. |
| `images/press-suits-worried.png` | 6 | Anxious traders in suits frowning at falling red stock-market screens. |
| `images/press-aid.png` | 6 | A globe and a UK-aid relief crate against a hopeful sunrise. |
| `images/press-books.png` | 4 | Cosy reopened public library with full shelves and a reading-nook armchair. |

## Avatars — X / Twitter

| file | slots | prompt |
| --- | --- | --- |
| `images/avatar-nigel-pinstripe.png` | 98 | Smug man in a pinstripe suit with a Union Jack lapel pin, arms crossed, plain studio. |
| `images/avatar-x-neutral-analyst.png` | 86 | Neutral headshot of an ordinary man in a plain shirt, neutral expression, plain grey studio background. |
| `images/avatar-x-contrarian.png` | 84 | Smirking man in a black polo with arms crossed against a moody dark studio backdrop. |
| `images/avatar-x-regpurse.png` | 28 | Portly aristocrat in pinstripe with a monocle and a brandy glass, oil-painting wall. |
| `images/avatar-x-neutral-reporter.png` | 24 | Neutral headshot of a Westminster political reporter in a plain blazer, calm expression, plain studio background. |
| `images/avatar-larry-cat.png` | 22 | Smug ginger cat in a tiny Downing Street collar sitting on the No. 10 doorstep. |

## Avatars — Bluesky

| file | slots | prompt |
| --- | --- | --- |
| `images/avatar-bsky-rosa.png` | 46 | Cheerful young woman with pastel-pink hair and cat-ear headphones in a cosy fairy-lit room. |
| `images/avatar-bsky-pollyticks.png` | 26 | Friendly woman in glasses with a politics-nerd tote bag, a tidy bookshelf behind her. |
| `images/avatar-bsky-polbites.png` | 19 | Friendly podcaster in headphones at a laptop, soft news-ticker glow behind them. |
| `images/avatar-bsky-social-org.png` | 14 | Friendly solidarity campaign-group logo with a raised-hands motif on warm coral. |
| `images/avatar-bsky-tariq.png` | 11 | Young man in a beanie holding a tote bag of books, reading in a cosy cafe. |
| `images/avatar-bsky-frontline.png` | 10 | Warm, tired public-service key worker in a lanyard, kind smile, a workplace corridor behind. |
| `images/avatar-bsky-citizen.png` | 8 | Ordinary cheerful member of the public in a casual coat taking a selfie on a high street. |
| `images/avatar-bsky-green-org.png` | 6 | Friendly green campaign-group logo with a leaf-and-river motif on fresh teal. |
| `images/avatar-bsky-dan.png` | 4 | Tired young man lit by the glow of his phone in a dark room, wry half-smile. |


## Portraits — cabinet members & advisers (policy/pick cards, #11)

Portrait artwork for the ministers and advisers who bring policy options to the PM — shown
in the avatar slot of every hand card (`renderCard`, 4 variants) and on the pick screen
(`buildPickButton`). `image` = a head-and-shoulders PORTRAIT of the named character; the
prompt is used verbatim as the generation prompt and as the in-game `altText`. Keyed per
CHARACTER — a minister who appears on several cards (and on the pick screen) reuses ONE file.

Dimension: portraits 240x240 (cropped to a 56px circle in-game).

Distinct files: 31  (human 29, shared cat 2).
Total slots filled: 60  (54 hand-card + 6 pick).

The two cat portraits are each shared by four feline advisers (by gender).

| file | slots | prompt |
| --- | --- | --- |
| `images/minister-cat-calico.png` | 8 | Head-and-shoulders editorial caricature portrait of a poised calico cat serving as a Whitehall cabinet adviser, wearing a neat little blouse collar and an official lanyard, regarding the camera with composed authority against a plain studio background. |
| `images/minister-cat-tabby.png` | 8 | Head-and-shoulders editorial caricature portrait of a dignified grey tabby cat serving as a Whitehall cabinet adviser, wearing a tiny suit collar and an official lanyard, gazing solemnly at the camera against a plain studio background. |
| `images/minister-brook-trent.png` | 3 | Head-and-shoulders editorial caricature portrait of an earnest middle-aged environment secretary in a green tie, windswept open-air complexion and a faint hopeful smile, plain studio background. |
| `images/minister-chunk-slumberton.png` | 2 | Head-and-shoulders editorial caricature portrait of a burly, genial craft-and-communities champion in a chunky hand-knitted jumper, relaxed easy grin, plain studio background. |
| `images/minister-dr-ina-tentcare.png` | 3 | Head-and-shoulders editorial caricature portrait of a composed health secretary in a navy suit with a small stethoscope lapel pin, calm reassuring expression, plain studio background. |
| `images/minister-em-ployment.png` | 1 | Head-and-shoulders editorial caricature portrait of a brisk work-and-pensions secretary in a grey suit holding a clipboard, businesslike half-smile, plain studio background. |
| `images/minister-honesty-boxe.png` | 2 | Head-and-shoulders editorial caricature portrait of a scrupulously tidy ethics adviser in a plain dark suit, open honest expression and clasped hands, plain studio background. |
| `images/minister-hugh-cradle.png` | 1 | Head-and-shoulders editorial caricature portrait of a warm early-years minister in a soft pastel cardigan, kindly grandparent smile, plain studio background. |
| `images/minister-hugh-manity.png` | 1 | Head-and-shoulders editorial caricature portrait of a thoughtful education secretary in tweed with reading glasses pushed up onto the forehead, scholarly look, plain studio background. |
| `images/minister-hugh-mend.png` | 1 | Head-and-shoulders editorial caricature portrait of a determined justice-reform minister in a sober charcoal suit, resolute set jaw, plain studio background. |
| `images/minister-isla-mann.png` | 3 | Head-and-shoulders editorial caricature portrait of a sharp, confident chancellor in a power suit holding a red budget box, steely smile, plain studio background. |
| `images/minister-lex-counsell.png` | 1 | Head-and-shoulders editorial caricature portrait of a precise justice secretary in barrister-black with a crisp white collar, measured expression, plain studio background. |
| `images/minister-lou-booker.png` | 1 | Head-and-shoulders editorial caricature portrait of a friendly communities secretary in a bright blazer, approachable broad smile, plain studio background. |
| `images/minister-mason-carrick.png` | 2 | Head-and-shoulders editorial caricature portrait of a practical housing secretary in a shirt with a high-vis-trimmed jacket and a hard hat tucked under one arm, can-do grin, plain studio background. |
| `images/minister-maya-ableton.png` | 1 | Head-and-shoulders editorial caricature portrait of a warm disability minister in a smart magenta blazer, confident welcoming smile, plain studio background. |
| `images/minister-nora-buggy.png` | 1 | Head-and-shoulders editorial caricature portrait of a cheerful children-and-families minister in a colourful scarf, kindly bright-eyed look, plain studio background. |
| `images/minister-pearl-bright.png` | 1 | Head-and-shoulders editorial caricature portrait of a beaming dental-health minister with a dazzling white smile and a clean pastel suit, plain studio background. |
| `images/minister-penny-crunch.png` | 3 | Head-and-shoulders editorial caricature portrait of a frugal chief secretary to the treasury in a thrifty grey suit, pursed cost-cutting expression, plain studio background. |
| `images/minister-penny-pledge.png` | 1 | Head-and-shoulders editorial caricature portrait of a compassionate international-development minister with a small globe lapel pin, hopeful warm smile, plain studio background. |
| `images/minister-phil-tankerton.png` | 1 | Head-and-shoulders editorial caricature portrait of a portly treasury minister in pinstripes with a pocket-watch chain, smug well-fed grin, plain studio background. |
| `images/minister-pippa-lyne.png` | 3 | Head-and-shoulders editorial caricature portrait of a forward-looking energy secretary in a sleek suit with a tiny wind-turbine lapel pin, optimistic smile, plain studio background. |
| `images/minister-reg-broadsheet.png` | 2 | Head-and-shoulders editorial caricature portrait of a media-savvy culture secretary in a stylish open-collar suit, knowing camera-ready smile, plain studio background. |
| `images/minister-reg-iment.png` | 1 | Head-and-shoulders editorial caricature portrait of an upright veterans minister with a regimental tie and a poppy pin, dignified steady gaze, plain studio background. |
| `images/minister-sir-wat-ney.png` | 1 | Head-and-shoulders editorial caricature portrait of a curious science minister in a lab coat over a suit with wild grey hair, inquisitive expression, plain studio background. |
| `images/minister-sue-carer.png` | 1 | Head-and-shoulders editorial caricature portrait of a gentle welfare minister in a soft lilac cardigan, caring compassionate smile, plain studio background. |
| `images/minister-tara-macadam.png` | 1 | Head-and-shoulders editorial caricature portrait of a brisk transport secretary in a hi-vis-trimmed coat holding a rolled timetable, purposeful look, plain studio background. |
| `images/minister-toby-tenant.png` | 1 | Head-and-shoulders editorial caricature portrait of an earnest young renters-rights minister in a slightly rumpled jacket holding a set of keys, determined smile, plain studio background. |
| `images/minister-vera-calm.png` | 1 | Head-and-shoulders editorial caricature portrait of a serene mental-health minister in soft teal, calm reassuring expression, plain studio background. |
| `images/minister-vera-suffrage.png` | 2 | Head-and-shoulders editorial caricature portrait of a principled constitution minister with a suffragette-purple sash detail, resolute proud look, plain studio background. |
| `images/minister-will-lerner.png` | 1 | Head-and-shoulders editorial caricature portrait of an encouraging adult-education minister in a corduroy jacket with a pen behind one ear, friendly mentor smile, plain studio background. |
| `images/minister-will-trayde.png` | 1 | Head-and-shoulders editorial caricature portrait of a practical skills minister in smart workwear holding a pen and a wrench, optimistic grin, plain studio background. |
