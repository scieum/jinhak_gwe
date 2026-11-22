"""PreToolUse 훅: 사람 소유 경로에 대한 Claude의 쓰기를 막는다. 종료코드 2 = 차단."""
import json
import os
import re
import sys

PROTECTED = re.compile(r"(^|[/\s\"'=])(docs/|rules/|scripts/|\.claude/settings[^/\s]*\.json(?![\w.]))")
# shortcut: 셸 명령은 문자열 검사만 한다(우회 가능). 우회가 실제로 생기면 셸 쓰기 자체를 막는 방식으로 강화.
SHELL_WRITE = re.compile(r">|\b(Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|New-Item|"
                         r"rm|mv|cp|tee|sed\s+-i|del|copy|move)\b", re.I)


def rel(path):
    root = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()).replace("\\", "/").rstrip("/")
    p = path.replace("\\", "/")
    return p[len(root) + 1:] if p.lower().startswith(root.lower() + "/") else p


def blocked(event):
    tool, inp = event.get("tool_name", ""), event.get("tool_input", {})
    if tool in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        path = inp.get("file_path") or inp.get("notebook_path") or ""
        return bool(PROTECTED.search(rel(path))), path
    if tool in ("Bash", "PowerShell"):
        cmd = inp.get("command", "").replace("\\", "/")
        return bool(PROTECTED.search(cmd) and SHELL_WRITE.search(cmd)), cmd
    return False, ""


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8")  # Windows 기본 cp949면 한글이 깨짐
    hit, target = blocked(json.load(sys.stdin))
    if hit:
        print(f"보호 경로라 쓸 수 없어요(사람만 수정): {target}", file=sys.stderr)
        sys.exit(2)
