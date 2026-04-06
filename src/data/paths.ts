export interface Session {
  id: string;
  title: string;
  description: string;
  videoUrl: string; // YouTube embed URL
  task: string;
  duration: string; // e.g. "~7 min"
}

export interface Stage {
  id: string;
  title: string;
  description: string;
  sessions: Session[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // CSS variable
  stages: Stage[];
}

export const paths: LearningPath[] = [
  {
    id: "technology",
    title: "Technology",
    description: "Build technical skills from fundamentals to advanced development.",
    icon: "Monitor",
    color: "var(--accent-blue)",
    stages: [
      {
        id: "tech-foundations",
        title: "Foundations",
        description: "Start with the basics of how technology works.",
        sessions: [
          {
            id: "tech-1-1",
            title: "How the Internet Works",
            description: "Understand the infrastructure that powers everything online.",
            videoUrl: "https://www.youtube.com/embed/x3c1ih2NJEg",
            task: "Write down 3 things you learned about how data travels across the internet.",
            duration: "~5 min",
          },
          {
            id: "tech-1-2",
            title: "Introduction to Programming",
            description: "Learn what programming is and why it matters.",
            videoUrl: "https://www.youtube.com/embed/zOjov-2OZ0E",
            task: "List 3 real-world problems that can be solved with programming.",
            duration: "~7 min",
          },
          {
            id: "tech-1-3",
            title: "Understanding Algorithms",
            description: "Discover how step-by-step instructions power software.",
            videoUrl: "https://www.youtube.com/embed/rL8X2mlNHPM",
            task: "Write a simple algorithm for making your morning routine.",
            duration: "~6 min",
          },
        ],
      },
      {
        id: "tech-web",
        title: "Web Development",
        description: "Learn to build for the web.",
        sessions: [
          {
            id: "tech-2-1",
            title: "HTML & CSS Basics",
            description: "The building blocks of every website.",
            videoUrl: "https://www.youtube.com/embed/qz0aGYrrlhU",
            task: "Sketch a simple webpage layout with header, content, and footer sections.",
            duration: "~8 min",
          },
          {
            id: "tech-2-2",
            title: "JavaScript Essentials",
            description: "Add interactivity to your web pages.",
            videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk",
            task: "Describe 3 interactive features on websites you use daily.",
            duration: "~7 min",
          },
          {
            id: "tech-2-3",
            title: "Responsive Design",
            description: "Make websites that work on any device.",
            videoUrl: "https://www.youtube.com/embed/srvUrASNj0s",
            task: "Check 2 of your favorite websites on both desktop and mobile. Note the differences.",
            duration: "~6 min",
          },
        ],
      },
      {
        id: "tech-career",
        title: "Career in Tech",
        description: "Prepare yourself for a tech career.",
        sessions: [
          {
            id: "tech-3-1",
            title: "Tech Career Paths",
            description: "Explore the many directions a tech career can take.",
            videoUrl: "https://www.youtube.com/embed/Uo3cL4nrGOk",
            task: "Pick 2 tech roles that interest you and write why.",
            duration: "~8 min",
          },
          {
            id: "tech-3-2",
            title: "Building a Portfolio",
            description: "Learn what makes a strong tech portfolio.",
            videoUrl: "https://www.youtube.com/embed/u-RLu_8kwA0",
            task: "List 3 project ideas you could build for your portfolio.",
            duration: "~7 min",
          },
          {
            id: "tech-3-3",
            title: "Landing Your First Role",
            description: "Tips for getting hired in tech.",
            videoUrl: "https://www.youtube.com/embed/Xg9ihH15Uto",
            task: "Write a 2-sentence summary of your strongest skill.",
            duration: "~6 min",
          },
        ],
      },
    ],
  },
  {
    id: "business",
    title: "Business",
    description: "Master entrepreneurship, strategy, and leadership skills.",
    icon: "Briefcase",
    color: "var(--accent-emerald)",
    stages: [
      {
        id: "biz-mindset",
        title: "Entrepreneurial Mindset",
        description: "Develop the thinking patterns of successful entrepreneurs.",
        sessions: [
          {
            id: "biz-1-1",
            title: "The Entrepreneurial Mindset",
            description: "Learn what sets successful founders apart.",
            videoUrl: "https://www.youtube.com/embed/Ihs4VFZWwn4",
            task: "Write down 3 problems you see daily that could be business opportunities.",
            duration: "~8 min",
          },
          {
            id: "biz-1-2",
            title: "Finding Your Niche",
            description: "Discover where your skills meet market demand.",
            videoUrl: "https://www.youtube.com/embed/sYMqVwsewSg",
            task: "List your top 5 skills and match them to potential markets.",
            duration: "~6 min",
          },
          {
            id: "biz-1-3",
            title: "Value Proposition Design",
            description: "Learn to articulate why customers should choose you.",
            videoUrl: "https://www.youtube.com/embed/ReM1uqmVfP0",
            task: "Write a one-sentence value proposition for a product idea.",
            duration: "~7 min",
          },
        ],
      },
      {
        id: "biz-strategy",
        title: "Business Strategy",
        description: "Learn frameworks for building sustainable businesses.",
        sessions: [
          {
            id: "biz-2-1",
            title: "Business Model Canvas",
            description: "A visual tool for mapping your business.",
            videoUrl: "https://www.youtube.com/embed/QoAOzMTLP5s",
            task: "Sketch a simple business model canvas for a coffee shop.",
            duration: "~7 min",
          },
          {
            id: "biz-2-2",
            title: "Understanding Your Market",
            description: "Research and analyze your target audience.",
            videoUrl: "https://www.youtube.com/embed/XlNsrCkGkVA",
            task: "Define a target customer persona with age, goals, and pain points.",
            duration: "~6 min",
          },
          {
            id: "biz-2-3",
            title: "Revenue Models",
            description: "Explore different ways businesses make money.",
            videoUrl: "https://www.youtube.com/embed/vMqCGr9GFd8",
            task: "Name 3 different revenue models and an example company for each.",
            duration: "~8 min",
          },
        ],
      },
      {
        id: "biz-leadership",
        title: "Leadership",
        description: "Build skills to lead teams and projects effectively.",
        sessions: [
          {
            id: "biz-3-1",
            title: "Leadership Fundamentals",
            description: "Core principles every leader needs.",
            videoUrl: "https://www.youtube.com/embed/pYKH2uSax8U",
            task: "Describe a leader you admire and list 3 qualities they demonstrate.",
            duration: "~7 min",
          },
          {
            id: "biz-3-2",
            title: "Communication Skills",
            description: "Master the art of clear, persuasive communication.",
            videoUrl: "https://www.youtube.com/embed/HAnw168huqA",
            task: "Practice explaining a complex idea in under 30 seconds.",
            duration: "~6 min",
          },
          {
            id: "biz-3-3",
            title: "Building Your Network",
            description: "Learn the power of meaningful professional connections.",
            videoUrl: "https://www.youtube.com/embed/2aKNp9oZv4Q",
            task: "Identify 3 people in your field you'd like to connect with and why.",
            duration: "~5 min",
          },
        ],
      },
    ],
  },
  {
    id: "data",
    title: "Data",
    description: "Learn to collect, analyze, and derive insights from data.",
    icon: "BarChart3",
    color: "var(--accent-purple)",
    stages: [
      {
        id: "data-intro",
        title: "Data Fundamentals",
        description: "Understand the basics of data and why it matters.",
        sessions: [
          {
            id: "data-1-1",
            title: "What is Data Science?",
            description: "An introduction to the world of data.",
            videoUrl: "https://www.youtube.com/embed/X3paOmcrTjQ",
            task: "Name 3 industries where data science is making a major impact.",
            duration: "~6 min",
          },
          {
            id: "data-1-2",
            title: "Types of Data",
            description: "Learn the difference between structured and unstructured data.",
            videoUrl: "https://www.youtube.com/embed/Hh3dGk3_2MQ",
            task: "Find 3 examples of structured data and 3 of unstructured data in your daily life.",
            duration: "~5 min",
          },
          {
            id: "data-1-3",
            title: "Introduction to Statistics",
            description: "Basic statistical concepts every data person needs.",
            videoUrl: "https://www.youtube.com/embed/xxpc-HPKN28",
            task: "Calculate the average of these numbers: 12, 18, 22, 30, 8.",
            duration: "~7 min",
          },
        ],
      },
      {
        id: "data-tools",
        title: "Data Tools",
        description: "Get hands-on with essential data tools.",
        sessions: [
          {
            id: "data-2-1",
            title: "Spreadsheets for Data",
            description: "Master spreadsheets as your first data tool.",
            videoUrl: "https://www.youtube.com/embed/rwbho0CgEAE",
            task: "Create a simple spreadsheet tracking your weekly expenses.",
            duration: "~8 min",
          },
          {
            id: "data-2-2",
            title: "Introduction to SQL",
            description: "Learn to query databases with SQL.",
            videoUrl: "https://www.youtube.com/embed/27axs9dO7AE",
            task: "Write a simple SELECT query to get all customers from a 'customers' table.",
            duration: "~7 min",
          },
          {
            id: "data-2-3",
            title: "Data Visualization Basics",
            description: "Turn numbers into clear, compelling visuals.",
            videoUrl: "https://www.youtube.com/embed/5Zg-C8AAIGg",
            task: "Choose 3 chart types and explain when each is most effective.",
            duration: "~6 min",
          },
        ],
      },
      {
        id: "data-career",
        title: "Data Career",
        description: "Navigate your career path in data.",
        sessions: [
          {
            id: "data-3-1",
            title: "Data Career Paths",
            description: "Explore roles like analyst, engineer, and scientist.",
            videoUrl: "https://www.youtube.com/embed/uE2Hwks8fgA",
            task: "Compare 2 data roles: list required skills and typical responsibilities.",
            duration: "~7 min",
          },
          {
            id: "data-3-2",
            title: "Building a Data Portfolio",
            description: "Showcase your data skills effectively.",
            videoUrl: "https://www.youtube.com/embed/CGlfiwts2S8",
            task: "Brainstorm 3 data project ideas using publicly available datasets.",
            duration: "~6 min",
          },
          {
            id: "data-3-3",
            title: "The Data-Driven Mindset",
            description: "Think like a data professional in everything you do.",
            videoUrl: "https://www.youtube.com/embed/EFiyzVlMxkI",
            task: "Identify a decision you made today and describe what data could improve it.",
            duration: "~5 min",
          },
        ],
      },
    ],
  },
];

export function getPath(pathId: string): LearningPath | undefined {
  return paths.find((p) => p.id === pathId);
}

export function getSession(pathId: string, sessionId: string): { path: LearningPath; stage: Stage; session: Session; sessionIndex: number; totalSessions: number } | undefined {
  const path = getPath(pathId);
  if (!path) return undefined;
  
  let globalIndex = 0;
  let totalSessions = 0;
  
  // Count total sessions
  for (const stage of path.stages) {
    totalSessions += stage.sessions.length;
  }
  
  for (const stage of path.stages) {
    for (const session of stage.sessions) {
      globalIndex++;
      if (session.id === sessionId) {
        return { path, stage, session, sessionIndex: globalIndex, totalSessions };
      }
    }
  }
  return undefined;
}

export function getNextSession(pathId: string, currentSessionId: string): Session | undefined {
  const path = getPath(pathId);
  if (!path) return undefined;
  
  const allSessions = path.stages.flatMap((s) => s.sessions);
  const currentIndex = allSessions.findIndex((s) => s.id === currentSessionId);
  if (currentIndex === -1 || currentIndex >= allSessions.length - 1) return undefined;
  return allSessions[currentIndex + 1];
}
