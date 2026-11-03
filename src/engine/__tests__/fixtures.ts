import type { PortfolioData } from "../schema";

export const full: PortfolioData = {
  personal: {
    fullName: "Maya Krishnan",
    headline: "Full-stack engineer building calm, fast web apps",
    about: "I build products end to end, from Postgres schemas to pixel-level UI.\n\nPreviously shipped payments tooling used by 40k merchants.",
    email: "maya@example.com",
    phone: "+91 98765 43210",
    location: "Bengaluru, India",
    linkedinUrl: "linkedin.com/in/maya-example",
    githubUrl: "https://github.com/maya-example",
    socials: [{ label: "Blog", url: "https://maya.example.com" }],
    avatar: { src: "https://cdn.example.com/a.webp", width: 400, height: 400 },
    resumeUrl: "https://cdn.example.com/resume.pdf",
  },
  education: [
    { institution: "National Institute of Technology", degree: "B.Tech", major: "Computer Science", startYear: 2018, endYear: 2022, grade: "8.9 CGPA", coursework: ["Distributed Systems", "Compilers"], achievements: ["Dean's list"] },
  ],
  skills: [
    { category: "Languages", items: ["TypeScript", "Go", "SQL", "typescript"] },
    { category: "Frameworks", items: ["Next.js", "React"] },
  ],
  projects: [
    { name: "Ledgerly", summary: "Double-entry bookkeeping for small shops", description: "Built the ledger engine and reconciliation UI.", technologies: ["Next.js", "Postgres"], features: ["Bank sync", "GST reports"], contributions: "Lead engineer", category: "SaaS", repoUrl: "github.com/maya/ledgerly", liveUrl: "https://ledgerly.example.com", image: { src: "https://cdn.example.com/p1.webp" }, screenshots: [{ src: "https://cdn.example.com/s1.webp" }] },
    { name: "Tiny CLI", summary: "A command-line tool with no live link", technologies: ["Go"], repoUrl: "https://github.com/maya/tiny" },
  ],
  experience: [
    { organization: "Acme Payments", title: "Software Engineer", employmentType: "Full-time", startDate: "2022-07", endDate: "", responsibilities: ["Owned merchant onboarding"], achievements: ["Cut onboarding time by 60%"], skills: ["Go", "Kafka"] },
    { organization: "Startup Labs", title: "Intern", startDate: "2021-05", endDate: "2021-08" },
  ],
  certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon", issuedOn: "2023-03", credentialUrl: "https://aws.example.com/verify/1" }],
  awards: [{ title: "Smart India Hackathon winner", subtitle: "Government of India", date: "2021-08" }],
  publications: [{ title: "Fast reconciliation at scale", subtitle: "Engineering blog", url: "https://blog.example.com/post" }],
  positions: [{ title: "Tech Lead, Coding Club", subtitle: "NIT", description: "Ran weekly workshops" }],
  extracurriculars: [{ title: "College football team" }],
  volunteering: [{ title: "Teaching kids to code", subtitle: "Code Club" }],
  hobbies: ["Bouldering", "Film photography"],
  testimonials: [{ quote: "Maya ships faster than anyone I've worked with.", author: "R. Sharma", role: "CTO, Acme" }],
};

export const nameOnly: PortfolioData = { personal: { fullName: "Aarav Mehta" } };

export const noPhoto: PortfolioData = { ...full, personal: { ...full.personal, avatar: null } };

export const oneProject: PortfolioData = {
  personal: { fullName: "Riya Sen", headline: "Designer" },
  projects: [{ name: "Only Project", summary: "Just one" }],
};

export const manyProjects: PortfolioData = {
  personal: { fullName: "Dev Patel" },
  projects: Array.from({ length: 30 }, (_, i) => ({ name: `Project ${i + 1}`, summary: `Summary ${i + 1}`, technologies: ["Rust"] })),
};

export const longText: PortfolioData = {
  personal: { fullName: "Kavya Ramachandran Iyer Venkataraman", headline: "x".repeat(150), about: "Lorem ipsum ".repeat(300) },
  projects: [{ name: "A".repeat(110), description: "word ".repeat(900) }],
};

export const noLinks: PortfolioData = {
  personal: { fullName: "Neha Gupta", about: "No links at all." },
  projects: [{ name: "Offline thing", summary: "No repo, no live link" }],
};

export const unicode: PortfolioData = {
  personal: { fullName: "José Müller-Øster 李明 محمد", headline: "Ingénieur · 工程师 · مهندس", location: "São Paulo" },
  skills: [{ category: "Idiomas", items: ["Español", "中文", "العربية"] }],
};

/** Everything a malicious or careless user might type. */
export const hostile: PortfolioData = {
  personal: {
    fullName: '<script>alert("x")</script>Eve',
    headline: '"><img src=x onerror=alert(1)>',
    about: "</style><script>alert(2)</script>",
    email: "not-an-email",
    linkedinUrl: "javascript:alert(3)",
    githubUrl: "   ",
    socials: [{ label: "Bad", url: "data:text/html,<script>alert(4)</script>" }, { label: "", url: "https://ok.example.com" }],
    avatar: { src: "javascript:alert(5)" },
  },
  projects: [{ name: "   " }, { name: "Real", liveUrl: "vbscript:msgbox", repoUrl: "ht tp://bad url" }],
  experience: [{ organization: "", title: "Ghost" }],
  education: [{ institution: "   " }],
  skills: [{ category: "Empty", items: ["", "  "] }],
  hobbies: ["", "  "],
};

export const FIXTURES = { full, nameOnly, noPhoto, oneProject, manyProjects, longText, noLinks, unicode } as const;
