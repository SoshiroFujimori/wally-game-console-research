"""Read an on-disk artifact without disturbing an already-open Word session.

Python's ordinary open can fail when Microsoft Word has the document open.
The Windows fallback asks only for read access and accepts the existing
process's read/write/delete sharing.  It never writes to or closes the source.
"""

from __future__ import annotations

import ctypes
import os
from pathlib import Path
from ctypes import wintypes


def read_bytes_shared(path: str | os.PathLike[str]) -> bytes:
    source = Path(path)
    try:
        return source.read_bytes()
    except PermissionError:
        if os.name != "nt":
            raise

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    create_file = kernel32.CreateFileW
    create_file.argtypes = (
        wintypes.LPCWSTR,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.LPVOID,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.HANDLE,
    )
    create_file.restype = wintypes.HANDLE
    read_file = kernel32.ReadFile
    read_file.argtypes = (
        wintypes.HANDLE,
        wintypes.LPVOID,
        wintypes.DWORD,
        ctypes.POINTER(wintypes.DWORD),
        wintypes.LPVOID,
    )
    read_file.restype = wintypes.BOOL
    close_handle = kernel32.CloseHandle
    close_handle.argtypes = (wintypes.HANDLE,)
    close_handle.restype = wintypes.BOOL

    generic_read = 0x80000000
    share_all = 0x00000001 | 0x00000002 | 0x00000004
    open_existing = 3
    sequential_scan = 0x08000000
    invalid_handle = wintypes.HANDLE(-1).value
    handle = create_file(
        str(source.resolve()),
        generic_read,
        share_all,
        None,
        open_existing,
        sequential_scan,
        None,
    )
    if handle == invalid_handle:
        raise ctypes.WinError(ctypes.get_last_error(), str(source))

    chunks: list[bytes] = []
    try:
        while True:
            buffer = ctypes.create_string_buffer(1024 * 1024)
            received = wintypes.DWORD()
            if not read_file(handle, buffer, len(buffer), ctypes.byref(received), None):
                raise ctypes.WinError(ctypes.get_last_error(), str(source))
            if received.value == 0:
                break
            chunks.append(buffer.raw[: received.value])
    finally:
        close_handle(handle)
    return b"".join(chunks)
