from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one marker in {path}; found {count}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


server = "src/lib/stage1-self-service-server.ts"
replace_once(
    server,
    "function encodeObjectPath(objectPath: string): string {\n  return objectPath.split(\"/\").map(encodeURIComponent).join(\"/\");\n}\n",
    "function encodeObjectPath(objectPath: string): string {\n  return objectPath.split(\"/\").map(encodeURIComponent).join(\"/\");\n}\n\nfunction copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {\n  const copy = new Uint8Array(bytes.byteLength);\n  copy.set(bytes);\n  return copy.buffer;\n}\n",
)
replace_once(server, "          body: input.bytes,", "          body: copyToArrayBuffer(input.bytes),")


test = "src/lib/stage1-self-service-server.test.ts"
replace_once(
    test,
    "  assert(startedPayload.ok && startedPayload.challengeId, \"verification challenge was not issued\");",
    "  assert(\n    startedPayload.ok && typeof startedPayload.challengeId === \"string\",\n    \"verification challenge was not issued\",\n  );",
)
replace_once(
    test,
    "  assert(verifiedPayload.ok && verifiedPayload.capability, \"verification capability was not issued\");",
    "  assert(\n    verifiedPayload.ok && typeof verifiedPayload.capability === \"string\",\n    \"verification capability was not issued\",\n  );",
)
replace_once(
    test,
    "function submissionForm(\n",
    "function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {\n  const copy = new Uint8Array(bytes.byteLength);\n  copy.set(bytes);\n  return copy.buffer;\n}\n\nfunction submissionForm(\n",
)
replace_once(
    test,
    "    new File([options.photoBytes ?? makeSyntheticPng()], \"synthetic.png\", { type: \"image/png\" }),",
    "    new File([copyToArrayBuffer(options.photoBytes ?? makeSyntheticPng())], \"synthetic.png\", {\n      type: \"image/png\",\n    }),",
)

print("Stage 1 TypeScript boundary fixes are present.")
