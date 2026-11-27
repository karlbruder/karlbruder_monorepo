"""Catalog failures independent of their consumers."""


class CatalogError(Exception):
    """A catalog operation could not be completed."""


class ProductNotFoundError(CatalogError):
    """The product does not exist."""


class ProductInactiveError(CatalogError):
    """An inactive product cannot be changed or newly offered."""
