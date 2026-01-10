import logging
import sys

from loguru import logger


class InterceptHandler(logging.Handler):
    """Intercept standard logging messages and redirect them to loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where the logged message originated
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def setup_logging() -> None:
    """Configure loguru and intercept standard library logging."""
    # Remove default handler
    logger.remove()

    # Add custom handler with format from the course
    logger.add(
        sink=sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <bold><white>{message}</white></bold> | <dim>{extra}</dim>",
        colorize=True,
        diagnose=False,  # Set to False for production safety to avoid leaking sensitive data
        backtrace=False,  # Set to False to avoid extended tracebacks
    )

    # Intercept standard library logging (including uvicorn)
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    # Disable uvicorn access logger (we handle this with middleware)
    logging.getLogger("uvicorn.access").handlers = []


# Setup logging when module is imported
setup_logging()

