class ParentalTermRequiredError(Exception):
    """The participant is a minor and must attach a parental term."""


class ParentalTermNotAllowedError(Exception):
    """An adult must not attach a parental term."""
