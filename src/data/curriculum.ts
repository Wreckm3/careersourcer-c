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
        featured: true,
        lessons: [
          {
            id: "entre-1",
            title: "Start With Why",
            intro:
              "Every successful business answers one question clearly: WHY does this exist? People don't buy what you do, they buy why you do it. This idea — from Simon Sinek — has shaped a generation of founders.",
            description: "The foundation under every great business.",
            videoUrl: yt("u4ZoJKF_VuA"),
            challenge: "Write ONE sentence: 'My business exists because…'. Don't overthink it — just write it.",
            duration: "~18 min",
          },
          {
            id: "entre-2",
            title: "How to Find a Real Idea",
            intro:
              "Most beginner founders fail because they fall in love with an idea nobody wants. The best ideas come from real problems you (or people around you) already have. Michael Seibel from Y Combinator breaks down exactly how to test that.",
            description: "Ideas come from problems, not brainstorming.",
            videoUrl: yt("vDXkpJw16os"),
            challenge: "List 5 problems you or your friends complain about every week. One of them is an idea.",
            duration: "~17 min",
          },
          {
            id: "entre-3",
            title: "Build the Smallest Thing First (MVP)",
            intro:
              "An MVP — minimum viable product — is the tiniest version of your idea that proves people want it. It is meant to be ugly, simple and embarrassing. If you wait until it's perfect, you'll never launch.",
            description: "Launch ugly, learn fast.",
            videoUrl: yt("QRZ_l7cVzzU"),
            challenge: "Describe your MVP in ONE sentence: 'It's a [thing] that lets [people] do [action].'",
            duration: "~17 min",
          },
          {
            id: "entre-4",
            title: "Getting Your First Customers",
            intro:
              "Your first 10 customers won't come from ads — they'll come from you DM-ing people, calling friends, posting in WhatsApp groups. Founders who can't sell die. Founders who can sell survive long enough to figure the rest out.",
            description: "Do things that don't scale.",
            videoUrl: yt("hyYCn_kAngI"),
            challenge: "Message 3 people today and pitch your idea in 2 sentences. Note their reactions.",
            duration: "~25 min",
          },
          {
            id: "entre-5",
            title: "Register Your Business in Kenya",
            intro:
              "Once your idea has even one paying customer, register it. In Kenya it costs under KSh 1,000 and takes about an hour on eCitizen. You get a real business name, the right to invoice, and the foundation to grow.",
            description: "Make it official — Kenya edition.",
            videoUrl: yt("4dbTC9J5sE4"),
            challenge: "Log into eCitizen and do a name search for your business — even just to reserve it.",
            duration: "~3 min",
          },
        ],
      },
      {
        id: "digital-marketing",
        title: "Digital Marketing",
        emoji: "📈",
        tagline: "Get attention online",
        description: "Learn how brands grow on Instagram, TikTok, Google and email.",
        searchKeywords: ["marketing", "ads", "promotion", "sales", "growth", "seo"],
        featured: true,
        lessons: [
          {
            id: "mkt-1",
            title: "Digital Marketing in 10 Tips",
            intro:
              "Digital marketing is just getting the right message to the right person at the right time — using the internet. Neil Patel's 10 essentials cover the whole landscape: SEO, email, paid ads, social — in one short sitting.",
            description: "The 30,000-foot view first.",
            videoUrl: yt("4abNIEHj-10"),
            challenge: "Pick ONE channel (SEO, email, TikTok, Instagram) that fits your business best. Just one.",
            duration: "~11 min",
          },
          {
            id: "mkt-2",
            title: "SEO — Free Traffic Forever",
            intro:
              "Search engine optimisation is how you appear on Google when someone searches. Get it right and you receive free customers for years. Ahrefs' beginner intro is the cleanest explanation on the internet.",
            description: "Why one blog post can pay you for years.",
            videoUrl: yt("DvwS7cV9GmQ"),
            challenge: "Type your business idea into Google. Note the top 3 results — they are your competition.",
            duration: "~20 min",
          },
          {
            id: "mkt-3",
            title: "Email Marketing — The Hidden Goldmine",
            intro:
              "Every Ksh 1 spent on email returns about Ksh 40. Email isn't dead — it's just boring and that's why it works. Build a small list early and you own a direct line to your customers that no algorithm can take away.",
            description: "The channel no one can shut down on you.",
            videoUrl: yt("J0CEiuOfON0"),
            challenge: "Sign up for MailerLite (free up to 1,000 contacts). Create your first list.",
            duration: "~17 min",
          },
          {
            id: "mkt-4",
            title: "The Art of Digital Marketing",
            intro:
              "Tactics change every year — TikTok today, something else next year. But the underlying art of marketing — empathy, positioning, storytelling — never changes. Neil Patel covers what stays the same.",
            description: "Beyond tactics — into strategy.",
            videoUrl: yt("ExV24jFfi_g"),
            challenge: "Write down: who is your ONE ideal customer? Age, struggle, where they hang out online.",
            duration: "~35 min",
          },
          {
            id: "mkt-5",
            title: "Turn It Into a Career",
            intro:
              "You don't need a marketing degree. Most digital marketers learned online and built a portfolio of small wins. A single 'I grew this account from 0 to 1,000 followers' case study can get you hired.",
            description: "From learning to earning.",
            videoUrl: yt("DoLzQN1m7sU"),
            challenge: "Offer to manage one social account for a friend's business — free — for 30 days. That's your case study.",
            duration: "~6 min",
          },
        ],
      },
      {
        id: "e-commerce",
        title: "E-Commerce",
        emoji: "🛒",
        tagline: "Sell products online",
        description: "Set up your own online shop and start selling.",
        searchKeywords: ["ecommerce", "shop", "store", "sell", "shopify", "online store"],
        featured: true,
        lessons: [
          {
            id: "ecom-1",
            title: "How E-Commerce Actually Works",
            intro:
              "An online store is 4 simple things: a product, a website, a way to take payment, a way to deliver. That's it. In Kenya you can use Shopify, WooCommerce, or even just a WhatsApp catalog to start.",
            description: "The 4 pieces of any online store.",
            videoUrl: yt("RWI59fC7Z48"),
            challenge: "List 3 products you could realistically source or make and sell from home.",
            duration: "~19 min",
          },
          {
            id: "ecom-2",
            title: "Build Your Shopify Store",
            intro:
              "Shopify is the most beginner-friendly way to launch a real store. The free trial is enough to set up everything before you pay a cent. This full walkthrough has helped thousands of people launch.",
            description: "From signup to live store.",
            videoUrl: yt("uorQJ_ucDhg"),
            challenge: "Start the Shopify free trial. Set up your store name and homepage — that's enough today.",
            duration: "~40 min (skip around)",
          },
          {
            id: "ecom-3",
            title: "Design a Store That Sells",
            intro:
              "A pretty store doesn't sell — a CLEAR store sells. Good product photos, simple navigation, trust signals (reviews, return policy), fast checkout. This step-by-step shows you the difference.",
            description: "What separates a real store from a hobby site.",
            videoUrl: yt("PVufWxoWfkI"),
            challenge: "Add your first product to your store with: 3 photos, a clear title, and a benefit-driven description.",
            duration: "~45 min (skip around)",
          },
          {
            id: "ecom-4",
            title: "The Complete Shopify Guide",
            intro:
              "Once you've launched, this complete guide fills in the gaps — taxes, shipping zones, apps, abandoned cart emails. Treat it like a reference, not a one-sitting watch.",
            description: "Your reference manual.",
            videoUrl: yt("ferhOYx1NMo"),
            challenge: "Set up your shipping zones (start with just 'Nairobi' and 'Rest of Kenya').",
            duration: "~60 min (skip around)",
          },
          {
            id: "ecom-5",
            title: "Get Your First Sale",
            intro:
              "Your first sale is psychologically huge — and it almost never comes from ads. It comes from your WhatsApp status, your friends, a TikTok. Focus all energy on getting ONE stranger to buy.",
            description: "Stop tweaking. Start selling.",
            videoUrl: yt("4abNIEHj-10"),
            challenge: "Post your store link on WhatsApp status + one Instagram story today. Just once.",
            duration: "~11 min",
          },
        ],
      },
      {
        id: "personal-finance",
        title: "Personal Finance",
        emoji: "💰",
        tagline: "Manage your money well",
        description: "Save, budget and invest from a teenager's pocket money up.",
        searchKeywords: ["finance", "money", "save", "budget", "invest", "savings"],
        featured: true,
        lessons: [
          {
            id: "fin-1",
            title: "The 50/30/20 Rule",
            intro:
              "The simplest budget on earth: 50% of income to needs, 30% to wants, 20% to savings. It works whether you earn KSh 2,000 a month or KSh 200,000. Master this once and you'll never be broke from confusion again.",
            description: "One rule, every income level.",
            videoUrl: yt("OZQQMYfaBT4"),
            challenge: "Take your last KSh 1,000. Split it: KSh 500 needs, KSh 300 wants, KSh 200 savings.",
            duration: "~10 min",
          },
          {
            id: "fin-2",
            title: "Budgeting When You're Young",
            intro:
              "Most adults wish someone taught them this at 16. Track every shilling for one month and you'll be shocked where it goes. Awareness alone fixes 50% of money problems.",
            description: "The skill that compounds for life.",
            videoUrl: yt("sNocjsSSRkE"),
            challenge: "Write down every shilling you spent yesterday. Total it.",
            duration: "~3 min",
          },
          {
            id: "fin-3",
            title: "Compound Interest — The 8th Wonder",
            intro:
              "Money grows on money. KSh 1,000 saved every month at 10% becomes over KSh 2 million in 30 years. Einstein supposedly called compound interest 'the most powerful force in the universe'. Understand it once and you'll save earlier for life.",
            description: "Why starting today matters so much.",
            videoUrl: yt("Rm6UdfRs3gw"),
            challenge: "Open M-Shwari Lock Savings. Lock KSh 100 for 1 month — just to feel how it works.",
            duration: "~7 min",
          },
          {
            id: "fin-4",
            title: "Investing for Beginners",
            intro:
              "Saving protects your money. Investing GROWS it. Ali Abdaal's beginner guide explains index funds, stocks and what's actually worth your time when you're starting with little money.",
            description: "From saver to investor.",
            videoUrl: yt("lNdOtlpmH5U"),
            challenge: "Research one Kenyan investment option — money market fund, T-bill, or Sanlam Money Market. Just learn what it is.",
            duration: "~20 min",
          },
          {
            id: "fin-5",
            title: "The Only Investing Video You'll Ever Need",
            intro:
              "Mark Tilbury's video is one of the most respected beginner investing breakdowns on YouTube. By the end you'll understand index funds, diversification and why most 'get rich' YouTubers are wrong.",
            description: "Lock in the long view.",
            videoUrl: yt("Ay4fmZdZqJE"),
            challenge: "Write down one investing rule you'll stick to: e.g. 'I save 20% of every paycheck before spending'.",
            duration: "~21 min",
          },
        ],
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
        featured: true,
        lessons: [
          {
            id: "anim-1",
            title: "The 12 Principles of Animation",
            intro:
              "Every Pixar, Disney and anime animator learns the same 12 principles — squash & stretch, anticipation, timing. Alan Becker's animated explainer is the best 24-minute crash course on the internet. Watch it once and you'll spot these in every cartoon for the rest of your life.",
            description: "The DNA of all animation.",
            videoUrl: yt("uDqjIdI4bF4"),
            challenge: "Pick any animated movie clip. Try to identify 3 of the 12 principles in action.",
            duration: "~24 min",
          },
          {
            id: "anim-2",
            title: "FlipaClip — Animate on Your Phone",
            intro:
              "FlipaClip is a free app that lets you animate frame-by-frame on a phone. No tablet, no laptop, no excuses. It's how many young animators got started, including some now working professionally.",
            description: "Your studio fits in your pocket.",
            videoUrl: yt("fAf38GpZa3Y"),
            challenge: "Download FlipaClip. Create a 12-frame animation of a bouncing ball — that's the classic exercise.",
            duration: "~16 min",
          },
          {
            id: "anim-3",
            title: "FlipaClip — Going Deeper",
            intro:
              "Once you've made your first bouncing ball, this fuller guide teaches layers, onion-skin, sound and exporting. By the end you'll have everything to make a 30-second short film on your phone.",
            description: "From doodle to short film.",
            videoUrl: yt("_qhYMKzPQjE"),
            challenge: "Make a 5-second animation with a character that walks, then waves. Export it.",
            duration: "~10 min",
          },
          {
            id: "anim-4",
            title: "Krita — Free Pro Tool",
            intro:
              "Krita is fully free, runs on any laptop, and includes a real animation timeline. If you ever move from phone to laptop, this is where to go next — without paying anything.",
            description: "Step up to the laptop.",
            videoUrl: yt("-B3LDBlkFWU"),
            challenge: "Download Krita (free). Just open it and explore the brushes for 10 minutes.",
            duration: "~25 min",
          },
          {
            id: "anim-5",
            title: "Blender 2D — The Ultimate Free Studio",
            intro:
              "Blender's Grease Pencil turns the famous 3D tool into a full 2D animation studio. It's what many studios use for hybrid 2D/3D work, and it's 100% free forever.",
            description: "Free, professional, future-proof.",
            videoUrl: yt("5epzCprCdGc"),
            challenge: "Install Blender (free). Open it and watch the first 10 minutes of the tutorial — no need to animate yet.",
            duration: "~50 min (skip around)",
          },
        ],
      },
      {
        id: "photography",
        title: "Photography",
        emoji: "📸",
        tagline: "Shoot great photos",
        description: "Take photos people want to look at — using a phone or any camera.",
        searchKeywords: ["photo", "photography", "camera", "shoot", "picture"],
        featured: true,
        lessons: [
          {
            id: "photo-1",
            title: "13 Smartphone Photography Tips",
            intro:
              "Jamie Windsor is a real photographer who proves that the phone in your pocket is enough to take stunning photos. Lighting, composition and timing matter way more than the camera body itself.",
            description: "Your phone is enough — really.",
            videoUrl: yt("_ZYGsx1i5L8"),
            challenge: "Take 3 photos of the same object with: morning light, midday light, evening light. Compare.",
            duration: "~18 min",
          },
          {
            id: "photo-2",
            title: "8 Tips to Kill It on Mobile",
            intro:
              "Practical mobile photography techniques — angle, gridlines, HDR, portrait mode. Quick wins you can apply tomorrow on the way to school or work.",
            description: "Quick wins for today.",
            videoUrl: yt("HXIVNdp_SoM"),
            challenge: "Turn on the gridlines in your camera app. Take 5 photos using them.",
            duration: "~11 min",
          },
          {
            id: "photo-3",
            title: "Rule of Thirds (The One Composition Rule)",
            intro:
              "If you learn only one composition rule, learn this one. Divide the frame into 3x3 and place your subject on the lines or intersections — instantly more interesting photos.",
            description: "One rule, every shot.",
            videoUrl: yt("I1OK3yeuO_s"),
            challenge: "Take 5 photos using rule of thirds. Then 5 with subject dead-center. Compare which feel better.",
            duration: "~15 min",
          },
          {
            id: "photo-4",
            title: "Editing with Snapseed (Free)",
            intro:
              "A great edit can turn a 6/10 phone shot into an 8/10 portfolio piece. Snapseed is Google's free pro-grade editor — and it runs even on entry-level Android phones.",
            description: "Free edits that look paid.",
            videoUrl: yt("WB-NrT-XyG0"),
            challenge: "Pick one of your photos. Edit it in Snapseed: tune image, crop, selective brightness. Post the before/after.",
            duration: "~15 min",
          },
          {
            id: "photo-5",
            title: "11 Tips for Professional Phone Photos",
            intro:
              "A deeper dive into shooting professional-quality phone photography — from settings to staging. Bring it all together and start posting work people will actually pay for.",
            description: "From hobby to portfolio.",
            videoUrl: yt("Bmn_GI4xZBQ"),
            challenge: "Shoot a small series of 5 photos around one theme (food, friends, nature). That's your first mini-portfolio.",
            duration: "~22 min",
          },
        ],
      },
      {
        id: "music-production",
        title: "Music Production",
        emoji: "🎵",
        tagline: "Make your own beats",
        description: "Produce music in free tools like BandLab and GarageBand.",
        searchKeywords: ["music", "beats", "produce", "song", "audio", "fl studio"],
        featured: true,
        lessons: [
          {
            id: "music-1",
            title: "Make Music on Your Phone",
            intro:
              "You don't need a studio. You don't need a laptop. BandLab is a free app that lets you produce real songs directly on your phone — drums, melodies, vocals, mixing. It's how thousands of Kenyan producers started.",
            description: "Your studio is in your pocket.",
            videoUrl: yt("0QSigM67sDE"),
            challenge: "Download BandLab. Open it and tap through one drum kit pattern.",
            duration: "~8 min",
          },
          {
            id: "music-2",
            title: "BandLab — The Full Tour",
            intro:
              "BandLab's official tutorial walks you through every panel: tracks, effects, the mix editor. Take it slow — pause and try each thing as you go.",
            description: "Learn the tool properly.",
            videoUrl: yt("NmUaIoydldg"),
            challenge: "Create a project. Add at least 2 tracks (a drum loop and one instrument).",
            duration: "~16 min",
          },
          {
            id: "music-3",
            title: "Make Your First Beat",
            intro:
              "Theory is fun, but making something is better. This tutorial walks you through producing a complete beat from scratch in BandLab's free web studio. By the end you'll have something you can post.",
            description: "From silence to a finished beat.",
            videoUrl: yt("S96P06ml8Cg"),
            challenge: "Finish ONE 30-second beat. Doesn't matter if it's bad. Just finish it.",
            duration: "~11 min",
          },
          {
            id: "music-4",
            title: "Music Theory in 30 Minutes",
            intro:
              "Andrew Huang teaches more usable music theory in 30 minutes than most music schools teach in a term. Scales, chords, keys — explained so anyone can apply them to a beat tonight.",
            description: "The shortcut to better-sounding music.",
            videoUrl: yt("rgaTLrZGlk0"),
            challenge: "Find the key of one of your favourite songs (Google or use an app). Make one beat in that same key.",
            duration: "~32 min",
          },
          {
            id: "music-5",
            title: "Full BandLab Production Workflow",
            intro:
              "Putting it all together: arranging, mixing, exporting. Once you can finish a song from idea to MP3, you're a producer — not a beginner.",
            description: "Finish a real, postable song.",
            videoUrl: yt("6sLGYiRXEqs"),
            challenge: "Export one of your beats as an MP3. Share it with one friend or on your WhatsApp status.",
            duration: "~17 min",
          },
        ],
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
