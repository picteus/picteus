__version__: str = "0.9.0"


def get_version() -> str:
    """Returns the version of the package."""
    return __version__


from picteus_extension_sdk.picteus_extension import PicteusExtension
