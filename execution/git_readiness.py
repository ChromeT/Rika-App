import subprocess
import sys
import json

def run_command(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout.strip(), result.returncode
    except Exception as e:
        return str(e), 1

def check_git_readiness():
    """
    Checks if the git repository is ready for a build/deploy.
    1. Check for uncommitted changes.
    2. Check if local is behind remote.
    """
    status_report = {
        "is_ready": True,
        "checks": {}
    }

    # 1. Check for uncommitted changes
    stdout, code = run_command("git status --porcelain")
    if stdout:
        status_report["is_ready"] = False
        status_report["checks"]["uncommitted_changes"] = "Found uncommitted changes. Please commit or stash them."
    else:
        status_report["checks"]["uncommitted_changes"] = "OK"

    # 2. Check branch sync
    run_command("git fetch origin")
    stdout, code = run_command("git status -uno")
    if "behind" in stdout:
        status_report["is_ready"] = False
        status_report["checks"]["sync_status"] = "Local branch is behind origin. Please pull."
    elif "ahead" in stdout:
        status_report["checks"]["sync_status"] = "Local branch is ahead of origin. Ready to push."
    else:
        status_report["checks"]["sync_status"] = "Up to date with origin."

    return status_report

if __name__ == "__main__":
    report = check_git_readiness()
    print(json.dumps(report, indent=2))
    if not report["is_ready"]:
        sys.exit(1)
    sys.exit(0)
