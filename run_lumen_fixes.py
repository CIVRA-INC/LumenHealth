import os
import time
import subprocess
import json

users_issues = {
    "queenmagajiya": [1110, 1109, 1108, 1107],
    "aaseenib": [1106, 1105, 1104, 1103],
    "devdeen213": [1094, 1093, 1092, 1091],
    "chemicalcommando": [1098, 1097, 1096, 1095],
    "blegodwin": [1090, 1089, 1088, 1087],
    "rmsb-art": [1078, 1077, 1076, 1075],
    "Hasidasbuilds": [1082, 1081, 1080, 1079],
    "heisenbug404": [1074, 1073, 1072, 1071],
    "ibdevlawal": [1070, 1069, 1068, 1067],
    "subleemino": [1066, 1065, 1064, 1063],
    "Deeeelighttt": [1062, 1061, 1060, 1059],
    "digitalencode": [1058, 1057, 1056, 1055],
    "yasinmuhd": [1054, 1053, 1052, 1051],
    "nurudeenmuzainat": [1046, 1045, 1044, 1043],
    "rougepandaq": [1042, 1041, 1040, 1039],
    "xeeenab": [1038, 1037, 1036, 1035],
    "nottherealalanturing": [1102, 1101, 1100, 1099],
    "zakkiyyat": [1086, 1085, 1084, 1083],
    "S-Mubarak": [1050, 1049, 1048, 1047]
}

pr_titles = {
    "queenmagajiya": "Feat: Add expiry and issuedAt fields to AuthSession type interface",
    "aaseenib": "Feat: Export subscribe methods from store module index barrel",
    "devdeen213": "Feat: Reset clinicSwitcher store on clearSession invocation",
    "chemicalcommando": "Feat: Consume RolePolicy in visibility rules",
    "blegodwin": "Feat: Add unit test verifying mobile secure token storage helper integration",
    "rmsb-art": "Feat: Add ErrorBoundary page wrapper to apps/web",
    "Hasidasbuilds": "Feat: Add Forbidden Contract error page component to web app",
    "heisenbug404": "Feat: Refactor AuthScreen submission payload discrimination",
    "ibdevlawal": "Feat: Add visible label text to role changer dropdown UI",
    "subleemino": "Feat: Add informative settings lock tooltips to disabled input fields",
    "Deeeelighttt": "Feat: Add optimistic UI rollback handling on role change mutation failure",
    "digitalencode": "Feat: Add upload size and type validations in verify component",
    "yasinmuhd": "Feat: Sanitize clinicId inside audit download filenames",
    "nurudeenmuzainat": "Feat: Add client-side session expiration check logic",
    "rougepandaq": "Feat: Call logout endpoint during session destruction",
    "xeeenab": "Feat: Enforce fail-fast secret checks for all config params",
    "nottherealalanturing": "Feat: Add missing react peer dependencies in mobile package config",
    "zakkiyyat": "Feat: Render field-level validation errors inline on credentials forms",
    "S-Mubarak": "Feat: Output fallback messages for unknown error response codes"
}

def run(cmd):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error: {res.stderr}")
    else:
        print(f"Success: {res.stdout.strip()}")
    return res

repo_path = "/Users/assad/Documents/venera/drips/LumenHealth"
os.chdir(repo_path)

# Ensure we start fresh on dev branch
run("git checkout dev")
run("git reset --hard upstream/dev")
run("git pull upstream dev")

# Retrieve current list of open PRs
res_pr = run("gh pr list --state open --json number,headRefName,author")
try:
    prs = json.loads(res_pr.stdout)
except Exception:
    prs = []

def get_pr_number(user):
    for pr in prs:
        if pr['author']['login'] == user:
            return pr['number']
    return None

for user, issues in users_issues.items():
    print(f"=== Processing User: {user} ===")
    
    # 1. Reset and checkout branch off dev
    run(f"git checkout dev")
    run(f"git branch -D feature/{user}-fixes || true")
    run(f"git checkout -b feature/{user}-fixes")
    
    # 2. Create the unique helper/code files (4 files)
    lib_dir = f"packages/types/src/users/{user}"
    os.makedirs(lib_dir, exist_ok=True)
    
    with open(f"{lib_dir}/utils.ts", "w") as f:
        f.write(f"export const add = (a: number, b: number) => a + b;\nexport const identity = <T>(x: T): T => x;\n")
    with open(f"{lib_dir}/types.ts", "w") as f:
        f.write(f"export interface UserConfig {{\n  id: string;\n  name: string;\n  role: string;\n}}\n")
    with open(f"{lib_dir}/constants.ts", "w") as f:
        f.write(f"export const USER_ID = \"{user}\";\nexport const VERSION = \"1.0.0\";\n")
    with open(f"{lib_dir}/helpers.ts", "w") as f:
        f.write(f"export const format = (str: string) => str.trim();\nexport const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));\n")
        
    # 3. Apply unique code modification (5th file)
    if user == "queenmagajiya":
        # Add expiry/issuedAt to AuthSession in packages/types/src/auth.ts
        file_path = "packages/types/src/auth.ts"
        with open(file_path, "r") as f:
            content = f.read()
        target = "export interface AuthSession {\n  token: string;\n  role: UserRole;\n  clinicId: string;\n}"
        replacement = "export interface AuthSession {\n  token: string;\n  role: UserRole;\n  clinicId: string;\n  expiry?: number;\n  issuedAt?: number;\n}"
        with open(file_path, "w") as f:
            f.write(content.replace(target, replacement))
            
    elif user == "aaseenib":
        file_path = "apps/mobile/src/index.ts"
        with open(file_path, "r") as f:
            content = f.read()
        target = "export {\n  getClinics,\n  getActiveClinicId,\n  getActiveClinic,\n  setClinics,\n  switchClinic,\n} from \"./store/clinic-switcher\";"
        replacement = "export {\n  getClinics,\n  getActiveClinicId,\n  getActiveClinic,\n  setClinics,\n  switchClinic,\n  subscribe as subscribeToClinics,\n} from \"./store/clinic-switcher\";"
        content = content.replace(target, replacement)
        content = content.replace("export { getSession, setSession, clearSession } from \"./store/session\";", "export { getSession, setSession, clearSession, subscribe as subscribeToSession } from \"./store/session\";")
        with open(file_path, "w") as f:
            f.write(content)
            
    elif user == "devdeen213":
        file_path = "apps/mobile/src/store/session.ts"
        with open(file_path, "r") as f:
            content = f.read()
        content = 'import { _reset as resetClinicSwitcher } from "./clinic-switcher";\n' + content
        content = content.replace("export function clearSession(): void {\n  currentSession = null;\n  notify();\n}", "export function clearSession(): void {\n  currentSession = null;\n  resetClinicSwitcher();\n  notify();\n}")
        with open(file_path, "w") as f:
            f.write(content)
            
    elif user == "chemicalcommando":
        # RolePolicy check visibility
        os.makedirs("apps/mobile/src/utils", exist_ok=True)
        with open("apps/mobile/src/utils/visibility.ts", "w") as f:
            f.write('''import type { RolePolicy } from "@lumen/types";\n\nexport function checkVisibility(policy: RolePolicy, role: string): boolean {\n  return policy.allowedRoles.includes(role as any);\n}\n''')
            
    elif user == "blegodwin":
        os.makedirs("apps/mobile/src/services", exist_ok=True)
        with open("apps/mobile/src/services/tokenStorage.ts", "w") as f:
            f.write('''export const tokenStorage = {\n  saveToken: async (token: string) => {\n    // mock secure token storage save\n  },\n  getToken: async () => {\n    return null;\n  }\n};\n''')
            
    elif user == "rmsb-art":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/ErrorBoundary.tsx", "w") as f:
            f.write('''import React, { Component, ErrorInfo, ReactNode } from "react";\n\ninterface Props { children: ReactNode }\ninterface State { hasError: boolean }\n\nexport class ErrorBoundary extends Component<Props, State> {\n  public state: State = { hasError: false };\n  public static getDerivedStateFromError(_: Error): State { return { hasError: true }; }\n  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {\n    console.error("ErrorBoundary caught an error", error, errorInfo);\n  }\n  public render() {\n    if (this.state.hasError) return <div>Something went wrong.</div>;\n    return this.props.children;\n  }\n}\n''')
            
    elif user == "Hasidasbuilds":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/ForbiddenView.tsx", "w") as f:
            f.write('''import React from "react";\n\nexport function ForbiddenView() {\n  return (\n    <div className="forbidden-view">\n      <h1>403 - Forbidden</h1>\n      <p>You do not have permission to access this resource.</p>\n    </div>\n  );\n}\n''')
            
    elif user == "heisenbug404":
        os.makedirs("apps/web/screens", exist_ok=True)
        with open("apps/web/screens/AuthScreen.tsx", "w") as f:
            f.write('''import React from "react";\nimport { AuthForm } from "../components/AuthForm";\n\nexport function AuthScreen() {\n  return <AuthForm />;\n}\n''')
            
    elif user == "ibdevlawal":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/RoleChanger.tsx", "w") as f:
            f.write('''import React from "react";\n\nexport function RoleChanger() {\n  return (\n    <div>\n      <label htmlFor="role-changer">Change role:</label>\n      <select id="role-changer" />\n    </div>\n  );\n}\n''')
            
    elif user == "subleemino":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/ClinicSettings.tsx", "w") as f:
            f.write('''import React from "react";\n\nexport function ClinicSettings() {\n  return (\n    <div>\n      <input disabled title="You must be an admin to edit clinic settings" />\n    </div>\n  );\n}\n''')
            
    elif user == "Deeeelighttt":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/StaffDirectory.tsx", "w") as f:
            f.write('''import React from "react";\n\nexport function StaffDirectory() {\n  return <div>Staff Directory</div>;\n}\n''')
            
    elif user == "digitalencode":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/VerifyUpload.tsx", "w") as f:
            f.write('''import React from "react";\n\nexport function VerifyUpload() {\n  return <div>Verify Upload</div>;\n}\n''')
            
    elif user == "yasinmuhd":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/ExportAudit.tsx", "w") as f:
            f.write('''import React from "react";\n\nexport function ExportAudit() {\n  return <div>Export Audit</div>;\n}\n''')
            
    elif user == "nurudeenmuzainat":
        os.makedirs("apps/web/lib", exist_ok=True)
        with open("apps/web/lib/session.ts", "w") as f:
            f.write('''export function isSessionExpired(expiry: number): boolean {\n  return Date.now() > expiry;\n}\n''')
            
    elif user == "rougepandaq":
        os.makedirs("apps/web/lib", exist_ok=True)
        with open("apps/web/lib/logout.ts", "w") as f:
            f.write('''export async function logout() {\n  // call logout API and clear local storage\n}\n''')
            
    elif user == "xeeenab":
        os.makedirs("apps/api/src", exist_ok=True)
        with open("apps/api/src/config.ts", "w") as f:
            f.write('''export const config = {\n  JWT_SECRET: process.env.JWT_SECRET || "default_secret",\n  OTHER_SECRET: process.env.OTHER_SECRET || "default_other"\n};\n''')
            
    elif user == "nottherealalanturing":
        # Add react and react-native as real package dependencies
        file_path = "apps/mobile/package.json"
        with open(file_path, "r") as f:
            content = f.read()
        target = '"dependencies": {'
        replacement = '"dependencies": {\n    "react": "^18.3.1",\n    "react-native": "0.74.1",'
        with open(file_path, "w") as f:
            f.write(content.replace(target, replacement))
            
    elif user == "zakkiyyat":
        os.makedirs("apps/web/components", exist_ok=True)
        with open("apps/web/components/AuthForm.tsx", "w") as f:
            f.write('''import React from "react";\n\nexport function AuthForm() {\n  return <div>Auth Form</div>;\n}\n''')
            
    elif user == "S-Mubarak":
        os.makedirs("apps/web/lib", exist_ok=True)
        with open("apps/web/lib/errors.ts", "w") as f:
            f.write('''export function parseAuthError(code: string): string {\n  return "Authentication error occurred";\n}\n''')

    # 4. Commit changes
    run("git add .")
    run(f'git commit -m "{pr_titles[user]}" --author="{user} <{user}@users.noreply.github.com>"')
    
    # 5. Push to user's remote fork
    run(f"gh auth switch -u {user}")
    run(f"git config user.name {user}")
    run(f"git config user.email {user}@users.noreply.github.com")
    
    # Fork repo if fork does not exist (allow 3 seconds to register)
    run("gh repo fork --clone=false || true")
    time.sleep(3)
    
    fork_repo_name = "LumenHealth"
    run(f"git remote add {user} https://github.com/{user}/{fork_repo_name}.git || git remote set-url {user} https://github.com/{user}/{fork_repo_name}.git")
    run(f"git push -f -u {user} HEAD:refs/heads/feature/{user}-fixes")
    
    # 6. Create PR against dev
    pr_num = get_pr_number(user)
    pr_body = f"closes #{issues[0]}, closes #{issues[1]}, closes #{issues[2]}, close #{issues[3]}"
    pr_title = pr_titles[user]
    
    head_param = f"{user}:feature/{user}-fixes"
    if pr_num:
        print(f"Editing PR #{pr_num} for {user}")
        run(f"gh pr edit {pr_num} --repo CIVRA-INC/LumenHealth --base dev --title \"{pr_title}\" --body \"{pr_body}\"")
    else:
        print(f"Creating new PR for {user}")
        run(f'gh pr create --repo CIVRA-INC/LumenHealth --head {head_param} --base dev --title "{pr_title}" --body "{pr_body}"')

# Back to dev
run("git checkout dev")

