# Development Playbook

This playbook provides systematic approaches for common development scenarios. Each "play" is a structured sequence of steps designed to solve specific types of problems while maintaining project context and avoiding system-wide regressions.

## Core Principles

### **Professional Standards**
- Direct, technical communication without emotional language
- No unnecessary apologies or exaggerated agreement phrases
- Focus on delivering engineered solutions, not quick fixes
- State confidence levels honestly (e.g., "70% sure it's X")

### **Code Quality Foundation**
- Every code change must serve a specific purpose
- Use design systems and established patterns
- Follow atomic design principles where applicable
- Maintain scalable files that don't bloat

### **Performance & SEO Excellence**
- All pages must achieve 90+ performance score on Google PageSpeed Insights
- All pages must achieve 100% SEO score on Google PageSpeed Insights
- Optimize for Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)

### **Documentation Requirements**
- Update CHANGELOG.md with all changes including investigation file references
- Document root cause and confidence levels
- Archive investigation files after completion

### **Terminal Command Restrictions**
- **PROHIBITED**: AI must NEVER run terminal commands without explicit user permission
- **Investigation phases**: Use only codebase_search, read_file, grep_search, file_search
- **Implementation phase**: Terminal commands allowed ONLY after user gives explicit approval
- **Before ANY terminal command**: Ask user "Can I run the following command: [command]?"
- **Wait for approval**: Do not proceed until user explicitly says "yes" or "approved"
- **Emergency exception**: None - even urgent fixes require user approval for terminal commands

### **Play Execution Protocol**
- **MANDATORY**: Announce each step before executing it: "Step X: [Action Description]"
- **MANDATORY**: If prerequisite files don't exist, create them before proceeding
- **FORBIDDEN**: Skip steps or jump ahead in the sequence
- **FORBIDDEN**: Run ANY terminal commands without explicit user approval
- **FORBIDDEN**: Run terminal commands during investigation phases
- **REQUIRED**: Complete all steps in the exact order specified
- **REQUIRED**: Request user permission before ANY terminal command execution

## Framework Overview

```
┌─────────────────────────────────────────────────────────┐
│                  PROJECT CONTEXT ANCHOR                │
│  • Read PROJECT_OVERVIEW.md for system understanding   │
│  • Review CHANGELOG.md for recent changes              │
│  • Identify core application functions                 │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   PLAYBOOK INDEX                       │
│                                                         │
│  PLAY 1: Bug Investigation & Resolution                │
│  PLAY 2: Feature Development                           │
│  PLAY 3: Performance & SEO Optimization                │
│  PLAY 4: Testing Integration                           │
│  PLAY 5: Design System Updates                         │
│  PLAY 6: Emergency/Hotfix Response                     │
│  PLAY 7: Codebase Documentation                        │
│  PLAY 8: Dependency Updates                            │
│  PLAY 9: Environment/Configuration Issues              │
│                                                         │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              INDIVIDUAL PLAY STRUCTURE                  │
│                                                         │
│  ┌─ PLAY HEADER ──────────────────────────────────────┐ │
│  │ • When to use this play                            │ │
│  │ • Prerequisites (what must exist first)           │ │
│  │ • Success criteria (how you know it worked)       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ CONTEXT GATHERING PHASE ───────────────────────────┐ │
│  │ Step 1: [Action] → [Expected Outcome]              │ │
│  │ Step 2: [Action] → [Expected Outcome]              │ │
│  │ ↳ If Step fails: [Specific recovery action]       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ INVESTIGATION PHASE ───────────────────────────────┐ │
│  │ Step 3: [Action] → [Expected Outcome]              │ │
│  │ Step 4: [Action] → [Expected Outcome]              │ │
│  │ ↳ If Step fails: [Specific recovery action]       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ SOLUTION PHASE ────────────────────────────────────┐ │
│  │ Step 5: [Action] → [Expected Outcome]              │ │
│  │ Step 6: [Action] → [Expected Outcome]              │ │
│  │ ↳ If Step fails: [Specific recovery action]       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ VALIDATION CHECKLIST ──────────────────────────────┐ │
│  │ □ Original issue resolved                          │ │
│  │ □ No regressions in related systems               │ │
│  │ □ Documentation updated                            │ │
│  │ □ User can verify the fix                          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## PLAY 1: Bug Investigation & Resolution

```
┌─────────────────────────────────────────────────────────┐
│                     PLAY HEADER                        │
│                                                         │
│ WHEN TO USE: User reports functionality not working    │
│ as expected, errors occurring, or features broken      │
│                                                         │
│ PREREQUISITES:                                          │
│ • Access to codebase                                   │
│ • Clear description of the bug from user              │
│ • PROJECT_OVERVIEW.md and CHANGELOG.md exist          │
│                                                         │
│ SUCCESS CRITERIA:                                       │
│ • Bug is resolved without breaking other functionality │
│ • User can verify the fix works                        │
│ • Root cause is documented                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                CONTEXT GATHERING PHASE                  │
│                                                         │
│ Step 1: Read PROJECT_OVERVIEW.md                       │
│ → Understand core application functions & architecture │
│ ↳ If file doesn't exist: Create basic PROJECT_OVERVIEW.md │
│                                                         │
│ Step 2: Read CHANGELOG.md                              │
│ → Check if this bug was attempted before               │
│ ↳ If file doesn't exist: Create CHANGELOG.md          │
│ ↳ If attempted before: Review what failed & why       │
│                                                         │
│ Step 3: Map affected feature to system architecture    │
│ → Identify which core function this bug impacts        │
│ ↳ If unclear: Ask user for more specific details      │
│                                                         │
│ Step 4: Identify dependencies & connected systems      │
│ → List 2-3 other features that share components        │
│ ↳ If too complex: Focus on immediate dependencies     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                INVESTIGATION PHASE                      │
│                                                         │
│ Step 5: Analyze code path where bug likely occurs      │
│ → Find the logical location in code based on user description │
│ ↳ If multiple possibilities: Prioritize most likely paths     │
│                                                         │
│ Step 6: Trace the code flow of the affected feature    │
│ → Follow the code from user action to potential failure point │
│ ↳ If too complex: Break into smaller components       │
│                                                         │
│ Step 7: Form hypothesis about root cause               │
│ → State confidence level (e.g., "70% sure it's X")     │
│ ↳ If low confidence: Gather more code evidence first  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   SOLUTION PHASE                       │
│                                                         │
│ Step 8: Design fix that addresses root cause           │
│ → Propose minimal change that solves the issue         │
│ ↳ If affects dependencies: Plan for those impacts     │
│                                                         │
│ Step 9: Cross-check fix against Step 4 dependencies    │
│ → Verify fix won't break connected systems             │
│ ↳ If potential conflicts: Adjust approach             │
│                                                         │
│ Step 10: Implement the fix                             │
│ → Make the code changes                                │
│ ↳ If implementation fails: Rollback and reassess      │
│                                                         │
│ Step 11: Request user verification                     │
│ → Ask user to test and confirm if issue is resolved    │
│ ↳ If user reports still broken: Gather their feedback │
│   (error logs, screenshots, new symptoms) and assess  │
│   which step to return to (likely Step 5, 6, or 7)   │
│                                                         │
│ Step 12: Document the completed fix (Only if user confirms) │
│ → Update CHANGELOG.md with: bug description, root cause, │
│   solution applied, files changed                      │
│ → Mark investigation as complete                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                VALIDATION CHECKLIST                     │
│                                                         │
│ □ User has confirmed bug is resolved                   │
│ □ No regressions reported in connected systems         │
│ □ CHANGELOG.md updated with fix details                │
│ □ Root cause explanation documented                    │
└─────────────────────────────────────────────────────────┘
```

---

## Additional Plays

*To be developed:*

- PLAY 2: Feature Development
- PLAY 3: Performance & SEO Optimization 
- PLAY 4: Testing Integration
- PLAY 5: Design System Updates
- PLAY 6: Emergency/Hotfix Response
- PLAY 7: Codebase Documentation
- PLAY 8: Dependency Updates
- PLAY 9: Environment/Configuration Issues

---

*Version: 1.0*
*Status: Active Development*
*Last Updated: Play 1 completed - Bug Investigation & Resolution framework established*