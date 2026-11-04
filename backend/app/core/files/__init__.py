"""Shared file infrastructure. Domains own the meaning and access rules of their files."""

from app.core.files.storage import FileStorage, FileStorageError, get_file_storage

__all__ = ["FileStorage", "FileStorageError", "get_file_storage"]
