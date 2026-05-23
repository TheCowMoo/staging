import AppLayout from "@/components/AppLayout";
import { BookOpen, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface GlossaryEntry {
  acronym: string;
  fullName: string;
  definition: string;
  category: string;
  url?: string;
}

const GLOSSARY: GlossaryEntry[] = [
  // ── Safety & Emergency Standards ──────────────────────────────────────────
  {
    acronym: "OSHA",
    fullName: "Occupational Safety and Health Administration",
    definition:
      "A U.S. federal agency under the Department of Labor that sets and enforces workplace safety and health standards. OSHA's General Duty Clause (Section 5(a)(1)) requires employers to provide a workplace free from recognized hazards. OSHA 3148 provides specific guidance on workplace violence prevention programs.",
    category: "Regulatory",
    url: "https://www.osha.gov",
  },
  {
    acronym: "NFPA 3000",
    fullName: "National Fire Protection Association Standard 3000",
    definition:
      "The NFPA 3000 Standard for an Active Shooter / Hostile Event Response (ASHER) Program provides a framework for organizations to plan, train, and respond to active shooter and hostile events. It covers program management, response procedures, training, and recovery.",
    category: "Standards",
    url: "https://www.nfpa.org/codes-and-standards/nfpa-3000",
  },
  {
    acronym: "NIMS",
    fullName: "National Incident Management System",
    definition:
      "A comprehensive, nationwide approach developed by FEMA that provides a common framework for managing incidents of all sizes and types. NIMS establishes standardized terminology, organizational structures, and operational procedures to enable effective coordination between agencies and organizations during emergencies.",
    category: "Emergency Management",
    url: "https://www.fema.gov/emergency-managers/nims",
  },
  {
    acronym: "ICS",
    fullName: "Incident Command System",
    definition:
      "A standardized, on-scene, all-hazards incident management approach that allows for the integration of facilities, equipment, personnel, procedures, and communications. ICS is a component of NIMS and establishes a clear chain of command with defined roles including Incident Commander, Operations Section Chief, and others.",
    category: "Emergency Management",
    url: "https://www.fema.gov/emergency-managers/nims/incident-command-system",
  },
  {
    acronym: "EAP",
    fullName: "Emergency Action Plan",
    definition:
      "A written document required by OSHA (29 CFR 1910.38) that describes the actions employees should take to ensure their safety during fire and other emergencies. In the context of workplace violence, an EAP outlines response procedures, evacuation routes, shelter-in-place protocols, communication systems, and assigned roles for emergency coordinators.",
    category: "Emergency Management",
  },
  {
    acronym: "ACTD",
    fullName: "Assess, Commit, Take Action, Debrief",
    definition:
      "The ACTD framework is the platform's preferred active threat response protocol. It replaces older Active Threat Response Training terminology with a structured decision-making model: (1) Assess the situation and your options; (2) Commit to a course of action; (3) Take Action decisively; (4) Debrief after the event to identify lessons learned and improve future response.",
    category: "Response Protocols",
  },
  {
    acronym: "CISA",
    fullName: "Cybersecurity and Infrastructure Security Agency",
    definition:
      "A U.S. federal agency responsible for protecting the nation's critical infrastructure from physical and cyber threats. CISA provides resources, training, and guidance on workplace violence prevention, active shooter preparedness, and physical security assessments.",
    category: "Regulatory",
    url: "https://www.cisa.gov",
  },
  {
    acronym: "CPTED",
    fullName: "Crime Prevention Through Environmental Design",
    definition:
      "A multi-disciplinary approach to deterring criminal behavior through environmental design. CPTED principles include natural surveillance (designing spaces to maximize visibility), natural access control (guiding people through a space), territorial reinforcement (defining ownership and boundaries), and maintenance (keeping spaces well-maintained to deter criminal activity).",
    category: "Physical Security",
  },
  {
    acronym: "FEMA",
    fullName: "Federal Emergency Management Agency",
    definition:
      "A U.S. federal agency under the Department of Homeland Security that coordinates the federal government's role in preparing for, preventing, mitigating, responding to, and recovering from domestic disasters. FEMA developed and maintains NIMS and ICS.",
    category: "Emergency Management",
    url: "https://www.fema.gov",
  },
  {
    acronym: "AED",
    fullName: "Automated External Defibrillator",
    definition:
      "A portable medical device that analyzes heart rhythm and delivers an electric shock to restore normal rhythm in cases of sudden cardiac arrest. OSHA and NFPA recommend that AEDs be accessible in workplaces and that staff be trained in their use.",
    category: "Medical",
  },
  {
    acronym: "SHRM",
    fullName: "Society for Human Resource Management",
    definition:
      "The world's largest HR professional society, providing resources, research, and best practice guidance on workplace issues including domestic violence preparedness, workplace violence prevention policies, and employee safety programs.",
    category: "Professional Standards",
    url: "https://www.shrm.org",
  },
  {
    acronym: "OSHA 300",
    fullName: "OSHA Form 300 — Log of Work-Related Injuries and Illnesses",
    definition:
      "A mandatory recordkeeping form required by OSHA (29 CFR 1904) for employers with more than 10 employees. It documents all work-related injuries and illnesses that result in days away from work, restricted work, transfer to another job, medical treatment beyond first aid, loss of consciousness, or diagnosis of a significant injury or illness.",
    category: "Regulatory",
    url: "https://www.osha.gov/recordkeeping",
  },
  {
    acronym: "CFR",
    fullName: "Code of Federal Regulations",
    definition:
      "The codification of general and permanent rules published in the Federal Register by U.S. federal agencies. OSHA regulations are found in Title 29 CFR. Key workplace safety regulations include 29 CFR 1910 (General Industry) and 29 CFR 1904 (Recordkeeping).",
    category: "Regulatory",
  },
  {
    acronym: "NFPA",
    fullName: "National Fire Protection Association",
    definition:
      "A global nonprofit organization that develops and publishes fire, electrical, and life safety codes and standards. In addition to NFPA 3000, other relevant standards include NFPA 101 (Life Safety Code) for egress and evacuation requirements.",
    category: "Standards",
    url: "https://www.nfpa.org",
  },
  {
    acronym: "TAR",
    fullName: "Threat Assessment Report",
    definition:
      "A formal document produced by Five Stones Technology following a facility safety audit. The TAR summarizes risk findings across multiple assessment categories, assigns risk levels (Low through Critical), identifies corrective actions, and includes an Emergency Action Plan tailored to the specific facility.",
    category: "Platform",
  },
  {
    acronym: "ASHER",
    fullName: "Active Shooter / Hostile Event Response",
    definition:
      "The category of emergency response addressed by NFPA 3000. ASHER programs encompass planning, training, and operational procedures for responding to active shooter incidents and other hostile events in the workplace.",
    category: "Response Protocols",
  },
  {
    acronym: "SRO",
    fullName: "School Resource Officer",
    definition:
      "A law enforcement officer assigned to work in a school setting. SROs serve as a liaison between the school and law enforcement agencies and may be involved in emergency planning and active threat response.",
    category: "Physical Security",
  },
  {
    acronym: "HVAC",
    fullName: "Heating, Ventilation, and Air Conditioning",
    definition:
      "Building mechanical systems that control temperature, humidity, and air quality. In security assessments, HVAC access points are evaluated as potential entry vectors and for the risk of chemical or biological agent introduction.",
    category: "Physical Security",
  },
  {
    acronym: "CCTV",
    fullName: "Closed-Circuit Television",
    definition:
      "A video surveillance system in which cameras transmit signals to a specific set of monitors. CCTV is a key component of physical security assessments, evaluated for coverage, recording capability, and monitoring protocols.",
    category: "Physical Security",
  },
  // -- Canadian Standards & Regulatory Terms --
  {
    acronym: "CLC",
    fullName: "Canada Labour Code, Part II",
    definition:
      "Federal legislation governing occupational health and safety for federally regulated workplaces in Canada. Part II of the CLC requires employers to prevent workplace hazards, including violence. Employers must develop and implement a workplace violence prevention policy and program under CLC s. 125(1)(z.16).",
    category: "Canadian Standards",
    url: "https://laws-lois.justice.gc.ca/eng/acts/L-2/",
  },
  {
    acronym: "CSA Z1002",
    fullName: "CSA Standard Z1002 - Workplace Violence Prevention",
    definition:
      "A Canadian national standard developed by the Canadian Standards Association (CSA Group) that provides a framework for identifying, assessing, and controlling workplace violence hazards. CSA Z1002 applies to all Canadian workplaces and aligns with provincial OHS legislation. It covers risk assessment, prevention programs, incident response, and post-incident support.",
    category: "Canadian Standards",
    url: "https://www.csagroup.org/",
  },
  {
    acronym: "OHSA (ON)",
    fullName: "Ontario Occupational Health and Safety Act - Bill 168 Amendments",
    definition:
      "Ontario's Bill 168 (2010) amended the OHSA to require Ontario employers to develop a workplace violence and harassment policy, conduct risk assessments, implement prevention programs, and provide worker training. Employers must also have measures in place to protect workers from domestic violence that may carry over into the workplace.",
    category: "Canadian Standards",
    url: "https://www.ontario.ca/laws/statute/90o01",
  },
  {
    acronym: "WorkSafeBC",
    fullName: "Workers' Compensation Board of British Columbia - Violence Prevention Regulations",
    definition:
      "British Columbia's OHS Regulation (Part 4.27) requires employers to identify the risk of workplace violence, implement procedures to prevent or minimize that risk, and inform workers of the nature and extent of the risk. WorkSafeBC enforces these requirements and provides inspection and enforcement authority.",
    category: "Canadian Standards",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-04-general-conditions",
  },
  {
    acronym: "CCOHS",
    fullName: "Canadian Centre for Occupational Health and Safety",
    definition:
      "A federal Crown corporation that provides occupational health and safety information and resources to Canadian employers and workers. CCOHS publishes guidance on workplace violence prevention, harassment, and psychological safety. It is a key reference for Canadian employers building compliant safety programs.",
    category: "Canadian Standards",
    url: "https://www.ccohs.ca/oshanswers/psychosocial/violence.html",
  },
  {
    acronym: "Bill C-65",
    fullName: "An Act to amend the Canada Labour Code (Harassment and Violence)",
    definition:
      "Federal Canadian legislation (2018) that amended the Canada Labour Code to strengthen protections against harassment and violence in federally regulated workplaces. Bill C-65 requires employers to conduct risk assessments, develop prevention plans, provide training, and establish response procedures. It covers all forms of harassment and violence, including domestic violence that enters the workplace.",
    category: "Canadian Standards",
    url: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-2020-130/index.html",
  },
  {
    acronym: "OHS (AB)",
    fullName: "Alberta Occupational Health and Safety Act - Violence Prevention",
    definition:
      "Alberta's OHS Act requires employers to assess the risk of violence in the workplace and develop a violence prevention plan if a risk is identified. The plan must include procedures for reporting incidents, investigating complaints, and protecting workers. Alberta OHS also requires employers to inform workers of the nature and extent of violence risk.",
    category: "Canadian Standards",
    url: "https://www.alberta.ca/occupational-health-safety-act",
  },
  {
    acronym: "AAR",
    fullName: "After Action Review",
    definition:
      "A structured debrief process conducted after an emergency event, drill, or exercise to evaluate what happened, why it happened, and how it can be improved. An AAR identifies strengths, gaps, and corrective actions to improve future response. Best practice is to conduct an AAR within 24\u201372 hours of the event while details are fresh. The AAR process is a core component of the ACTD framework\u2019s \u2018Debrief\u2019 phase and is required by NFPA 3000 and FEMA exercise guidance.",
    category: "Emergency Management",
  },
  {
    acronym: "BCP",
    fullName: "Business Continuity Plan",
    definition:
      "A documented plan that outlines how an organization will continue operating during and after an unplanned disruption or emergency. A BCP identifies critical business functions, defines recovery time objectives (RTOs), establishes alternate operating procedures, and assigns recovery responsibilities. BCPs complement Emergency Action Plans by addressing operational continuity beyond the immediate life-safety response \u2014 including IT recovery, supply chain continuity, and communication with stakeholders. ISO 22301 is the international standard for business continuity management systems.",
    category: "Emergency Management",
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(GLOSSARY.map((e) => e.category))).sort()];

export default function Glossary() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = GLOSSARY.filter((entry) => {
    const matchesSearch =
      !search ||
      entry.acronym.toLowerCase().includes(search.toLowerCase()) ||
      entry.fullName.toLowerCase().includes(search.toLowerCase()) ||
      entry.definition.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || entry.category === activeCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.acronym.localeCompare(b.acronym));

  const categoryColors: Record<string, string> = {
    "Regulatory": "bg-red-100 text-red-700 border-red-200",
    "Standards": "bg-blue-100 text-blue-700 border-blue-200",
    "Emergency Management": "bg-amber-100 text-amber-700 border-amber-200",
    "Physical Security": "bg-purple-100 text-purple-700 border-purple-200",
    "Response Protocols": "bg-green-100 text-green-700 border-green-200",
    "Medical": "bg-pink-100 text-pink-700 border-pink-200",
    "Professional Standards": "bg-slate-100 text-slate-700 border-slate-200",
    "Platform": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Canadian Standards": "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Acronym Glossary</h1>
            <p className="text-sm text-muted-foreground">
              Definitions for regulatory, standards, and emergency management terms used throughout this platform.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <Input
            placeholder="Search acronyms, full names, or definitions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          Showing {filtered.length} of {GLOSSARY.length} entries
        </p>

        {/* Glossary Entries */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No entries match your search.</p>
            </div>
          ) : (
            filtered.map((entry) => (
              <div key={entry.acronym} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-bold text-foreground">{entry.acronym}</span>
                    <span className="text-sm text-muted-foreground">{entry.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${categoryColors[entry.category] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {entry.category}
                    </span>
                    {entry.url && (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Official resource"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{entry.definition}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
