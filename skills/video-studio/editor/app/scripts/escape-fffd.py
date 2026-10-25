"""Rewrite literal U+FFFD in built JS as the \\uFFFD escape (same value at runtime)."""
import sys
for f in sys.argv[1:]:
    s = open(f, encoding="utf-8").read()
    if "�" in s:
        open(f, "w", encoding="utf-8").write(s.replace("�", "\\uFFFD"))
