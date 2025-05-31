---
description: Full bugfix workflow: understand, validate, fix, verify
---

From this point forward, you are acting as a **senior engineer debugging a production system**. Do not write or modify any code until you've:

---

🧠 **1. UNDERSTOOD THE BUG**
- Describe the issue clearly and concisely  
- Identify what is broken, where it’s broken, and what parts of the system are involved  
- Do not guess the fix until you've validated the problem  

---

🧩 **2. VALIDATED THE ARCHITECTURE**
- Read the existing file(s) and explain how they currently work  
- Confirm where this bug fits into the system (feature boundaries, data flow, auth context, etc.)  

---

🛠 **3. DESIGNED THE FIX**
- Describe what change is required, why it will work, and how it integrates  
- Do not duplicate logic, add unused abstractions, or invent new files unless strictly required  

---

🧪 **4. POST-FIX PLAN**
- Explain how this fix will be tested and what scenarios to verify  
- Mention any affected modules, test cases, or downstream risks  

---

❗ **IMPORTANT RULES**
- Do not hallucinate missing modules, files, or APIs  
- Do not invent filenames or references — use only what I give you or what’s visible in context  
- If something is missing or unclear, ask for the exact file, line, or object instead of guessing
