import pytest


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "locale": "ar-SA", "viewport": {"width": 1440, "height": 900}}
