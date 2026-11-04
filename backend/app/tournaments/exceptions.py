"""Tournament workflow errors. HTTP mappings belong in the API layer."""


class TournamentError(Exception):
    """A tournament operation could not satisfy its domain requirements."""


class ParentalConsentFormRequiredError(TournamentError):
    """The participant is a minor and must attach a parental consent form."""


class ParentalConsentFormNotAllowedError(TournamentError):
    """An adult must not attach a parental consent form."""


class RegistrationNotAllowedError(TournamentError):
    """The registration inputs or current event configuration do not permit creation."""


class RegistrationResourceNotFoundError(TournamentError):
    """The requested tournament, registration or document is absent or inaccessible."""


class RegistrationConflictError(TournamentError):
    """A duplicate or lifecycle conflict prevents the operation."""


class RegistrationDocumentInvalidError(TournamentError):
    """The submitted document metadata or staged upload is invalid."""


class RegistrationDocumentTooLargeError(TournamentError):
    """The document exceeds the allowed size."""


class RegistrationDocumentTypeNotAllowedError(TournamentError):
    """The document has a disallowed content type."""


class UploadEmptyError(Exception):
    """The upload body contained no bytes."""


class UploadTooLargeError(Exception):
    """The upload body exceeded the allowed size while reading."""


class UploadDisallowedTypeError(Exception):
    """Leading bytes did not match an allowed file type."""


class PolicyArchiveError(TournamentError):
    """A linked policy could not be captured safely."""
