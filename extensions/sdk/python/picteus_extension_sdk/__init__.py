__version__: str = "0.10.0"


def get_version() -> str:
    """Returns the version of the package."""
    return __version__


from picteus_extension_sdk.intents import *
from picteus_extension_sdk.picteus_extension import *
