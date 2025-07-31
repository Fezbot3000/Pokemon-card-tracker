# Development Rules v2.5 - Flow-Based System with Investigation Enforcement

## 🎯 **Core Principles**

### 🔐 **Permission & Control**
- Never restart the server without explicit permission
- **FORBIDDEN**: NO terminal commands during investigation phases (Phases 1-3)
- **FORBIDDEN**: NO terminal commands without explicit user approval
- Follow all instructions without deviation
- Explain proposed deviation of instructions before commencing
- Never make git commits or pushes without explicit user verification and approval; always pause after changes for user review

### 🔍 **SIMPLE 3-STEP WORKFLOW** 
**Clear, straightforward process with minimal approvals:**

## **Step 1: Investigation & Understanding**
**Understand the problem and current codebase**

- Use `codebase_search` and `read_file` to understand current implementation
- Identify the root cause of issues or where new features should integrate
- Document findings in `investigations/INVESTIGATION_[FEATURE/BUG]_[YYYYMMDD].md`
- **OUTPUT**: Clear problem understanding
- **USER APPROVAL REQUIRED**: Ask "Shall I proceed to Step 2?" and wait for approval

## **Step 2: Solution Design & Planning**
**Figure out how to fix/implement based on existing code**

- Design technical solution that fits existing architecture
- Plan specific implementation steps and file changes needed
- Consider impacts, dependencies, and testing approach
- Update investigation file with technical approach
- **OUTPUT**: Clear implementation plan
- **USER APPROVAL REQUIRED**: Ask "Shall I proceed to Step 3?" and wait for approval

## **Step 3: Implementation**
**Execute the planned changes**

- Implement the solution following the planned approach
- Make all necessary code changes
- Test the implementation
- **OUTPUT**: Working solution
- **USER VERIFICATION**: Present completed work for final verification

### ⚠️ **SIMPLE ENFORCEMENT**
- **Follow the 3 steps in order**
- **Wait for approval between steps** 
- **Create investigation file to document work**
- **No code changes until Step 3**

### 🚫 **TERMINAL COMMAND RESTRICTIONS**
- **Steps 1-2: NO terminal commands** - Use codebase_search, read_file, grep_search, file_search only
- **Step 3: Terminal commands allowed** after user approval to proceed with implementation



### 🤖 **Professional Standards**
- Direct, technical communication without emotional language
- No unnecessary apologies or human-like behaviour
- Purpose: Execute instructions efficiently
- Focus on delivering engineered solutions, not quick fixes

### 💡 **Code Quality Foundation**
- Every code change must serve a specific purpose
- No arbitrary additions or technical debt
- Use design systems and established patterns
- Maintain scalable files that don't bloat; follow best practices such as modularization, code splitting, and regular refactoring
- Follow atomic design principles where applicable (e.g., atoms for basic elements, molecules for combined atoms)

### ❓ **Clarification Protocol**
- When context is insufficient, ask specific questions before proceeding
- Never make assumptions about requirements
- Seek explicit clarification on ambiguous instructions
- Document assumptions that must be made and get approval

### ⚡ **Performance & SEO Excellence**
- All pages must achieve 90+ performance score on Google PageSpeed Insights
- All pages must achieve 100% SEO score on Google PageSpeed Insights
- Implement comprehensive SEO strategy with consistent meta tags, structured data, and semantic HTML
- Optimize for Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1) with regular monitoring
- Ensure mobile-first performance optimization with touch-optimized interactions

### 📚 **AI-Focused Documentation Strategy**
- Documentation serves as persistent context for AI comprehension of codebase
- Feature-based documentation combining functionality description with change history
- Each feature gets dedicated MD file in `docs/features/` directory
- Documentation must be practical and immediately actionable for AI understanding
- Updates happen at feature level, not individual change level

### 📊 **Metrics for Adherence & Efficiency**
- Track key metrics per flow: time spent, rework cycles, and adherence rate (e.g., % of quality gates passed on first attempt)
- Aim for efficiency gains: e.g., reduce development time by 20% compared to non-flow-based approaches through iterative tracking
- Document metrics in a new `METRICS.md` file for ongoing analysis and refinement
- **AI Adherence Tracking**: Must be 100% investigation compliance (any violation = protocol failure)
- **Assumption Violations**: Track and document in `docs/maintenance/AI_VIOLATIONS.md`
- **User Intervention Required**: Log every time user must redirect AI behavior
- **Success Metric**: Zero assumption-based debugging incidents per task

## 📋 **Universal Standards & Templates**

### **Quality Standards** (Apply to all flows unless noted)
- **Performance**: 90+ score on Google PageSpeed Insights for all pages
- **SEO**: 100% SEO score on Google PageSpeed Insights for all pages  
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1 across all interactions
- **Testing**: Minimum 80% coverage for critical paths, 60% overall
- **Accessibility**: WCAG 2.1 AA compliance for all user-facing changes
- **Security**: Input validation, XSS prevention, data sanitization

### **Standard Validation Commands**
- **Build Check**: `npm run build` to verify compilation
- **Test Execution**: `npm test` for test suite validation
- **Development Server**: `npm start` for local testing

### **Universal User Verification Template**
1. **TODO Status**: "✅ Completed todos: [list completed tasks]"
2. **Summarize**: "This is what I did" with specific changes and rationale
3. **Confidence Level**: "Confidence: [X]% - [brief reasoning for confidence level]"
4. **Test Flow**: "Run server, follow these steps: [specific UI actions]"
5. **Build Verification**: "Run npm run build to check for issues"
6. **Approval Request**: "Test locally as described. If working, approve for commit?"

### **Documentation Update Requirements**
- Update relevant feature documentation in `docs/features/`
- **MANDATORY**: Add entry to `CHANGELOG.md` with investigation file reference
- Log metrics in `docs/maintenance/METRICS.md`
- Update architecture documentation if system design changed

### **Changelog Entry Template**
```
## [YYYY-MM-DD] - [Feature/Bug/Enhancement]
**What**: [Brief description of change]
**Why**: [Reason for change] 
**Investigation**: `investigations/INVESTIGATION_[NAME]_[YYYYMMDD].md`
**Files Changed**: [List of modified files]
**Confidence**: [X]% - [reasoning]
```

### **Investigation File Management**
- **New Tasks**: Create `investigations/INVESTIGATION_[FEATURE/BUG]_[YYYYMMDD].md`
- **Follow-ups**: Update existing investigation file for same task
- **Failed Solutions**: Document failed approaches and lessons learned in same investigation file
- **Folder Structure**: All investigations go in `investigations/` folder to prevent project root clutter
- **Archival**: After task completion, move investigation files to `investigations/archive/`
- **Active Work**: Keep active investigation files in `investigations/` folder

## 🚨 **UNIVERSAL FAILURE PROTOCOL**
**Applies to ALL flows - NO EXCEPTIONS**

### **Failure Triggers** (ANY of these = MANDATORY re-investigation):
- User reports solution didn't work ("still not working", "didn't fix it", "not resolved")
- Solution fails during validation or testing
- User requests different approach after implementation
- Unintended side effects or regressions discovered
- User provides additional context that changes the problem

### **Mandatory Actions** (MUST be completed in order):
1. **IMMEDIATE STOP**: Halt all implementation activities, no code changes, NO TERMINAL COMMANDS
2. **MANDATORY**: Restart Universal Investigation Protocol (Phases 1-3)
3. **Update Investigation File**: Document in existing investigation file:
   - Failed approach and why it didn't work
   - New information or context from user
   - Lessons learned from failure
   - Revised understanding of the problem
4. **Re-investigate**: Complete fresh codebase analysis with new insights
5. **Get Approval**: Explicit user approval required before ANY new implementation

### **Enforcement**:
- **VIOLATION PENALTY**: Any code change or terminal command without completing failure protocol → IMMEDIATE STOP, restart from Phase 1
- **NO EXCEPTIONS**: Applies to all flows including Emergency/Hotfix  
- **NO PATCHES**: Cannot add "quick fixes" - must complete full re-investigation
- **NO TERMINAL COMMANDS**: Forbidden during investigation phases - use codebase_search and read_file only

### **Investigation File Failure Documentation**:
Add to existing investigation file:
```
## Failed Attempt #[N] - [Date]
**Approach Tried:** [what was implemented]
**Failure Reason:** [why it didn't work]
**User Feedback:** [exact user feedback received]
**Lessons Learned:** [what this teaches us]
**New Information:** [any new context discovered]
```

## 🧭 **Flow Selection Guide**

### **Decision Tree**
```
STEP 0: Universal Investigation Protocol (REQUIRED for all flows except Emergency)
↓
Is this a critical production issue? → YES → Emergency Flow (#8)
                                   ↓ NO
Is this a simple change (< 30 min)? → YES → Quick Task Flow (#0)
                                    ↓ NO
Is this a new project setup? → YES → Project Initialization Flow (#1)
↓ NO
Is this a bug or issue? → YES → Bug Resolution Flow (#3)
                        ↓ NO
Is this adding/changing functionality? → YES → Feature Development Flow (#2)
                                       ↓ NO
Is this testing-related? → YES → Testing Integration Flow (#4)
                         ↓ NO
Is this design system work? → YES → Design System Flow (#5)
                            ↓ NO
Is this performance/SEO optimization? → YES → Performance & SEO Flow (#6)
                                      ↓ NO
Is this updating this document? → YES → Framework Maintenance Flow (#7)
```

### **Quick Reference**
- **Emergency/Hotfix**: Critical production issues requiring immediate fix
- **Quick Task**: Simple changes under 30 minutes (typos, config updates, minor styling)
- **Project Initialization**: New project setup or major system refactoring
- **Feature Development**: Adding new functionality or enhancing existing features
- **Bug Resolution**: Fixing reported issues, performance problems, or security vulnerabilities
- **Testing Integration**: Establishing testing framework or improving test coverage
- **Design System**: Creating/updating visual design standards and component library
- **Performance & SEO**: Optimization work for performance and SEO improvements
- **Framework Maintenance**: Updating this document or development processes

## 🔄 **Development Flows**

### ⚡ **Flow #0: Quick Task Flow**

**Entry Point:** Simple changes requiring minimal process overhead (< 30 minutes)

**Qualifying Tasks:**
- Typo corrections and content updates
- Configuration file changes
- Minor styling adjustments (color, spacing tweaks)
- Documentation updates that don't affect system architecture
- Simple variable renaming or constant updates

**Steps:**
1. **Quick Assessment**
   - Verify change doesn't affect system architecture or user experience
   - Confirm no testing or design system updates required
   - Estimate completion time under 30 minutes

2. **Direct Implementation**
   - Make targeted change with minimal scope
   - Ensure change follows existing patterns and conventions
   - No new dependencies or architectural changes

3. **Rapid Validation**
   - Quick functional test of changed area
   - Verify no obvious regressions introduced
   - Check change works as expected in context

4. **Streamlined User Verification**
   - Summarize: "Quick change made: [specific change description]"
   - Test flow: "Verify [specific area] works as expected"
   - Request approval: "Simple change - approve for commit?"

5. **Immediate Documentation** (After Approval)
   - Update relevant feature documentation if applicable
   - Log change in appropriate feature changelog
   - No separate architecture or design system updates required

**Quality Gate:** Change complete, functionally verified, user-approved, documented.

**Note:** If complexity increases during implementation, escalate to appropriate full flow.

---

### 🚀 **Flow #1: Project Initialization**

**Entry Point:** New project or major system setup

**Steps:**
1. **Requirements Analysis**
   - Define core functional requirements with specific user stories and acceptance criteria (e.g., "As a user, I can log in so that I access my dashboard; Acceptance: Successful auth redirects to dashboard")
   - Identify technical constraints including browser support, performance targets, and platform limitations
   - Establish privacy/security requirements with specific compliance standards (GDPR, accessibility, etc.)
   - Document non-functional requirements including performance benchmarks, scalability needs, and maintenance requirements

2. **Architecture Planning**
   - Create comprehensive `docs/architecture/SYSTEM_OVERVIEW.md` documenting system design, data flow, and integration points
   - Map component relationships with dependency diagrams and interaction patterns (e.g., use tools like Mermaid for diagrams)
   - Define tech stack with specific versions, justification for choices, and migration strategies
   - Plan file structure following established patterns with clear separation of concerns (e.g., src/components, src/services)

3. **Feature Documentation Structure**
   - Create `docs/features/` directory for all feature-specific documentation
   - Establish feature documentation template with sections: Purpose, Architecture, Usage, API, Changelog
   - Create initial feature documentation files for planned core features
   - Set up documentation maintenance processes for AI context preservation

4. **Project Changelog & Investigation Setup**
   - Create `CHANGELOG.md` in project root for comprehensive change tracking
   - Create `investigations/` directory for all investigation files
   - Create `investigations/archive/` directory for completed investigations
   - Set up changelog template with investigation file references
   - Document initial project setup as first changelog entry

5. **Design System Foundation**
   - Create detailed `docs/design/DESIGN_SYSTEM.md` with complete design tokens (colors, spacing, typography, shadows)
   - Define responsive breakpoints with specific pixel values and device targeting (e.g., mobile: 0-767px, tablet: 768-1023px, desktop: 1024+px)
   - Establish component hierarchy using atomic design principles (atoms, molecules, organisms, templates, pages)
   - Document usage guidelines with code examples and implementation patterns (e.g., Button component: `<Button variant="primary">Click me</Button>`)

6. **Development Environment Setup**
   - Configure build tools with specific linting rules, formatting standards, and type checking (e.g., ESLint, Prettier)
   - Set up testing framework with coverage targets, test structure, and CI/CD integration (e.g., Jest/Vitest with GitHub Actions)
   - Establish development workflows including git branching strategy (e.g., feature branches, main for production) and code review process
   - Integrate version control tools: Use GitHub Desktop for local management; verify functionality locally before committing/pushing
   - Set up deployment pipelines: Configure GitHub workflows (e.g., Actions) for automated builds and deployments to platforms like Firebase or Netlify upon push to main
   - Create documentation templates for consistent project documentation

7. **Quality Assurance Framework**
   - Create `docs/maintenance/TECHNICAL_DEBT_AND_BUGS.md` with tracking templates and resolution processes
   - Define testing strategy with specific coverage targets (minimum 80% for critical paths)
   - Establish security validation checklist including input sanitization, XSS prevention, and data validation
   - Set up performance monitoring with Google PageSpeed Insights (target: 90+ performance, 100% SEO)
   - Implement comprehensive SEO strategy with meta tags, structured data, and semantic HTML
   - Configure Core Web Vitals monitoring with automated alerts for regression
   - Create `docs/maintenance/METRICS.md` for tracking flow adherence and efficiency (e.g., log time per step)

8. **User Verification Phase**
   - Summarize all setup changes: "This is what I did" with a list of key configurations and files created
   - Provide a testing flow: "Run the server locally (e.g., npm start for React) and follow these UI steps to verify: [e.g., Navigate to localhost:3000, click login button, expect redirect]"
   - Suggest building the app: "Run npm run build to check for any compilation issues"
   - Request approval: "Are you happy with this setup? Can I proceed with initial git commit via GitHub Desktop?"

**Quality Gate:** Complete project foundation with all documentation in place, user-verified, and approved for commit.

---

### 🎨 **Flow #2: Feature Development**

**Entry Point:** New feature request or enhancement

**Prerequisites:**
- **MANDATORY**: Complete Universal Investigation Protocol (Phases 1-3) before starting this flow
- **MANDATORY**: Investigation documentation (.md file) created and approved

**Steps:**
1. **Planning & Clarification Phase**
   - Create detailed implementation plan with specific steps, timelines, and deliverables (e.g., "Day 1: Wireframes; Day 2: Implementation")
   - Ask clarifying questions if requirements are ambiguous or incomplete
   - Check existing `docs/architecture/SYSTEM_OVERVIEW.md` for alignment and integration requirements
   - Identify all dependencies, potential conflicts, and architectural impacts
   - Get explicit approval on complete approach before proceeding

2. **Feature Documentation Creation**
   - Create `docs/features/[FEATURE_NAME].md` with template structure:
     - **Purpose**: What this feature does and why it exists
     - **Architecture**: How it integrates with the system
     - **Implementation**: Key components, services, and data flows
     - **Usage**: How users interact with the feature
     - **API**: External interfaces and integration points
     - **Testing**: Test coverage and validation approach
     - **Changelog**: Historical changes and decisions
   - Document planned implementation approach and architectural decisions

3. **Visual Design Phase** (Required for UI changes)
   - Create ASCII wireframes showing layout structure and component hierarchy (e.g., simple grid layouts in text)
   - Define responsive behavior across mobile, tablet, and desktop breakpoints
   - Ensure accessibility compliance with keyboard navigation and screen reader support
   - Validate design against established design system patterns
   - Get approval on visual design before implementation

4. **Architecture Integration**
   - Update `docs/architecture/SYSTEM_OVERVIEW.md` documenting new components, services, and data flows
   - Map integration points with existing systems and potential impact areas
   - Plan comprehensive testing strategy including unit, integration, and user acceptance tests
   - Identify and document any technical debt or refactoring requirements

5. **Implementation Phase**
   - Build using established design system patterns with no hardcoded values
   - Follow mobile-first responsive approach with touch-optimized interactions
   - Implement comprehensive error handling with user-friendly error messages
   - Add appropriate logging for debugging and monitoring purposes
   - Ensure atomic design principles with reusable component structure

6. **Testing & Validation**
   - Apply Universal Quality Standards (see Universal Standards section)
   - Test responsive behavior across all supported devices and browsers
   - Write unit tests for all new functionality per Universal Testing Standards

7. **User Verification Phase**
   - Follow Universal User Verification Template (see Universal Standards section)
   - Provide feature-specific testing flow: "Run server, then: [specific feature actions]"

8. **Feature Documentation Completion** (After Approval)
   - Complete `docs/features/[FEATURE_NAME].md` with final implementation details
   - Update Architecture section with actual implementation decisions
   - Document any deviations from original plan and rationale
   - **MANDATORY**: Add entry to `CHANGELOG.md` using Changelog Entry Template
   - Apply Universal Documentation Update Requirements (see Universal Standards section)
   - Archive investigation file to `investigations/archive/`
   - Trigger GitHub workflows for CI/CD after approved push

**Quality Gate:** Feature complete with tests, user-verified, feature documentation complete, no debt introduced.

---

### 🔧 **Flow #3: Bug Resolution**

**Entry Point:** Bug report or issue identification

**Prerequisites:**
- **MANDATORY**: Complete Universal Investigation Protocol (Phases 1-3) before starting this flow
- **MANDATORY**: Investigation documentation (.md file) created and approved

**Steps:**
1. **Analysis & Solution Design**
   - Document findings clearly: "This is the problem" with specific technical details
   - Explain discovery process: "This is how I found it" including investigation steps and evidence
   - Propose comprehensive technical solution: "This is what I recommend" with implementation details
   - Provide clear explanation: "This is what I'm trying to achieve" in non-technical terms
   - Request explicit approval: "Can I proceed?" and wait for confirmation

2. **Implementation Phase**
   - Implement only after receiving explicit approval from Analysis & Solution Design phase
   - Follow approved solution exactly without deviations or "improvements"
   - Document all changes made with clear commit messages and code comments
   - Avoid patches, workarounds, or quick fixes that introduce technical debt

3. **Solution Validation**
   - Test fix thoroughly across multiple scenarios and edge cases
   - Validate no regression introduced by running existing test suite
   - Update or add tests to prevent similar issues in the future
   - Apply Universal Quality Standards to ensure no performance/SEO regression

4. **User Verification Phase**
   - Follow Universal User Verification Template (see Universal Standards section)
   - Provide bug-specific testing flow: "Replicate bug scenario: [specific steps to reproduce and verify fix]"

5. **Solution Failure Protocol** (if initial solution fails)
   - **MANDATORY**: Follow Universal Failure Protocol (see Universal Failure Protocol section)
   - Remove failed solution completely - no patches or quick fixes
   - Document failure in investigation file per Universal Failure Protocol requirements
   - Complete full re-investigation with broader scope and new insights

6. **Documentation Update** (After Approval)
   - Update `docs/maintenance/TECHNICAL_DEBT_AND_BUGS.md` with complete resolution details
   - Document root cause, solution applied, and validation performed
   - Record prevention strategies to avoid similar issues  
   - **MANDATORY**: Add entry to `CHANGELOG.md` using Changelog Entry Template
   - Apply Universal Documentation Update Requirements (see Universal Standards section)
   - Archive investigation file to `investigations/archive/`
   - Trigger deployment workflows if applicable (e.g., to Firebase) after push

**Quality Gate:** Bug resolved, user-verified, testing complete, feature documentation updated, prevention documented.

---

### 🧪 **Flow #4: Testing Integration**

**Entry Point:** Adding tests to existing code or establishing testing framework

**Steps:**
1. **Testing Strategy Definition**
   - Identify critical paths requiring test coverage with specific business impact assessment (e.g., auth flow: high impact)
   - Define unit test scope focusing on services, utilities, and complex business logic
   - Establish integration test requirements for API endpoints and data flows
   - Apply Universal Testing Standards for coverage targets

2. **Testing Framework Setup**
   - Configure testing tools appropriate for project tech stack (Vitest for Vite, Jest for Create React App, etc.)
   - Set up test runner with watch mode, coverage reporting, and CI/CD integration (e.g., GitHub Actions for auto-runs on push)
   - Establish testing file structure following project conventions (co-location vs separate test directories)
   - Create reusable test utilities, mocks, and helper functions for common patterns

3. **Test Implementation Priority**
   - Write unit tests for services and utilities first (highest ROI and stability)
   - Add component tests for user interactions and business logic
   - Create integration tests for critical user workflows and data persistence
   - Implement visual regression tests for design system components where applicable

4. **Quality Validation**
   - Ensure tests are readable with clear descriptions and meaningful assertions
   - Validate test coverage meets established targets with no critical gaps
   - Review test performance ensuring fast execution (under 30 seconds for unit tests)
   - Verify tests catch actual bugs through mutation testing or deliberate bug introduction

5. **User Verification Phase**
   - Follow Universal User Verification Template (see Universal Standards section)
   - Provide testing-specific flow: "Run tests using Standard Validation Commands, expect all to pass"

6. **Testing Documentation** (After Approval)
   - Create `docs/testing/TESTING_STRATEGY.md` if establishing comprehensive testing framework
   - Integrate tests into build pipeline with fail-fast configuration
   - Set up automated test execution on pull requests and deployments (e.g., deploy to Netlify only if tests pass)
   - Configure coverage reporting with trend analysis and quality gates
   - Apply Universal Documentation Update Requirements (see Universal Standards section)

**Quality Gate:** Testing suite complete, user-verified, feature documentation updated, automated execution ready.

---

### 🎨 **Flow #5: Design System Implementation**

**Entry Point:** Establishing or updating design system

**Steps:**
1. **Design Token Definition**
   - Define complete color palette with semantic naming (primary, secondary, success, warning, error, neutral)
   - Establish spacing scale using mathematical progression (4px, 8px, 16px, 24px, 32px, etc.)
   - Create typography system with font sizes, weights, and line heights for all text elements
   - Document component size variations and interactive state definitions (hover, focus, active, disabled)

2. **Atomic Component Architecture**
   - Design component hierarchy strictly following atomic design principles
   - Create base atom components (buttons, inputs, typography) with comprehensive prop APIs
   - Build molecule components (form fields, search bars) using only atomic components
   - Implement organism components (headers, forms, cards) with responsive behavior patterns
   - Establish accessibility compliance standards for all component levels (e.g., ARIA labels)

3. **Pattern Documentation & Guidelines**
   - Update `docs/design/DESIGN_SYSTEM.md` with comprehensive component documentation
   - Document component usage with comprehensive code examples and live demos (e.g., Storybook integration if applicable)
   - Create visual style guide showing all component variations and states
   - Establish clear do's and don'ts with specific examples of correct and incorrect usage
   - Provide implementation best practices and common pitfall avoidance (e.g., avoid overriding tokens)

4. **Implementation Standards & Validation**
   - Enforce zero hardcoded values - all styling must use design tokens
   - Validate consistent pattern usage across all components and applications
   - Test responsive behavior across all supported breakpoints and devices
   - Verify comprehensive accessibility including keyboard navigation and screen readers

5. **User Verification Phase**
   - Summarize: "This is what I did" with new tokens/components
   - Provide testing flow: "Run server, view components in UI (e.g., check button states)"
   - Suggest build: "Run npm run build for issues"
   - Request approval: "Test changes live. Approve commit?"

6. **Design System Documentation** (After Approval)
   - Complete `docs/design/DESIGN_SYSTEM.md` with all component documentation
   - Update affected feature documentation in `docs/features/` with design system usage
   - Audit existing codebase for design system compliance with remediation plan
   - Refactor non-compliant implementations following established migration strategy
   - Establish ongoing maintenance process with regular reviews and updates (e.g., quarterly audits)

**Quality Gate:** Design system complete, user-verified, documentation updated, 100% compliance.

---

### ⚡ **Flow #6: Performance & SEO Optimization**

**Entry Point:** Performance or SEO improvements needed or regular optimization review

**Steps:**
1. **Performance Baseline Assessment**
   - Measure current performance using Google PageSpeed Insights for all pages
   - Identify Core Web Vitals metrics (LCP, FID, CLS) and current scores
   - Analyze performance bottlenecks including bundle size, image optimization, and loading patterns
   - Document current SEO scores and identify specific areas for improvement

2. **SEO Audit & Strategy**
   - Audit all pages for SEO compliance using Google PageSpeed Insights
   - Validate meta tags, structured data, and semantic HTML implementation
   - Review content structure, heading hierarchy, and keyword optimization
   - Ensure consistent SEO strategy across all pages and components

3. **Performance Optimization Implementation**
   - Implement code splitting and lazy loading for non-critical resources
   - Optimize images with appropriate formats, compression, and responsive loading
   - Minimize and compress CSS/JS bundles with tree-shaking
   - Implement preloading for critical resources and prefetching for anticipated navigation

4. **SEO Enhancement Implementation**
   - Implement comprehensive meta tags (title, description, Open Graph, Twitter Cards)
   - Add structured data markup (JSON-LD) for rich snippets and search visibility
   - Ensure semantic HTML with proper heading hierarchy and accessibility attributes
   - Optimize internal linking structure and URL patterns

5. **Validation & Monitoring**
   - Verify 90+ performance score on Google PageSpeed Insights for all pages
   - Validate 100% SEO score achievement with no missing optimization opportunities
   - Test Core Web Vitals compliance across different devices and network conditions
   - Set up ongoing monitoring with automated alerts for performance regression (e.g., via GitHub Actions)

6. **User Verification Phase**
   - Summarize: "This is what I did" with optimizations applied
   - Provide testing flow: "Run server, load pages, check load times and interactions"
   - Suggest build: "Run npm run build to verify optimized build"
   - Request approval: "Test performance/SEO scores. Approve for commit?"

7. **Performance Documentation** (After Approval)
   - Update relevant feature documentation in `docs/features/` with performance considerations
   - Document optimization strategies and implementation details in `docs/performance/OPTIMIZATION_GUIDE.md`
   - Update development guidelines with performance and SEO best practices
   - Establish regular review schedule for performance and SEO maintenance (e.g., monthly)
   - Create troubleshooting guide for common performance and SEO issues
   - Log improvements in `docs/maintenance/METRICS.md` (e.g., score deltas pre/post-optimization)

**Quality Gate:** All pages achieving 90+ performance and 100% SEO, user-verified, documentation updated, monitoring in place.

---

### 🔄 **Flow #7: Framework Maintenance & Refinement**

**Entry Point:** Iterative improvement of this document or ongoing project maintenance

**Steps:**
1. **Review & Feedback Collection**
   - Gather feedback on existing flows (e.g., from usage metrics in `docs/maintenance/METRICS.md` or user input)
   - Identify gaps, redundancies, or inefficiencies (e.g., overly rigid steps for small projects)
   - Analyze adherence metrics: time saved, rework reduced, quality improvements

2. **Refinement Planning**
   - Propose updates: Add examples, flexibility options (e.g., "For small projects, optional steps marked *"), or new flows
   - Document changes with rationale (e.g., "Added user verification for commits to ensure control")
   - Ensure alignment with core principles and industry standards (e.g., reference SOLID for architecture)

3. **Implementation & Versioning**
   - Update document with new version (e.g., v2.0); use semantic versioning (major for breaking changes, minor for additions)
   - Incorporate automation where possible (e.g., scripts for metric tracking or gate enforcement)
   - Test updates by applying to a sample task or past project

4. **User Verification Phase**
   - Summarize changes to the framework
   - Provide testing flow: "Review updated sections, test in a mock workflow"
   - Suggest for any build-related if applicable
   - Request approval: "Approve updates for commit to repo?"

5. **Framework Documentation** (After Approval)
   - Update version number and changelog in this document
   - Verify updates don't introduce inconsistencies
   - Update all projects to reference the new version
   - Log refinement metrics (e.g., efficiency gains from updates)

**Quality Gate:** Framework updated, documented, validated for improved usability.

---

### 🚨 **Flow #8: Emergency/Hotfix Flow**

**Entry Point:** Critical production issue requiring immediate resolution

**Qualifying Conditions:**
- Production system down or severely degraded
- Security vulnerability actively being exploited
- Data corruption or loss in progress
- Critical business function completely broken

**Steps:**
1. **Emergency Assessment**
   - Document issue severity and business impact
   - Estimate time to resolution and affected user count
   - Identify minimal viable fix approach
   - Get emergency authorization to proceed with reduced process

2. **Immediate Fix Implementation**
   - Implement minimal, targeted fix with focus on restoration
   - No optimization or enhancement during emergency fix
   - Document all changes with clear emergency context
   - Verify fix resolves immediate issue without introducing new problems

3. **Emergency Validation**
   - Test fix in production-like environment if possible
   - Validate critical functionality restored
   - Verify no immediate side effects or regressions
   - Monitor key metrics post-deployment

4. **Expedited User Verification**
   - Summarize: "Emergency fix applied: [specific issue and resolution]"
   - Provide validation: "Critical functionality restored, monitored for [time period]"
   - Request approval: "Emergency fix working, approve for immediate commit and deploy?"

5. **Post-Emergency Follow-up** (After Approval)
   - Create follow-up task for proper solution using standard flows
   - Document root cause analysis and prevention strategies
   - Update relevant feature documentation with emergency fix details
   - Schedule technical debt remediation if emergency fix introduced shortcuts
   - Log incident metrics and lessons learned in `docs/maintenance/METRICS.md`

**Quality Gate:** Critical issue resolved, system restored, proper follow-up scheduled.

---

## 🚨 **Quality Gates & Checkpoints**

### **Pre-Implementation Gates**
- [ ] Appropriate flow selected using decision tree
- [ ] Detailed plan created and explicitly approved (except Quick Task and Emergency flows)
- [ ] Architecture alignment verified against existing documentation
- [ ] Design system compliance confirmed for all UI changes
- [ ] Testing strategy defined with specific coverage targets
- [ ] Visual mockups created and approved for all UI changes (Feature Development flow)
- [ ] All clarifying questions asked and answered
- [ ] Relevant feature documentation reviewed for context

### **Post-Implementation Gates**
- [ ] Functionality verified through comprehensive testing
- [ ] Universal Quality Standards applied and verified (see Universal Standards section)
- [ ] Zero technical debt introduced or existing debt documented
- [ ] Universal User Verification Template completed with approval for commit

### **Release Gates**
- [ ] All Universal Quality Standards met with no regressions
- [ ] Cross-platform compatibility verified across all supported browsers/devices
- [ ] Meta tags, structured data, and semantic HTML validated for all pages
- [ ] All feature documentation updated and accurate
- [ ] Deployment via GitHub workflows successful post-push (after user commit approval)

---

## 🖥️ **Development Environment Setup**

### **Console Log Filtering** 
For clean development experience, the application includes automatic console filtering via LoggingService:

**App-Level Filtering** (`src/services/LoggingService.js`):
- Automatically filters external noise: `background.js`, `webchannel_blob`, `NmLockState`, Firebase warnings  
- Preserves app-specific logs and errors for debugging
- Uses structured logging with `LoggingService.info()`, `LoggingService.warn()`, `LoggingService.error()`

**Browser Console Filtering** (Additional Manual Option):
1. Open DevTools Console
2. Click filter icon (funnel symbol)  
3. Add filter: `-/background\.js|webchannel_blob|NmLockState|Missing or insufficient permissions/`

**Logging Architecture**:
- Production: All console logs suppressed, only LoggingService output
- Development: External noise filtered, app logs visible through LoggingService
- Use `LoggingService` directly instead of `console.log` for all app logging

---

## 📊 **Success Metrics & Validation**

- **Code Quality**: Maintainable, well-documented, comprehensively tested, scalable architecture
- **User Control**: All decisions approved, including explicit verification for commits and pushes
- **Process Efficiency**: Clear workflows with defined outcomes, minimal rework required (track via `docs/maintenance/METRICS.md`)
- **AI Context Quality**: Feature documentation provides sufficient context for AI comprehension and effective assistance
- **Knowledge Retention**: Comprehensive feature-based documentation maintained, lessons learned captured
- **Technical Excellence**: Zero shortcuts taken, all solutions properly engineered, user-tested via build and UI flow
- **Performance Excellence**: 90+ Google PageSpeed Insights performance score maintained across all pages
- **SEO Excellence**: 100% Google PageSpeed Insights SEO score achieved and maintained
- **Core Web Vitals Compliance**: LCP <2.5s, FID <100ms, CLS <0.1 across all user interactions
- **Adherence Tracking**: 90%+ flow compliance rate, measurable time savings (e.g., 20% reduction in debug cycles)

*Version: 5.0*
*Status: Ready for Implementation*  
*Last Updated: MAJOR SIMPLIFICATION - Removed all bureaucratic gates and complex enforcement. Simple 3-step workflow: 1) Investigation, 2) Solution Design, 3) Implementation. Only 2 approval points between steps. No more file-by-file approvals or complex templates. Focus on getting work done efficiently.*