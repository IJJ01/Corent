import re
from pathlib import Path

GEN_DIR = Path("shared/generated")

# In *_pb2_grpc.py, protoc writes: import user_pb2 as user__pb2
# We want: from app.generated import user_pb2 as user__pb2
PAT = re.compile(r"^import (\w+_pb2) as (\w+)\s*$")

def main():
    if not GEN_DIR.exists():
        raise SystemExit(f"Missing {GEN_DIR}. Run protoc first.")

    changed = 0
    for p in GEN_DIR.glob("*_pb2_grpc.py"):
        txt = p.read_text(encoding="utf-8")
        lines = txt.splitlines()
        out = []
        file_changed = False

        for line in lines:
            m = PAT.match(line)
            if m:
                mod, alias = m.group(1), m.group(2)
                out.append(f"from shared.generated import {mod} as {alias}")
                file_changed = True
            else:
                out.append(line)

        if file_changed:
            p.write_text("\n".join(out) + "\n", encoding="utf-8")
            changed += 1

    print(f"✅ Fixed imports in {changed} *_pb2_grpc.py files")

if __name__ == "__main__":
    main()
