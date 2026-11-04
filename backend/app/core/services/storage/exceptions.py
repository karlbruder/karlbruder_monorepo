class FileStorageError(Exception):
    """The storage client could not complete the request."""


class UploadEmptyError(Exception):
    """The upload body contained no bytes."""


class UploadTooLargeError(Exception):
    """The upload body exceeded the allowed size while reading."""


class UploadDisallowedTypeError(Exception):
    """Leading bytes did not match an allowed file type."""
