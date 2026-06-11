from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROTO_DIR = ROOT / "shared" / "protos"
GENERATED_DIR = ROOT / "shared" / "generated"

GENERATED_DIR.mkdir(exist_ok=True)
(GENERATED_DIR / "__init__.py").touch(exist_ok=True)

proto_files = list(PROTO_DIR.glob("*.proto"))

if not proto_files:
    raise RuntimeError(f"No .proto files found in {PROTO_DIR}")

subprocess.run(
    [
        sys.executable,
        "-m",
        "grpc_tools.protoc",
        f"-I{PROTO_DIR}",
        f"--python_out={GENERATED_DIR}",
        f"--grpc_python_out={GENERATED_DIR}",
        *[str(p) for p in proto_files],
    ],
    check=True,
)

pattern = re.compile(r"^import (\w+_pb2) as ", re.MULTILINE)

for file in GENERATED_DIR.glob("*_pb2*.py"):
    content = file.read_text(encoding="utf-8")

    content = pattern.sub(
        r"from shared.generated import \1 as ",
        content,
    )

    file.write_text(content, encoding="utf-8")

print("Proto generation complete.")