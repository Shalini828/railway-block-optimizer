"""Explicit isolated auth settings for the test suite."""

import os


os.environ["APP_ENV"] = "test"
os.environ["JWT_SECRET"] = "test-only-signing-key-not-for-deployment"
os.environ["DEMO_PASSWORD"] = "test-only-demo-password"
os.environ["AUTH_RATE_LIMIT_MAX_FAILURES"] = "5"
os.environ["AUTH_RATE_LIMIT_WINDOW_SECONDS"] = "60"
