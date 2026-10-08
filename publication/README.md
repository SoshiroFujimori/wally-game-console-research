# Publication records

`files.json` records the bytes and SHA-256 of the initial public snapshot.
It excludes itself, Git internals, the referenced console checkout, private
settings, and generated local build files. Regenerate this record when creating
a new publication snapshot with `tools/publication/manifest.py --write` after
staging intended files. It hashes Git blobs after line-ending normalization.
Verify it with `tools/publication/manifest.py --check`. Do not reinterpret archived experiment hashes as
hashes of the redacted copies.

`media-review.json` permits only the exact image, PDF, and video content that was
reviewed for publication. A changed hash needs another review. It is not a
performance or hardware-correctness certificate.

`policy.json` lists upstream attribution addresses that remain in copied source
files. Private names and their replacements are kept only in `.private/`.

For this snapshot, the publication tests cover split-run Word names, hidden
document parts, nested archives, metadata, staged content, private filenames,
and private data left in outgoing Git history. SDWire tests use mocks and do
not operate hardware. The saved E6 CSV also reproduces 4.393, 2.254, and 0.465
ms/frame of APB wait for mailbox, 16-word FIFO, and 512-word FIFO respectively.
This is a recomputation of the saved experiment, not a new hardware run.
