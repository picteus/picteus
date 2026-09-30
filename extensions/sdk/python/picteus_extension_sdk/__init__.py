__version__: str = "0.18.0"


def get_version() -> str:
    """Returns the version of the package."""
    return __version__


from picteus_extension_sdk.generated.back_end_intents import *
from picteus_extension_sdk.generated.front_end_intents import *
from picteus_extension_sdk.generated.view_kit import *
from picteus_extension_sdk.picteus_extension import *
