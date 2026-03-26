# **Validation Analysis of Board2Dispatch: A Vibe-Coding Solution for Field Service Operations**

## **Executive Summary**

The transition from analog to digital operations within the small-to-medium business field service sector has historically been hindered by a profound misalignment between software architecture and the cognitive models of domain experts. Board2Dispatch emerges as a highly targeted, artificial intelligence-assisted dispatch operating system designed specifically to bridge this divide. Developed as a comprehensive proposal for the "Close the Gap" challenge hosted by the Codefi Vibeathon, Board2Dispatch translates unstructured, messy real-world inputs—such as text messages, rushed phone notes, and tribal knowledge—into an explainable, optimized, same-day dispatch plan in a matter of minutes.

This analytical document validates the architectural, economic, and psychological foundations of the Board2Dispatch platform. The analysis indicates that the platform addresses a critical market vulnerability, colloquially termed the "Telephone-Game Gap," wherein the operational truth known to frontline coordinators is severely distorted when forced into rigid, traditional software interfaces. By employing natural language processing, transparent algorithmic reasoning, and dynamic scenario simulation, Board2Dispatch empowers the "Stacey" persona. This persona represents a deeply experienced, operationally urgent office manager or dispatcher who possesses low technical confidence and zero appetite for software complexity.

Rather than demanding that non-technical users adapt to engineering-centric workflows and complex database management, Board2Dispatch adapts to the natural conversational patterns of the user. The platform essentially asks operators to describe their day in natural language, subsequently providing a proposed plan, plain-language justifications for its scheduling decisions, scenario simulations for sudden disruptions, and manual override controls at every critical juncture. This report situates Board2Dispatch within the broader competitive landscape, demonstrating how it navigates the chasm between overly simplistic scheduling applications and excessively complex, enterprise-grade field service management software. Through an exhaustive examination of operational challenges, technological paradigms, and human-centered design principles, this analysis confirms that Board2Dispatch not only fulfills the criteria of the "Close the Gap" challenge but also represents a scalable, highly commercializable approach to modernizing blue-collar service operations.

## **The Problem Addressed: The Telephone-Game Gap**

To understand the necessity of a solution like Board2Dispatch, one must first examine the systemic inefficiencies characterizing the target market. Dispatching in the small-to-medium service sector is rarely a linear or predictable process. It is characterized by high-frequency interruptions, emergency escalations, shifting technician availability, and complex spatial dependencies. Despite the availability of digital tools, a significant portion of the industry continues to rely on analog methods—such as whiteboards, sticky notes, and localized tribal knowledge—to manage this inherent chaos.1

Analog systems provide a superficial sense of control but critically fail to provide a shared, real-time overview of the production status.1 The "Telephone-Game Gap" refers to the sequential degradation of information as it passes from the customer to the dispatcher, and finally to the field technician. Field technicians frequently experience the downstream ripple effects of this gap, which manifest as incomplete work order details, missing service histories, and last-minute schedule changes lacking contextual explanation.3 When dispatch operations are managed via disparate notes and manual entry, every handoff introduces a layer of distortion.4 Traditional software attempts to solve this by forcing the dispatcher to input data into highly structured, rigid fields. However, this introduces a secondary bottleneck: the translation of nuanced, situational reality into binary software toggles. If a technician is delayed because of a missing part, the dispatcher must navigate multiple software screens to update statuses, notify the customer, and re-route the next technician. If the software interface is too burdensome, the dispatcher will abandon it in favor of the whiteboard, rendering the digital system obsolete.3

The financial consequences of manual and inefficient dispatching are severe and quantifiable. Research indicates that heating, ventilation, and air conditioning businesses lose between $500 and $1,000 per week solely due to poor dispatching practices, an issue stemming not from a lack of demand or technician skill, but from disorganized routing and scheduling.2 When dispatching is not dynamically optimized, technicians spend an inordinate amount of time on non-revenue-generating tasks. Data shows that field technicians lose up to 25% of their workday to administrative burdens, traffic delays, and the process of driving between multiple wholesalers to locate components.5

| Metric | Impact per Technician | Impact for a 15-Person Team |
| :---- | :---- | :---- |
| Non-Revenue Time | 3.2 hours per week | 48 hours per week |
| Hourly Billing Rate | $150 (Average) | N/A |
| Lost Revenue per Week | $1,425 | $21,375 |
| **Annualized Lost Revenue** | **$74,100** | **$1,111,500** |

This substantial annual loss for a mid-sized operation highlights the cascading effects of poor dispatching.5 The underlying realities suggest a direct cause-and-effect relationship where manual planning limits the number of variables a human dispatcher can balance simultaneously. A human can easily route three trucks, but routing fifteen trucks while dynamically adjusting for real-time traffic, parts availability, and emergency service level agreement requirements exceeds human cognitive limits. Consequently, companies that optimize their dispatch processes using automated tools report up to a 43% increase in completed jobs per day and a 30% reduction in operational costs.2 Board2Dispatch closes this gap by allowing the problem owner to remain in the driver's seat, utilizing natural language to dictate the constraints while the artificial intelligence handles the heavy synthesis and mathematical optimization.

## **Alignment with the Close the Gap Challenge**

The conceptual foundation of Board2Dispatch rests on the emerging software development practice known as vibe-coding, which is the central theme of the Codefi initiative. Coined by artificial intelligence researcher Andrej Karpathy in early 2025, vibe-coding represents a methodology where developers or non-technical users generate, refine, and debug applications through natural language prompts, shifting the focus away from manual syntax generation toward creative problem solving.6 In a vibe-coding workflow, the user acts less like a traditional programmer and more like a product manager, guiding the artificial intelligence to realize a specific operational vision.8

The "Close the Gap" challenge, hosted by the Missouri-based non-profit Codefi, specifically asks for tools that help non-technical individuals move seamlessly from identifying a problem to deploying a working solution.9 Codefi's mission is predicated on the belief that industrial innovations should be driven by the people closest to the challenges, rather than by distant software developers attempting to interpret secondary requirements.10 Board2Dispatch demonstrates this philosophy directly through its fundamental architecture.

The platform embodies the vibe-coding ethos not by asking the user to code a standalone application, but by embedding the vibe-coding philosophy directly into the user interface of the dispatching tool itself. Problem articulation occurs during the intake phase, where the system accepts plain-language context and business rules without requiring structured data entry. Solution generation follows immediately, as the planner converts this conversational context into actionable assignments automatically. The process then moves to guided iteration, where follow-up questions and scenario controls allow the user to refine outcomes conversationally. Finally, operational deployment is achieved as the dispatch board becomes immediately usable by the entire team. Throughout this entire lifecycle, the end-user never touches source code, fulfilling the ultimate promise of the "Close the Gap" directive.

## **Demographic Profiling and Strategic Niche Selection**

Board2Dispatch employs a highly intentional niche-down strategy, focusing initial deployment exclusively on heating, ventilation, and air conditioning dispatch operations. The primary users identified for this platform encompass dispatch coordinators, small business owners, and office managers responsible for same-day service routing. This specific focus is highly strategic for several reasons relating to the operational realities of the trade.

The sector is characterized by a very clear urgency hierarchy, ranging from critical emergencies to low-priority routine maintenance. Furthermore, the environment is defined by frequent interruptions, including sudden technician unavailability and escalated customer complaints. Success in this role requires a heavy dependence on tacit domain knowledge—understanding which technician has the best rapport with a specific commercial client, or knowing which older equipment models require specialized skills. Because existing processes are often fragmented and manual, introducing a system that understands these specific industry nuances immediately generates value.

Demographically, the workforce being managed differs significantly from the personnel managing it. The field technician workforce is predominantly male (approximately 97.4%) with an average age of 40 years.11 Conversely, dispatchers and office managers frequently transition into their roles from administrative backgrounds and are required to possess specific computer skills, such as proficiency in Microsoft Office or accounting software.12 They act as the central nervous system of the operation, requiring in-depth knowledge of terminology, technician skill levels, and geographic territories to match the right worker to the right job.12

However, deep domain expertise does not inherently translate to high technical confidence regarding enterprise-grade software administration. Many traditional field service management platforms demand that the dispatcher adopt the mental model of a database administrator. The steep learning curves associated with enterprise software frequently alienate the exact personnel they are meant to assist.15 The target persona for Board2Dispatch exhibits high operational urgency and zero appetite for software complexity.17 By narrowing the focus specifically to this niche, Board2Dispatch increases its out-of-the-box intelligence. The system does not need to be configured to understand what an emergency condenser failure is; it inherently knows how to prioritize it. This pre-configured intelligence creates a frictionless experience for non-technical users, ensuring high adoption rates.

## **Comprehensive Product Walkthrough**

To fully grasp the operational efficiency introduced by Board2Dispatch, a detailed examination of the user journey is required. The product architecture is divided into six distinct phases, engineered to guide the user from chaotic inputs to a structured, optimized daily plan.

The first phase is Intake. Rather than navigating complex menus, the user simply provides the context for the day in plain language. A dispatcher might dictate or type, "John is running late due to traffic, the commercial unit at the bakery is leaking and needs our best tech immediately, and push all low-priority residential maintenance to the afternoon." This conversational input replaces dozens of manual clicks and form submissions.

The second phase is Review. The system utilizes natural language processing to extract the relevant entities: the specific workers involved, the jobs that need addressing, and the temporal or skill-based rules applied to them. If the artificial intelligence detects ambiguity—for instance, if it cannot determine which specific commercial bakery is being referenced from the client database—it asks targeted follow-up questions to clarify the intent before proceeding.

The third phase is Plan Build. The artificial intelligence planner scores worker-job matches using a multidimensional heuristic matrix. It evaluates the required skills for each job against the certified skills of the available workforce. It calculates availability, current workload, and drive-time efficiency. It factors in priority weightings, ensuring that emergency leaks supersede routine filter replacements. Most importantly, it integrates the textual business rules established during the intake phase, ensuring that the human dispatcher's immediate constraints override historical algorithms.

The fourth phase is Explainability. Every assignment generated by the AI includes a "Why this match?" card. This card translates the complex mathematical scoring into plain-language bullet points, informing the dispatcher exactly why a specific technician was chosen for a specific route.

The fifth phase is Scenario Simulation. Field service environments are highly volatile. When a disruption occurs, the dispatcher can utilize one-click or voice-triggered replanning. By simulating scenarios such as a technician becoming unavailable or a new emergency arising, the system can instantly generate a proposed full rebalance of the remaining schedule, allowing the dispatcher to preview the optimal recovery strategy without committing to it prematurely.

The final phase is Human Override. Manual status changes and reassignment capabilities remain available at all times. The system is designed to be subservient to the operator; if the dispatcher disagrees with the algorithmic proposal, they can manually drag and drop assignments, and the system will instantly recalculate the secondary impacts of that human decision.

## **Human-Centered Design Principles**

The design philosophy underpinning Board2Dispatch is rooted in human-computer interaction research, specifically tailored to the psychological profile of the non-technical operator. The primary principle driving the interface is anxiety reduction. In high-stakes operational environments, new technology often induces stress. To combat this, the system is designed to always show what happened and why it happened, eliminating the disorientation associated with opaque automated systems.18

This leads directly to the second principle: transparency over magic. A critical risk in deploying artificial intelligence for operational scheduling is the "black box" phenomenon. Traditional machine learning models generate outputs without providing the user with any understanding of the underlying rationale.19 If an algorithm assigns a job counterintuitively, the dispatcher will assume the system is flawed and abandon it. By utilizing Explainable Artificial Intelligence, Board2Dispatch provides visible scoring rationales and conflict notes. Transparency is not merely a feature; it is a psychological prerequisite for software adoption, fostering trust and allowing the dispatcher to verify that critical contextual variables have not been omitted.20

The third principle is maintaining a human-in-the-loop architecture by default. Automated decision-making systems that execute irreversible actions without human oversight create severe power imbalances and strip the operator of agency.22 In the context of the dispatch office, removing manual control triggers change fatigue and immediate rejection. Dispatchers take pride in their ability to manage complex logistical puzzles. Therefore, Board2Dispatch treats the artificial intelligence as a highly capable assistant rather than an autonomous replacement, ensuring no irreversible AI-only actions occur without confirmation.

Furthermore, the system incorporates graceful fallback mechanisms. If the natural language parsing fails or planning confidence drops due to highly irregular inputs, the user can seamlessly revert to traditional, manual operation of the dispatch board. Finally, the platform strictly utilizes operational language rather than engineering language. The terminology, interface elements, and error messages are built for dispatchers, utilizing the vernacular of the trade rather than the jargon of software development.

## **Artificial Intelligence and System Architecture**

The seamless user experience of Board2Dispatch is supported by a robust, multi-layered architectural framework designed to handle unstructured data and complex optimization math in real-time.

The foundation is the Input Parsing Layer. This component utilizes advanced natural language processing to convert unstructured text or voice inputs into structured workflow entities. By utilizing word-embedding methods and deep learning classifiers, the system translates conversational language into computable numerical vectors, effectively categorizing and prioritizing tasks without requiring manual data entry.23 This layer is responsible for understanding that "the bakery job" corresponds to a specific work order and that "ASAP" translates to a high-priority temporal constraint.

The second tier is the Planner Layer. This engine executes heuristic scoring to match technicians with work orders. It evaluates millions of potential routing permutations against a set of hard and soft constraints. Hard constraints act as vetoes for safety and compliance—for example, preventing a technician without high-voltage certification from being assigned to a commercial electrical repair. Soft constraints, such as minimizing travel time or honoring customer preferences, are weighted and optimized to generate the most efficient overall board.

The third tier is the Scenario Layer. Drawing upon principles of receding horizon model predictive control, this layer allows for dynamic replanning based on continuous information updates.25 It recalculates the entire board under controlled disruption events, ensuring that the system can recover from unpredictable delays without causing a cascading failure of the daily schedule.

The fourth tier is the Explanation Layer. This is the implementation of Explainable Artificial Intelligence. It takes the complex, multidimensional mathematical scores generated by the planner and converts those details into non-technical justification bullets. This translation layer is what populates the "Why this match?" cards, ensuring that the algorithmic reasoning is accessible to the human operator.27

The final component is the UI Orchestration Layer. This front-end architecture maintains the distinct phases of the user journey—from intake to review to final dispatch—while ensuring that manual drag-and-drop controls and status overrides are permanently accessible and perfectly synchronized with the underlying database.

## **Alignment with the Evaluation Rubric**

As a formal submission to the "Close the Gap" challenge, Board2Dispatch must be evaluated against a specific set of criteria. The platform demonstrates exceptional alignment with all prescribed dimensions of the rubric.

| Rubric Category | Weight | Board2Dispatch Alignment Rationale |
| :---- | :---- | :---- |
| **Impact & Relevance** | 40% | Directly addresses a high-frequency, high-cost operational workflow responsible for significant revenue leakage. By reducing missed urgency, mitigating overload risk, and cutting coordination delays, the financial impact is immediate. Crucially, it keeps domain experts closest to the problem in decision control. |
| **Feasibility** | 15% | The system is pilot-ready for deployment inside a single commercial team utilizing existing dispatch practices. Because the intake layer accepts natural language, the training burden is exceptionally low. Incremental adoption is highly viable, allowing teams to start with basic planning before enabling advanced voice and scenario workflows. |
| **Innovation** | 15% | The platform represents a novel synthesis of explainable heuristic planning, natural language rule handling, and scenario simulation. It completely subverts the paradigm of opaque automation, emphasizing an "AI that can be challenged" model. The integration of voice commands specifically supports fast-paced operational contexts. |
| **User Experience** | 10% | The clear, 3-phase journey drastically reduces cognitive load. Immediate explainability is embedded directly inside each job card, and the permanent accessibility of manual overrides ensures that the user never feels trapped by algorithmic decisions. |
| **Demo Quality** | 20% | The proposed demonstration provides a strong narrative connection to the real-world chaos of a dispatch office. It offers clear before-and-after value demonstration potential, and the reliable fallback behavior ensures a credible, low-risk live demo flow. |

## **Live Demonstration Script and Narrative Flow**

To effectively communicate the value proposition of Board2Dispatch during the evaluation phase, the live demonstration is engineered to simulate a high-stress operational environment over a concise 5 to 7-minute presentation.

The demonstration begins in the Intake phase. The presenter copies a block of messy, disorganized dispatch notes—simulating a rapid sequence of morning phone calls and text messages—and pastes them directly into the interface alongside a set of plain-text operational rules.

The system immediately transitions to the Review extraction phase. The presenter highlights how the artificial intelligence has successfully parsed the chaotic text, accurately extracting the list of available workers, the pending jobs, and the specific constraints. The system demonstrates its interactive capability by prompting a follow-up question regarding an ambiguous location, which the presenter resolves conversationally.

Next, the presenter initiates the Plan Build phase. The system rapidly generates a fully optimized set of technician assignments. To demonstrate transparency, the presenter clicks to open the "Why" cards on several jobs, showcasing how the artificial intelligence explains its routing and scheduling logic in plain, non-technical language.

The narrative then simulates a real-world crisis. The presenter injects a disruption, triggering a "technician unavailable" event simulating a broken-down vehicle. The system instantly calculates the delta, showing exactly how the board must be rearranged to absorb the loss.

To emphasize human control, the presenter executes a manual override, reassigning a specific high-priority job to a different technician and updating the status via a traditional drag-and-drop interface. The system accepts the manual change and seamlessly adjusts the surrounding schedule. Finally, the presenter utilizes a voice action to command a full rebalance of the board. The demonstration concludes by reviewing the final state of the schedule, visually highlighting the radically reduced coordination burden and the transparent, easily understandable decision flow.

## **Six-Week Pilot Implementation Plan**

The deployment of an automated system into an environment heavily reliant on muscle memory and legacy processes carries the severe risk of change fatigue. If a new tool disrupts the workflow during peak season, it will be discarded, regardless of its mathematical superiority.28 Therefore, Board2Dispatch proposes a highly structured, risk-mitigated six-week pilot rollout.

**Week 1: Setup and Baseline Evaluation**

The initial week is dedicated to configuring the workforce and job schema with a single partner shop. Crucially, this period is used to capture baseline metrics from the current, legacy workflow to establish a quantitative foundation for later comparison.

**Weeks 2–3: Shadow Mode**

The most critical phase of the implementation is Shadow Mode. During this period, Board2Dispatch runs entirely in parallel with the existing dispatch process. The dispatcher continues to perform their duties utilizing their traditional tools. Simultaneously, the artificial intelligence ingests the same daily constraints and generates its own proposed board. Comparing the AI plan against the human plan outcomes allows developers to tune the heuristic algorithms while proving to the dispatcher that the system is capable of handling logistical complexities without risking actual operational disruption.

**Weeks 4–5: Assisted Mode**

Once a baseline of trust is established, the system transitions to Assisted Mode. Here, the AI plan serves as the default draft for the day. The dispatcher reviews the proposed board, confirms the logic, makes any necessary edits based on tacit knowledge, and executes the final plan. This elevates the dispatcher from a data-entry clerk to a strategic editor.

**Week 6: Evaluation and Iteration**

The final week involves a comprehensive review of the captured metrics and qualitative operator feedback. This evaluation determines the success of the pilot and prioritizes the next sequence of feature improvements.

## **Operational Success Metrics**

The efficacy of the Board2Dispatch platform will be evaluated against a stringent set of operational key performance indicators.

| Success Metric | Evaluation Rationale |
| :---- | :---- |
| **Time-to-first-dispatch plan** | Measures the reduction in administrative hours spent organizing the initial morning schedule. |
| **% jobs assigned without escalation** | Indicates the accuracy of the natural language parsing and the efficiency of the heuristic routing algorithms. |
| **Urgent response latency** | Tracks the speed at which the system can re-route technicians to handle high-priority, high-revenue emergency breakdowns. |
| **Replan recovery time** | Evaluates how swiftly the system stabilizes after a disruption, such as a technician calling out sick or a job extending beyond its estimate. |
| **Number of manual overrides** | Tracking the frequency and reasoning for manual interventions. A decreasing trend indicates algorithmic accuracy and growing user trust. |
| **Dispatcher trust score / cognitive load** | Utilizes qualitative feedback mechanisms to measure the reduction in workplace stress and software-induced anxiety. |

## **Risk Assessment and Mitigation Strategies**

While the architecture is robust, several operational risks must be proactively managed to ensure successful deployment and long-term viability.

The primary risk is overtrust in artificial intelligence decisions, commonly known as automation bias. In high-pressure environments, users may become complacent and blindly accept algorithmic decisions even when they lack critical real-world context.29 Board2Dispatch mitigates this risk by making the explainability features and manual controls mandatory and highly visible, forcing a degree of active engagement and verification from the operator.

A secondary risk involves the ingestion of sparse or noisy input text. If a dispatcher inputs vague instructions, a language model might hallucinate constraints or fail to identify critical dependencies. The system counteracts this through a dedicated follow-up clarification flow. If the parsing layer cannot extract the necessary structured entities, the user interface pauses and explicitly asks the user for the missing parameters, employing safe fallback behaviors rather than guessing.

Finally, there is the risk of change fatigue within existing teams. Service businesses are notoriously resistant to workflow alterations. To mitigate this, the deployment strategy mandates starting in shadow mode, allowing the team to experience the benefits of the software without initially altering their daily routines, while strictly preserving familiar dispatch concepts and operational language throughout the interface.

## **Future Expansion and Product Roadmap**

While the initial development focuses strictly on heating, ventilation, and air conditioning operations to ensure deep out-of-the-box intelligence, the underlying architecture of Board2Dispatch is highly scalable. The future product roadmap outlines a sequence of strategic expansions designed to deepen the platform's capabilities.

Near-term developments include the integration of granular travel-time and geo-routing optimization, utilizing live traffic application programming interfaces to further enhance route efficiency. The system will also develop technician preference and relationship memory, allowing the algorithm to automatically prioritize sending specific technicians to specific commercial clients based on historical rapport.

Mid-term enhancements will focus on service level agreement-aware auto-alerting, allowing the system to flag potential contract violations before they occur, and multi-branch dispatch support to accommodate regional enterprise scaling.

Long-term strategic goals include expanding the platform to facilitate end-customer estimated time of arrival communication workflows, bringing the transparency of the dispatch board directly to the consumer. Ultimately, the core heuristic engine will be adapted into vertical templates to support allied trades beyond HVAC, including electrical contracting, plumbing, and comprehensive facilities management.

## **Local Development Context**

To facilitate rapid iteration and review by technical evaluators, the Board2Dispatch prototype is engineered for straightforward local deployment. The application can be initialized via standard package management commands:

npm install

npm run dev

Following execution, the application is accessible via a standard local host environment (http://localhost:3000). It should be noted that production builds may require network access for specific font fetching protocols, depending on the specific environmental configuration of the deployment server.

## **Final Analytical Statement**

The small-to-medium field service industry does not suffer from a lack of software; it suffers from a lack of software that comprehends the psychological and operational realities of its users. The reliance on analog whiteboards is not a symptom of an antiquated workforce, but rather an indictment of rigid digital interfaces that demand blue-collar domain experts adapt to the mental models of software engineers.

Board2Dispatch subverts this paradigm by harnessing the power of vibe-coding and natural language processing not to write software, but to operate it. Board2Dispatch is fundamentally not about "AI replacing dispatchers." It is about artificial intelligence amplifying non-technical domain experts. By removing the cognitive burden of spatial routing and schedule balancing, Board2Dispatch ensures that the people closest to the work are equipped with the digital leverage necessary to build and execute better operational decisions themselves. This amplification of human expertise is the core spirit of the Close the Gap challenge.

#### **Works cited**

1. Common challanges for production managers / Boards on Fire, accessed March 26, 2026, [https://boardsonfire.com/en/knowledge-center/inspiration/common-challanges-for-production-managers](https://boardsonfire.com/en/knowledge-center/inspiration/common-challanges-for-production-managers)  
2. 20+ HVAC Dispatching Tips to Maximize Efficiency and Revenue in 2026 \- FieldCamp, accessed March 26, 2026, [https://fieldcamp.ai/blog/hvac-dispatching-tips/](https://fieldcamp.ai/blog/hvac-dispatching-tips/)  
3. HVAC Scheduling & Dispatching: How to Reduce Missed Calls, Improve Communication, and Protect Revenue \- MIS Solutions, accessed March 26, 2026, [https://www.mis-solutions.com/2026/01/hvac-scheduling-and-dispatch/](https://www.mis-solutions.com/2026/01/hvac-scheduling-and-dispatch/)  
4. How to avoid the customer experience gap | Lucky Orange, accessed March 26, 2026, [https://www.luckyorange.com/blog/posts/customer-experience-gap](https://www.luckyorange.com/blog/posts/customer-experience-gap)  
5. Top 6 HVAC Technician Productivity Killers and How to Solve Them \- Droppoint Australia, accessed March 26, 2026, [https://www.droppoint.com.au/post/technician-productivity](https://www.droppoint.com.au/post/technician-productivity)  
6. Vibe coding \- Wikipedia, accessed March 26, 2026, [https://en.wikipedia.org/wiki/Vibe\_coding](https://en.wikipedia.org/wiki/Vibe_coding)  
7. Vibe Coding Explained: Tools and Guides \- Google Cloud, accessed March 26, 2026, [https://cloud.google.com/discover/what-is-vibe-coding](https://cloud.google.com/discover/what-is-vibe-coding)  
8. Our Journey with Vibe Coding, what we've learnt over the past 6 months | by Darren Evans | Google Cloud \- Medium, accessed March 26, 2026, [https://medium.com/google-cloud/our-journey-with-vibe-coding-what-weve-learnt-over-the-past-6-months-b25a0559f008](https://medium.com/google-cloud/our-journey-with-vibe-coding-what-weve-learnt-over-the-past-6-months-b25a0559f008)  
9. From Cape to KC \- Codefi Launches Missouri's First AI Vibe-Coding Hackathons, accessed March 26, 2026, [https://codefiworks.com/news/2025-10-02-codefi-launches-missouris-first-ai-vibe-coding-hackathons](https://codefiworks.com/news/2025-10-02-codefi-launches-missouris-first-ai-vibe-coding-hackathons)  
10. Codefi Announces AgTech AI Startup Studio and Vibeathon Cape, accessed March 26, 2026, [https://codefiworks.com/blog/codefi-announces-agtech-ai-startup-studio-and-vibeathon-cape](https://codefiworks.com/blog/codefi-announces-agtech-ai-startup-studio-and-vibeathon-cape)  
11. Hvac technician demographics and statistics in the US \- Zippia, accessed March 26, 2026, [https://www.zippia.com/hvac-technician-jobs/demographics/](https://www.zippia.com/hvac-technician-jobs/demographics/)  
12. Service Dispatcher \- HVAC Career Map, accessed March 26, 2026, [https://hvaccareermap.org/jobs/service-dispatcher](https://hvaccareermap.org/jobs/service-dispatcher)  
13. HVAC Office Manager Job Description: How to Recruit and Retain the Best \- ServiceTitan, accessed March 26, 2026, [https://www.servicetitan.com/templates/hvac/office-manager-job-description](https://www.servicetitan.com/templates/hvac/office-manager-job-description)  
14. The Essential Role of HVAC Dispatchers: More Than Just a Call Center, accessed March 26, 2026, [https://rockstarrecruitinggroup.com/hvac/the-essential-role-of-hvac-dispatchers-more-than-just-a-call-center/](https://rockstarrecruitinggroup.com/hvac/the-essential-role-of-hvac-dispatchers-more-than-just-a-call-center/)  
15. ServiceTitan Reviews 2026: Details, Pricing, & Features \- G2, accessed March 26, 2026, [https://www.g2.com/products/servicetitan/reviews](https://www.g2.com/products/servicetitan/reviews)  
16. Is Service Titan the Ultimate Solution for Your Business? A Consultant's Honest Review, accessed March 26, 2026, [https://phlashconsulting.com/is-service-titan-the-ultimate-solution-for-your-business-a-consultants-honest-review/](https://phlashconsulting.com/is-service-titan-the-ultimate-solution-for-your-business-a-consultants-honest-review/)  
17. RECORD LC \- Creative Circle Media Solutions, accessed March 26, 2026, [https://cdn4.creativecirclemedia.com/laclede/files/20250905-180008-e24-09-06-2025%20Sat%20PDF%20E-Edition.pdf](https://cdn4.creativecirclemedia.com/laclede/files/20250905-180008-e24-09-06-2025%20Sat%20PDF%20E-Edition.pdf)  
18. Evaluating a virtual reality–delivered mindfulness intervention for anxiety: a mixed-methods study in real-world community and school settings \- Frontiers, accessed March 26, 2026, [https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1669287/full](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1669287/full)  
19. What is Explainable AI (XAI)? \- IBM, accessed March 26, 2026, [https://www.ibm.com/think/topics/explainable-ai](https://www.ibm.com/think/topics/explainable-ai)  
20. The Human Element in AI: Enhancing Field Service Dispatch for Maximum Impact \- IFS Blog, accessed March 26, 2026, [https://blog.ifs.com/the-human-element-in-ai-enhancing-field-service-dispatch-for-maximum-impact/](https://blog.ifs.com/the-human-element-in-ai-enhancing-field-service-dispatch-for-maximum-impact/)  
21. Trustworthy XAI and Its Applications \- arXiv, accessed March 26, 2026, [https://arxiv.org/html/2410.17139v2](https://arxiv.org/html/2410.17139v2)  
22. TechDispatch \- Human oversight of automated decision-making \- European Data Protection Supervisor, accessed March 26, 2026, [https://www.edps.europa.eu/system/files/2025-09/25-09-15\_techdispatch-human-oversight\_en.pdf](https://www.edps.europa.eu/system/files/2025-09/25-09-15_techdispatch-human-oversight_en.pdf)  
23. Natural Language Processing Model for Managing Maintenance Requests in Buildings, accessed March 26, 2026, [https://www.mdpi.com/2075-5309/10/9/160](https://www.mdpi.com/2075-5309/10/9/160)  
24. AI-Driven Maintenance: Enhancing Efficiency and Resident Satisfaction \- Lessen, accessed March 26, 2026, [https://www.lessen.com/resources/ai-driven-maintenance-enhancing-efficiency-and-resident-satisfaction](https://www.lessen.com/resources/ai-driven-maintenance-enhancing-efficiency-and-resident-satisfaction)  
25. (PDF) Enhancing Infrastructure Resilience by Using Dynamically Updated Damage Estimates in Optimal Repair Planning: The Power Grid Case \- ResearchGate, accessed March 26, 2026, [https://www.researchgate.net/publication/356683994\_Enhancing\_Infrastructure\_Resilience\_by\_Using\_Dynamically\_Updated\_Damage\_Estimates\_in\_Optimal\_Repair\_Planning\_The\_Power\_Grid\_Case](https://www.researchgate.net/publication/356683994_Enhancing_Infrastructure_Resilience_by_Using_Dynamically_Updated_Damage_Estimates_in_Optimal_Repair_Planning_The_Power_Grid_Case)  
26. Enhancing Infrastructure Resilience by Using Dynamically Updated Damage Estimates in Optimal Repair Planning: The Power Grid Case \- ASCE Library, accessed March 26, 2026, [https://ascelibrary.org/doi/10.1061/AJRUA6.0001159](https://ascelibrary.org/doi/10.1061/AJRUA6.0001159)  
27. What is Explainable AI? Benefits & Best Practices \- Qlik, accessed March 26, 2026, [https://www.qlik.com/us/augmented-analytics/explainable-ai](https://www.qlik.com/us/augmented-analytics/explainable-ai)  
28. Built a dispatch tool for field service businesses (hvac/plumbing ect)-- looking for feedback : r/smallbusiness \- Reddit, accessed March 26, 2026, [https://www.reddit.com/r/smallbusiness/comments/1rhbkrl/built\_a\_dispatch\_tool\_for\_field\_service/](https://www.reddit.com/r/smallbusiness/comments/1rhbkrl/built_a_dispatch_tool_for_field_service/)  
29. Explainable AI – how humans can trust AI \- Ericsson, accessed March 26, 2026, [https://www.ericsson.com/en/reports-and-papers/white-papers/explainable-ai--how-humans-can-trust-ai](https://www.ericsson.com/en/reports-and-papers/white-papers/explainable-ai--how-humans-can-trust-ai)  
30. To explain or not to explain?—Artificial intelligence explainability in clinical decision support systems \- PMC, accessed March 26, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC9931364/](https://pmc.ncbi.nlm.nih.gov/articles/PMC9931364/)