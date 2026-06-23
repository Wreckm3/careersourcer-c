// CareerSourcer curriculum — 3 categories × 6 branches.
// Featured branches have full 5-lesson tracks. Others ship as "coming soon".
// Lessons follow: intro → video → challenge → self-check → next.

export interface Lesson {
  id: string;
  title: string;
  intro: string;        // 2-5 minute read primer shown before the video
  description: string;  // one-liner shown in lists
  videoUrl: string;     // YouTube embed URL
  challenge: string;    // small build/action task
  duration: string;
}

export interface Branch {
  id: string;
  title: string;
  emoji: string;
  tagline: string;          // "What you'll build"
  description: string;
  searchKeywords: string[]; // for guided search matching
  featured: boolean;
  lessons: Lesson[];        // empty when not featured
}

export interface Category {
  id: string;
  title: string;
  emoji: string;
  description: string;
  icon: string;             // lucide icon name
  color: string;            // CSS variable
  branches: Branch[];
}

// Helper to build YouTube embeds consistently
const yt = (id: string) => `https://www.youtube.com/embed/${id}`;

export const categories: Category[] = [
  // ───────────────────── TECHNOLOGY ─────────────────────
  {
    id: "technology",
    title: "Technology",
    emoji: "💻",
    description: "Build real things with code. Websites, games, apps, AI tools.",
    icon: "Monitor",
    color: "var(--accent-blue)",
    branches: [
      {
        id: "web-development",
        title: "Web Development",
        emoji: "💻",
        tagline: "Build your own websites",
        description: "Make websites people can actually visit. Start with HTML and grow from there.",
        searchKeywords: ["website", "web", "html", "css", "javascript", "frontend", "site"],
        featured: true,
        lessons: [
          {
            id: "web-1",
            title: "What is Web Development?",
            intro:
              "Every website you visit — YouTube, Safaricom, even this one — is built with three core languages: HTML for structure, CSS for style, JavaScript for behaviour. You don't need a fancy laptop or a paid course to start. A free browser and a text editor are enough.",
            description: "Understand what builds the web.",
            videoUrl: yt("ZxKM3DCV2kE"),
            challenge:
              "Open any 3 websites you use daily. Note one thing each does well in design or layout.",
            duration: "~5 min",
          },
          {
            id: "web-2",
            title: "Your First HTML Page",
            intro:
              "HTML is just text with tags. <h1> for big titles, <p> for paragraphs. That's it for now. You can write HTML in any text editor — even Notepad — save it as index.html, and open it in your browser.",
            description: "Write your first webpage.",
            videoUrl: yt("salY_Sm6mv4"),
            challenge:
              "Create a file called about-me.html with a heading, a paragraph about you, and one image. Open it in your browser.",
            duration: "~3 min",
          },
          {
            id: "web-3",
            title: "Styling with CSS",
            intro:
              "CSS makes things look good — colours, fonts, spacing, layout. The same HTML page can look completely different just by changing CSS. Don't try to learn every property; learn by tweaking.",
            description: "Add colour, fonts and layout.",
            videoUrl: yt("OEV8gMkCHXQ"),
            challenge:
              "Add a <style> block to your about-me.html. Change the background colour, font, and heading colour.",
            duration: "~4 min",
          },
          {
            id: "web-4",
            title: "JavaScript Basics",
            intro:
              "JavaScript makes pages interactive — buttons that do things, forms that respond, content that updates. You don't need to master it overnight. Start with one button that does one thing.",
            description: "Make your page react to clicks.",
            videoUrl: yt("DHjqpvDnNGE"),
            challenge:
              "Add a button to your page that shows an alert with your name when clicked.",
            duration: "~5 min",
          },
          {
            id: "web-5",
            title: "Publish Your First Site",
            intro:
              "A website only matters when people can visit it. Free tools like GitHub Pages or Netlify let you publish a real, shareable URL in minutes — no hosting fees, no card needed.",
            description: "Put your site online for free.",
            videoUrl: yt("0P53S34zm44"),
            challenge:
              "Deploy your about-me page using Netlify Drop (drag and drop). Share the link with one friend.",
            duration: "~6 min",
          },
        ],
      },
      {
        id: "game-development",
        title: "Game Development",
        emoji: "🎮",
        tagline: "Build your own games",
        description: "Make games people actually play. Start in your browser with no install.",
        searchKeywords: ["game", "games", "unity", "scratch", "play", "gaming", "indie"],
        featured: true,
        lessons: [
          {
            id: "game-1",
            title: "How Games Are Actually Made",
            intro:
              "Most games — even AAA ones — start with one person, one idea, and a free tool. Tools like Scratch, GDevelop, Godot and Unity are 100% free. The hardest part isn't the engine; it's finishing your first tiny game.",
            description: "Understand how indie games are built.",
            videoUrl: yt("_eK26atXTds"),
            challenge: "List 3 simple games you'd like to recreate (Pong, Snake, Flappy Bird, etc.)",
            duration: "~5 min",
          },
          {
            id: "game-2",
            title: "Your First Game in Scratch",
            intro:
              "Scratch is drag-and-drop coding in your browser. No download, no setup. It's how MIT teaches kids and adults to program. You'll build a real, playable game in under 10 minutes.",
            description: "Build a playable game with zero code.",
            videoUrl: yt("jXUZaf5D12A"),
            challenge: "Go to scratch.mit.edu and make a sprite move when you press arrow keys.",
            duration: "~8 min",
          },
          {
            id: "game-3",
            title: "Game Design Basics",
            intro:
              "Great games aren't about graphics — they're about one core loop that feels good. Jump-and-land, shoot-and-hit, match-and-clear. Before writing more code, design the feel.",
            description: "What makes a game actually fun.",
            videoUrl: yt("216_5nu4aVQ"),
            challenge: "Pick your favourite game. Write down its core loop in one sentence.",
            duration: "~6 min",
          },
          {
            id: "game-4",
            title: "Intro to Unity (Free Engine)",
            intro:
              "Unity is the engine behind games on Play Store, Steam, and consoles. It's free for beginners. The interface looks scary at first; this lesson takes you through it calmly.",
            description: "Tour the engine real games are built in.",
            videoUrl: yt("IlKaB1etrik"),
            challenge: "Download Unity Hub (free). Create a new 2D project. Just open it.",
            duration: "~9 min",
          },
          {
            id: "game-5",
            title: "Sharing Your Game",
            intro:
              "Even a tiny game becomes real once someone else plays it. itch.io lets you publish browser games for free with no approval. One link, one friend playing — that's your first shipped game.",
            description: "Put your game online for free.",
            videoUrl: yt("c2T7GOXR8xo"),
            challenge: "Create a free itch.io account. Browse 3 indie games made by solo developers.",
            duration: "~5 min",
          },
        ],
      },
      {
        id: "app-development",
        title: "App Development",
        emoji: "📱",
        tagline: "Build phone apps",
        description: "Make apps for Android and iPhone using a single codebase.",
        searchKeywords: ["app", "mobile", "phone", "android", "ios", "flutter", "react native"],
        featured: true,
        lessons: [
          {
            id: "app-1",
            title: "What App Development Actually Is",
            intro:
              "An app is just a program that runs on a phone. You can build one app that runs on both Android and iPhone using tools like Flutter (by Google) or React Native. No need to learn two languages. Pick one tool — Flutter is the friendliest start.",
            description: "Understand what you're about to build.",
            videoUrl: yt("lHhRhPV--G0"),
            challenge: "Search the Play Store for 'Flutter Gallery'. Install it and tap around — every screen there is built with Flutter.",
            duration: "~3 min",
          },
          {
            id: "app-2",
            title: "Your First Flutter Setup",
            intro:
              "Setup is the hardest part of app development — once Flutter is installed, everything else is faster. You need Flutter SDK + Android Studio. On a slow connection it can take 1–2 hours, but you only do it once.",
            description: "Install the tools you'll use forever.",
            videoUrl: yt("1ukSR1GRtMU"),
            challenge: "Install Flutter and run `flutter doctor` in the terminal. Aim to see at least one green checkmark.",
            duration: "~12 min",
          },
          {
            id: "app-3",
            title: "Build Your First Widget",
            intro:
              "Everything in Flutter is a 'widget' — text, buttons, layouts. You build apps by combining widgets like Lego blocks. This sounds abstract until you build one — then it clicks.",
            description: "The Lego-block thinking behind Flutter.",
            videoUrl: yt("W1pNjxmNHNQ"),
            challenge: "Create a new Flutter project. Change the default text to your own name and hot-reload it.",
            duration: "~10 min",
          },
          {
            id: "app-4",
            title: "Build a Real App",
            intro:
              "Now stitch widgets, screens and a bit of logic into something that feels like a real app. Even a counter, todo or tip-calculator app teaches you 80% of what real production apps use.",
            description: "From single screen to multi-screen app.",
            videoUrl: yt("x0uinJvhNxI"),
            challenge: "Pick ONE small idea (calculator, tip splitter, BMI tool). Build it — even if it's ugly.",
            duration: "~30 min (skip around)",
          },
          {
            id: "app-5",
            title: "Ship It to Real Users",
            intro:
              "Building an app you never share is just practice. Getting it on a friend's phone — even as a test APK — changes everything. Later you can publish to Play Store (about KSh 3,000 one-time fee).",
            description: "From your laptop to a real phone.",
            videoUrl: yt("pTJJsmejUOQ"),
            challenge: "Build a release APK with `flutter build apk`. Send it to one friend on WhatsApp and have them install it.",
            duration: "~25 min (skip around)",
          },
        ],
      },
      {
        id: "ai-automation",
        title: "AI & Automation",
        emoji: "🤖",
        tagline: "Use AI to do real work",
        description: "Use ChatGPT, Claude and no-code AI tools to save time and build things.",
        searchKeywords: ["ai", "chatgpt", "automation", "claude", "gpt", "artificial intelligence"],
        featured: true,
        lessons: [
          {
            id: "ai-1",
            title: "What AI Actually Is",
            intro:
              "AI tools like ChatGPT, Claude and Gemini are not magic — they predict the next likely word based on patterns learned from huge amounts of text. Knowing this changes how you use them: clearer instructions in, better results out.",
            description: "Understand the tool you're about to use.",
            videoUrl: yt("xs3ZyXX7dX0"),
            challenge: "Open ChatGPT (free). Ask it to explain something you actually want to learn today.",
            duration: "~5 min",
          },
          {
            id: "ai-2",
            title: "Prompting Like a Pro",
            intro:
              "A weak prompt gets a weak answer. A strong prompt sets a role, a task, a format and constraints. 'Write a CV' is weak. 'Act as a Kenyan HR manager. Write a 1-page CV for a Form 4 leaver applying for a sales internship. Use bullet points.' is strong.",
            description: "The formula behind every great AI answer.",
            videoUrl: yt("_wPTAeZLd7c"),
            challenge: "Rewrite one bad prompt using: role + task + format + constraint. Compare both answers.",
            duration: "~7 min",
          },
          {
            id: "ai-3",
            title: "Using AI to Save Hours Every Week",
            intro:
              "AI shines at the boring stuff: summarising notes, drafting emails, planning your week, breaking down hard topics. Pick 3 tasks you do weekly and let AI handle the first draft. You edit, you stay in control.",
            description: "Practical, daily ways to use AI.",
            videoUrl: yt("Qc6pdR8BhFA"),
            challenge: "Pick one repetitive task this week (notes, emails, planning). Use AI to do it.",
            duration: "~8 min",
          },
          {
            id: "ai-4",
            title: "Automating Boring Work (No-Code)",
            intro:
              "Tools like Zapier and Make connect apps together so they do things for you — like saving every email attachment to Drive automatically. No code required. One automation can save hours every month.",
            description: "Make apps work for you.",
            videoUrl: yt("JtdUgJGI_Oo"),
            challenge: "Sign up for Zapier free. Build one Zap (even a trivial one) and turn it on.",
            duration: "~8 min",
          },
          {
            id: "ai-5",
            title: "Turning AI Skills Into Income",
            intro:
              "People are already paying for AI-assisted work — content drafting, image generation, custom GPTs, lead research. You don't need to be an expert; you need to be useful to a specific person with a specific problem.",
            description: "Earn from what you just learned.",
            videoUrl: yt("TyXivx7fFwQ"),
            challenge: "List 3 small AI services you could offer this week (e.g. CV polish, blog drafts, image edits).",
            duration: "~9 min",
          },
        ],
      },
      {
        id: "ui-ux-design",
        title: "UI/UX Design",
        emoji: "🎨",
        tagline: "Design beautiful apps",
        description: "Design how apps and websites look and feel using free tools like Figma.",
        searchKeywords: ["ui", "ux", "design", "figma", "interface", "user experience"],
        featured: true,
        lessons: [
          {
            id: "ux-1",
            title: "UI vs UX (And Why Both Matter)",
            intro:
              "UI is how it looks. UX is how it works. A pretty app nobody can use has good UI and bad UX. A clunky-looking app you can't stop using has bad UI and great UX. The best products nail both.",
            description: "The difference everyone confuses.",
            videoUrl: yt("SRec90j6lTY"),
            challenge: "Open 3 apps on your phone. For each, write 1 thing that's great UX and 1 that's frustrating.",
            duration: "~12 min",
          },
          {
            id: "ux-2",
            title: "Figma in 13 Minutes",
            intro:
              "Figma is the design tool the whole industry uses. It's free, works in your browser (even on weak laptops), and is the only design tool you need to know for the next few years.",
            description: "The tool you'll actually use.",
            videoUrl: yt("jQ1sfKIl50E"),
            challenge: "Sign up for Figma (free). Create one frame and drag in 3 shapes — that's it.",
            duration: "~13 min",
          },
          {
            id: "ux-3",
            title: "The Full Figma Crash Course",
            intro:
              "Once you've poked around, this longer course teaches frames, components, auto-layout and prototyping — the four superpowers of Figma. You don't need to watch it all at once.",
            description: "Go deeper at your own pace.",
            videoUrl: yt("ezldKx-jPag"),
            challenge: "Recreate one screen from any app you love (Instagram login, M-Pesa home, etc.) in Figma.",
            duration: "~30 min (skip around)",
          },
          {
            id: "ux-4",
            title: "Design a Real Website",
            intro:
              "Designing a full landing page forces you to use everything: grids, typography, color, hierarchy. The point isn't perfection — it's making 100 small decisions and learning from each one.",
            description: "Apply everything to one project.",
            videoUrl: yt("clSHs94hNNc"),
            challenge: "Design a single-page website in Figma for a fake (or real) Kenyan business — a barber, kibanda, tutor.",
            duration: "~40 min",
          },
          {
            id: "ux-5",
            title: "Build a Portfolio That Gets You Hired",
            intro:
              "Designers get hired from portfolios, not certificates. 3 strong projects beat 10 weak ones. Show your thinking — not just final screens.",
            description: "Turn your work into income.",
            videoUrl: yt("mmgxspm9JWs"),
            challenge: "List the 3 design projects you'll put in your first portfolio (real or self-initiated).",
            duration: "~17 min",
          },
        ],
      },
      {
        id: "cybersecurity",
        title: "Cybersecurity",
        emoji: "🔐",
        tagline: "Learn ethical hacking",
        description: "Understand how systems get attacked — and how to protect them.",
        searchKeywords: ["security", "hacking", "cyber", "ethical", "hacker", "protect"],
        featured: true,
        lessons: [
          {
            id: "cyber-1",
            title: "What Cybersecurity Actually Is",
            intro:
              "Cybersecurity is the job of keeping data, money and identities safe from people trying to steal them. Every bank, hospital and school in Kenya now hires for this. It's not just hacking — it's defence.",
            description: "The field in 7 minutes.",
            videoUrl: yt("inWWhr5tnEA"),
            challenge: "Check haveibeenpwned.com with your email. If it's been in a breach, change those passwords.",
            duration: "~7 min",
          },
          {
            id: "cyber-2",
            title: "Why Strong Passwords Matter",
            intro:
              "Modern computers can guess billions of passwords per second. 'Password123' lasts 0.1 seconds. A long passphrase (4 random words) lasts longer than your lifetime. This one habit blocks 80% of real attacks.",
            description: "The math behind weak vs strong.",
            videoUrl: yt("3NjQ9b3pgIg"),
            challenge: "Replace your weakest password with a 4-word passphrase like 'mango-river-bicycle-cloud'.",
            duration: "~12 min",
          },
          {
            id: "cyber-3",
            title: "How Passwords Get Cracked",
            intro:
              "Seeing the actual cracking process — billions of guesses per second on a GPU — makes you take security seriously for life. It's also the foundation for understanding why hashing, salting and 2FA exist.",
            description: "The attack you're defending against.",
            videoUrl: yt("7U-RbOKanYs"),
            challenge: "Turn on 2-factor authentication for your Gmail / WhatsApp / M-Pesa. Today.",
            duration: "~20 min",
          },
          {
            id: "cyber-4",
            title: "Phishing — The #1 Attack in Kenya",
            intro:
              "Most real-world breaches don't use crazy hacking — they use phishing: fake emails, fake M-Pesa SMS, fake job offers. Seeing how easy these are to make is the best vaccine against falling for them.",
            description: "Spot the trap before you click.",
            videoUrl: yt("u9dBGWVwMMA"),
            challenge: "Find one suspicious SMS or email in your phone. Spot 3 red flags (urgency, weird link, bad grammar).",
            duration: "~18 min",
          },
          {
            id: "cyber-5",
            title: "Becoming a Cybersecurity Pro",
            intro:
              "Cybersecurity has more open jobs than people to fill them — globally and in Kenya. The Google Cybersecurity Certificate is a real, recognised entry point. This intro shows you exactly what the field looks like.",
            description: "A real path into the field.",
            videoUrl: yt("_DVVNOGYtmU"),
            challenge: "Browse the Google Cybersecurity Certificate on Coursera. Note 3 skills you'd need to learn.",
            duration: "~60 min (skip around)",
          },
        ],
      },
    ],
  },

  // ───────────────────── BUSINESS ─────────────────────
  {
    id: "business",
    title: "Business",
    emoji: "🚀",
    description: "Earn online, build a brand, and turn skills into income.",
    icon: "Briefcase",
    color: "var(--accent-emerald)",
    branches: [
      {
        id: "freelancing",
        title: "Freelancing",
        emoji: "🤝",
        tagline: "Get paid for skills you have",
        description: "Land your first client and get paid online — even from Kenya.",
        searchKeywords: ["freelance", "client", "money", "income", "fiverr", "upwork", "earn"],
        featured: true,
        lessons: [
          {
            id: "freelance-1",
            title: "What Freelancing Actually Is",
            intro:
              "Freelancing means selling a skill directly to clients — no boss, no office. People in Kenya freelance in writing, design, video editing, virtual assistance, coding. Start with one skill, one platform, one client.",
            description: "How freelancing works in real life.",
            videoUrl: yt("utPBI1qitJU"),
            challenge: "List 3 skills you have, even basic ones (typing, English, design, social media).",
            duration: "~5 min",
          },
          {
            id: "freelance-2",
            title: "Picking Your First Skill",
            intro:
              "You don't need to be an expert. You need to be slightly ahead of your client. Pick the skill where you have the smallest gap to bridge and where buyers exist — writing, simple design, basic video editing, data entry.",
            description: "Choose what to sell first.",
            videoUrl: yt("FMd67p9pEdo"),
            challenge: "Pick ONE skill from your list. Write 3 sentences about why you'd hire yourself.",
            duration: "~6 min",
          },
          {
            id: "freelance-3",
            title: "Setting Up on Fiverr / Upwork",
            intro:
              "Both platforms work from Kenya and pay via M-Pesa-friendly methods. Fiverr is easier to start (you set what you offer). Upwork takes longer to get approved but pays better. Many Kenyans use both.",
            description: "Create your first gig or profile.",
            videoUrl: yt("mVdyKy2Hn0U"),
            challenge: "Create a free account on Fiverr. Don't publish yet — just explore 10 gigs in your skill.",
            duration: "~7 min",
          },
          {
            id: "freelance-4",
            title: "Writing a Gig That Sells",
            intro:
              "Clients scan, they don't read. Your title, image, and first sentence do 90% of the work. Steal structure from top-rated gigs in your category — don't copy text, copy the format.",
            description: "What makes clients click 'order'.",
            videoUrl: yt("rLfAImFUwds"),
            challenge: "Write a draft gig title and 3-line description for your skill.",
            duration: "~6 min",
          },
          {
            id: "freelance-5",
            title: "Getting Your First Client",
            intro:
              "The first client is the hardest. Most beginners get theirs by pricing low, replying fast, and over-delivering on one small job. Once you have one 5-star review, the next jobs come easier.",
            description: "Land that first paying job.",
            videoUrl: yt("AomSFPbUMHQ"),
            challenge: "Publish your gig OR send 5 personalised proposals on Upwork this week.",
            duration: "~7 min",
          },
        ],
      },
      {
        id: "content-creation",
        title: "Content Creation",
        emoji: "🎥",
        tagline: "Build an audience online",
        description: "Make videos, posts and content that grow a real following.",
        searchKeywords: ["content", "youtube", "tiktok", "instagram", "creator", "audience", "social"],
        featured: true,
        lessons: [
          {
            id: "content-1",
            title: "Why Content Creation Works",
            intro:
              "Content creation isn't just for famous people. Small accounts (under 10k followers) often earn from brand deals, affiliate links, services, and digital products. The trick is consistency on one platform with one clear topic.",
            description: "Understand the real opportunity.",
            videoUrl: yt("gXfLl3qYy0k"),
            challenge: "Name 2 small creators (under 50k followers) you'd happily watch every week.",
            duration: "~5 min",
          },
          {
            id: "content-2",
            title: "Picking Your Niche",
            intro:
              "Niches grow faster than general accounts. 'Cooking Kenyan student meals' beats 'cooking'. 'Tech tips for high schoolers' beats 'tech'. Pick a topic you can post about for 30 days without getting bored.",
            description: "Find the topic only you can own.",
            videoUrl: yt("TLCuJRivmhU"),
            challenge: "Write down 3 niche ideas. Circle the one you'd post about every day for free.",
            duration: "~6 min",
          },
          {
            id: "content-3",
            title: "Filming on a Phone",
            intro:
              "Every modern phone shoots great video. What matters: natural light (face a window), steady framing (lean on something), and clear audio (record close to your mouth or use earphones).",
            description: "Shoot good video with what you have.",
            videoUrl: yt("vfgXdSaaSPQ"),
            challenge: "Record one 30-second clip of yourself talking about your niche. Just one.",
            duration: "~7 min",
          },
          {
            id: "content-4",
            title: "Hooks That Stop the Scroll",
            intro:
              "The first 3 seconds decide everything. Strong hooks: ask a question, state a bold claim, show the end result first, or break a pattern. Without a hook, even great content gets scrolled past.",
            description: "The most important 3 seconds.",
            videoUrl: yt("LmXpbP7dD48"),
            challenge: "Write 5 different hook lines for the same video idea.",
            duration: "~5 min",
          },
          {
            id: "content-5",
            title: "Posting Consistently",
            intro:
              "The algorithm rewards rhythm. 3 posts a week for 3 months beats 30 posts in one week. Pick a schedule you can actually hold — even 2 posts a week — and protect it.",
            description: "How creators actually grow.",
            videoUrl: yt("VdBY8Tv-s2Q"),
            challenge: "Decide a posting schedule. Write it where you'll see it daily.",
            duration: "~5 min",
          },
        ],
      },
      {
        id: "entrepreneurship",
        title: "Entrepreneurship",
        emoji: "🚀",
        tagline: "Start your first business",
        description: "Turn a small idea into a real business — even with little money.",
        searchKeywords: ["business", "startup", "founder", "entrepreneur", "company"],
        featured: false,
        lessons: [],
      },
      {
        id: "digital-marketing",
        title: "Digital Marketing",
        emoji: "📈",
        tagline: "Get attention online",
        description: "Learn how brands grow on Instagram, TikTok, Google and email.",
        searchKeywords: ["marketing", "ads", "promotion", "sales", "growth", "seo"],
        featured: false,
        lessons: [],
      },
      {
        id: "e-commerce",
        title: "E-Commerce",
        emoji: "🛒",
        tagline: "Sell products online",
        description: "Set up your own online shop and start selling.",
        searchKeywords: ["ecommerce", "shop", "store", "sell", "shopify", "online store"],
        featured: false,
        lessons: [],
      },
      {
        id: "personal-finance",
        title: "Personal Finance",
        emoji: "💰",
        tagline: "Manage your money well",
        description: "Save, budget and invest from a teenager's pocket money up.",
        searchKeywords: ["finance", "money", "save", "budget", "invest", "savings"],
        featured: false,
        lessons: [],
      },
    ],
  },

  // ───────────────────── CREATIVE ─────────────────────
  {
    id: "creative",
    title: "Creative",
    emoji: "🎨",
    description: "Design, edit, animate, shoot. Build a portfolio you can show.",
    icon: "Palette",
    color: "var(--accent-purple)",
    branches: [
      {
        id: "graphic-design",
        title: "Graphic Design",
        emoji: "🎨",
        tagline: "Design logos, posters, social posts",
        description: "Create designs people pay for using free tools like Canva and Figma.",
        searchKeywords: ["design", "graphic", "logo", "poster", "canva", "photoshop"],
        featured: true,
        lessons: [
          {
            id: "design-1",
            title: "What Graphic Design Actually Is",
            intro:
              "Graphic design is solving visual problems — making a poster readable, a logo memorable, a feed beautiful. You don't need talent to start. You need to learn what works and copy structure from designs you admire.",
            description: "Understand the craft.",
            videoUrl: yt("YqQx75OPRa0"),
            challenge: "Save 5 designs (logos, posters, posts) you love. Look for what they have in common.",
            duration: "~5 min",
          },
          {
            id: "design-2",
            title: "The 5 Design Principles",
            intro:
              "Almost every good design uses: alignment, contrast, repetition, hierarchy and white space. Learn these once and you'll see them everywhere — and your work will instantly improve.",
            description: "The rules pros never break.",
            videoUrl: yt("a5KYlHNKQB8"),
            challenge: "Pick one of your saved designs. Identify which of the 5 principles it uses most.",
            duration: "~7 min",
          },
          {
            id: "design-3",
            title: "Designing in Canva (Free)",
            intro:
              "Canva is free, runs in your browser, and lets you make professional-looking designs in minutes. Pros use it too — it's not 'cheating'. Master it before paying for anything fancier.",
            description: "Make your first real design.",
            videoUrl: yt("jzWxBuvwuwQ"),
            challenge: "Open Canva. Design one Instagram post about anything you care about.",
            duration: "~8 min",
          },
          {
            id: "design-4",
            title: "Typography That Doesn't Suck",
            intro:
              "90% of beginner designs look bad because of font choices. Rule: use max 2 fonts. One bold for headings, one clean for body. Stick to fonts already on Canva or Google Fonts.",
            description: "Pick fonts like a pro.",
            videoUrl: yt("QrNi9FmdlxY"),
            challenge: "Redesign your Instagram post — change ONLY the fonts. Compare both versions.",
            duration: "~6 min",
          },
          {
            id: "design-5",
            title: "Building a Portfolio",
            intro:
              "Clients don't hire your CV — they hire your portfolio. Even 3 strong pieces beat 20 weak ones. Start with fake briefs: redesign a local business's poster, design a logo for your dream brand.",
            description: "What clients actually want to see.",
            videoUrl: yt("8M0qxamf1rE"),
            challenge: "Design 3 pieces around one theme (e.g. 3 posters for a fake coffee shop).",
            duration: "~6 min",
          },
        ],
      },
      {
        id: "video-editing",
        title: "Video Editing",
        emoji: "🎬",
        tagline: "Edit videos people watch",
        description: "Cut, trim and add effects with free tools like CapCut and DaVinci Resolve.",
        searchKeywords: ["video", "edit", "editing", "capcut", "davinci", "premiere", "youtube"],
        featured: true,
        lessons: [
          {
            id: "edit-1",
            title: "What Editors Actually Do",
            intro:
              "Editing is storytelling with cuts. A good editor turns 30 minutes of raw footage into a 3-minute video people watch to the end. The best editors aren't fast — they make decisions fast.",
            description: "Understand the real job.",
            videoUrl: yt("g9G218IncLw"),
            challenge: "Watch a short YouTube video. Count how many cuts happen in the first 30 seconds.",
            duration: "~5 min",
          },
          {
            id: "edit-2",
            title: "CapCut on Your Phone",
            intro:
              "CapCut is free, runs on any phone, and is what most TikTok and Reels editors actually use. You can do 80% of pro editing without ever touching a laptop.",
            description: "Edit your first video on your phone.",
            videoUrl: yt("P51CqlPOE_w"),
            challenge: "Install CapCut. Import any 3 clips from your phone and stitch them together.",
            duration: "~8 min",
          },
          {
            id: "edit-3",
            title: "Cuts, B-Roll and Pacing",
            intro:
              "Cuts hide boredom. B-roll (extra footage shown over the main one) keeps eyes engaged. Pacing — when to slow down vs speed up — separates amateur from pro. Watch any pro video with this in mind.",
            description: "Make videos that hold attention.",
            videoUrl: yt("ivhHHoLXy4s"),
            challenge: "Re-edit your first video. Cut anything boring. Aim to make it 30% shorter.",
            duration: "~7 min",
          },
          {
            id: "edit-4",
            title: "Sound: The Hidden 50%",
            intro:
              "Bad video with great audio is watchable. Great video with bad audio gets closed in 5 seconds. Free music (Epidemic Sound trial, YouTube Audio Library) and clean voice recording matter more than 4K footage.",
            description: "Why audio matters more than video.",
            videoUrl: yt("Wcxw3BPSt3A"),
            challenge: "Add background music and one sound effect to your edited video.",
            duration: "~6 min",
          },
          {
            id: "edit-5",
            title: "DaVinci Resolve (Free Pro Tool)",
            intro:
              "DaVinci Resolve is what Hollywood films are edited in — and the full version is free forever. If you want to edit on a laptop, start here, not in pirated Premiere.",
            description: "Step up to laptop editing.",
            videoUrl: yt("SrJOE2pEp7A"),
            challenge: "Download DaVinci Resolve (free). Just open it — no need to edit yet.",
            duration: "~9 min",
          },
        ],
      },
      {
        id: "blender-3d",
        title: "Blender & 3D Design",
        emoji: "🧊",
        tagline: "Create 3D art and models",
        description: "Learn Blender, the free 3D tool used by pros and studios worldwide.",
        searchKeywords: ["blender", "3d", "modeling", "animation", "render", "sculpting"],
        featured: true,
        lessons: [
          {
            id: "blender-1",
            title: "Why Blender is a Big Deal",
            intro:
              "Blender is 100% free, runs on most laptops, and is used to make professional animations, films, and game assets. The famous 'Donut Tutorial' has launched thousands of careers — and that's exactly where you'll start.",
            description: "Meet the free tool studios actually use.",
            videoUrl: yt("-tbSCMbJA6o"),
            challenge: "Download Blender (free) from blender.org. Just install it — no need to open yet.",
            duration: "~10 min",
          },
          {
            id: "blender-2",
            title: "Navigating the Interface",
            intro:
              "Blender looks scary at first — buttons everywhere. But you only need 6 shortcuts to start: G (grab), R (rotate), S (scale), Tab (edit mode), middle-mouse (orbit), scroll (zoom). Learn these, ignore the rest for now.",
            description: "Stop being scared of the UI.",
            videoUrl: yt("9NT_1BvV2yw"),
            challenge: "Open Blender. Practice G, R, S on the default cube. Orbit around it.",
            duration: "~10 min",
          },
          {
            id: "blender-3",
            title: "Modeling Your First Object",
            intro:
              "3D modeling is just pushing vertices, edges and faces around until they look like something. Start with simple shapes — a mug, a chair, a sword. Don't aim for realism; aim for recognisable.",
            description: "Build something you can show.",
            videoUrl: yt("ICBP-7x7Chc"),
            challenge: "Model one simple object: a mug, table, or pencil. Save your .blend file.",
            duration: "~15 min",
          },
          {
            id: "blender-4",
            title: "Lighting & Materials",
            intro:
              "A great model with bad lighting looks fake. A simple model with good lighting looks real. Three-point lighting and one HDRI environment map will instantly upgrade every render you make.",
            description: "Make your 3D look real.",
            videoUrl: yt("aafyp5g1CjI"),
            challenge: "Add one light and one material to your model. Render a still image.",
            duration: "~12 min",
          },
          {
            id: "blender-5",
            title: "Rendering & Sharing Your Work",
            intro:
              "ArtStation, Instagram and Reddit (r/blender) are where 3D artists get noticed. One clean render with good lighting beats five rushed ones. Post consistently and you'll get feedback that makes you better.",
            description: "Get your art seen.",
            videoUrl: yt("4pSkVBxlGxg"),
            challenge: "Export your render as PNG. Post it anywhere — Instagram, WhatsApp status, ArtStation.",
            duration: "~10 min",
          },
        ],
      },
      {
        id: "animation",
        title: "Animation",
        emoji: "✨",
        tagline: "Bring drawings to life",
        description: "Make 2D animations using free tools — no art-school degree needed.",
        searchKeywords: ["animation", "animate", "cartoon", "motion", "2d"],
        featured: false,
        lessons: [],
      },
      {
        id: "photography",
        title: "Photography",
        emoji: "📸",
        tagline: "Shoot great photos",
        description: "Take photos people want to look at — using a phone or any camera.",
        searchKeywords: ["photo", "photography", "camera", "shoot", "picture"],
        featured: false,
        lessons: [],
      },
      {
        id: "music-production",
        title: "Music Production",
        emoji: "🎵",
        tagline: "Make your own beats",
        description: "Produce music in free tools like BandLab and GarageBand.",
        searchKeywords: ["music", "beats", "produce", "song", "audio", "fl studio"],
        featured: false,
        lessons: [],
      },
    ],
  },
];

// ──────────────── Helpers ────────────────

export function getCategory(categoryId: string): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function getBranch(
  categoryId: string,
  branchId: string
): { category: Category; branch: Branch } | undefined {
  const category = getCategory(categoryId);
  if (!category) return undefined;
  const branch = category.branches.find((b) => b.id === branchId);
  if (!branch) return undefined;
  return { category, branch };
}

// Lessons are uniquely identified by branch+lesson id; search across all categories.
export function getLesson(
  branchId: string,
  lessonId: string
):
  | {
      category: Category;
      branch: Branch;
      lesson: Lesson;
      lessonIndex: number;
      totalLessons: number;
    }
  | undefined {
  for (const category of categories) {
    const branch = category.branches.find((b) => b.id === branchId);
    if (!branch) continue;
    const idx = branch.lessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) continue;
    return {
      category,
      branch,
      lesson: branch.lessons[idx],
      lessonIndex: idx + 1,
      totalLessons: branch.lessons.length,
    };
  }
  return undefined;
}

export function getNextLesson(branchId: string, currentLessonId: string): Lesson | undefined {
  for (const category of categories) {
    const branch = category.branches.find((b) => b.id === branchId);
    if (!branch) continue;
    const idx = branch.lessons.findIndex((l) => l.id === currentLessonId);
    if (idx === -1 || idx >= branch.lessons.length - 1) return undefined;
    return branch.lessons[idx + 1];
  }
  return undefined;
}

export function getBranchProgress(
  branch: Branch,
  completedIds: string[]
): { completed: number; total: number; percent: number } {
  const total = branch.lessons.length;
  const completed = branch.lessons.filter((l) => completedIds.includes(l.id)).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// Guided search: returns ranked branch matches for a free-text query.
export function searchBranches(query: string): { category: Category; branch: Branch; score: number }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const results: { category: Category; branch: Branch; score: number }[] = [];

  for (const category of categories) {
    for (const branch of category.branches) {
      let score = 0;
      const haystack = [
        branch.title.toLowerCase(),
        branch.tagline.toLowerCase(),
        branch.description.toLowerCase(),
        ...branch.searchKeywords.map((k) => k.toLowerCase()),
      ];
      for (const word of words) {
        for (const hay of haystack) {
          if (hay === word) score += 5;
          else if (hay.includes(word)) score += 2;
        }
      }
      if (score > 0) results.push({ category, branch, score });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 4);
}
