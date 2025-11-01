def estimate_tokens(text: str) -> int:
    """Rough token estimator.

    Heuristic: ~1 token ~= 4 chars for English-like text.
    Falls back to word count if text is short.
    """
    if not text:
        return 0
    try:
        n_chars = len(text)
        approx = int(round(n_chars / 4.0))
        if approx <= 0:
            approx = max(1, len(text.split()))
        return approx
    except Exception:
        return 0

