import type { PortfolioData } from "@/engine/schema";

/** Fictional demo people used for the landing page and template gallery thumbnails. */
export const SAMPLES: Record<string, { data: PortfolioData; url: string }> = {
  minimal: {
    url: "ananya.portfoliohub.site",
    data: {
      personal: {
        fullName: "Ananya Rao",
        headline: "Product designer turning messy workflows into calm tools",
        about: "I design B2B software for teams that live in spreadsheets. Six years across fintech and logistics; currently leading design for a warehouse platform.",
        email: "ananya@example.com",
        location: "Pune, India",
        linkedinUrl: "https://linkedin.com/in/example",
        socials: [{ label: "Dribbble", url: "https://dribbble.com/example" }],
      },
      experience: [
        { organization: "Shipwise", title: "Lead Product Designer", startDate: "2023-02", responsibilities: ["Own the design system and the dispatch console", "Run research with 40+ warehouse operators"], skills: ["Figma", "Research"] },
        { organization: "Paybook", title: "Product Designer", startDate: "2020-06", endDate: "2023-01", achievements: ["Redesigned invoicing; support tickets down 35%"] },
      ],
      projects: [
        { name: "Dispatch Console", summary: "Real-time view of 1,200 daily shipments", category: "Case study", technologies: ["Figma", "Design system"], liveUrl: "https://example.com" },
        { name: "Invoice Flow", summary: "From 9 steps to 3", category: "Case study" },
      ],
      skills: [
        { category: "Design", items: ["Interaction design", "Design systems", "Prototyping"] },
        { category: "Tools", items: ["Figma", "Framer", "Notion"] },
      ],
      education: [{ institution: "National Institute of Design", degree: "M.Des", major: "Interaction Design", startYear: 2017, endYear: 2019 }],
    },
  },
  developer: {
    url: "kabir.portfoliohub.site",
    data: {
      personal: {
        fullName: "Kabir Singh",
        headline: "Backend engineer · distributed systems · Go & Rust",
        about: "I like systems that stay up. Built a payments ledger that processes 2M events a day and an open-source rate limiter with 3k stars.",
        email: "kabir@example.com",
        location: "Delhi, India",
        githubUrl: "https://github.com/example",
        linkedinUrl: "https://linkedin.com/in/example",
      },
      projects: [
        { name: "Throttle", summary: "Distributed rate limiter for Go services", technologies: ["Go", "Redis", "gRPC"], repoUrl: "https://github.com/example/throttle", liveUrl: "https://example.com", category: "Open source" },
        { name: "Ledger Core", summary: "Double-entry ledger at 2M events/day", technologies: ["Rust", "Postgres", "Kafka"], repoUrl: "https://github.com/example/ledger", category: "Systems" },
      ],
      experience: [{ organization: "Fintrail", title: "Software Engineer II", startDate: "2022-08", responsibilities: ["Own the settlement pipeline", "On-call lead for payments"], skills: ["Go", "Kafka", "AWS"] }],
      skills: [
        { category: "Languages", items: ["Go", "Rust", "TypeScript", "SQL"] },
        { category: "Infra", items: ["Kubernetes", "Kafka", "Postgres", "Redis"] },
      ],
    },
  },
  editorial: {
    url: "meera.portfoliohub.site",
    data: {
      personal: {
        fullName: "Meera Iyer",
        headline: "Writer and researcher on cities, climate and how we live",
        about: "I report on urban infrastructure and the people who keep it running. My work has appeared in national newspapers and two edited volumes.\n\nCurrently a research fellow studying heat resilience in South Asian cities.",
        email: "meera@example.com",
        location: "Chennai, India",
      },
      projects: [
        { name: "The Heat Map", summary: "A year inside India's hottest neighbourhoods", category: "Long-form series", description: "Twelve stories, one block at a time." },
        { name: "Water Lines", summary: "Who gets water, and when", category: "Investigation" },
      ],
      publications: [
        { title: "Cooling the informal city", subtitle: "Urban Studies Review", date: "2025-04" },
        { title: "After the flood", subtitle: "Edited volume, chapter 4", date: "2024-01" },
      ],
      testimonials: [{ quote: "Meera writes about infrastructure the way others write about people.", author: "Editor", role: "Weekend magazine" }],
      education: [{ institution: "Jawaharlal Nehru University", degree: "MA", major: "Urban Geography", endYear: 2019 }],
    },
  },
};
