import type { Workflow, DailyContext } from "./types";

export const DEMO_NOTES = `Tech: Marcus Webb — HVAC senior, commercial cert
Tech: Priya Okonkwo — HVAC, electrical, refrigeration
Tech: Danny Ruiz — HVAC junior

Job: Rivera Residence @ 2204 Elm St — AC not blowing cold at all, been down since last night (urgent)
Job: Thornfield Office Park — rooftop RTU unit 3 tripping breaker, tenants complaining (commercial, urgent)
Job: Chen Family — annual tune-up, central AC (normal, scheduled 2pm)
Job: Martinez — Mini-split install, 2-zone (high priority, customer paid in full)
Job: Goldberg Apt 4B — thermostat replacement, won't hold temp (normal)`;

export const DEMO_RULES = `If job is urgent, assign senior tech first
Commercial jobs require commercial certification
Don't assign more than 3 jobs per tech
If worker is en route, prefer other available techs`;

export const DEMO_CONTEXT: DailyContext = {
  typedText: `Morning update — rough night. Rivera called at 6am, AC completely dead, baby in the house. Thornfield is also blowing up, tenants on third floor are baking. Marcus and Priya should handle the urgent calls first. Danny can start with the Chen tune-up since it's scheduled for 2pm and is low-stress. Martinez paid upfront so we need to make that happen today.`,
  transcribedText: "",
  imageExtractedText: "",
  rulesText: DEMO_RULES,
  mergedText: `Morning update — rough night. Rivera called at 6am, AC completely dead, baby in the house. Thornfield is also blowing up, tenants on third floor are baking. Marcus and Priya should handle the urgent calls first. Danny can start with the Chen tune-up since it's scheduled for 2pm and is low-stress. Martinez paid upfront so we need to make that happen today.`,
};

export const DEMO_WORKFLOW: Workflow = {
  workers: [
    {
      id: "w1",
      name: "Marcus Webb",
      skills: ["hvac", "commercial", "senior"],
      status: "available",
    },
    {
      id: "w2",
      name: "Priya Okonkwo",
      skills: ["hvac", "electrical", "refrigeration"],
      status: "available",
    },
    {
      id: "w3",
      name: "Danny Ruiz",
      skills: ["hvac"],
      status: "available",
    },
  ],
  jobs: [
    {
      id: "j1",
      customerName: "Rivera Residence",
      problem: "AC completely dead — no cold air, family with infant at home, urgent same-day fix needed",
      priority: "urgent",
      requiredSkills: ["hvac", "refrigeration"],
      address: "2204 Elm St",
      estimatedMinutes: 90,
      status: "unassigned",
    },
    {
      id: "j2",
      customerName: "Thornfield Office Park",
      problem: "Rooftop RTU unit 3 tripping breaker — commercial building, tenants on upper floors without AC",
      priority: "urgent",
      requiredSkills: ["hvac", "commercial", "electrical"],
      address: "500 Commerce Blvd",
      estimatedMinutes: 120,
      status: "unassigned",
    },
    {
      id: "j3",
      customerName: "Chen Family",
      problem: "Annual AC tune-up — central system, scheduled for 2pm, preventive maintenance",
      priority: "normal",
      requiredSkills: ["hvac"],
      address: "88 Maple Ave",
      estimatedMinutes: 60,
      status: "unassigned",
    },
    {
      id: "j4",
      customerName: "Martinez",
      problem: "Mini-split install, 2-zone system — customer paid in full, needs completion today",
      priority: "high",
      requiredSkills: ["hvac", "electrical"],
      address: "317 Park Lane",
      estimatedMinutes: 180,
      status: "unassigned",
    },
    {
      id: "j5",
      customerName: "Goldberg Apt 4B",
      problem: "Thermostat replacement — unit won't hold temperature set point, intermittent issue",
      priority: "normal",
      requiredSkills: ["hvac", "electrical"],
      address: "1402 Broadway",
      estimatedMinutes: 45,
      status: "unassigned",
    },
  ],
  rules: [
    {
      id: "rule1",
      condition: "If job is urgent",
      action: "Assign senior tech first",
    },
    {
      id: "rule2",
      condition: "Commercial jobs",
      action: "Require commercial certification",
    },
    {
      id: "rule3",
      condition: "Technician workload",
      action: "Don't assign more than 3 jobs per tech",
    },
    {
      id: "rule4",
      condition: "If worker is en route",
      action: "Prefer other available techs",
    },
  ],
};
